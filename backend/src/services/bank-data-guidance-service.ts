import type { Database } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";
import { plainDash } from "./plain-text.js";

export type GuidanceType = "standar" | "metadata" | "metodologi" | "konsistensi";

export class BankDataGuidanceService {
  constructor(private readonly db: Database) {}

  private async seriesSnapshot(indicatorId: string) {
    const result = await this.db.query<{
      id: string; code: string; name: string; unit: string; source_name: string | null;
      first_year: number | null; last_year: number | null; observation_count: number;
    }>(
      `SELECT i.id::text, i.code, i.name, COALESCE(u.symbol, u.name) AS unit,
              string_agg(DISTINCT ds.name, ', ' ORDER BY ds.name) AS source_name,
              MIN(p.code::int)::int AS first_year, MAX(p.code::int)::int AS last_year,
              COUNT(o.id)::int AS observation_count
       FROM sababuka.indicators i
       JOIN sababuka.indicator_versions iv ON iv.indicator_id = i.id AND iv.status = 'active'
       JOIN sababuka.units u ON u.id = iv.unit_id
       LEFT JOIN sababuka.observations o ON o.indicator_version_id = iv.id
       LEFT JOIN sababuka.periods p ON p.id = o.period_id
       LEFT JOIN sababuka.indicator_source_mappings ism ON ism.indicator_version_id = iv.id
       LEFT JOIN sababuka.data_sources ds ON ds.id = ism.source_id
       WHERE i.id = $1 AND i.origin_type = 'bank_data'
       GROUP BY i.id, u.symbol, u.name`, [indicatorId],
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Seri Bank Data tidak ditemukan.");
    return result.rows[0];
  }

  async list(indicatorId: string) {
    await this.seriesSnapshot(indicatorId);
    const result = await this.db.query(
      `SELECT n.id::text, n.indicator_id::text, n.guidance_type, n.notes, n.snapshot_json,
              n.created_at::text, creator.full_name AS created_by_name,
              n.resolved_at::text, n.resolution_notes, resolver.full_name AS resolved_by_name,
              CASE WHEN n.resolved_at IS NULL THEN 'open' ELSE 'resolved' END AS status
       FROM sababuka.bank_data_guidance_notes n
       JOIN sababuka.users creator ON creator.id = n.created_by
       LEFT JOIN sababuka.users resolver ON resolver.id = n.resolved_by
       WHERE n.indicator_id = $1
       ORDER BY n.created_at DESC`, [indicatorId],
    );
    return { data: result.rows };
  }

  async create(auth: AuthContext, indicatorId: string, input: { guidance_type: GuidanceType; notes: string }, audit: AuditContext) {
    const snapshot = await this.seriesSnapshot(indicatorId);
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO sababuka.bank_data_guidance_notes (indicator_id, guidance_type, notes, snapshot_json, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       RETURNING id::text`, [indicatorId, input.guidance_type, plainDash(input.notes).trim(), JSON.stringify(snapshot), auth.user.id],
    );
    await recordAudit(this.db, { ...audit, eventType: "bank_data.guidance_created", entityType: "bank_data_guidance_note", entityId: result.rows[0]!.id, metadata: { indicator_id: indicatorId, guidance_type: input.guidance_type } });
    return this.list(indicatorId);
  }

  async resolve(auth: AuthContext, noteId: string, resolutionNotes: string, audit: AuditContext) {
    const result = await this.db.query<{ indicator_id: string }>(
      `UPDATE sababuka.bank_data_guidance_notes
       SET resolved_by = $2, resolved_at = now(), resolution_notes = $3
       WHERE id = $1 AND resolved_at IS NULL
       RETURNING indicator_id::text`, [noteId, auth.user.id, plainDash(resolutionNotes).trim()],
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Catatan tidak ditemukan atau sudah ditindaklanjuti.");
    await recordAudit(this.db, { ...audit, eventType: "bank_data.guidance_resolved", entityType: "bank_data_guidance_note", entityId: noteId, metadata: { indicator_id: result.rows[0].indicator_id } });
    return this.list(result.rows[0].indicator_id);
  }
}
