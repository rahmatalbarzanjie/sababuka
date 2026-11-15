import { randomUUID } from "node:crypto";
import type { Database } from "../database.js";
import type { AppConfig } from "../config.js";
import type { AuthContext } from "../types/auth.js";
import type { AuditContext } from "./audit-service.js";
import { ConnectorService } from "./connector-service.js";
import { notifyRole } from "./notification-service.js";

interface Counter { checked: number; updated: number; added: number; unchanged: number; failed: number }
export interface SyncSummary { bps: Counter; satudata: Counter; error?: string }
interface Actor { auth: AuthContext; audit: AuditContext }
type ImportResult = { status: string; reason?: string };

const empty = (): Counter => ({ checked: 0, updated: 0, added: 0, unchanged: 0, failed: 0 });
/** Item yang dicek kurang dari ini lalu dilewati, sehingga siklus yang terputus (restart) dilanjutkan, bukan diulang. */
const RECHECK_AFTER_HOURS = 12;
const STALE_RUN_HOURS = 4;

let running = false;

/** Sinkron otomatis Bank Data: mengambil data baru dari BPS Kapuas dalam Angka dan Satu Data Kapuas. */
export class BankDataSyncService {
  private readonly connectors: ConnectorService;
  constructor(private readonly db: Database, config: AppConfig, private readonly intervalHours: number) { this.connectors = new ConnectorService(db, config); }

  /** Dipanggil berkala oleh penjadwal; memulai siklus baru hanya bila siklus terakhir sudah lewat dari interval. */
  async tick(): Promise<void> {
    if (this.intervalHours <= 0 || running) return;
    const last = await this.db.query<{ due: boolean }>(
      `SELECT NOT EXISTS (SELECT 1 FROM sababuka.bank_data_sync_runs
        WHERE (status <> 'running' AND started_at > now() - make_interval(hours => $1))
           OR (status = 'running' AND started_at > now() - make_interval(hours => $2))) AS due`,
      [this.intervalHours, STALE_RUN_HOURS],
    );
    if (last.rows[0]?.due) await this.run("scheduler");
  }

  async status() {
    const runs = await this.db.query(`SELECT id::text, trigger, started_at::text, finished_at::text, status, summary FROM sababuka.bank_data_sync_runs ORDER BY started_at DESC LIMIT 5`);
    const failures = await this.db.query(`SELECT source_code, external_id, left(detail, 200) AS detail, last_checked_at::text FROM sababuka.bank_data_sync_items WHERE last_status = 'failed' ORDER BY last_checked_at DESC LIMIT 10`);
    return { interval_hours: this.intervalHours, enabled: this.intervalHours > 0, running, runs: runs.rows, failures: failures.rows };
  }

  /** Mulai siklus di latar belakang (tombol "Sinkronkan sekarang"). */
  startNow(actorId: string): { started: boolean } {
    if (running) return { started: false };
    void this.run("manual", actorId).catch(() => undefined);
    return { started: true };
  }

  private async actor(actorId?: string): Promise<Actor | null> {
    const id = actorId ?? (await this.db.query<{ id: string }>(
      `SELECT u.id::text AS id FROM sababuka.users u
       JOIN sababuka.user_role_assignments ura ON ura.user_id = u.id AND ura.starts_at <= now() AND (ura.ends_at IS NULL OR ura.ends_at > now())
       JOIN sababuka.roles r ON r.id = ura.role_id
       WHERE r.code = 'superadmin' AND u.status = 'active' ORDER BY u.created_at LIMIT 1`)).rows[0]?.id;
    if (!id) return null;
    const auth = { sessionId: "bank-data-sync", csrfTokenHash: Buffer.alloc(0), user: { id, email: "sync@sababuka.local", full_name: "Sinkron Otomatis Bank Data", mfa_required: false, must_change_password: false, roles: [], permissions: [] } } as unknown as AuthContext;
    return { auth, audit: { actorId: id, requestId: `bank-data-sync:${randomUUID()}`, ipAddress: null, userAgent: "SABABUKA bank data sync" } };
  }

  private async record(source: string, externalId: string, status: string, changed: boolean, remoteModified: string | null, detail: string | null) {
    await this.db.query(
      `INSERT INTO sababuka.bank_data_sync_items (source_code, external_id, remote_modified, last_checked_at, last_changed_at, last_status, detail)
       VALUES ($1,$2,$3,now(),CASE WHEN $4::boolean THEN now() END,$5,$6)
       ON CONFLICT (source_code, external_id) DO UPDATE SET
         remote_modified = COALESCE(EXCLUDED.remote_modified, sababuka.bank_data_sync_items.remote_modified),
         last_checked_at = now(),
         last_changed_at = CASE WHEN $4::boolean THEN now() ELSE sababuka.bank_data_sync_items.last_changed_at END,
         last_status = EXCLUDED.last_status, detail = EXCLUDED.detail`,
      [source, externalId, remoteModified, changed, status, detail?.slice(0, 300) ?? null],
    );
  }

