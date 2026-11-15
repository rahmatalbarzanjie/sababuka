import type { Database } from "../database.js";
import { ApiError } from "../errors.js";
import type { AppConfig } from "../config.js";
import { decryptSecret, encryptSecret, maskSecret } from "../security/secrets.js";
import type { AuthContext } from "../types/auth.js";
import { recordAudit, type AuditContext } from "./audit-service.js";

const SECRET_CODE = "ANTHROPIC_API_KEY";
const API_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_MODEL = "claude-sonnet-5-5";

const SYSTEM_PROMPT = `Anda adalah Sababuka, asisten data Bupati Kapuas. Jawab dalam bahasa Indonesia yang jelas, ringkas, dan hormat (maksimal 160 kata).
Aturan ketat:
1. Gunakan HANYA angka dan fakta pada bagian FAKTA. Salin angka persis seperti tertulis. Jangan menambah angka, penyebab, atau kejadian yang tidak ada di FAKTA.
2. Jika FAKTA tidak cukup untuk menjawab, katakan terus terang apa yang belum tersedia.
3. Sebut OPD penanggung jawab dan kecamatan terdampak bila ada di FAKTA, lalu beri satu atau dua langkah tindak lanjut yang konkret untuk Bupati.
4. Jangan menyebut kata "JSON", "FAKTA", atau istilah teknis sistem. Jangan memakai tabel. Gunakan paragraf pendek atau daftar singkat.`;

interface SecretRow { encrypted_secret: string; masked_hint: string | null; last_tested_at: string | null; last_test_status: string | null; last_test_error: string | null }

export interface ToolDefinition { name: string; description: string; input_schema: Record<string, unknown> }
export interface ContentBlock { type: string; text?: string; id?: string; name?: string; input?: unknown }

/** Angka pada teks (selain tahun dan bilangan kecil) yang tidak muncul pada bukti. Kosong = semua angka berdasar data. */
export function ungroundedNumbers(answer: string, facts: string): string[] {
  const canon = (value: string) => value.replace(/\./gu, "").replace(",", ".").replace(/^0+(?=\d)/u, "");
  const known = new Set((facts.match(/\d[\d.,]*/gu) ?? []).map((token) => canon(token.replace(/[.,]$/u, ""))));
  const bad: string[] = [];
  for (const raw of answer.match(/\d[\d.,]*/gu) ?? []) {
    const token = canon(raw.replace(/[.,]$/u, ""));
    const value = Number(token);
    if (!Number.isFinite(value) || (Number.isInteger(value) && (value <= 12 || (value >= 1990 && value <= 2040)))) continue;
    if (!known.has(token)) bad.push(raw.replace(/[.,]$/u, ""));
  }
  return [...new Set(bad)];
}

export function numbersGrounded(answer: string, facts: string): boolean {
  return ungroundedNumbers(answer, facts).length === 0;
}

export class LlmService {
  constructor(private readonly db: Database, private readonly config?: AppConfig) {}

  private async row(): Promise<SecretRow | null> {
    const result = await this.db.query<SecretRow>(`SELECT encrypted_secret, masked_hint, last_tested_at::text, last_test_status, last_test_error FROM sababuka.system_secrets WHERE code = $1`, [SECRET_CODE]);
    return result.rows[0] ?? null;
  }

  private async apiKey(): Promise<string | null> {
    const row = await this.row();
    if (row && this.config?.connectorEncryptionKey) {
      try { return decryptSecret(row.encrypted_secret, this.config.connectorEncryptionKey); } catch { /* jatuh ke environment */ }
    }
    return process.env.ANTHROPIC_API_KEY?.trim() || null;
  }

  private model() { return process.env.LLM_MODEL?.trim() || DEFAULT_MODEL; }
  modelName() { return this.model(); }
  async available(): Promise<boolean> { return Boolean(await this.apiKey()); }

