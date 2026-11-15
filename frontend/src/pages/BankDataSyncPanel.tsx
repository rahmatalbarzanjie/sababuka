import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { Badge, ErrorState, formatDate, Notice, Spinner, useAsync } from "../components";

interface Counter { checked: number; updated: number; added: number; unchanged: number; failed: number }
interface SyncRun { id: string; trigger: string; started_at: string; finished_at: string | null; status: string; summary: { bps?: Counter; satudata?: Counter; error?: string } }
interface SyncFailure { source_code: string; external_id: string; detail: string | null; last_checked_at: string }
interface SyncStatus { interval_hours: number; enabled: boolean; running: boolean; runs: SyncRun[]; failures?: SyncFailure[] }

const statusLabel: Record<string, string> = { running: "Berjalan", success: "Berhasil", partial: "Sebagian gagal", failed: "Gagal" };
const tone = (status: string) => status === "success" ? "success" : status === "running" ? "neutral" : "warning";

/** Status sinkron otomatis Seri Data dari BPS Kapuas dalam Angka dan Satu Data Kapuas. */
export function BankDataSyncPanel({ canManage }: { canManage: boolean }) {
  const status = useAsync(() => api<SyncStatus>("/connectors/bank-data/sync"), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const running = status.data?.running ?? false;
  useEffect(() => { if (!running) return; const timer = setInterval(status.reload, 15_000); return () => clearInterval(timer); }, [running, status.reload]);

  const start = async () => {
    setBusy(true); setMessage(null);
    try {
      const result = await api<{ started: boolean }>("/connectors/bank-data/sync", { method: "POST", mutation: true });
      setMessage(result.started ? { tone: "success", text: "Sinkron dimulai di latar belakang. Halaman ini diperbarui otomatis; proses dapat memakan waktu puluhan menit." } : { tone: "warning", text: "Sinkron sedang berjalan." });
      status.reload();
    } catch (cause) { setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Sinkron gagal dimulai." }); }
    finally { setBusy(false); }
  };

  const last = status.data?.runs[0];
  const total = (key: keyof Counter) => (last?.summary.bps?.[key] ?? 0) + (last?.summary.satudata?.[key] ?? 0);
  return <section className="panel connector-panel" aria-labelledby="bank-sync-title">
    <header className="panel-heading"><div><h2 id="bank-sync-title">Sinkron otomatis Seri Data</h2><p>{status.data?.enabled ? `Sistem memeriksa BPS Kapuas dalam Angka dan Satu Data Kapuas tiap ${status.data.interval_hours} jam, lalu menambahkan data tahun baru dan seri baru. Nilai yang sudah ada tidak ditimpa.` : "Sinkron otomatis nonaktif di lingkungan ini (BANK_DATA_SYNC_HOURS=0)."}</p></div><RefreshCw aria-hidden /></header>
    <div className="panel-body">
    {message && <Notice tone={message.tone}>{message.text}</Notice>}
    {status.loading ? <div className="panel-loading"><Spinner /></div> : status.error ? <ErrorState title="Status sinkron belum dapat dimuat" onRetry={status.reload}>{status.error}</ErrorState> : <>
      {last ? <p className="sync-status"><Badge tone={tone(last.status)}>{statusLabel[last.status] ?? last.status}</Badge> {last.finished_at ? `Selesai ${formatDate(last.finished_at)}` : `Dimulai ${formatDate(last.started_at)}`} · {total("added")} seri baru, {total("updated")} diperbarui, {total("unchanged")} tanpa perubahan, {total("failed")} gagal{last.summary.error ? ` · ${last.summary.error}` : ""}</p> : <p>Belum ada sinkron yang berjalan.</p>}
      {!!status.data?.failures?.length && <details className="sync-failures"><summary>{status.data.failures.length} sumber gagal diperiksa</summary><ul>{status.data.failures.map((item) => <li key={`${item.source_code}:${item.external_id}`}><strong>{item.source_code === "BPS_KAPUAS" ? "BPS" : "Satu Data"} {item.external_id}</strong>: {item.detail ?? "tanpa keterangan"}</li>)}</ul></details>}
      {canManage && <div className="panel-actions flush"><button className="button primary" disabled={busy || running} onClick={() => void start()}><RefreshCw aria-hidden />{running ? "Sinkron berjalan…" : "Sinkronkan sekarang"}</button></div>}
    </>}
    </div>
  </section>;
}