  /** Item yang baru dicek (dan tidak gagal), beserta penanda ubah terakhir dari sumber. */
  private async recentlyChecked(source: string): Promise<Map<string, string | null>> {
    const rows = await this.db.query<{ external_id: string; remote_modified: string | null }>(
      `SELECT external_id, remote_modified FROM sababuka.bank_data_sync_items WHERE source_code = $1 AND last_checked_at > now() - make_interval(hours => $2) AND last_status <> 'failed'`,
      [source, RECHECK_AFTER_HOURS],
    );
    return new Map(rows.rows.map((row) => [row.external_id, row.remote_modified]));
  }

  private async everSeen(source: string, externalId: string): Promise<boolean> {
    return (await this.db.query(`SELECT 1 FROM sababuka.bank_data_sync_items WHERE source_code = $1 AND external_id = $2`, [source, externalId])).rows.length > 0;
  }

  private tally(counter: Counter, result: ImportResult, hadBefore: boolean): boolean {
    if (result.status === "failed") { counter.failed += 1; return false; }
    if (result.status === "imported") { if (hadBefore) counter.updated += 1; else counter.added += 1; return true; }
    counter.unchanged += 1;
    return false;
  }

  async run(trigger: "scheduler" | "manual", actorId?: string): Promise<SyncSummary | null> {
    if (running) return null;
    running = true;
    const summary: SyncSummary = { bps: empty(), satudata: empty() };
    const runId = (await this.db.query<{ id: string }>(`INSERT INTO sababuka.bank_data_sync_runs (trigger) VALUES ($1) RETURNING id::text`, [trigger])).rows[0]!.id;
    let status: "success" | "partial" | "failed" = "success";
    try {
      const actor = await this.actor(actorId);
      if (!actor) throw new Error("Akun Developer aktif untuk sinkron tidak ditemukan.");
      await this.syncSatuData(actor, summary);
      await this.syncBps(actor, summary);
      if (summary.bps.failed + summary.satudata.failed > 0) status = "partial";
    } catch (error) {
      status = "failed";
      summary.error = (error instanceof Error ? error.message : String(error)).slice(0, 300);
    } finally {
      await this.db.query(`UPDATE sababuka.bank_data_sync_runs SET status = $2, finished_at = now(), summary = $3::jsonb WHERE id = $1`, [runId, status, JSON.stringify(summary)]);
      running = false;
    }
    if (status !== "success") {
      await notifyRole(this.db, "superadmin", {
        type: "connector.bank_data_sync",
        title: status === "failed" ? "Sinkron Bank Data gagal" : "Sinkron Bank Data selesai dengan kendala",
        message: summary.error ?? `${summary.bps.failed + summary.satudata.failed} sumber gagal diperiksa. Buka Konektor untuk rinciannya.`,
        entityType: "bank_data_sync", entityId: runId,
      }).catch(() => undefined);
    }
    return summary;
  }

  private async syncSatuData(actor: Actor, summary: SyncSummary) {
    const packages = (await this.connectors.listSatuDataTablePackages()).data;
    const stored = await this.db.query<{ external_id: string; remote_modified: string | null }>(`SELECT external_id, remote_modified FROM sababuka.bank_data_sync_items WHERE source_code = 'SATUDATA_KAPUAS' AND last_status <> 'failed'`);
    const modifiedBefore = new Map(stored.rows.map((row) => [row.external_id, row.remote_modified]));
    for (const pkg of packages) {
      // Paket yang waktu ubahnya di Satu Data tidak berubah sejak pemeriksaan terakhir tidak diunduh ulang.
      if (pkg.modified && modifiedBefore.get(pkg.id) === pkg.modified) continue;
      summary.satudata.checked += 1;
      try {
        const had = await this.everSeen("SATUDATA_KAPUAS", pkg.id);
        const result = await this.connectors.importSatuDataPackage(actor.auth, pkg.id, actor.audit, true) as ImportResult;
        const changed = this.tally(summary.satudata, result, had);
        await this.record("SATUDATA_KAPUAS", pkg.id, result.status === "failed" ? "failed" : changed ? "changed" : "unchanged", changed, pkg.modified, result.reason ?? null);
      } catch (error) {
        summary.satudata.failed += 1;
        await this.record("SATUDATA_KAPUAS", pkg.id, "failed", false, null, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async syncBps(actor: Actor, summary: SyncSummary) {
    const seen = await this.recentlyChecked("BPS_KAPUAS");
    let pages = 1;
    for (let page = 1; page <= pages; page += 1) {
      const list = await this.connectors.searchBpsVariables("", page);
      pages = list.pages;
      for (const item of list.results) {
        if (seen.has(item.id)) continue;
        summary.bps.checked += 1;
        try {
          const had = await this.everSeen("BPS_KAPUAS", item.id);
          const result = await this.connectors.importBankVariable(actor.auth, item.id, actor.audit, true) as ImportResult;
          const changed = this.tally(summary.bps, result, had);
          await this.record("BPS_KAPUAS", item.id, result.status === "failed" ? "failed" : changed ? "changed" : "unchanged", changed, null, result.reason ?? null);
        } catch (error) {
          summary.bps.failed += 1;
          await this.record("BPS_KAPUAS", item.id, "failed", false, null, error instanceof Error ? error.message : String(error));
        }
      }
    }
  }
}