  /** Satu putaran percakapan dengan alat (tool use). */
  async converse(system: string, messages: Array<{ role: "user" | "assistant"; content: unknown }>, tools: ToolDefinition[], maxTokens: number): Promise<{ content: ContentBlock[]; stop_reason: string }> {
    const key = await this.apiKey();
    if (!key) throw new Error("Kunci API belum dikonfigurasi.");
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: this.model(), max_tokens: maxTokens, system, tools, messages }),
      signal: AbortSignal.timeout(40_000),
    });
    const payload = await response.json().catch(() => ({})) as { content?: ContentBlock[]; stop_reason?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message?.replaceAll(key, "***").slice(0, 200) ?? `HTTP ${response.status}`);
    return { content: payload.content ?? [], stop_reason: payload.stop_reason ?? "end_turn" };
  }

  async status() {
    const row = await this.row();
    const env = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    return {
      configured: Boolean(row || env),
      storage: row ? "encrypted_database" : env ? "environment" : "none",
      masked: row?.masked_hint ?? maskSecret(process.env.ANTHROPIC_API_KEY),
      model: this.model(),
      master_key_configured: Boolean(this.config?.connectorEncryptionKey),
      last_tested_at: row?.last_tested_at ?? null,
      last_test_status: row?.last_test_status ?? (env ? "not_tested" : "not_configured"),
      last_test_error: row?.last_test_error ?? null,
    };
  }

  private async call(key: string, system: string, user: string, maxTokens: number): Promise<string> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: this.model(), max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      signal: AbortSignal.timeout(25_000),
    });
    const payload = await response.json().catch(() => ({})) as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message?.replaceAll(key, "***").slice(0, 200) ?? `HTTP ${response.status}`);
    return (payload.content ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("").trim();
  }

  async save(auth: AuthContext, value: string, audit: AuditContext) {
    if (!this.config?.connectorEncryptionKey) throw new ApiError(503, "CONFIGURATION_ERROR", "Master key belum dikonfigurasi. Kunci tidak disimpan.");
    const key = value.trim();
    if (key.length < 20 || key.length > 400) throw new ApiError(400, "VALIDATION_ERROR", "Kunci API tidak valid.");
    let status = "connected"; let error: string | null = null;
    try { await this.call(key, "Balas dengan satu kata: OK", "Tes koneksi", 16); }
    catch (cause) { status = "failed"; error = cause instanceof Error ? cause.message : "Gagal terhubung."; }
    await this.db.query(
      `INSERT INTO sababuka.system_secrets (code, encrypted_secret, masked_hint, last_tested_at, last_test_status, last_test_error, updated_by) VALUES ($1,$2,$3,now(),$4,$5,$6)
       ON CONFLICT (code) DO UPDATE SET encrypted_secret = EXCLUDED.encrypted_secret, masked_hint = EXCLUDED.masked_hint, last_tested_at = now(), last_test_status = EXCLUDED.last_test_status, last_test_error = EXCLUDED.last_test_error, updated_by = EXCLUDED.updated_by, updated_at = now()`,
      [SECRET_CODE, encryptSecret(key, this.config.connectorEncryptionKey), maskSecret(key), status, error, auth.user.id],
    );
    await recordAudit(this.db, { ...audit, eventType: "assistant.llm_key_saved", entityType: "system_secret", entityId: null, afterData: { configured: true, test_status: status } });
    return this.status();
  }

  async clear(audit: AuditContext) {
    await this.db.query(`DELETE FROM sababuka.system_secrets WHERE code = $1`, [SECRET_CODE]);
    await recordAudit(this.db, { ...audit, eventType: "assistant.llm_key_removed", entityType: "system_secret", entityId: null, afterData: { configured: false } });
    return this.status();
  }

  /** Susun jawaban berbahasa alami dari fakta hasil hitung. Mengembalikan null (dan jawaban aturan dipakai) bila model tidak tersedia atau memuat angka di luar fakta. */
  async narrate(question: string, facts: unknown, draft: string): Promise<{ text: string; model: string } | null> {
    const key = await this.apiKey();
    if (!key) return null;
    const factText = JSON.stringify(facts);
    try {
      const text = await this.call(key, SYSTEM_PROMPT, `PERTANYAAN:\n${question}\n\nFAKTA:\n${factText}\n\nDRAF JAWABAN (boleh dipoles, angka harus tetap):\n${draft}`, 700);
      if (!text || !numbersGrounded(text, `${factText} ${draft}`)) return null;
      return { text, model: this.model() };
    } catch { return null; }
  }
}
