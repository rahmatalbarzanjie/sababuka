import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react";
import { api } from "../api";
import { AppLink } from "../components/AppLink";
import { Badge, EmptyState, ErrorState, PageLoading, useAsync } from "../components";
import { DistrictBars, TrendChart } from "../components/InsightVisuals";
import { Legend } from "../components/Legend";
import { askAbout, askPath, indicatorPath, isVerified, num, pct, sector, statusOf, toneOf, type Insight } from "../insight";
import { navigate } from "../router";
import { plain } from "../text";

interface InsightsResponse { generated_at: string; insights: Insight[] }
const relationLabel = { primary: "Utama", supporting: "Pendukung", comparison: "Pembanding" } as const;
const kindLabel: Record<string, string> = { rpjmd: "Indikator RPJMD", opd: "Usulan OPD", bps: "BPS Kabupaten Kapuas", satudata: "Satu Data Kapuas" };

function downloadSeries(item: Insight) {
  const cell = (value: unknown) => `"${plain(String(value ?? "")).replace(/"/g, '""')}"`;
  const rows: Array<Array<unknown>> = [["Indikator", "Wilayah", "Tahun", "Nilai", "Satuan"]];
  for (const point of item.series) rows.push([item.name, "Kabupaten Kapuas", point.year, point.value, item.unit]);
  if (item.district_latest) for (const entry of item.district_latest.items) rows.push([item.name, entry.name, item.district_latest.year, entry.value, item.unit]);
  const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "data-indikator.csv"; link.click();
  URL.revokeObjectURL(url);
}

