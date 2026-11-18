import { ArrowLeft, Download, ExternalLink, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api";
import { AppLink } from "../components/AppLink";
import type { AchievementItem, AchievementResponse } from "../components/AchievementSection";
import { DetailTrend } from "../components/DetailTrend";
import { DistrictMap, normalizeName, useKapuasGeography } from "../components/DistrictMap";
import { LinkedSeries } from "../components/LinkedSeries";
import { Badge, EmptyState, ErrorState, PageLoading, useAsync } from "../components";
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

function RankedDistricts({ items, unit, year, selected, onSelect }: { items: Array<{ name: string; value: number; previous: number | null }>; unit: string; year: number; selected: string | null; onSelect(name: string | null): void }) {
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
        const active = selected !== null && normalizeName(selected) === normalizeName(entry.name);
        return <li key={entry.name} className={`${index === EDGE - 1 && collapsible && !all ? "rank-gap-after" : ""}${active ? " active" : ""}`}>
          <span className="rank-name"><button type="button" className="rank-pick" aria-pressed={active} onClick={() => onSelect(active ? null : entry.name)}>{plain(entry.name)}</button></span>
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
  const data = useAsync(async () => {
    const [insights, achievement] = await Promise.all([api<InsightsResponse>(`/executive/insights?indicator_id=${encodeURIComponent(id)}&limit=1`), api<AchievementResponse>("/executive/achievement").catch(() => null)]);
    return { item: insights.insights[0], ach: achievement?.items.find((entry) => entry.indicator_id === id) ?? null };
  }, [id]);
  const geography = useKapuasGeography();
  const [picked, setPicked] = useState<string | null>(null);
  const [allYears, setAllYears] = useState(false);
  const item = data.data?.item;
  const ach: AchievementItem | null = data.data?.ach ?? null;
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
  const sections: Array<[string, string]> = [["capaian", "1 Capaian"], ["tren", "2 Tren"], ["tabulasi", "3 Tabulasi"], ["spasial", "4 Spasial"], ["sumber", "5 Sumber"], ["tindak-lanjut", "6 Tindak lanjut"]];
  const pickedItem = picked ? districts.find((entry) => normalizeName(entry.name) === normalizeName(picked)) : null;
  const pickedRank = pickedItem ? districts.indexOf(pickedItem) + 1 : 0;
  const pickedChange = pickedItem && pickedItem.previous ? ((pickedItem.value - pickedItem.previous) / Math.abs(pickedItem.previous)) * 100 : null;
  const hasTarget = ach !== null && ach.target_value !== null;
  const gapTone = ach?.status === "belum_tercapai" ? "bad" : ach?.status === "tercapai" ? "good" : "";
  const achText = !ach || !hasTarget
    ? "Indikator ini belum memiliki target RPJMD di sistem, sehingga capaian terhadap target tidak dinilai. Nilai terbaru dan tren tetap ditampilkan."
    : ach.status === "belum_ada_data" ? "Realisasi indikator ini belum terbit, sehingga capaian terhadap target belum dapat dinilai."
    : ach.status === "tanpa_arah" ? "Arah baik-buruk indikator ini belum ditetapkan, sehingga capaian terhadap target belum dapat dinilai."
    : `${plain(item.name)} tercatat ${num(ach.latest_value!)} ${plain(ach.unit)} pada ${ach.latest_year}, ${ach.status === "tercapai" ? "telah mencapai" : "belum mencapai"} target ${num(ach.target_value!)} untuk tahun ${ach.target_year}.`;
  const steady = !item.limited && item.assessment === "netral" && ach?.direction && (item.trend === "stabil" || item.trend === "fluktuatif");
  const trendLabel = steady ? (item.trend === "stabil" ? "Stabil" : "Berfluktuasi") : statusOf(item);
  const trendMeaning = steady ? "Tren " + (item.trend === "stabil" ? "stabil" : "berfluktuasi") + ": perubahan terbaru belum cukup konsisten untuk dinyatakan membaik atau memburuk." : statusMeaning(item);
  const guidance = ach ? plain(ach.follow_up) : !item.limited && item.assessment !== "netral" ? plain(item.recommendation) : "";
  return <div className="exec indicator-detail">
    {back}
    <div className="detail-head">
      <span className="spotlight-badges">
        {ach && hasTarget && ach.status !== "tanpa_arah" && <Badge tone={ach.status === "tercapai" ? "success" : ach.status === "belum_tercapai" ? "danger" : "neutral"}>{ach.status === "tercapai" ? "Tercapai" : ach.status === "belum_tercapai" ? "Belum tercapai" : "Belum ada realisasi"}</Badge>}
        <Badge tone={tone === "good" ? "success" : tone === "bad" ? "danger" : "neutral"}>Tren: {trendLabel}</Badge>
        {item.analysis.anomaly?.is_anomaly && <Badge tone="warning">Tidak biasa</Badge>}
        <Badge tone={stale ? "warning" : "neutral"}>Data tahun {item.latest_year}</Badge>
        <Badge tone={verified ? "success" : "neutral"}>{verified ? "Terverifikasi" : "Bank Data · belum diverifikasi"}</Badge>
      </span>
      <span className="detail-buttons">
        <button type="button" className="button secondary" onClick={() => downloadSeries(item)}><Download aria-hidden />Unduh CSV</button>
        <button type="button" className="button primary" onClick={() => navigate(askPath(askAbout(item)))}><MessageCircle aria-hidden />Tanya Sababuka</button>
      </span>
    </div>
    {stale && <p className="stale-note" role="note">Data terbaru berasal dari tahun {item.latest_year}, {years} tahun lalu. Gunakan sebagai gambaran konteks dan periksa sumber asli untuk angka terkini.</p>}

    <nav className="section-nav" aria-label="Isi halaman">{sections.map(([anchor, label]) => <a key={anchor} href={`#${anchor}`}>{label}</a>)}</nav>

    <section className="panel-card" id="capaian" aria-labelledby="capaian-judul">
      <header className="card-head"><div><h2 id="capaian-judul"><span className="step-no">1</span>Capaian terhadap target</h2></div></header>
      {hasTarget && ach && ach.latest_value !== null && <div className="detail-stats">
        <div className="detail-stat"><span>Realisasi {ach.latest_year}</span><b>{num(ach.latest_value)}</b></div>
        <div className="detail-stat"><span>Target {ach.target_year}</span><b>{num(ach.target_value!)}</b></div>
        <div className="detail-stat"><span>Selisih</span><b className={gapTone}>{ach.gap === null ? "-" : `${ach.gap > 0 ? "+" : ""}${num(ach.gap)}`}</b></div>
        <div className="detail-stat"><span>Arah baik</span><b className="small-b">{ach.direction === "decrease" ? "Semakin rendah semakin baik" : ach.direction === "increase" ? "Semakin tinggi semakin baik" : "Belum ditetapkan"}</b></div>
      </div>}
      <p>{achText}</p>
      <dl className="brief-list">
        <div><dt>Nilai terbaru</dt><dd><strong>{num(item.latest_value)}</strong> {plain(item.unit)} pada {item.latest_year}{item.change_pct !== null ? `, ${pct(item.change_pct)} dari periode sebelumnya` : ""}.</dd></div>
        {top && bottom && districts.length > 1 && <div><dt>Sebaran kecamatan</dt><dd>Tertinggi {plain(top.name)} ({num(top.value)}), terendah {plain(bottom.name)} ({num(bottom.value)}){spread ? `, selisih ${spread.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kali lipat` : ""}. Data kecamatan tahun {item.district_latest!.year}.</dd></div>}
        {(item.opds.length > 0 || verified) && <div><dt>OPD terkait</dt><dd>{item.opds.length ? item.opds.join(", ") : "OPD penanggung jawab belum dipetakan."}</dd></div>}
      </dl>
    </section>

    <section className="panel-card" id="tren" aria-labelledby="tren-judul">
      <header className="card-head"><div><h2 id="tren-judul"><span className="step-no">2</span>Tren</h2><p>{hasTrend ? `Tahun ${item.series[0]!.year} sampai ${item.latest_year} (${item.series.length} tahun)${item.unit ? `, satuan ${plain(item.unit)}` : ""}.` : "Tren memerlukan minimal 2 tahun data."}</p></div><Badge tone={tone === "good" ? "success" : tone === "bad" ? "danger" : "neutral"}>{trendLabel}</Badge></header>
      <p>{trendMeaning}</p>
      {!item.limited && item.assessment !== "netral" && <p className="muted">{plain(item.detail)}</p>}
      {hasTrend && <DetailTrend points={item.series} unit={plain(item.unit)} tone={tone} />}
    </section>

    <section className="panel-card" id="tabulasi" aria-labelledby="tabulasi-judul">
      <header className="card-head"><div><h2 id="tabulasi-judul"><span className="step-no">3</span>Tabulasi data per tahun</h2><p>Nilai kabupaten dalam satuan {plain(item.unit) || "asal"}. Perubahan dihitung terhadap tahun sebelumnya.</p></div></header>
      <div className="table-scroll"><table className="all-table"><thead><tr><th>Tahun</th><th>Nilai</th><th>Perubahan</th></tr></thead><tbody>
        {shownRows.map((row) => { const change = changeOf(row.year, row.value); return <tr key={row.year}><td>{row.year}</td><td className="num"><strong>{num(row.value)}</strong></td><td className="num">{pct(change)}</td></tr>; })}
      </tbody></table></div>
      {rows.length > YEAR_ROWS && <button type="button" className="button secondary" aria-expanded={allYears} onClick={() => setAllYears((value) => !value)}>{allYears ? `Tampilkan ${YEAR_ROWS} tahun terbaru saja` : `Tampilkan semua ${rows.length} tahun`}</button>}
    </section>

    <section className="panel-card" id="spasial" aria-labelledby="spasial-judul">
      <header className="card-head"><div><h2 id="spasial-judul"><span className="step-no">4</span>Sebaran per kecamatan{item.district_latest ? ` (${item.district_latest.year})` : ""}</h2><p>{districts.length > 0 ? "Pilih kecamatan pada peta atau tabel. Rincian langsung tampil di samping peta." : "Peta dan tabel tampil bila indikator memiliki nilai di minimal 8 kecamatan."}</p></div></header>
      {districts.length > 0 && item.district_latest ? <div className="detail-split">
        <div className="detail-map">{geography.data ? <DistrictMap geography={geography.data} items={districts} unit={plain(item.unit)} selected={picked} onSelect={setPicked} /> : <p className="muted">{geography.error ? "Peta wilayah belum tersedia." : "Memuat peta..."}</p>}</div>
        <div className="detail-pick" aria-live="polite">{pickedItem
          ? <><span className="muted">Kecamatan terpilih</span><b>{plain(pickedItem.name)}</b><span>{num(pickedItem.value)} {plain(item.unit)}, peringkat {pickedRank} dari {districts.length}{pickedChange !== null ? `. ${pickedChange >= 0 ? "Naik" : "Turun"} ${Math.abs(pickedChange).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari tahun sebelumnya` : ""}.</span><AppLink to={`/dashboard?kecamatan=${encodeURIComponent(pickedItem.name)}`}>Lihat status seluruh indikator {plain(pickedItem.name)}</AppLink></>
          : <span className="muted">Pilih kecamatan pada peta atau tabel untuk melihat nilai, peringkat, dan perubahannya.</span>}</div>
        <div className="detail-rank"><RankedDistricts items={districts} unit={item.unit} year={item.district_latest.year} selected={picked} onSelect={setPicked} /></div>
      </div> : <>
        <p className="empty-note">Indikator ini belum memiliki data per kecamatan, sehingga peta tidak ditampilkan. Peta dan tabel peringkat akan tampil otomatis begitu ada nilai di minimal 8 kecamatan.</p>
        <AppLink to="/dashboard#peta">Buka peta kondisi seluruh kecamatan</AppLink>
      </>}
    </section>

    <section className="panel-card" id="sumber" aria-labelledby="sumber-judul">
      <header className="card-head"><div><h2 id="sumber-judul"><span className="step-no">5</span>Sumber data</h2></div></header>
      <dl className="brief-list">
        <div><dt>Sumber</dt><dd>{plain(item.source_label) || "-"} ({kindLabel[item.source_kind] ?? item.source_kind})</dd></div>
        <div><dt>Status</dt><dd>{verified ? "Terverifikasi: disetujui BAPPERIDA dan terbit ke dashboard Bupati." : "Bank Data: belum diverifikasi OPD dan BAPPERIDA, dipakai sebagai konteks dan pembanding."}</dd></div>
        <div><dt>Data hingga</dt><dd>{item.latest_year}</dd></div>
        <div><dt>Tautan sumber</dt><dd>{item.source_url ? <a href={item.source_url} target="_blank" rel="noopener noreferrer">Buka sumber asli <ExternalLink aria-hidden /></a> : "Tautan sumber asli belum tercatat."}</dd></div>
      </dl>
      <LinkedSeries links={item.links} baseYear={item.latest_year} />
    </section>

    <section className="panel-card" id="tindak-lanjut" aria-labelledby="tindak-judul">
      <header className="card-head"><div><h2 id="tindak-judul"><span className="step-no">6</span>Tindak lanjut OPD</h2></div><Badge tone="neutral">Belum ada tanggapan OPD</Badge></header>
      {guidance ? <p><strong>Arahan sistem.</strong> {guidance}</p> : <p className="muted">Belum ada arahan tindak lanjut untuk indikator ini.</p>}
      <p className="empty-note">Penyebab selisih dan rencana percepatan dari OPD belum tersimpan di sistem. Teks di atas adalah arahan baku yang dihitung dari data, bukan pernyataan OPD.</p>
    </section>
  </div>;
}
