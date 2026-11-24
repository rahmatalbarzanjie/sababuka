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

interface StoredAnswer {
  message_id: string;
  answer: string;
  citations: Array<Record<string, unknown>>;
  sufficiency: "sufficient" | "partial" | "insufficient";
  visuals: unknown[];
  suggestions: string[];
}

function sessionTitle(question: string) {
  const clean = plainDash(question).replace(/\s+/gu, " ").trim();
  return clean.length <= 72 ? clean : `${clean.slice(0, 69).trimEnd()}...`;
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
  async listSessions(auth: AuthContext, archived: boolean) {
    await this.ensureEnabled();
    const result = await this.db.query(
      `SELECT s.id::text, s.title, s.status, s.started_at::text,
              COALESCE(MAX(m.created_at), s.started_at)::text AS updated_at,
              COUNT(m.id)::int AS message_count
       FROM sababuka.assistant_sessions s
       LEFT JOIN sababuka.assistant_messages m ON m.session_id = s.id
       WHERE s.user_id = $1 AND s.status = $2
       GROUP BY s.id
       ORDER BY COALESCE(MAX(m.created_at), s.started_at) DESC`,
      [auth.user.id, archived ? "archived" : "active"],
    );
    return result.rows;
  }
  async getSession(auth: AuthContext, sessionId: string) {
    await this.ensureEnabled();
    const session = await this.db.query(`SELECT id::text, title, status, started_at::text FROM sababuka.assistant_sessions WHERE id = $1 AND user_id = $2`, [sessionId, auth.user.id]);
    if (!session.rows[0]) throw new ApiError(404, "NOT_FOUND", "Riwayat chat tidak ditemukan.");
    const messages = await this.db.query<{ id: string; message_role: "user" | "assistant"; content: string; structured_data: Record<string, unknown>; created_at: string }>(
      `SELECT id::text, message_role, content, structured_data, created_at::text
       FROM sababuka.assistant_messages
       WHERE session_id = $1 AND message_role IN ('user', 'assistant')
       ORDER BY created_at, id`, [sessionId],
    );
    return { ...session.rows[0], messages: messages.rows.map((row) => ({ id: row.id, role: row.message_role, content: row.content, created_at: row.created_at, answer: row.message_role === "assistant" ? this.storedAnswer(row.id, row.content, row.structured_data) : undefined })) };
  }
  async updateSession(auth: AuthContext, sessionId: string, input: { title?: string; status?: "active" | "archived" }, audit: AuditContext) {
    await this.ensureEnabled();
    const title = input.title ? plainDash(input.title).replace(/\s+/gu, " ").trim() : null;
    if (input.title !== undefined && !title) throw new ApiError(400, "VALIDATION_ERROR", "Judul chat tidak boleh kosong.");
    const result = await this.db.query(
      `UPDATE sababuka.assistant_sessions
       SET title = CASE WHEN $3::boolean THEN $4 ELSE title END,
           status = COALESCE($5, status),
           ended_at = CASE WHEN $5 = 'archived' THEN now() WHEN $5 = 'active' THEN NULL ELSE ended_at END
       WHERE id = $1 AND user_id = $2
       RETURNING id::text, title, status, started_at::text`,
      [sessionId, auth.user.id, input.title !== undefined, title, input.status ?? null],
    );
    if (!result.rows[0]) throw new ApiError(404, "NOT_FOUND", "Riwayat chat tidak ditemukan.");
    await recordAudit(this.db, { ...audit, eventType: input.status === "archived" ? "assistant.session_archived" : "assistant.session_updated", entityType: "assistant_session", entityId: sessionId, metadata: { status: input.status, title_changed: input.title !== undefined } });
    return result.rows[0];
  }
  private storedAnswer(messageId: string, content: string, structured: Record<string, unknown>): StoredAnswer {
    const response = structured.response && typeof structured.response === "object" ? structured.response as Partial<StoredAnswer> : {};
    const legacySources = Array.isArray(structured.sources) ? structured.sources : [];
    const sourceList = Array.isArray(response.citations) ? response.citations : legacySources;
    const citations = sourceList.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((item, index) => ({
      ...item,
      publication_item_id: String(item.publication_item_id ?? item.label ?? `${messageId}-${index}`),
      label: String(item.label ?? item.indicator ?? "Sumber data"),
    }));
    const sufficiency = response.sufficiency ?? structured.sufficiency;
    return {
      message_id: messageId,
      answer: content,
      citations,
      sufficiency: sufficiency === "partial" || sufficiency === "insufficient" ? sufficiency : "sufficient",
      visuals: Array.isArray(response.visuals) ? response.visuals : [],
      suggestions: Array.isArray(response.suggestions) ? response.suggestions.filter((item): item is string => typeof item === "string") : [],
    };
  }
  private async existingAnswer(sessionId: string, clientMessageId: string): Promise<StoredAnswer | null> {
    const result = await this.db.query<{ id: string; content: string; structured_data: Record<string, unknown> }>(
      `SELECT answer.id::text, answer.content, answer.structured_data
       FROM sababuka.assistant_messages question
       JOIN sababuka.assistant_messages answer
         ON answer.session_id = question.session_id
        AND answer.message_role = 'assistant'
        AND answer.structured_data->>'user_message_id' = question.id::text
       WHERE question.session_id = $1 AND question.client_message_id = $2
       LIMIT 1`, [sessionId, clientMessageId],
    );
    return result.rows[0] ? this.storedAnswer(result.rows[0].id, result.rows[0].content, result.rows[0].structured_data) : null;
  }
  async ask(auth: AuthContext, sessionId: string, question: string, clientMessageId: string, audit: AuditContext) {
    await this.ensureEnabled();
    const session = await this.db.query(`SELECT id FROM sababuka.assistant_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'`, [sessionId, auth.user.id]);
    if (!session.rows[0]) throw new ApiError(404, "NOT_FOUND", "Sesi asisten tidak ditemukan atau sudah ditutup.");
    const duplicate = await this.existingAnswer(sessionId, clientMessageId);
    if (duplicate) return duplicate;
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
      insightReply.answer = plainDash(insightReply.answer);
      const citations = insightReply.sources.map((entry) => ({ publication_item_id: entry.label, label: entry.label, indicator: entry.indicator, period: String(entry.year), organization: "", source: entry.source, indicator_id: entry.indicator_id, source_url: entry.source_url }));
      const client = await this.db.connect();
      let replied: { id: string };
      try {
        await client.query("BEGIN");
        const asked = await client.query<{ id: string }>(`INSERT INTO sababuka.assistant_messages (session_id, message_role, content, structured_data, request_id, client_message_id) VALUES ($1, 'user', $2, '{}'::jsonb, $3, $4) ON CONFLICT (session_id, client_message_id) WHERE client_message_id IS NOT NULL DO NOTHING RETURNING id::text`, [sessionId, question, audit.requestId, clientMessageId]);
        if (!asked.rows[0]) {
          await client.query("ROLLBACK");
          const existing = await this.existingAnswer(sessionId, clientMessageId);
          if (existing) return existing;
          throw new ApiError(409, "CONFLICT", "Pertanyaan yang sama masih diproses. Coba lagi beberapa saat.");
        }
        const response = { sufficiency: insightReply.sufficiency, citations, visuals: insightReply.visuals ?? [], suggestions: insightReply.suggestions ?? [] };
        const inserted = await client.query<{ id: string }>(`INSERT INTO sababuka.assistant_messages (session_id, message_role, content, model_name, structured_data, request_id) VALUES ($1, 'assistant', $2, $5, $3::jsonb, $4) RETURNING id::text`, [sessionId, insightReply.answer, JSON.stringify({ sufficiency: insightReply.sufficiency, retrieval: "trend_engine", narrated_by: agent?.model ?? narrated?.model ?? "rules", answer_mode: agent ? "agent" : "aturan", agent_failure: failure, attempts, tools: agent?.toolsUsed ?? [], user_message_id: asked.rows[0].id, sources: insightReply.sources, response }), audit.requestId, agent?.model ?? narrated?.model ?? "sababuka-insight-v1"]);
        replied = inserted.rows[0]!;
        await client.query(`UPDATE sababuka.assistant_sessions SET title = $2 WHERE id = $1 AND (title IS NULL OR title = '' OR title = 'Tanya Sababuka')`, [sessionId, sessionTitle(question)]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally { client.release(); }
      await recordAudit(this.db, { ...audit, eventType: "assistant.answer_generated", entityType: "assistant_session", entityId: sessionId, metadata: { sufficiency: insightReply.sufficiency, citation_count: insightReply.sources.length, engine: agent ? "agent" : "trend_engine", agent_failure: failure, agent_failure_detail: failureDetail, attempts } });
      return { message_id: replied.id, answer: insightReply.answer, citations, sufficiency: insightReply.sufficiency, visuals: insightReply.visuals, suggestions: insightReply.suggestions };
    }
  }
}
