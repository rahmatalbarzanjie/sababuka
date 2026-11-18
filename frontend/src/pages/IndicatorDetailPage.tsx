import { ArrowLeft, Download, ExternalLink, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { AppLink } from "../components/AppLink";
import { DetailTrend } from "../components/DetailTrend";
import { LinkedSeries } from "../components/LinkedSeries";
import { Badge, EmptyState, ErrorState, PageLoading, useAsync } from "../components";
import { Legend, type LegendGroup } from "../components/Legend";
import { askAbout, askPath, isVerified, num, pct, sector, statusOf, toneOf, type Insight } from "../insight";
import { setPageTitle } from "../pageTitle";
import { navigate } from "../router";
import { plain } from "../text";

interface InsightsResponse { generated_at: string; insights: Insight[] }
const kindLabel: Record<string, string> = { rpjmd: "Indikator RPJMD", opd: "Usulan OPD", bps: "BPS Kabupaten Kapuas", satudata: "Satu Data Kapuas" };
/** Data yang lebih tua dari ini ditandai sebagai bukan data terkini. */
const STALE_YEARS = 3;
const EDGE = 5;
const YEAR_ROWS = 5;

function downloadSeries(item: Insight) {
  const cell = (value: unknown) => `"${plain(String(value ?? "")).replace(/"/g, '""')}"`;
  const rows: Array<Array<unknown>> = [["Indikator", "Wilayah", "Tahun", "Nilai", "Satuan"]];
  for (const point of item.series) rows.push([item.name, "Kabupaten Kapuas", point.year, point.value, item.unit]);
  if (item.district_latest) for (const entry of item.district_latest.items) rows.push([item.name, entry.name, item.district_latest.year, entry.value, item.unit]);
  const blob = new Blob(["﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "data-indikator.csv"; link.click();
  URL.revokeObjectURL(url);
}

/** Penjelasan singkat arti status pada lencana, supaya pembaca tidak perlu mencari legenda. */
function statusMeaning(item: Insight): string {
  if (item.limited) return `Data belum cukup: baru ${item.analysis.years} tahun data (terbaru ${item.latest_year}). Tren dan penilaian membutuhkan minimal 3 tahun.`;
  if (item.assessment === "netral") return "Belum dinilai: arah baik-buruk indikator ini belum ditetapkan, jadi sistem belum menyatakan membaik atau memburuk. Datanya tetap tersedia.";
  return plain(item.headline);
}

function RankedDistricts({ items, unit, year }: { items: Array<{ name: string; value: number; previous: number | null }>; unit: string; year: number }) {
  const [all, setAll] = useState(false);
  const max = items[0]?.value || 1;
  const collapsible = items.length > EDGE * 2 + 2;
  const hasChange = items.some((entry) => entry.previous !== null && entry.previous !== 0);
  const visible = !collapsible || all ? items : [...items.slice(0, EDGE), ...items.slice(-EDGE)];
  const hidden = items.length - EDGE * 2;
  return <>
    <ol className="rank-list" aria-label={`Nilai per kecamatan tahun ${year}, urut dari tertinggi (${plain(unit)})`}>
      {visible.map((entry, index) => {
        const change = entry.previous !== null && entry.previous !== 0 ? ((entry.value - entry.previous) / Math.abs(entry.previous)) * 100 : null;
        return <li key={entry.name} className={`${index === EDGE - 1 && collapsible && !all ? "rank-gap-after" : ""}`}>
          <span className="rank-name"><AppLink to={`/dashboard?kecamatan=${encodeURIComponent(entry.name)}`}>{plain(entry.name)}</AppLink></span>
          <span className="rank-bar" role="presentation"><i style={{ width: `${Math.max(3, (entry.value / max) * 100)}%` }} /></span>
          <b className="rank-value">{num(entry.value)}</b>
          {hasChange && <small className="rank-change">{pct(change)}</small>}
        </li>;
      })}
    </ol>
    {collapsible && <button type="button" className="button secondary" aria-expanded={all} onClick={() => setAll((value) => !value)}>{all ? "Tampilkan 5 tertinggi dan 5 terendah saja" : `Tampilkan semua ${items.length} kecamatan (${hidden} lainnya)`}</button>}
  </>;
}

/** Satu indikator selengkapnya: ringkasan, grafik, data per tahun, sebaran kecamatan, dan sumber. */
export function IndicatorDetailPage({ id }: { id: string }) {
  const data = useAsync(() => api<InsightsResponse>(`/executive/insights?indicator_id=${encodeURIComponent(id)}&limit=1`), [id]);
  const [allYears, setAllYears] = useState(false);
  const item = data.data?.insights[0];
  useEffect(() => {
    if (!item) return undefined;
    setPageTitle({ title: plain(item.name), subtitle: `${sector(item.category)} · ${plain(item.source_label)}` });
    const previous = document.title;
    document.title = `${plain(item.name)} | SABABUKA`;
    return () => { setPageTitle(null); document.title = previous; };
  }, [item]);
  if (data.loading) return <PageLoading />;
  if (data.error) return <ErrorState title="Detail indikator belum dapat dimuat" onRetry={data.reload}>{data.error}</ErrorState>;
  const back = <AppLink to="/dashboard" className="back-link"><ArrowLeft aria-hidden />Kembali ke Dashboard Eksekutif</AppLink>;
  if (!item) return <div className="exec">{back}<EmptyState title="Indikator tidak ditemukan">Indikator belum memiliki data terpublikasi atau tidak tersedia untuk peran Anda.</EmptyState></div>;
  const tone = toneOf(item.assessment);
  const verified = isVerified(item.source_kind);
  const years = new Date().getFullYear() - item.latest_year;
  const stale = years >= STALE_YEARS;
  const rows = [...item.series].sort((a, b) => b.year - a.year);
  const byYear = new Map(item.series.map((point) => [point.year, point.value]));
  const changeOf = (year: number, value: number) => { const before = byYear.get(year - 1); return before === undefined || before === 0 ? null : ((value - before) / Math.abs(before)) * 100; };
  const districts = item.district_latest ? [...item.district_latest.items].sort((a, b) => b.value - a.value) : [];
  const top = districts[0]; const bottom = districts[districts.length - 1];
  const spread = top && bottom && bottom.value > 0 ? top.value / bottom.value : null;
  const hasTrend = item.series.length >= 2;
  const shownRows = allYears ? rows : rows.slice(0, YEAR_ROWS);
  const legendGroups: LegendGroup[] = verified ? ["target", "status", "source", "chart"] : ["status", "source", "chart"];
  const sections = [hasTrend && ["grafik", "Grafik"], districts.length > 0 && ["kecamatan", "Per kecamatan"], hasTrend && ["data-tahun", "Data per tahun"], ["sumber", "Sumber"]].filter(Boolean) as Array<[string, string]>;
  return <div className="exec indicator-detail">
    {back}
    <div className="detail-head">
      <span className="spotlight-badges">
        <Badge tone={tone === "good" ? "success" : tone === "bad" ? "warning" : "neutral"}>{statusOf(item)}</Badge>
        {item.analysis.anomaly?.is_anomaly && <Badge tone="warning">Tidak biasa</Badge>}
        <Badge tone={stale ? "warning" : "neutral"}>Data tahun {item.latest_year}</Badge>
        <Badge tone={verified ? "success" : "neutral"}>{verified ? "Terverifikasi" : "Bank Data · belum diverifikasi"}</Badge>
      </span>
      <button type="button" className="button secondary" onClick={() => downloadSeries(item)}><Download aria-hidden />Unduh CSV</button>
    </div>
    {stale && <p className="stale-note" role="note">Data terbaru berasal dari tahun {item.latest_year}, {years} tahun lalu. Gunakan sebagai gambaran konteks dan periksa sumber asli untuk angka terkini.</p>}

    <section className="panel-card" aria-labelledby="ringkasan">
      <header className="card-head"><div><h2 id="ringkasan">Ringkasan</h2></div></header>
      <dl className="brief-list">
        <div><dt>Nilai terbaru</dt><dd><strong>{num(item.latest_value)}</strong> {plain(item.unit)} pada {item.latest_year}{item.change_pct !== null ? `, ${pct(item.change_pct)} dari periode sebelumnya` : ""}.</dd></div>
        {top && bottom && districts.length > 1 && <div><dt>Sebaran kecamatan</dt><dd>Tertinggi {plain(top.name)} ({num(top.value)}), terendah {plain(bottom.name)} ({num(bottom.value)}){spread ? `, selisih ${spread.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kali lipat` : ""}. Data kecamatan tahun {item.district_latest!.year}.</dd></div>}
        <div><dt>Arti status</dt><dd>{statusMeaning(item)}</dd></div>
        {!item.limited && item.assessment !== "netral" && <div><dt>Analisis</dt><dd>{plain(item.detail)}</dd></div>}
        {!item.limited && item.assessment !== "netral" && <div><dt>Tindak lanjut</dt><dd>{plain(item.recommendation)}</dd></div>}
        {(item.opds.length > 0 || verified) && <div><dt>OPD terkait</dt><dd>{item.opds.length ? item.opds.join(", ") : "OPD penanggung jawab belum dipetakan."}</dd></div>}
      </dl>
      <div className="detail-actions"><button className="button primary" onClick={() => navigate(askPath(askAbout(item)))}><MessageCircle aria-hidden />Tanya Sababuka tentang indikator ini</button></div>
    </section>

    {sections.length > 2 && <nav className="section-nav" aria-label="Isi halaman">{sections.map(([anchor, label]) => <a key={anchor} href={`#${anchor}`}>{label}</a>)}</nav>}

    {hasTrend && <section className="panel-card" id="grafik" aria-labelledby="grafik-judul">
      <header className="card-head"><div><h2 id="grafik-judul">Grafik</h2><p>Tren {item.series[0]!.year} sampai {item.latest_year} ({item.series.length} tahun){item.unit ? `, satuan ${plain(item.unit)}` : ""}.</p></div></header>
      <DetailTrend points={item.series} unit={plain(item.unit)} tone={tone} />
    </section>}

    {districts.length > 0 && item.district_latest && <section className="panel-card" id="kecamatan" aria-labelledby="kecamatan-judul">
      <header className="card-head"><div><h2 id="kecamatan-judul">Per kecamatan ({item.district_latest.year})</h2><p>Urut dari nilai tertinggi. Pilih nama kecamatan untuk melihat status seluruh indikatornya.</p></div></header>
      <RankedDistricts items={districts} unit={item.unit} year={item.district_latest.year} />
    </section>}

    {hasTrend && <section className="panel-card" id="data-tahun" aria-labelledby="data-tahun-judul">
      <header className="card-head"><div><h2 id="data-tahun-judul">Data per tahun</h2><p>Nilai kabupaten dalam satuan {plain(item.unit) || "asal"}. Perubahan dihitung terhadap tahun sebelumnya.</p></div></header>
      <div className="table-scroll"><table className="all-table"><thead><tr><th>Tahun</th><th>Nilai</th><th>Perubahan</th></tr></thead><tbody>
        {shownRows.map((row) => { const change = changeOf(row.year, row.value); return <tr key={row.year}><td>{row.year}</td><td className="num"><strong>{num(row.value)}</strong></td><td className="num">{pct(change)}</td></tr>; })}
      </tbody></table></div>
      {rows.length > YEAR_ROWS && <button type="button" className="button secondary" aria-expanded={allYears} onClick={() => setAllYears((value) => !value)}>{allYears ? `Tampilkan ${YEAR_ROWS} tahun terbaru saja` : `Tampilkan semua ${rows.length} tahun`}</button>}
    </section>}

    <section className="panel-card" id="sumber" aria-labelledby="sumber-judul">
      <header className="card-head"><div><h2 id="sumber-judul">Sumber data</h2></div></header>
      <dl className="brief-list">
        <div><dt>Sumber</dt><dd>{plain(item.source_label) || "-"} ({kindLabel[item.source_kind] ?? item.source_kind})</dd></div>
        <div><dt>Status</dt><dd>{verified ? "Terverifikasi: disetujui BAPPERIDA dan terbit ke dashboard Bupati." : "Bank Data: belum diverifikasi OPD dan BAPPERIDA, dipakai sebagai konteks dan pembanding."}</dd></div>
        <div><dt>Data hingga</dt><dd>{item.latest_year}</dd></div>
        <div><dt>Tautan sumber</dt><dd>{item.source_url ? <a href={item.source_url} target="_blank" rel="noopener noreferrer">Buka sumber asli <ExternalLink aria-hidden /></a> : "Tautan sumber asli belum tercatat."}</dd></div>
      </dl>
      <LinkedSeries links={item.links} baseYear={item.latest_year} />
    </section>

    <Legend groups={legendGroups} folded />
  </div>;
}
