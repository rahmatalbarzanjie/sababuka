import { CheckCircle2, Database, Link2, Plus, Settings2, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { AppLink } from "../components/AppLink";
import { Badge, EmptyState, ErrorState, formatDate, Modal, Notice, Spinner, useAsync } from "../components";
import { toast } from "../toast";
import type { Indicator, Organization, PageResponse } from "../types";
import { BankDataImportPanel } from "./BankDataImportPanel";
import { ResponsibleOpdPanel } from "./ResponsibleOpdPanel";
import { SeriesLinksPanel } from "./SeriesLinksPanel";

type ConnectorKind = "api_json" | "ckan" | "bps" | "csv_url" | "file_upload" | "database_view" | "html_scrape" | "manual";
type AuthType = "none" | "api_key" | "bearer" | "basic" | "oauth2";
type DataFormat = "json" | "csv" | "xlsx" | "html" | "database" | "manual";
interface IntegrationProfile { id: string; organization_id: string; organization_name: string | null; code: string; name: string; connector_kind: ConnectorKind; auth_type: AuthType; data_format: DataFormat; base_url: string | null; endpoint_path: string | null; data_path: string | null; notes: string | null; status: string; mapping_count: number; last_synced_at: string | null }
interface IntegrationForm { organization_id: string; code: string; name: string; connector_kind: ConnectorKind; base_url: string; endpoint_path: string; auth_type: AuthType; data_format: DataFormat; data_path: string; notes: string }
interface Mapping { id: string; indicator_code: string; indicator_name: string; source_code: string; external_dataset_id: string; status: string; updated_at: string }
interface ImportHistory { id: string; event_type: string; entity_type: string; metadata: { source?: string; variable_id?: string; package_id?: string; title?: string; indicators?: number; observations?: number; district_observations?: number; reason?: string }; occurred_at: string; actor_name: string }

const kindLabel: Record<ConnectorKind, string> = { api_json: "API JSON", ckan: "Portal CKAN", bps: "BPS", csv_url: "CSV melalui URL", file_upload: "Unggah file", database_view: "Database atau view", html_scrape: "Website", manual: "Manual" };

export function ConnectorsPage() {
  const { user } = useAuth();
  const isDeveloper = user?.roles.some((role) => role.code === "superadmin" && role.scope_type === "global") ?? false;
  const canMap = user?.permissions.includes("connector.map") ?? false;
  const integrations = useAsync(() => isDeveloper ? api<{ data: IntegrationProfile[] }>("/connectors/integrations") : Promise.resolve({ data: [] }), [isDeveloper]);
  const organizations = useAsync(() => isDeveloper ? api<PageResponse<Organization>>("/organizations?page_size=100&active=true&sort_by=name&sort_order=asc") : Promise.resolve(null), [isDeveloper]);
  const indicators = useAsync(() => canMap ? api<PageResponse<Indicator>>("/indicators?page=1&page_size=100&sort_by=name&sort_order=asc") : Promise.resolve(null), [canMap]);
  const mappings = useAsync(() => canMap ? api<{ data: Mapping[] }>("/connectors/mappings") : Promise.resolve({ data: [] }), [canMap]);
  const history = useAsync(() => isDeveloper ? api<{ data: ImportHistory[] }>("/connectors/bank-data/import-history") : Promise.resolve({ data: [] }), [isDeveloper]);
  const [editing, setEditing] = useState<IntegrationProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mappingBusy, setMappingBusy] = useState<string | null>(null);

  const transition = async (mapping: Mapping, action: "approve" | "retire") => {
    setMappingBusy(mapping.id);
    try {
      await api(`/connectors/mappings/${mapping.id}/actions/${action}`, { method: "POST", mutation: true });
      toast.success(action === "approve" ? "Pemetaan disetujui" : "Pemetaan dihentikan", mapping.indicator_name);
      mappings.reload();
    } catch (cause) { toast.error("Tindakan gagal", cause instanceof Error ? cause.message : "Pemetaan belum dapat diperbarui."); }
    finally { setMappingBusy(null); }
  };

  if (isDeveloper) return <div className="connector-role-page">
    <Notice tone="info">Developer hanya mengatur sumber teknis dan menjalankan impor manual. Pemetaan Seri Data ke indikator RPJMD dilakukan BAPPERIDA.</Notice>
    <section className="panel connector-panel">
      <header className="panel-heading"><div><h2>Sumber data</h2><p>Daftarkan alamat dan format sumber. Sistem tidak menjalankan jadwal atau impor otomatis.</p></div><button className="button primary" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus />Tambah sumber</button></header>
      {integrations.loading ? <div className="panel-loading"><Spinner /></div> : integrations.error ? <ErrorState title="Sumber belum dapat dimuat" onRetry={integrations.reload}>{integrations.error}</ErrorState> : !integrations.data?.data.length ? <EmptyState title="Belum ada sumber tambahan">Tambahkan profil sumber bila data berasal dari sistem OPD atau layanan eksternal.</EmptyState> : <div className="source-profile-list">{integrations.data.data.map((item) => <article key={item.id}><span className="table-icon"><Database /></span><div><strong>{item.name}</strong><small>{item.organization_name ?? "Lintas instansi"} · {kindLabel[item.connector_kind]}</small><p>{item.base_url ?? "Sumber tanpa alamat daring"}</p></div><Badge tone={item.status === "error" ? "danger" : "neutral"}>Manual</Badge><button className="button secondary compact" onClick={() => { setEditing(item); setModalOpen(true); }}><Settings2 />Atur</button></article>)}</div>}
      <p className="muted-text">API key BPS dan rahasia konektor dikelola pada <AppLink to="/admin/system">Konfigurasi Sistem</AppLink>.</p>
    </section>
    <BankDataImportPanel />
    <ImportHistoryPanel state={history} />
    {modalOpen && organizations.data && <IntegrationModal organizations={organizations.data.data} initial={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); integrations.reload(); }} />}
  </div>;

  if (canMap) return <div className="connector-role-page">
    <Notice tone="info">BAPPERIDA menetapkan hubungan Seri Data, indikator RPJMD, serta OPD utama dan pendukung. Impor dan pengaturan konektor tetap dikerjakan Developer.</Notice>
    <ResponsibleOpdPanel />
    <SeriesLinksPanel indicators={indicators.data?.data ?? []} />
    <section className="panel connector-panel">
      <header className="panel-heading"><div><h2>Kandidat pemetaan teknis</h2><p>Periksa kandidat lama yang menghubungkan dataset sumber ke indikator. Impor hanya dijalankan Developer dari katalog manual.</p></div><Link2 /></header>
      {mappings.loading ? <div className="panel-loading"><Spinner /></div> : mappings.error ? <ErrorState title="Pemetaan belum dapat dimuat" onRetry={mappings.reload}>{mappings.error}</ErrorState> : !mappings.data?.data.length ? <EmptyState title="Belum ada kandidat pemetaan">Gunakan Tautan Seri Data untuk menghubungkan data konteks ke indikator RPJMD.</EmptyState> : <div className="table-scroll"><table><thead><tr><th>Indikator</th><th>Sumber</th><th>Status</th><th>Diperbarui</th><th>Tindakan</th></tr></thead><tbody>{mappings.data.data.map((item) => <tr key={item.id}><td><strong>{item.indicator_name}</strong><small>{item.indicator_code}</small></td><td>{item.source_code}<small>{item.external_dataset_id}</small></td><td><Badge tone={item.status === "active" ? "success" : item.status === "draft" ? "warning" : "neutral"}>{item.status === "draft" ? "Kandidat" : item.status === "approved" ? "Disetujui" : item.status === "active" ? "Aktif" : item.status}</Badge></td><td>{formatDate(item.updated_at)}</td><td><span className="table-actions">{item.status === "draft" && <button className="button primary compact" disabled={mappingBusy !== null} onClick={() => void transition(item, "approve")}><CheckCircle2 />Setujui</button>}{item.status !== "retired" && <button className="button secondary compact" disabled={mappingBusy !== null} onClick={() => void transition(item, "retire")}>Hentikan</button>}</span></td></tr>)}</tbody></table></div>}
    </section>
  </div>;

  return <Notice tone="error">Anda tidak memiliki kewenangan untuk mengelola sumber atau pemetaan Seri Data.</Notice>;
}

