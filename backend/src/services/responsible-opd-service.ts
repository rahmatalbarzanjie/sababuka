import type { Database, QueryResultRow } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

/** Jenis organisasi yang boleh menjadi OPD penanggung jawab atau pendukung sebuah indikator. */
export const RESPONSIBLE_ORG_TYPES = ["opd", "vertical_agency", "regional_enterprise", "organization_group"] as const;

export interface ResponsibleOpdInput { primary_organization_id: string | null; support_organization_ids: string[] }
interface Row extends QueryResultRow { indicator_id: string; code: string; name: string; origin_type: string; category_name: string; owner_label: string | null; primary_id: string | null; primary_label: string | null; support: Array<{ id: string; label: string }> | null; basis: string | null }

/** Relasi OPD utama dan pendukung per indikator. Dikelola BAPPERIDA dan Developer; tidak mengubah pemilik pelaporan indikator. */
export class ResponsibleOpdService {
  constructor(private readonly db: Database) {}

  async list(query: { q?: string | undefined; origin?: string | undefined; unmapped?: boolean | undefined; page: number; page_size: number }) {
    const where: string[] = ["i.is_active = true"]; const values: unknown[] = [];
    if (query.origin && query.origin !== "all") { values.push(query.origin); where.push(`i.origin_type = $${values.length}`); }
    if (query.q?.trim()) { values.push(`%${query.q.trim()}%`); where.push(`(i.name ILIKE $${values.length} OR i.code ILIKE $${values.length})`); }
    if (query.unmapped) where.push(`NOT EXISTS (SELECT 1 FROM sababuka.indicator_responsible_opd r WHERE r.indicator_id = i.id AND r.is_primary)`);
    const clause = where.join(" AND ");
    const total = await this.db.query<{ n: number }>(`SELECT count(*)::int AS n FROM sababuka.indicators i WHERE ${clause}`, values);
    values.push(query.page_size, (query.page - 1) * query.page_size);
    const rows = await this.db.query<Row>(
      `SELECT i.id::text AS indicator_id, i.code, i.name, i.origin_type, c.name AS category_name, COALESCE(ow.short_name, ow.name) AS owner_label,
              (SELECT r.organization_id::text FROM sababuka.indicator_responsible_opd r WHERE r.indicator_id = i.id AND r.is_primary) AS primary_id,
              (SELECT COALESCE(o.short_name, o.name) FROM sababuka.indicator_responsible_opd r JOIN sababuka.organizations o ON o.id = r.organization_id WHERE r.indicator_id = i.id AND r.is_primary) AS primary_label,
              (SELECT jsonb_agg(jsonb_build_object('id', o.id::text, 'label', COALESCE(o.short_name, o.name)) ORDER BY o.name) FROM sababuka.indicator_responsible_opd r JOIN sababuka.organizations o ON o.id = r.organization_id WHERE r.indicator_id = i.id AND NOT r.is_primary) AS support,
              (SELECT r.basis FROM sababuka.indicator_responsible_opd r WHERE r.indicator_id = i.id AND r.is_primary) AS basis
       FROM sababuka.indicators i JOIN sababuka.categories c ON c.id = i.category_id LEFT JOIN sababuka.organizations ow ON ow.id = i.owner_organization_id
       WHERE ${clause} ORDER BY i.origin_type = 'rpjmd_master' DESC, c.name, i.name LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return { data: rows.rows.map((row) => ({ ...row, support: row.support ?? [] })), meta: { page: query.page, page_size: query.page_size, total: total.rows[0]!.n } };
  }

  /** Daftar organisasi yang boleh dipilih. */
  async organizations() {
    const rows = await this.db.query(`SELECT id::text, code, COALESCE(short_name, name) AS label, name FROM sababuka.organizations WHERE is_active = true AND organization_type = ANY($1::text[]) ORDER BY name`, [RESPONSIBLE_ORG_TYPES]);
    return { data: rows.rows };
  }

  /** Mengganti seluruh relasi OPD satu indikator dalam satu transaksi, lalu mencatat sebelum dan sesudahnya di audit. */
  async set(auth: AuthContext, indicatorId: string, input: ResponsibleOpdInput, audit: AuditContext) {
    void auth;
    const support = [...new Set(input.support_organization_ids)].filter((id) => id !== input.primary_organization_id);
    const wanted = [...(input.primary_organization_id ? [input.primary_organization_id] : []), ...support];
    const indicator = await this.db.query<{ name: string }>(`SELECT name FROM sababuka.indicators WHERE id = $1 AND is_active = true`, [indicatorId]);
    if (!indicator.rows[0]) throw new ApiError(404, "NOT_FOUND", "Indikator tidak ditemukan.");
    if (wanted.length) {
      const valid = await this.db.query<{ id: string }>(`SELECT id::text FROM sababuka.organizations WHERE id = ANY($1::uuid[]) AND is_active = true AND organization_type = ANY($2::text[])`, [wanted, RESPONSIBLE_ORG_TYPES]);
      if (valid.rows.length !== wanted.length) throw new ApiError(422, "VALIDATION_ERROR", "Salah satu organisasi tidak ditemukan atau bukan OPD.");
    }
    const client = await this.db.connect();
    let before: Array<{ organization_id: string; is_primary: boolean; basis: string }> = [];
    try {
      await client.query("BEGIN");
      before = (await client.query<{ organization_id: string; is_primary: boolean; basis: string }>(`SELECT organization_id::text, is_primary, basis FROM sababuka.indicator_responsible_opd WHERE indicator_id = $1`, [indicatorId])).rows;
      await client.query(`DELETE FROM sababuka.indicator_responsible_opd WHERE indicator_id = $1`, [indicatorId]);
      // Dasar penetapan asal dipertahankan bila organisasi dan perannya tidak berubah; selain itu dicatat sebagai manual.
      const basisOf = (id: string, primary: boolean) => before.find((row) => row.organization_id === id && row.is_primary === primary)?.basis ?? "manual";
      if (input.primary_organization_id) await client.query(`INSERT INTO sababuka.indicator_responsible_opd (indicator_id, organization_id, is_primary, basis) VALUES ($1, $2, true, $3)`, [indicatorId, input.primary_organization_id, basisOf(input.primary_organization_id, true)]);
      for (const id of support) await client.query(`INSERT INTO sababuka.indicator_responsible_opd (indicator_id, organization_id, is_primary, basis) VALUES ($1, $2, false, $3)`, [indicatorId, id, basisOf(id, false)]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
    await recordAudit(this.db, {
      ...audit, eventType: "indicator.responsible_opd_set", entityType: "indicator", entityId: indicatorId,
      beforeData: { primary: before.find((row) => row.is_primary)?.organization_id ?? null, support: before.filter((row) => !row.is_primary).map((row) => row.organization_id).sort() },
      afterData: { primary: input.primary_organization_id, support: [...support].sort() }, metadata: { indicator: indicator.rows[0].name },
    });
    return { indicator_id: indicatorId, primary_organization_id: input.primary_organization_id, support_organization_ids: support };
  }
}
