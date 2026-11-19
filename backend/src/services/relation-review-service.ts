import type { Database } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";
import { pairKey } from "./cross-analysis-service.js";

export type ReviewAction = "confirmed" | "rejected" | "reset";

/** Validasi BAPPERIDA (dan Developer) atas keterkaitan indikator usulan sistem. Tautan Seri Data tidak melalui jalur ini. */
export class RelationReviewService {
  constructor(private readonly db: Database) {}

  async set(auth: AuthContext, indicatorId: string, relatedId: string, action: ReviewAction, note: string | null, audit: AuditContext) {
    if (indicatorId === relatedId) throw new ApiError(422, "VALIDATION_ERROR", "Pasangan indikator harus berbeda.");
    const found = await this.db.query<{ id: string; name: string }>(`SELECT id::text, name FROM sababuka.indicators WHERE id = ANY($1::uuid[]) AND origin_type = 'rpjmd_master'`, [[indicatorId, relatedId]]);
    if (found.rows.length !== 2) throw new ApiError(404, "NOT_FOUND", "Indikator RPJMD tidak ditemukan.");
    const key = pairKey(indicatorId, relatedId); const [a, b] = key.split("|") as [string, string];
    const before = await this.db.query<{ status: string }>(`SELECT status FROM sababuka.indicator_relation_reviews WHERE indicator_a = $1 AND indicator_b = $2`, [a, b]);
    if (action === "reset") await this.db.query(`DELETE FROM sababuka.indicator_relation_reviews WHERE indicator_a = $1 AND indicator_b = $2`, [a, b]);
    else await this.db.query(
      `INSERT INTO sababuka.indicator_relation_reviews (indicator_a, indicator_b, status, note, reviewed_by) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (indicator_a, indicator_b) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = now()`,
      [a, b, action, note, auth.user.id],
    );
    await recordAudit(this.db, { ...audit, eventType: "indicator.relation_reviewed", entityType: "indicator", entityId: indicatorId, beforeData: { status: before.rows[0]?.status ?? "usulan_sistem" }, afterData: { status: action === "reset" ? "usulan_sistem" : action, related_indicator_id: relatedId }, metadata: { names: found.rows.map((row) => row.name) } });
    return { indicator_id: indicatorId, related_indicator_id: relatedId, status: action === "reset" ? "usulan_sistem" : action };
  }
}