function ImportHistoryPanel({ state }: { state: ReturnType<typeof useAsync<{ data: ImportHistory[] }>> }) {
  return <section className="panel connector-panel"><header className="panel-heading"><div><h2>Riwayat impor manual</h2><p>Catatan ini berasal dari audit sistem dan tidak dapat diubah.</p></div><ShieldCheck /></header>
    {state.loading ? <div className="panel-loading"><Spinner /></div> : state.error ? <ErrorState title="Riwayat belum dapat dimuat" onRetry={state.reload}>{state.error}</ErrorState> : !state.data?.data.length ? <EmptyState title="Belum ada impor manual">Riwayat akan muncul setelah Developer mengimpor atau memperbarui Seri Data.</EmptyState> : <div className="table-scroll"><table><thead><tr><th>Waktu</th><th>Sumber</th><th>Data</th><th>Hasil</th><th>Pelaksana</th></tr></thead><tbody>{state.data.data.map((item) => <tr key={item.id}><td>{formatDate(item.occurred_at)}</td><td>{item.metadata.source ?? (item.entity_type === "bps_variable" ? "BPS" : "Satu Data")}</td><td><strong>{item.metadata.title ?? item.metadata.variable_id ?? item.metadata.package_id ?? "Data sumber"}</strong></td><td>{item.event_type.endsWith("failed") ? <Badge tone="danger">Gagal</Badge> : <><Badge tone="success">Berhasil</Badge><small>{item.metadata.indicators ?? 0} seri · {(item.metadata.observations ?? 0).toLocaleString("id-ID")} nilai</small></>}</td><td>{item.actor_name}</td></tr>)}</tbody></table></div>}
  </section>;
}

