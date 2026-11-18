import { Download, Search } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import { Badge, EmptyState, ErrorState, formatDate, Modal, Notice, Spinner, useAsync } from "../components";
import { plain } from "../text";

type Source = "bps" | "satudata";
interface BpsItem { id: string; title: string; subject: string | null; unit: string | null; description: string }
interface BpsSearch { total: number; pages: number; page: number; results: BpsItem[] }
interface SdItem { id: string; title: string; organization: string; format: string; modified: string | null }
interface Existing { imported: boolean; series: number; observations: number; year_min: number | null; year_max: number | null; district_series: number }
interface Preview {
  source: "BPS" | "SATUDATA"; id: string; title: string; subject?: string | null; organization?: string | null; unit?: string | null; note: string | null;
  region_label?: string | null; modified?: string | null; page_url?: string; file_name?: string | null; file_size?: number | null; readable?: boolean; reason?: string | null;
  years: number[]; year_min: number | null; year_max: number | null; year_count: number; value_count: number; region_count: number; series_count: number; series_labels: string[];
  existing: Existing; newer_than_system: boolean; sample: Array<{ year: number; region: string | null; series: string | null; value: number | string | null; unit?: string | null }>;
}
interface ImportResult { status: string; reason?: string; indicators?: number; observations?: number; district_observations?: number; skipped?: number }