/** Satu indikator selengkapnya: grafik, tabulasi data, analisis, tindak lanjut, OPD terkait, dan sumber. */
export function IndicatorDetailPage({ id }: { id: string }) {
  const data = useAsync(() => api<InsightsResponse>(`/executive/insights?indicator_id=${encodeURIComponent(id)}&limit=1`), [id]);
  if (data.loading) return <PageLoading />;
  if (data.error) return <ErrorState title="Detail indikator belum dapat dimuat" onRetry={data.reload}>{data.error}</ErrorState>;
  const item = data.data?.insights[0];
  const back = <AppLink to="/dashboard" className="back-link"><ArrowLeft aria-hidden />Kembali ke Dashboard Eksekutif</AppLink>;
  if (!item) return <div className="exec">{back}<EmptyState title="Indikator tidak ditemukan">Indikator belum memiliki data terpublikasi atau tidak tersedia untuk peran Anda.</EmptyState></div>;
  const tone = toneOf(item.assessment);
  const verified = isVerified(item.source_kind);
  const rows = [...item.series].sort((a, b) => b.year - a.year);
  const byYear = new Map(item.series.map((point) => [point.year, point.value]));
  const changeOf = (year: number, value: number) => { const before = byYear.get(year - 1); return before === undefined || before === 0 ? null : ((value - before) / Math.abs(before)) * 100; };
  const districts = item.district_latest ? [...item.district_latest.items].sort((a, b) => b.value - a.value) : [];
  return <div className="exec indicator-detail">
    {back}
    <header className="detail-head">
      <div><small>{sector(item.category)}</small><h2>{plain(item.name)}</h2></div>
      <span className="spotlight-badges">
        <Badge tone={tone === "good" ? "success" : tone === "bad" ? "warning" : "neutral"}>{statusOf(item)}</Badge>
        {item.analysis.anomaly?.is_anomaly && <Badge tone="warning">Tidak biasa</Badge>}
        <Badge tone={verified ? "success" : "neutral"}>{verified ? "Terverifikasi" : "Bank Data · belum diverifikasi"}</Badge>
      </span>
    </header>

    <section className="panel-card" aria-labelledby="grafik">
      <header className="card-head"><div><h2 id="grafik">Grafik</h2><p>Nilai terbaru <strong>{num(item.latest_value)}</strong> {plain(item.unit)} pada {item.latest_year}, perubahan {pct(item.change_pct)} dari periode sebelumnya.</p></div></header>
      <TrendChart points={item.series} unit={plain(item.unit)} title={`Tren ${item.series[0]?.year ?? ""}-${item.latest_year}`} tone={tone} />
    </section>

    <section className="panel-card" aria-labelledby="tabulasi">
      <header className="card-head"><div><h2 id="tabulasi">Tabulasi data</h2><p>Nilai per tahun dalam satuan {plain(item.unit) || "asal"}.</p></div><button type="button" className="button secondary" onClick={() => downloadSeries(item)}>Unduh CSV</button></header>
      <div className="table-scroll"><table className="all-table"><thead><tr><th>Tahun</th><th>Nilai</th><th>Perubahan dari tahun sebelumnya</th></tr></thead><tbody>
        {rows.map((row) => { const change = changeOf(row.year, row.value); return <tr key={row.year}><td>{row.year}</td><td className="num"><strong>{num(row.value)}</strong></td><td className="num">{pct(change)}</td></tr>; })}
      </tbody></table></div>
    </section>

    {districts.length > 0 && item.district_latest && <section className="panel-card" aria-labelledby="kecamatan">
      <header className="card-head"><div><h2 id="kecamatan">Per kecamatan ({item.district_latest.year})</h2><p>Tertinggi {districts[0]!.name} ({num(districts[0]!.value)}), terendah {districts[districts.length - 1]!.name} ({num(districts[districts.length - 1]!.value)}).</p></div></header>
      <DistrictBars items={districts.map((entry) => ({ name: entry.name, value: entry.value }))} unit={plain(item.unit)} title={`${plain(item.name)} per kecamatan`} />
      <div className="table-scroll"><table className="all-table"><thead><tr><th>Kecamatan</th><th>Nilai</th><th>Perubahan</th></tr></thead><tbody>
        {districts.map((entry) => <tr key={entry.name}><td>{plain(entry.name)}</td><td className="num"><strong>{num(entry.value)}</strong></td><td className="num">{entry.previous !== null && entry.previous !== 0 ? pct(((entry.value - entry.previous) / Math.abs(entry.previous)) * 100) : "-"}</td></tr>)}
      </tbody></table></div>
    </section>}

    <section className="panel-card analysis-card" aria-labelledby="analisis">
      <header className="card-head"><div><h2 id="analisis">Telaah Sababuka</h2><p>Dihitung dari data terpublikasi. Angka dihitung sistem, bukan ditebak.</p></div></header>
      <dl className="brief-list">
        <div><dt>Ringkasan</dt><dd>{plain(item.headline)}</dd></div>
        <div><dt>Analisis</dt><dd>{plain(item.detail)}</dd></div>
        <div><dt>Tindak lanjut dan rekomendasi</dt><dd>{plain(item.recommendation)}</dd></div>
        <div><dt>OPD terkait</dt><dd>{item.opds.length ? item.opds.join(", ") : "OPD penanggung jawab belum dipetakan."}</dd></div>
      </dl>
      <div className="detail-actions"><button className="button primary" onClick={() => navigate(askPath(askAbout(item)))}><MessageCircle aria-hidden />Tanya Sababuka tentang indikator ini</button></div>
    </section>

    <section className="panel-card" aria-labelledby="sumber">
      <header className="card-head"><div><h2 id="sumber">Sumber data</h2></div></header>
      <dl className="brief-list">
        <div><dt>Sumber</dt><dd>{plain(item.source_label) || "-"} ({kindLabel[item.source_kind] ?? item.source_kind})</dd></div>
        <div><dt>Status</dt><dd>{verified ? "Terverifikasi: disetujui BAPPERIDA dan terbit ke dashboard pimpinan." : "Bank Data: belum diverifikasi OPD dan BAPPERIDA, dipakai sebagai konteks dan pembanding."}</dd></div>
        <div><dt>Data hingga</dt><dd>{item.latest_year}</dd></div>
        <div><dt>Tautan sumber</dt><dd>{item.source_url ? <a href={item.source_url} target="_blank" rel="noopener noreferrer">Buka sumber asli <ExternalLink aria-hidden /></a> : "Tautan sumber asli belum tercatat."}</dd></div>
      </dl>
      {item.links.length > 0 && <div className="spotlight-links"><b>Data pendukung dan pembanding (Bank Data, belum diverifikasi)</b><ul>{item.links.map((link) => <li key={`${link.relation}:${link.indicator_id}`}><Badge tone="neutral">{relationLabel[link.relation]}</Badge><span><AppLink to={indicatorPath(link.indicator_id)}>{plain(link.name)}</AppLink></span><strong>{num(link.latest_value)} {plain(link.unit)}</strong><small>{link.latest_year} · {pct(link.change_pct)}</small></li>)}</ul></div>}
    </section>

    <Legend />
  </div>;
}
