import type { Database } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

export type SeriesRelation = "primary" | "supporting" | "comparison";

export interface SeriesLinkInput { rpjmd_indicator_id: string; series_indicator_id: string; relation_type: SeriesRelation; notes?: string | null }

/** Tautan manual Seri Data (Bank Data) ke indikator RPJMD. Opsional: seri tanpa tautan tetap berdiri sendiri. */
export class SeriesLinkService {
  constructor(private readonly db: Database) {}

  async list() {
    const result = await this.db.query(
      `SELECT l.id::text, l.relation_type, l.notes, l.created_at::text,
              r.id::text AS rpjmd_indicator_id, r.code AS rpjmd_code, r.name AS rpjmd_name,
              s.id::text AS series_indicator_id, s.code AS series_code, s.name AS series_name,
              (SELECT count(*)::int FROM sababuka.observations o JOIN sababuka.indicator_versions v ON v.id = o.indicator_version_id WHERE v.indicator_id = s.id) AS series_observations
       FROM sababuka.indicator_series_links l
       JOIN sababuka.indicators r ON r.id = l.rpjmd_indicator_id
       JOIN sababuka.indicators s ON s.id = l.series_indicator_id
       ORDER BY r.code, l.relation_type, s.name`,
    );
    return { data: result.rows };
  }

  /** Cari Seri Data (bank_data) berdasarkan nama/kode, beserta jumlah observasi. */
  async searchSeries(q: string) {
    const term = q.trim();
    if (term.length < 2) return { data: [] };
    const result = await this.db.query(
      `SELECT i.id::text, i.code, i.name, c.name AS category_name,
              (SELECT count(*)::int FROM sababuka.observations o JOIN sababuka.indicator_versions v ON v.id = o.indicator_version_id WHERE v.indicator_id = i.id) AS observation_count
       FROM sababuka.indicators i JOIN sababuka.categories c ON c.id = i.category_id
       WHERE i.origin_type = 'bank_data' AND i.archived_at IS NULL AND (i.name ILIKE '%' || $1 || '%' OR i.code ILIKE '%' || $1 || '%')
       ORDER BY i.name LIMIT 30`,
      [term],
    );
    return { data: result.rows };
  }

  async create(auth: AuthContext, input: SeriesLinkInput, audit: AuditContext) {
    const kinds = await this.db.query<{ id: string; origin_type: string }>(
      `SELECT id::text, origin_type FROM sababuka.indicators WHERE id = ANY($1::uuid[]) AND archived_at IS NULL`,
      [[input.rpjmd_indicator_id, input.series_indicator_id]],
    );
    const rpjmd = kinds.rows.find((row) => row.id === input.rpjmd_indicator_id);
    const series = kinds.rows.find((row) => row.id === input.series_indicator_id);
    if (!rpjmd || rpjmd.origin_type === "bank_data") throw new ApiError(422, "VALIDATION_ERROR", "Pilih indikator RPJMD atau usulan OPD sebagai tujuan tautan.");
    if (!series || series.origin_type !== "bank_data") throw new ApiError(422, "VALIDATION_ERROR", "Pilih Seri Data (Bank Data) yang akan ditautkan.");
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO sababuka.indicator_series_links (rpjmd_indicator_id, series_indicator_id, relation_type, notes, created_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (rpjmd_indicator_id, series_indicator_id) DO UPDATE SET relation_type = EXCLUDED.relation_type, notes = EXCLUDED.notes
       RETURNING id::text`,
      [input.rpjmd_indicator_id, input.series_indicator_id, input.relation_type, input.notes?.trim() || null, auth.user.id],
    );
    const id = result.rows[0]!.id;
    await recordAudit(this.db, { ...audit, eventType: "series_link.saved", entityType: "indicator_series_link", entityId: id, metadata: { rpjmd_indicator_id: input.rpjmd_indicator_id, series_indicator_id: input.series_indicator_id, relation_type: input.relation_type } });
    return { id };
  }

  async remove(auth: AuthContext, id: string, audit: AuditContext) {
    const result = await this.db.query(`DELETE FROM sababuka.indicator_series_links WHERE id = $1`, [id]);
    if (!result.rowCount) throw new ApiError(404, "NOT_FOUND", "Tautan tidak ditemukan.");
    await recordAudit(this.db, { ...audit, eventType: "series_link.removed", entityType: "indicator_series_link", entityId: id, metadata: { removed_by: auth.user.id } });
    return { removed: true };
  }
}