function IntegrationModal({ organizations, initial, onClose, onSaved }: { organizations: Organization[]; initial: IntegrationProfile | null; onClose(): void; onSaved(): void }) {
  const [form, setForm] = useState<IntegrationForm>({ organization_id: initial?.organization_id ?? organizations[0]?.id ?? "", code: initial?.code ?? "", name: initial?.name ?? "", connector_kind: initial?.connector_kind ?? "api_json", base_url: initial?.base_url ?? "", endpoint_path: initial?.endpoint_path ?? "", auth_type: initial?.auth_type ?? "none", data_format: initial?.data_format ?? "json", data_path: initial?.data_path ?? "", notes: initial?.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = <K extends keyof IntegrationForm>(key: K, value: IntegrationForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const payload = { ...form, code: form.code.trim().toUpperCase().replace(/\s+/gu, "_"), base_url: form.base_url.trim() || null, endpoint_path: form.endpoint_path.trim() || null, data_path: form.data_path.trim() || null, notes: form.notes.trim() || null };
      await api(initial ? `/connectors/integrations/${initial.id}` : "/connectors/integrations", { method: initial ? "PUT" : "POST", mutation: true, body: jsonBody(payload) });
      toast.success("Sumber disimpan", form.name); onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sumber belum dapat disimpan."); }
    finally { setBusy(false); }
  };
  return <Modal title={initial ? "Atur sumber data" : "Tambah sumber data"} onClose={onClose} wide>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}>
    <div className="form-grid"><label className="field"><span>Instansi pemilik</span><select value={form.organization_id} onChange={(event) => update("organization_id", event.target.value)} required><option value="">Pilih instansi</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Nama sumber</span><input value={form.name} onChange={(event) => update("name", event.target.value)} required /></label><label className="field"><span>Kode sumber</span><input value={form.code} disabled={Boolean(initial)} onChange={(event) => update("code", event.target.value.toUpperCase().replace(/\s+/gu, "_"))} required /></label><label className="field"><span>Jenis konektor</span><select value={form.connector_kind} onChange={(event) => update("connector_kind", event.target.value as ConnectorKind)}>{Object.entries(kindLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field connector-wide"><span>Alamat sumber (opsional)</span><input type="url" value={form.base_url} onChange={(event) => update("base_url", event.target.value)} /></label><label className="field"><span>Path endpoint</span><input value={form.endpoint_path} onChange={(event) => update("endpoint_path", event.target.value)} /></label><label className="field"><span>Lokasi data</span><input value={form.data_path} onChange={(event) => update("data_path", event.target.value)} /></label><label className="field"><span>Format</span><select value={form.data_format} onChange={(event) => update("data_format", event.target.value as DataFormat)}><option value="json">JSON</option><option value="csv">CSV</option><option value="xlsx">Excel</option><option value="html">HTML</option><option value="database">Database</option><option value="manual">Manual</option></select></label><label className="field"><span>Autentikasi</span><select value={form.auth_type} onChange={(event) => update("auth_type", event.target.value as AuthType)}><option value="none">Tanpa kredensial</option><option value="api_key">API key</option><option value="bearer">Bearer token</option><option value="basic">Username dan kata sandi</option><option value="oauth2">OAuth 2.0</option></select></label></div>
    <label className="field"><span>Catatan teknis</span><textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} /></label>
    <Notice tone="info">Semua sumber berjalan manual. Developer memilih data, memeriksa pratinjau, lalu menjalankan impor.</Notice>
    <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Batal</button><button className="button primary" disabled={busy}>{busy ? "Menyimpan..." : "Simpan sumber"}</button></footer>
  </form></Modal>;
}
