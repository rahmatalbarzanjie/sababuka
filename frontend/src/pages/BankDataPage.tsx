import { ArrowLeft, Database, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api";
import { AppLink } from "../components/AppLink";
import { Badge, EmptyState, ErrorState, PageLoading, useAsync } from "../components";
import { indicatorPath, num } from "../insight";
import { plain } from "../text";

interface CatalogItem {
  indicator_id: string; code: string; name: string; sector: string; source_kind: "bps" | "satudata"; unit: string; source_name: string;
  first_year: number; last_year: number; years: number; observations: number; districts: number; latest_value: number | null; latest_year: number | null;
}
interface CatalogResponse {
  generated_at: string;
  summary: { series: number; observations: number; with_districts: number; max_districts: number; sectors: number; bps: number; satudata: number; first_year: number | null; last_year: number | null };
  items: CatalogItem[];
}

const PAGE_SIZE = 25;
const kindLabel = { bps: "BPS Kapuas dalam Angka", satudata: "Satu Data Kapuas" } as const;
const count = (value: number) => value.toLocaleString("id-ID");

function downloadCsv(items: CatalogItem[]) {
  const cell = (value: unknown) => `"${plain(String(value ?? "")).replace(/"/g, '""')}"`;
  const head = ["Indikator", "Sektor", "Sumber", "Satuan", "Tahun awal", "Tahun akhir", "Jumlah tahun", "Jumlah nilai", "Jumlah kecamatan", "Nilai terbaru", "Tahun nilai terbaru"];
  const lines = items.map((item) => [item.name, item.sector, kindLabel[item.source_kind], item.unit, item.first_year, item.last_year, item.years, item.observations, item.districts, item.latest_value, item.latest_year].map(cell).join(","));
  const blob = new Blob(["\uFEFF" + [head.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "bank-data-kapuas.csv"; link.click();
  URL.revokeObjectURL(url);
}

/** Katalog seluruh seri Bank Data Kapuas: bukti bahwa sistem menyimpan data dalam jumlah besar, dapat ditelusuri dan diunduh. */
export function BankDataPage() {
  const data = useAsync(() => api<CatalogResponse>("/executive/bank-data"), []);
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [districtOnly, setDistrictOnly] = useState(false);
  const [page, setPage] = useState(1);
  const items = data.data?.items;
  const sectors = useMemo(() => [...new Set((items ?? []).map((item) => item.sector))].sort((a, b) => a.localeCompare(b, "id")), [items]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...(items ?? [])].sort((x, y) => y.observations - x.observations || x.name.localeCompare(y.name, "id")).filter((item) => (!needle || `${item.name} ${item.sector}`.toLowerCase().includes(needle))
      && (!sectorFilter || item.sector === sectorFilter) && (!sourceFilter || item.source_kind === sourceFilter) && (!districtOnly || item.districts > 0));
  }, [items, query, sectorFilter, sourceFilter, districtOnly]);
  const back = <AppLink to="/dashboard" className="back-link"><ArrowLeft aria-hidden />Kembali ke Dashboard Eksekutif</AppLink>;
  if (data.loading) return <PageLoading />;
  if (data.error) return <ErrorState title="Bank Data belum dapat dimuat" onRetry={data.reload}>{data.error}</ErrorState>;
  const summary = data.data?.summary;
  if (!summary || !items?.length) return <div className="exec">{back}<EmptyState title="Belum ada Bank Data terbit">Seri akan tampil setelah sinkron Bank Data berjalan.</EmptyState></div>;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const stats: Array<[string, string, string]> = [
    [count(summary.series), "seri indikator", `${count(summary.bps)} BPS, ${count(summary.satudata)} Satu Data`],
    [count(summary.observations), "nilai data tersimpan", "angka per tahun dan per kecamatan"],
    [`${summary.first_year}-${summary.last_year}`, "rentang tahun", "data tahunan Kabupaten Kapuas"],
    [count(summary.with_districts), "seri dengan rincian kecamatan", `hingga ${summary.max_districts} kecamatan`],
    [count(summary.sectors), "sektor", "dikelompokkan sesuai kategori pembangunan"],
  ];
  return <div className="exec bank-data">
    {back}
    <header className="detail-head">
      <div><small>Bank Data Kabupaten Kapuas</small><h2><Database aria-hidden /> Seluruh data yang tersimpan</h2></div>
      <Badge tone="neutral">Bank Data · belum diverifikasi</Badge>
    </header>
    <p className="muted">Data BPS Kapuas dalam Angka dan Satu Data Kapuas yang telah masuk ke sistem. Seri ini menjadi konteks dan pembanding bagi indikator RPJMD; belum diverifikasi OPD maupun BAPPERIDA. Pilih satu seri untuk melihat grafik, tabulasi per tahun dan kecamatan, serta tautan sumbernya.</p>
    <ul className="bank-stats" aria-label="Ringkasan Bank Data">{stats.map(([value, label, note]) => <li key={label}><strong>{value}</strong><span>{label}</span><small>{note}</small></li>)}</ul>
    <section className="panel-card" aria-labelledby="katalog">
      <header className="card-head"><div><h2 id="katalog">Katalog seri data</h2><p>{count(filtered.length)} dari {count(items.length)} seri ditampilkan.</p></div>
        <button type="button" className="button secondary" onClick={() => downloadCsv(filtered)}><Download aria-hidden />Unduh CSV</button></header>
      <div className="bank-filters">
        <label className="bank-search"><Search aria-hidden /><span className="sr-only">Cari seri data</span><input type="search" placeholder="Cari nama indikator atau sektor" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
        <label><span className="sr-only">Sektor</span><select value={sectorFilter} onChange={(event) => { setSectorFilter(event.target.value); setPage(1); }}><option value="">Semua sektor</option>{sectors.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
        <label><span className="sr-only">Sumber</span><select value={sourceFilter} onChange={(event) => { setSourceFilter(event.target.value); setPage(1); }}><option value="">Semua sumber</option><option value="bps">{kindLabel.bps}</option><option value="satudata">{kindLabel.satudata}</option></select></label>
        <label className="bank-check"><input type="checkbox" checked={districtOnly} onChange={(event) => { setDistrictOnly(event.target.checked); setPage(1); }} />Ada rincian kecamatan</label>
      </div>
      {filtered.length === 0 ? <EmptyState title="Tidak ada seri yang cocok">Ubah kata kunci atau filter.</EmptyState> : <>
        <div className="table-scroll"><table className="all-table"><thead><tr><th>Indikator</th><th>Sumber</th><th>Rentang</th><th>Nilai terbaru</th><th>Cakupan</th></tr></thead><tbody>
          {shown.map((item) => <tr key={item.indicator_id}>
            <td><strong><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink></strong><small>{item.sector}</small></td>
            <td><Badge tone="neutral">{item.source_kind === "bps" ? "BPS" : "Satu Data"}</Badge></td>
            <td className="num"><strong>{item.first_year === item.last_year ? item.first_year : `${item.first_year}-${item.last_year}`}</strong><small>{item.years} tahun</small></td>
            <td className="num">{item.latest_value === null ? "-" : <><strong>{num(item.latest_value)}</strong><small>{plain(item.unit)} · {item.latest_year}</small></>}</td>
            <td className="num"><strong>{count(item.observations)} nilai</strong><small>{item.districts > 0 ? `${item.districts} kecamatan` : "tingkat kabupaten"}</small></td>
          </tr>)}
        </tbody></table></div>
        <nav className="bank-pager" aria-label="Halaman katalog">
          <button type="button" className="button secondary" disabled={current <= 1} onClick={() => setPage(current - 1)}>Sebelumnya</button>
          <span>Halaman {current} dari {pages}</span>
          <button type="button" className="button secondary" disabled={current >= pages} onClick={() => setPage(current + 1)}>Berikutnya</button>
        </nav>
      </>}
    </section>
  </div>;
}
