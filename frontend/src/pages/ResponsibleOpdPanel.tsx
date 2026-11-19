import { Search } from "lucide-react";
import { useState } from "react";
import { api, jsonBody } from "../api";
import { Badge, EmptyState, ErrorState, Modal, Notice, Spinner, useAsync } from "../components";
import { toast } from "../toast";
import { plain } from "../text";

interface OrgOption { id: string; code: string; label: string; name: string }
interface Row { indicator_id: string; code: string; name: string; origin_type: string; category_name: string; owner_label: string | null; primary_id: string | null; primary_label: string | null; support: Array<{ id: string; label: string }>; basis: string | null }
interface ListResponse { data: Row[]; meta: { page: number; page_size: number; total: number } }

const originLabel: Record<string, string> = { rpjmd_master: "Indikator RPJMD", opd_manual: "Usulan OPD", bank_data: "Bank Data" };
const basisLabel: Record<string, string> = { rpjmd_tabel_3_5: "Tabel 3.5 RPJMD", analisis_tusi: "Analisis tugas dan fungsi", manual: "Diatur manual", pemilik_data: "Pemilik data", kata_kunci: "Kata kunci nama", subjek: "Subjek", bawaan: "Bawaan" };

function EditModal({ row, organizations, onClose, onSaved }: { row: Row; organizations: OrgOption[]; onClose(): void; onSaved(): void }) {
  const [primary, setPrimary] = useState(row.primary_id ?? "");
  const [support, setSupport] = useState<Set<string>>(new Set(row.support.map((entry) => entry.id)));
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = organizations.filter((org) => org.id !== primary && `${org.label} ${org.name}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const toggle = (id: string) => setSupport((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const save = async () => {
    setBusy(true); setError("");
    try {
      await api(`/connectors/responsible-opd/${encodeURIComponent(row.indicator_id)}`, { method: "PUT", mutation: true, body: jsonBody({ primary_organization_id: primary || null, support_organization_ids: [...support].filter((id) => id !== primary) }) });
      toast.success("Relasi OPD disimpan", plain(row.name));
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Relasi OPD gagal disimpan."); }
    finally { setBusy(false); }
  };
  return <Modal title="Atur OPD indikator" onClose={onClose}>
    {error && <Notice tone="error">{error}</Notice>}
    <p><strong>{plain(row.name)}</strong><br /><small className="muted">{plain(row.category_name)} · {originLabel[row.origin_type] ?? row.origin_type}</small></p>
    {row.owner_label && <p className="muted">Pemilik pelaporan indikator: {row.owner_label}. Relasi ini dipakai untuk analisis dan rekomendasi, tidak mengubah pemilik pelaporan.</p>}
    <label className="field"><span>OPD penanggung jawab utama</span>
      <select value={primary} onChange={(event) => setPrimary(event.target.value)}><option value="">Belum ditetapkan</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.label}</option>)}</select>
    </label>
    <fieldset className="field"><legend>OPD pendukung ({support.size} dipilih)</legend>
      <label className="search-field"><Search aria-hidden /><input aria-label="Cari OPD" placeholder="Cari OPD" value={filter} onChange={(event) => setFilter(event.target.value)} /></label>
      <div className="opd-checklist" role="group" aria-label="OPD pendukung">
        {shown.map((org) => <label key={org.id} className="opd-check"><input type="checkbox" checked={support.has(org.id)} onChange={() => toggle(org.id)} /><span>{org.label}</span></label>)}
        {shown.length === 0 && <p className="muted">Tidak ada OPD yang cocok.</p>}
      </div>
    </fieldset>
    <footer className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Batal</button><button className="button primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? "Menyimpan…" : "Simpan"}</button></footer>
  </Modal>;
}

/** Mengatur OPD penanggung jawab utama dan pendukung tiap indikator. Dipakai analisis silang, dashboard, dan asisten. */
export function ResponsibleOpdPanel() {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [origin, setOrigin] = useState("rpjmd_master");
  const [unmapped, setUnmapped] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const orgs = useAsync(() => api<{ data: OrgOption[] }>("/connectors/responsible-opd/organizations"), []);
  const list = useAsync(() => api<ListResponse>(`/connectors/responsible-opd?origin=${origin}&page=${page}&page_size=25${submitted ? `&q=${encodeURIComponent(submitted)}` : ""}${unmapped ? "&unmapped=true" : ""}`), [origin, page, submitted, unmapped]);
  const total = list.data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 25));
  return <><section className="panel connector-panel" aria-labelledby="responsible-opd-title">
    <header className="panel-heading"><div><h2 id="responsible-opd-title">Relasi OPD per indikator</h2><p>Tetapkan OPD penanggung jawab utama dan OPD pendukung. Relasi ini dipakai analisis lintas OPD, rekomendasi, dan jawaban asisten; pemilik pelaporan indikator tidak berubah.</p></div></header>
    <form className="toolbar connector-toolbar" onSubmit={(event) => { event.preventDefault(); setPage(1); setSubmitted(q.trim()); }}>
      <label className="search-field"><Search aria-hidden /><input aria-label="Cari indikator" placeholder="Cari nama atau kode indikator" value={q} onChange={(event) => setQ(event.target.value)} /></label>
      <label className="field inline-field"><span className="sr-only">Asal indikator</span><select aria-label="Asal indikator" value={origin} onChange={(event) => { setPage(1); setOrigin(event.target.value); }}><option value="rpjmd_master">Indikator RPJMD</option><option value="opd_manual">Usulan OPD</option><option value="bank_data">Bank Data</option><option value="all">Semua</option></select></label>
      <label className="check-field"><input type="checkbox" checked={unmapped} onChange={(event) => { setPage(1); setUnmapped(event.target.checked); }} /><span>Belum ada OPD utama</span></label>
      <button className="button secondary" type="submit">Cari</button>
    </form>
    {list.loading ? <div className="panel-loading"><Spinner /></div> : list.error || !list.data ? <ErrorState title="Relasi OPD belum dapat dimuat" onRetry={list.reload}>{list.error}</ErrorState>
      : list.data.data.length === 0 ? <EmptyState title="Tidak ada indikator">Ubah kata kunci atau filter.</EmptyState>
      : <><div className="table-scroll"><table><thead><tr><th>Indikator</th><th>OPD utama</th><th>OPD pendukung</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>
        {list.data.data.map((row) => <tr key={row.indicator_id}>
          <td><strong>{plain(row.name)}</strong><br /><small className="muted">{plain(row.category_name)} · {originLabel[row.origin_type] ?? row.origin_type}</small></td>
          <td>{row.primary_label ?? <Badge tone="warning">Belum ditetapkan</Badge>}{row.basis && <><br /><small className="muted">{basisLabel[row.basis] ?? row.basis}</small></>}</td>
          <td>{row.support.length ? row.support.map((entry) => entry.label).join(", ") : <span className="muted">Belum ada</span>}</td>
          <td><button className="button secondary" type="button" onClick={() => setEditing(row)}>Atur</button></td>
        </tr>)}
      </tbody></table></div>
      <div className="toolbar"><span className="muted">{total} indikator · halaman {page} dari {pages}</span>
        <button className="button secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button>
        <button className="button secondary" type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Berikutnya</button></div></>}
  </section>
  {editing && orgs.data && <EditModal row={editing} organizations={orgs.data.data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}</>;
}