const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 });
const bytes = (value: number | null | undefined) => value == null ? "-" : value >= 1_048_576 ? `${(value / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
const titleCase = (value: string) => value.replace(/(^|s)S/gu, (match) => match.toUpperCase());
const statusText: Record<string, string> = { imported: "Berhasil diimpor", unchanged: "Tidak ada yang berubah", skipped: "Dilewati", failed: "Gagal" };

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div><span>{label}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

function ImportPreview({ source, id, title, onClose, onDone }: { source: Source; id: string; title: string; onClose(): void; onDone(): void }) {
  const preview = useAsync(() => api<Preview>(`/connectors/bank-data/${source === "bps" ? "bps" : "satudata"}/${encodeURIComponent(id)}/preview`), [source, id]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const data = preview.data;
  const run = async () => {
    if (!data) return;
    setBusy(true); setError("");
    try {
      setResult(await api<ImportResult>(`/connectors/bank-data/${source === "bps" ? "bps" : "satudata"}/${encodeURIComponent(id)}/import${data.existing.imported ? "?refresh=true" : ""}`, { method: "POST", mutation: true }));
      onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Impor gagal."); }
    finally { setBusy(false); }
  };
  const importable = Boolean(data) && data!.readable !== false && data!.value_count > 0;
  // Dirender ke body agar overlay tidak terpotong oleh panel induk yang memakai transform.
  return createPortal(<Modal title={`Impor: ${plain(title)}`} onClose={onClose} wide>
    {preview.loading ? <div className="panel-loading"><Spinner /><p className="muted">Membaca metadata dari sumber. Untuk tabel besar ini dapat memakan waktu puluhan detik.</p></div>
      : preview.error || !data ? <ErrorState title="Metadata sumber belum dapat dibaca" onRetry={preview.reload}>{preview.error}</ErrorState>
      : <div className="import-preview">
        {error && <Notice tone="error">{error}</Notice>}
        {result && <Notice tone={result.status === "failed" ? "error" : result.status === "imported" ? "success" : "warning"}><strong>{statusText[result.status] ?? result.status}.</strong>{" "}
          {result.status === "imported" ? `${result.indicators ?? 0} seri, ${(result.observations ?? 0).toLocaleString("id-ID")} nilai (${(result.district_observations ?? 0).toLocaleString("id-ID")} nilai kecamatan).` : result.reason ?? ""}</Notice>}
        {data.readable === false && <Notice tone="warning">Berkas belum dapat dibaca: {data.reason}</Notice>}
        <section><h3>Metadata sumber</h3>
          <div className="detail-grid">
            <Fact label="Sumber" value={data.source === "BPS" ? "BPS Kabupaten Kapuas" : "Satu Data Kabupaten Kapuas"} hint={`ID ${data.id.slice(0, 12)}`} />
            <Fact label={data.source === "BPS" ? "Subjek" : "OPD pemilik"} value={plain((data.source === "BPS" ? data.subject : data.organization) ?? "-")} />
            <Fact label="Satuan" value={plain(data.unit ?? "tidak tercantum")} />
            {data.source === "SATUDATA" && <Fact label="Terakhir diubah di sumber" value={data.modified ? formatDate(data.modified) : "-"} hint={data.file_name ? `${data.file_name} (${bytes(data.file_size)})` : undefined} />}
          </div></section>
        <section><h3>Isi data</h3>
          <div className="detail-grid">
            <Fact label="Tahun terlama" value={data.year_min ? String(data.year_min) : "-"} />
            <Fact label="Tahun terbaru" value={data.year_max ? String(data.year_max) : "-"} hint={data.year_count ? `${data.year_count} tahun berisi data` : undefined} />
            <Fact label="Jumlah nilai" value={data.value_count.toLocaleString("id-ID")} />
            <Fact label="Jumlah seri" value={data.series_count.toLocaleString("id-ID")} hint="indikator Bank Data yang dibuat" />
            <Fact label={data.region_label ? `Wilayah (${plain(data.region_label)})` : "Kecamatan"} value={data.region_count ? `${data.region_count} wilayah` : "Tingkat kabupaten"} />
          </div>
          {data.years.length > 0 && <p className="muted import-years">Tahun tersedia: {data.years.join(", ")}</p>}
          {data.series_labels.length > 0 && <p className="import-series"><span className="muted">Seri yang dibuat:</span> {data.series_labels.map((label) => <Badge key={label} tone="neutral">{label}</Badge>)}{data.series_count > data.series_labels.length ? ` dan ${data.series_count - data.series_labels.length} lainnya` : ""}</p>}
        </section>
        <section><h3>Status di sistem</h3>
          {data.existing.imported
            ? <><div className="detail-grid">
              <Fact label="Seri sudah ada" value={data.existing.series.toLocaleString("id-ID")} hint={`${data.existing.district_series} berdata kecamatan`} />
              <Fact label="Nilai tersimpan" value={data.existing.observations.toLocaleString("id-ID")} />
              <Fact label="Rentang tahun di sistem" value={data.existing.year_min ? `${data.existing.year_min} sampai ${data.existing.year_max}` : "-"} />
            </div>
              {data.newer_than_system ? <Notice tone="info">Sumber memiliki data sampai {data.year_max}, lebih baru dari sistem ({data.existing.year_max}). Impor ulang akan menambah tahun yang belum ada.</Notice>
                : <Notice tone="success">Sistem sudah memuat tahun terbaru sumber. Impor ulang hanya memperbarui nilai yang berubah.</Notice>}</>
            : <Notice tone="info">Belum ada di sistem. Impor akan langsung terbit ke dashboard dan peta dengan label "Bank Data · belum diverifikasi".</Notice>}
        </section>
        {data.note && <section><h3>Catatan sumber</h3><p className="muted">{plain(data.note)}</p></section>}
        {data.sample.length > 0 && <section><h3>Contoh nilai</h3><div className="table-scroll"><table className="all-table"><thead><tr><th>Tahun</th><th>Wilayah</th><th>Seri</th><th>Nilai</th></tr></thead>
          <tbody>{data.sample.map((row, index) => <tr key={index}><td>{row.year}</td><td>{titleCase(plain(row.region ?? "Kabupaten"))}</td><td>{plain(row.series ?? "-")}</td><td className="num">{typeof row.value === "number" ? number.format(row.value) : row.value ?? "-"}</td></tr>)}</tbody></table></div></section>}
        <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>{result ? "Tutup" : "Batal"}</button>
          {!result && <button type="button" className="button primary" disabled={busy || !importable} onClick={() => void run()}><Download aria-hidden />{busy ? "Mengimpor..." : data.existing.imported ? "Perbarui dengan impor ulang" : "Impor sekarang"}</button>}</footer>
      </div>}
  </Modal>, document.body);
}

/** Katalog impor Bank Data: Developer memilih satu variabel atau tabel, memeriksa metadatanya, lalu mengimpor secara manual. */
export function BankDataImportPanel() {
  const [source, setSource] = useState<Source>("bps");
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<{ source: Source; id: string; title: string } | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const bps = useAsync(() => source === "bps" ? api<BpsSearch>(`/connectors/bps/variables?q=${encodeURIComponent(submitted)}&page=${page}`) : Promise.resolve(null), [source, submitted, page]);
  const packages = useAsync(() => source === "satudata" ? api<{ data: SdItem[] }>("/connectors/bank-data/satudata/packages") : Promise.resolve(null), [source]);
  const needle = submitted.trim().toLowerCase();
  const sdRows = (packages.data?.data ?? []).filter((item) => !needle || `${item.title} ${item.organization}`.toLowerCase().includes(needle));
  const submit = () => { setSubmitted(query); setPage(1); };
  return <section className="connector-panel bank-import" aria-labelledby="bank-import-title">
    <header className="panel-heading"><div><h2 id="bank-import-title">Impor Bank Data</h2><p>Impor dilakukan manual oleh Developer. Pilih variabel atau tabel, periksa metadata dan cakupan tahunnya, lalu impor. Data langsung terbit berlabel "Bank Data · belum diverifikasi".</p></div></header>
    <div className="chip-row" role="group" aria-label="Sumber data">
      <button type="button" className={`chip${source === "bps" ? " active" : ""}`} aria-pressed={source === "bps"} onClick={() => { setSource("bps"); setPage(1); }}>BPS Kapuas dalam Angka</button>
      <button type="button" className={`chip${source === "satudata" ? " active" : ""}`} aria-pressed={source === "satudata"} onClick={() => setSource("satudata")}>Satu Data Kapuas</button>
    </div>
    <form className="search-field" onSubmit={(event) => { event.preventDefault(); submit(); }}><Search aria-hidden /><span className="sr-only">Cari</span><input type="search" value={query} placeholder={source === "bps" ? "Cari variabel BPS, misalnya penduduk atau padi" : "Cari tabel atau OPD"} onChange={(event) => setQuery(event.target.value)} /></form>
    {source === "bps" ? (bps.loading ? <div className="panel-loading"><Spinner /></div> : bps.error || !bps.data ? <ErrorState title="Katalog BPS belum dapat dimuat" onRetry={bps.reload}>{bps.error}</ErrorState>
      : !bps.data.results.length ? <EmptyState title="Tidak ada variabel yang cocok">Ubah kata pencarian.</EmptyState> : <>
        <div className="table-scroll"><table className="all-table"><thead><tr><th>Variabel</th><th>Subjek</th><th>Satuan</th><th /></tr></thead><tbody>
          {bps.data.results.map((item) => <tr key={item.id}><td><strong>{plain(item.title)}</strong><small>ID {item.id} · {plain(item.description).slice(0, 140)}</small></td><td>{plain(item.subject ?? "-")}</td><td>{plain(item.unit ?? "-")}</td>
            <td><button type="button" className="button secondary" onClick={() => setChosen({ source: "bps", id: item.id, title: item.title })}>Impor</button></td></tr>)}</tbody></table></div>
        <div className="panel-actions"><span className="muted">{bps.data.total.toLocaleString("id-ID")} variabel, halaman {bps.data.page} dari {bps.data.pages}</span>
          <button type="button" className="button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</button><button type="button" className="button secondary" disabled={page >= bps.data.pages} onClick={() => setPage(page + 1)}>Berikutnya</button></div></>)
      : (packages.loading ? <div className="panel-loading"><Spinner /></div> : packages.error || !packages.data ? <ErrorState title="Katalog Satu Data belum dapat dimuat" onRetry={packages.reload}>{packages.error}</ErrorState>
        : !sdRows.length ? <EmptyState title="Tidak ada tabel yang cocok">Ubah kata pencarian.</EmptyState> : <>
          <div className="table-scroll"><table className="all-table"><thead><tr><th>Tabel</th><th>OPD pemilik</th><th>Diubah</th><th /></tr></thead><tbody>
            {sdRows.map((item) => <tr key={item.id}><td><strong>{plain(item.title)}</strong><small>{item.format}</small></td><td>{plain(item.organization)}</td><td>{item.modified ? formatDate(item.modified) : "-"}</td>
              <td><button type="button" className="button secondary" onClick={() => setChosen({ source: "satudata", id: item.id, title: item.title })}>Impor</button></td></tr>)}</tbody></table></div>
          <p className="muted">{sdRows.length} dari {packages.data.data.length} tabel.</p></>)}
    {doneCount > 0 && <Notice tone="success">{doneCount} impor selesai pada sesi ini. Daftar seri di dashboard diperbarui otomatis.</Notice>}
    {chosen && <ImportPreview source={chosen.source} id={chosen.id} title={chosen.title} onClose={() => setChosen(null)} onDone={() => setDoneCount((count) => count + 1)} />}
  </section>;
}
