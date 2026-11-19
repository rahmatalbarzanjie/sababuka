import type { Database, QueryResultRow } from "../database.js";
import { plainDash } from "./plain-text.js";
import { ApiError } from "../errors.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";
import { buildReply, parseIntent } from "./assistant-intents.js";
import { CrossAnalysisService, formatCrossAnalysis } from "./cross-analysis-service.js";
import { InsightService } from "./insight-service.js";
import { LlmService } from "./llm-service.js";
import { AgentService, type AgentFailure } from "./agent-service.js";
import { AchievementService } from "./achievement-service.js";
import type { AppConfig } from "../config.js";

const stopWords = new Set(["apa", "berapa", "bagaimana", "dan", "atau", "yang", "dari", "untuk", "pada", "di", "ke", "tahun", "data", "capaian", "indikator", "tampilkan", "jelaskan", "nilai"]);
function tokens(value: string) { return [...new Set(value.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/gu, " ").split(/\s+/u).filter((word) => word.length > 1 && !stopWords.has(word)))]; }
function formatValue(row: Record<string, unknown>) {
  if (row.text_value !== null) return String(row.text_value);
  const formatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(Number(row.numeric_value));
  return `${formatted}${row.unit_symbol ? ` ${row.unit_symbol}` : row.unit_name ? ` ${row.unit_name}` : ""}`;
}

export class AssistantService {
  constructor(private readonly db: Database, private readonly config?: AppConfig) {}
  private async ensureEnabled() {
    const result = await this.db.query<{ is_enabled: boolean }>(`SELECT is_enabled FROM sababuka.feature_flags WHERE code = 'assistant.enabled'`);
    if (!result.rows[0]?.is_enabled) throw new ApiError(403, "PERMISSION_DENIED", "Asisten AI sedang dinonaktifkan oleh administrator.");
  }
  async createSession(auth: AuthContext, title: string | null, audit: AuditContext) {
    await this.ensureEnabled();
    const organizationId = auth.user.organizations[0]?.id ?? null;
    const result = await this.db.query<QueryResultRow & Record<string, unknown>>(
      `INSERT INTO sababuka.assistant_sessions (user_id, organization_id, title) VALUES ($1, $2, $3)
       RETURNING id::text, title, status, started_at::text`, [auth.user.id, organizationId, title],
    );
    await recordAudit(this.db, { ...audit, eventType: "assistant.session_created", entityType: "assistant_session", entityId: result.rows[0]!.id as string, organizationId });
    return result.rows[0];
  }
  async ask(auth: AuthContext, sessionId: string, question: string, audit: AuditContext) {
    await this.ensureEnabled();
    const session = await this.db.query(`SELECT id FROM sababuka.assistant_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'`, [sessionId, auth.user.id]);
    if (!session.rows[0]) throw new ApiError(404, "NOT_FOUND", "Sesi asisten tidak ditemukan atau sudah ditutup.");
    const history = await this.db.query<{ message_role: "user" | "assistant"; content: string }>(`SELECT message_role, content FROM sababuka.assistant_messages WHERE session_id = $1 AND message_role IN ('user','assistant') ORDER BY created_at DESC LIMIT 6`, [sessionId]);
    const recent = history.rows.reverse().map((row) => ({ role: row.message_role, content: row.content }));
    let agent: Awaited<ReturnType<AgentService["run"]>> = null;
    let failure: AgentFailure | "galat_sistem" | null = null; let failureDetail: string | null = null; let attempts = 0;
    // Satu percobaan ulang untuk kegagalan sementara; model yang memang tidak dikonfigurasi tidak diulang.
    while (!agent && attempts < 2) {
      attempts += 1;
      const service = new AgentService(this.db, this.config);
      try { agent = await service.run(question, recent); failure = agent ? null : service.failure; failureDetail = null; } catch (error) { agent = null; failure = "galat_sistem"; failureDetail = plainDash(error instanceof Error ? error.message : String(error)).slice(0, 200); }
      if (failure === "llm_tidak_tersedia") break;
    }
    const achievement = (await new AchievementService(this.db).list()).items;
    const insightReply = buildReply(question, await new InsightService(this.db).all(), achievement);
    if (!agent && insightReply.focusId) {
      const wanted = parseIntent(question);
      if (wanted.related || wanted.recommendation) {
        const cross = await new CrossAnalysisService(this.db).analyze(insightReply.focusId).catch(() => null);
        if (cross) insightReply.answer = formatCrossAnalysis(cross);
      }
    }
    if (agent) {
      insightReply.answer = plainDash(agent.answer); insightReply.visuals = agent.visuals; insightReply.sources = agent.sources.length ? agent.sources : insightReply.sources;
      insightReply.sufficiency = "sufficient"; insightReply.suggestions = [];
    }
    {
      const narrated = !agent && insightReply.facts ? await new LlmService(this.db, this.config).narrate(question, insightReply.facts, insightReply.answer) : null;
      if (narrated) insightReply.answer = narrated.text;
      const degraded = !agent && failure !== null && failure !== "llm_tidak_tersedia";
      if (degraded) insightReply.answer = `${insightReply.answer}\n\n**Catatan**\nJawaban ini disusun oleh mesin aturan karena analisis lengkap asisten sedang tidak tersedia. Ulangi pertanyaan beberapa saat lagi untuk analisis yang lebih lengkap.`;
      insightReply.answer = plainDash(insightReply.answer);
      const asked = await this.db.query<{ id: string }>(`INSERT INTO sababuka.assistant_messages (session_id, message_role, content, structured_data, request_id) VALUES ($1, 'user', $2, '{}'::jsonb, $3) RETURNING id::text`, [sessionId, question, audit.requestId]);
      const replied = await this.db.query<{ id: string }>(`INSERT INTO sababuka.assistant_messages (session_id, message_role, content, model_name, structured_data, request_id) VALUES ($1, 'assistant', $2, $5, $3::jsonb, $4) RETURNING id::text`, [sessionId, insightReply.answer, JSON.stringify({ sufficiency: insightReply.sufficiency, retrieval: "trend_engine", narrated_by: agent?.model ?? narrated?.model ?? "rules", answer_mode: agent ? "agent" : "aturan", agent_failure: failure, attempts, tools: agent?.toolsUsed ?? [], user_message_id: asked.rows[0]!.id, sources: insightReply.sources }), audit.requestId, agent?.model ?? narrated?.model ?? "sababuka-insight-v1"]);
      await recordAudit(this.db, { ...audit, eventType: "assistant.answer_generated", entityType: "assistant_session", entityId: sessionId, metadata: { sufficiency: insightReply.sufficiency, citation_count: insightReply.sources.length, engine: agent ? "agent" : "trend_engine", agent_failure: failure, agent_failure_detail: failureDetail, attempts } });
      return { message_id: replied.rows[0]!.id, answer: insightReply.answer, citations: insightReply.sources.map((entry) => ({ publication_item_id: entry.label, label: entry.label, indicator: entry.indicator, period: String(entry.year), organization: "", source: entry.source, indicator_id: entry.indicator_id, source_url: entry.source_url })), sufficiency: insightReply.sufficiency, visuals: insightReply.visuals, suggestions: insightReply.suggestions };
    }
  }
}
