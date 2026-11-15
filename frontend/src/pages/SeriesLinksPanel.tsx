import { Link2, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { api, jsonBody } from "../api";
import { Badge, EmptyState, ErrorState, Notice, Spinner, useAsync } from "../components";
import type { Indicator } from "../types";

interface SeriesLink { id: string; relation_type: string; notes: string | null; rpjmd_indicator_id: string; rpjmd_code: string; rpjmd_name: string; series_indicator_id: string; series_code: string; series_name: string; series_observations: number }
interface SeriesOption { id: string; code: string; name: string; category_name: string; observation_count: number }

const relationLabel: Record<string, string> = { primary: "Utama", supporting: "Pendukung", comparison: "Pembanding" };

/** Menautkan Seri Data (BPS/Satu Data) ke indikator RPJMD secara manual, hanya bila memang berkaitan. */
export function SeriesLinksPanel({ indicators }: { indicators: Indicator[] }) {
  const links = useAsync(() => api<{ data: SeriesLink[] }>("/connectors/series-links"), []);
  const [rpjmdId, setRpjmdId] = useState("");
  const [relation, setRelation] = useState("supporting");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SeriesOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const search = async () => {
    setSearching(true); setMessage(null);
    try { setOptions((await api<{ data: SeriesOption[] }>(`/connectors/series-links/search?q=${encodeURIComponent(query)}`)).data); }
    catch (cause) { setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Pencarian Seri Data gagal." }); }
    finally { setSearching(false); }
  };
  const link = async (series: SeriesOption) => {
    if (!rpjmdId) { setMessage({ tone: "error", text: "Pilih indikator RPJMD terlebih dahulu." }); return; }
    setBusy(series.id); setMessage(null);
    try {
      await api("/connectors/series-links", { method: "POST", mutation: true, body: jsonBody({ rpjmd_indicator_id: rpjmdId, series_indicator_id: series.id, relation_type: relation, notes: notes || null }) });
      setMessage({ tone: "success", text: `"${series.name}" ditautkan sebagai data ${relationLabel[relation]!.toLowerCase()}.` }); links.reload();
    } catch (cause) { setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Tautan gagal disimpan." }); }
    finally { setBusy(null); }
  };
  const remove = async (item: SeriesLink) => {
    setBusy(item.id); setMessage(null);
    try { await api(`/connectors/series-links/${item.id}`, { method: "DELETE", mutation: true }); setMessage({ tone: "success", text: "Tautan dilepas. Seri Data tetap tersimpan." }); links.reload(); }
    catch (cause) { setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Tautan gagal dilepas." }); }
    finally { setBusy(null); }
  };

  return <section className="panel connector-panel" aria-labelledby="series-links-title">
    <header className="panel-heading"><div><h2 id="series-links-title">Tautan Seri Data ke RPJMD</h2><p>Seri Data BPS dan Satu Data berdiri sendiri sebagai bank data. Tautkan ke indikator RPJMD hanya bila memang berkaitan, sebagai data utama, pendukung, atau pembanding. Seri tanpa tautan tetap dipakai untuk tren, peta, dan Tanya Sababuka.</p></div><Link2 aria-hidden /></header>
    <div className="panel-body">
    {message && <Notice tone={message.tone}>{message.text}</Notice>}
    <div className="form-grid link-form">
      <label>Indikator RPJMD<select value={rpjmdId} onChange={(event) => setRpjmdId(event.target.value)}><option value="">Pilih indikator…</option>{indicators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Jenis hubungan<select value={relation} onChange={(event) => setRelation(event.target.value)}><option value="primary">Utama</option><option value="supporting">Pendukung</option><option value="comparison">Pembanding</option></select></label>
      <label>Catatan (opsional)<input value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} /></label>
    </div>
    <form className="panel-actions flush link-search" onSubmit={(event) => { event.preventDefault(); void search(); }}>
      <label className="search-field"><Search aria-hidden /><input aria-label="Cari Seri Data" placeholder="Cari Seri Data, mis. kemiskinan" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <button className="button secondary" type="submit" disabled={searching || query.trim().length < 2}>{searching ? "Mencari…" : "Cari Seri Data"}</button>
    </form>
    {options.length > 0 && <div className="table-scroll"><table><thead><tr><th>Seri Data</th><th>Kelompok</th><th>Data</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{options.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.code}</small></td><td>{item.category_name.replace(/^Bank Data · /u, "")}</td><td>{item.observation_count}</td><td><button className="button secondary" disabled={busy !== null} onClick={() => void link(item)}>{busy === item.id ? "Menautkan…" : "Tautkan"}</button></td></tr>)}</tbody></table></div>}
    <h3 className="link-heading">Tautan yang ada</h3>
    {links.loading ? <div className="panel-loading"><Spinner /></div> : links.error ? <ErrorState title="Tautan belum dapat dimuat" onRetry={links.reload}>{links.error}</ErrorState> : !links.data?.data.length ? <EmptyState title="Belum ada tautan">Cari Seri Data lalu tautkan ke indikator RPJMD yang berkaitan.</EmptyState> :
      <div className="table-scroll"><table><thead><tr><th>Indikator RPJMD</th><th>Hubungan</th><th>Seri Data</th><th>Data</th><th><span className="sr-only">Aksi</span></th></tr></thead><tbody>{links.data.data.map((item) => <tr key={item.id}><td><strong>{item.rpjmd_name}</strong><small>{item.rpjmd_code}</small></td><td><Badge tone="neutral">{relationLabel[item.relation_type] ?? item.relation_type}</Badge></td><td>{item.series_name}{item.notes && <small>{item.notes}</small>}</td><td>{item.series_observations}</td><td><button className="button secondary" aria-label={`Lepas tautan ${item.series_name}`} disabled={busy !== null} onClick={() => void remove(item)}><Trash2 aria-hidden />Lepas</button></td></tr>)}</tbody></table></div>}
    </div>
  </section>;
}
