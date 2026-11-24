import type { Database } from "../database.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";
import { AchievementService, type AchievementItem } from "./achievement-service.js";
import { InsightService, type Insight } from "./insight-service.js";
import { opdPerformance } from "./opd-performance.js";
import { plainDash } from "./plain-text.js";
import { formatPct } from "./trend-engine.js";

export const BRIEF_KEYS = ["perhatian", "target", "opd"] as const;
export type BriefKey = (typeof BRIEF_KEYS)[number];
export interface BriefItem { key: BriefKey; tone: "warn" | "bad" | "info"; title: string; detail: string; question: string }

const num = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
const list = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}` : names[0] ?? "";

/** Tiga hal yang layak diketahui Bupati hari ini, dihitung dari data terbit yang sama dengan jawaban asisten. */
/** Nilai terbaru nol setelah tahun sebelumnya positif lazimnya data belum terisi atau salah ketik, bukan kemunduran nyata; tidak layak jadi sorotan briefing. */
const suspectZero = (item: Insight) => { const previous = item.series[item.series.length - 2]; return item.latest_value <= 0 && previous !== undefined && previous.value > 0; };

export function buildBriefing(insights: Insight[], achievement: AchievementItem[]): BriefItem[] {
  const items: BriefItem[] = [];
  const candidates = insights.filter((item) => !suspectZero(item) && (item.assessment === "memburuk" || item.analysis.anomaly?.is_anomaly));
  const concerning = candidates.filter((item) => item.layer === "kinerja").sort((a, b) => b.score - a.score)[0] ?? candidates.sort((a, b) => b.score - a.score)[0];
  if (concerning) {
    items.push({ key: "perhatian", tone: "warn", title: plainDash(`${concerning.name} perlu dicermati`), detail: plainDash(`${num(concerning.latest_value)}${concerning.unit ? ` ${concerning.unit}` : ""} pada ${concerning.latest_year}${concerning.change_pct === null ? "" : `, ${formatPct(concerning.change_pct)} dari tahun sebelumnya`}.`), question: `Bagaimana tren ${concerning.name}?` });
  }
  const tercapai = achievement.filter((item) => item.status === "tercapai").length;
  const belum = achievement.filter((item) => item.status === "belum_tercapai").length;
  const tanpaRealisasi = achievement.filter((item) => item.status === "belum_ada_data").length;
  if (tercapai + belum > 0) {
    items.push({ key: "target", tone: belum > 0 ? "bad" : "info", title: belum > 0 ? `${belum} indikator belum mencapai target` : `Semua ${tercapai} indikator bernilai mencapai target`, detail: `${tercapai} tercapai${tanpaRealisasi ? `, ${tanpaRealisasi} masih menunggu realisasi` : ""}.`, question: "Indikator apa yang belum mencapai target?" });
  }
  const scored = opdPerformance(insights, achievement).filter((entry) => entry.skor !== null);
  const weak = scored.filter((entry) => entry.kondisi === "perlu_pembinaan" || entry.kondisi === "perlu_perhatian").sort((a, b) => a.skor! - b.skor!);
  if (scored.length >= 2) {
    const pembinaan = weak.filter((entry) => entry.kondisi === "perlu_pembinaan");
    const focus = pembinaan.length ? pembinaan : weak;
    items.push(focus.length
      ? { key: "opd", tone: "info", title: pembinaan.length ? `${pembinaan.length} OPD perlu pembinaan` : `${focus.length} OPD perlu perhatian`, detail: `${list(focus.slice(0, 2).map((entry) => `${entry.nama} (skor ${entry.skor})`))}${focus.length > 2 ? ` dan ${focus.length - 2} lainnya` : ""}.`, question: "Bagaimana kondisi dan perkembangan OPD di Kapuas?" }
      : { key: "opd", tone: "info", title: "Kondisi OPD terjaga", detail: `${scored.length} OPD yang dapat dinilai tidak ada yang berada di bawah batas perhatian.`, question: "Bagaimana kondisi dan perkembangan OPD di Kapuas?" });
  }
  return items;
}

export interface PinnedIndicator { indicator_id: string; name: string; unit: string; latest_year: number; latest_value: number; assessment: Insight["assessment"]; series: Array<{ year: number; value: number }> }

export class RuangBupatiService {
  constructor(private readonly db: Database) {}

  async briefing(auth: AuthContext) {
    const [insights, achievement] = [await new InsightService(this.db).all(), (await new AchievementService(this.db).list()).items];
    const day = await this.db.query<{ today: string }>(`SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS today`);
    const today = day.rows[0]!.today;
    const read = await this.db.query<{ item_key: string }>(`SELECT item_key FROM sababuka.assistant_briefing_reads WHERE user_id = $1 AND brief_date = $2::date`, [auth.user.id, today]);
    const done = new Set(read.rows.map((row) => row.item_key));
    const items = buildBriefing(insights, achievement).map((item) => ({ ...item, read: done.has(item.key) }));
    return { date: today, items };
  }

  async markRead(auth: AuthContext, key: BriefKey) {
    await this.db.query(
      `INSERT INTO sababuka.assistant_briefing_reads (user_id, brief_date, item_key) VALUES ($1, (now() AT TIME ZONE 'Asia/Jakarta')::date, $2) ON CONFLICT DO NOTHING`,
      [auth.user.id, key],
    );
    return { ok: true };
  }

  async pins(auth: AuthContext): Promise<PinnedIndicator[]> {
    const rows = await this.db.query<{ indicator_id: string }>(`SELECT indicator_id::text FROM sababuka.assistant_pins WHERE user_id = $1 ORDER BY created_at`, [auth.user.id]);
    if (!rows.rows.length) return [];
    const insights = await new InsightService(this.db).all();
    return rows.rows.flatMap((row) => {
      const insight = insights.find((item) => item.indicator_id === row.indicator_id);
      return insight ? [{ indicator_id: insight.indicator_id, name: plainDash(insight.name), unit: plainDash(insight.unit), latest_year: insight.latest_year, latest_value: insight.latest_value, assessment: insight.assessment, series: insight.series.map((point) => ({ year: point.year, value: point.value })) }] : [];
    });
  }

  async addPin(auth: AuthContext, indicatorId: string) {
    const insights = await new InsightService(this.db).all();
    if (!insights.some((item) => item.indicator_id === indicatorId)) throw new ApiError(404, "NOT_FOUND", "Indikator tidak ditemukan atau belum terbit.");
    const count = await this.db.query<{ total: number }>(`SELECT count(*)::int AS total FROM sababuka.assistant_pins WHERE user_id = $1`, [auth.user.id]);
    if (count.rows[0]!.total >= 12) throw new ApiError(409, "CONFLICT", "Pantauan penuh (maksimal 12 indikator). Hapus salah satu lebih dulu.");
    await this.db.query(`INSERT INTO sababuka.assistant_pins (user_id, indicator_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [auth.user.id, indicatorId]);
    return this.pins(auth);
  }

  async removePin(auth: AuthContext, indicatorId: string) {
    await this.db.query(`DELETE FROM sababuka.assistant_pins WHERE user_id = $1 AND indicator_id = $2`, [auth.user.id, indicatorId]);
    return this.pins(auth);
  }

  async notes(auth: AuthContext) {
    const result = await this.db.query(`SELECT id::text, content, session_id::text, created_at::text FROM sababuka.assistant_notes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [auth.user.id]);
    return result.rows;
  }

  async addNote(auth: AuthContext, content: string, sessionId: string | null, audit: AuditContext) {
    const text = plainDash(content).replace(/\s+/gu, " ").trim();
    if (text.length < 2) throw new ApiError(400, "VALIDATION_ERROR", "Catatan terlalu pendek.");
    if (sessionId) {
      const own = await this.db.query(`SELECT 1 FROM sababuka.assistant_sessions WHERE id = $1 AND user_id = $2`, [sessionId, auth.user.id]);
      if (!own.rows[0]) sessionId = null;
    }
    const result = await this.db.query<{ id: string; content: string; session_id: string | null; created_at: string }>(
      `INSERT INTO sababuka.assistant_notes (user_id, session_id, content) VALUES ($1, $2, $3) RETURNING id::text, content, session_id::text, created_at::text`,
      [auth.user.id, sessionId, text],
    );
    await recordAudit(this.db, { ...audit, eventType: "assistant.note_created", entityType: "assistant_note", entityId: result.rows[0]!.id });
    return result.rows[0]!;
  }

  async removeNote(auth: AuthContext, noteId: string) {
    const result = await this.db.query(`DELETE FROM sababuka.assistant_notes WHERE id = $1 AND user_id = $2 RETURNING id`, [noteId, auth.user.id]);
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Catatan tidak ditemukan.");
    return { ok: true };
  }
}
