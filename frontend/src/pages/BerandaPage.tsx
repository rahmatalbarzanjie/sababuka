import { AlertTriangle, Clock, Database, Search, ArrowDownRight, ArrowUpRight, Building2, CheckCircle2, MessageCircle, Minus, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, ErrorState, PageLoading, useAsync } from "../components";
import type { AchievementResponse } from "../components/AchievementSection";
import { AppLink } from "../components/AppLink";
import { DistrictMap, normalizeName, shade, useKapuasGeography } from "../components/DistrictMap";
import { DistrictSummaryPanel } from "../components/DistrictSummaryPanel";
import { FocusSection } from "../components/FocusSection";
import { IndicatorCards, shortSector, type CardFilter } from "../components/IndicatorCards";
import { InlineLegend } from "../components/InlineLegend";
import { LinkedSeries } from "../components/LinkedSeries";
import { askAbout, askPath, indicatorPath, isVerified, num, pct, sector, statusOf, toneOf, type Assessment, type Insight } from "../insight";
import { navigate } from "../router";
import { goDashboard, INDICATOR_GROUP, useDashTab, type DashTab } from "../portalNav";
import { Sparkline, TrendChart } from "../components/InsightVisuals";
import { plain } from "../text";

const relationLabel = { primary: "Utama", supporting: "Pendukung", comparison: "Pembanding" } as const;
interface InsightsResponse { generated_at: string; analyzed: number; context: { series: number; linked: number }; summary: { membaik: number; memburuk: number; naik: number; turun: number; anomali: number }; insights: Insight[] }

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const signed = (value: number | null, digits = 1) => value === null ? "-" : `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  return <div className="stat"><span>{label}</span><strong className={tone}>{value}</strong></div>;
}

function Spotlight({ item, rank }: { item: Insight; rank: number }) {
  const tone = toneOf(item.assessment);
  const Icon = item.trend === "naik" ? ArrowUpRight : item.trend === "turun" ? ArrowDownRight : Minus;
  const a = item.analysis;
  const streak = a.streak.direction && a.streak.length >= 2 ? `${a.streak.length} tahun${a.streak.since ? ` (sejak ${a.streak.since})` : ""}` : null;
  return <article className={`spotlight ${tone}`}>
    <header>
      <span className="spotlight-rank" aria-hidden>{rank}</span>
      <div><small>{sector(item.category)}</small><h3><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink></h3></div>
      <span className="spotlight-badges">{a.anomaly?.is_anomaly && <Badge tone="warning">Perubahan tidak biasa</Badge>}<Badge tone={tone === "good" ? "success" : tone === "bad" ? "danger" : "neutral"}><Icon aria-hidden />{pct(item.change_pct)}</Badge></span>
    </header>
    <div className="spotlight-grid">
      <TrendChart points={item.series} unit={plain(item.unit)} title={item.analysis.years > item.series.length ? `Tren ${item.series.length} tahun terakhir (${item.series[0]?.year ?? ""}-${item.latest_year})` : `Tren ${item.series[0]?.year ?? ""}-${item.latest_year}`} tone={tone} />
      <div className="spotlight-copy">
        <p className="spotlight-latest"><strong>{num(item.latest_value)}</strong> <span>{plain(item.unit)} · {item.latest_year}</span></p>
        <div className="stat-row">
          <Stat label={`Dari ${a.previous_year ?? "sebelumnya"}`} value={signed(a.change_pct)} tone={tone} />
          <Stat label={`Laju per tahun${a.first_year ? ` sejak ${a.first_year}` : ""}`} value={a.years >= 4 ? signed(a.cagr_pct) : "-"} />
          <Stat label={a.streak.direction === "turun" ? "Turun beruntun" : a.streak.direction === "naik" ? "Naik beruntun" : "Rentetan"} value={streak ?? "Tidak ada"} />
        </div>
      </div>
    </div>
    <dl className="brief-list spotlight-brief">
      <div><dt>Analisis</dt><dd>{plain(item.detail)}</dd></div>
      <div><dt>Tindak lanjut dan rekomendasi</dt><dd>{plain(item.recommendation)}</dd></div>
      <div><dt>OPD terkait</dt><dd>{item.opds.length ? item.opds.join(", ") : "OPD penanggung jawab belum dipetakan."}</dd></div>
    </dl>
    <div className="spotlight-actions"><AppLink to={indicatorPath(item.indicator_id)} className="button secondary">Lihat tabel dan grafik</AppLink><button type="button" className="button secondary" onClick={() => navigate(askPath(askAbout(item)))}><MessageCircle aria-hidden />Tanya Sababuka</button></div>
    <LinkedSeries links={item.links} baseYear={item.latest_year} />
    <footer>{item.opds.length > 0 && <span><Building2 aria-hidden />{item.opds.join(", ")}</span>}<small>Sumber: {plain(item.source_label)}{isVerified(item.source_kind) ? "" : " (Bank Data, belum diverifikasi)"}</small></footer>
  </article>;
}

function ChangeBoard({ items }: { items: Insight[] }) {
  const max = Math.max(...items.map((item) => Math.abs(item.change_pct ?? 0)), 1);
  if (!items.length) return <EmptyState title="Belum ada perubahan">Perubahan akan tampil setelah dua periode data tersedia.</EmptyState>;
  return <ol className="change-board">{items.map((item) => {
    const tone = toneOf(item.assessment);
    const width = Math.max(4, (Math.abs(item.change_pct ?? 0) / max) * 100);
    return <li key={item.indicator_id}>
      <span className="change-name" title={plain(item.name)}>{plain(item.name)}</span>
      <span className="change-bar" role="presentation"><i className={tone} style={{ width: `${width}%` }} /></span>
      <b className={tone}>{pct(item.change_pct)}</b>
    </li>;
  })}</ol>;
}

function SectorHealth({ insights }: { insights: Insight[] }) {
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; membaik: number; memburuk: number; netral: number }>();
    for (const item of insights) {
      const name = sector(item.category);
      const row = map.get(name) ?? { name, membaik: 0, memburuk: 0, netral: 0 };
      row[item.assessment] += 1; map.set(name, row);
    }
    return [...map.values()].sort((a, b) => b.memburuk - a.memburuk || (b.membaik + b.memburuk + b.netral) - (a.membaik + a.memburuk + a.netral)).slice(0, 10);
  }, [insights]);
  return <ul className="sector-list">{rows.map((row) => {
    const total = row.membaik + row.memburuk + row.netral;
    return <li key={row.name}>
      <span className="sector-name" title={row.name}>{row.name}</span>
      <span className="sector-bar" role="img" aria-label={`${row.membaik} membaik, ${row.netral} netral, ${row.memburuk} memburuk`}>
        {row.membaik > 0 && <i className="good" style={{ flexGrow: row.membaik }} />}
        {row.netral > 0 && <i className="neutral" style={{ flexGrow: row.netral }} />}
        {row.memburuk > 0 && <i className="bad" style={{ flexGrow: row.memburuk }} />}
      </span>
      <small>{total} indikator</small>
    </li>;
  })}</ul>;
}

type StatusFilter = "semua" | Assessment;

/** Seluruh indikator kinerja dalam satu tabel agar Bupati melihat gambaran lengkap, bukan hanya yang perlu perhatian. */
function AllIndicators({ insights, initialQuery = "" }: { insights: Insight[]; initialQuery?: string }) {
  const [status, setStatus] = useState<StatusFilter>("semua");
  const [sectorFilter, setSectorFilter] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [limit, setLimit] = useState(12);
  const sectors = useMemo(() => [...new Set(insights.map((item) => sector(item.category)))].sort((a, b) => a.localeCompare(b, "id")), [insights]);
  const counts = useMemo(() => ({ semua: insights.length, membaik: insights.filter((i) => i.assessment === "membaik").length, memburuk: insights.filter((i) => i.assessment === "memburuk").length, netral: insights.filter((i) => i.assessment === "netral").length }), [insights]);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const order: Record<Assessment, number> = { memburuk: 0, netral: 1, membaik: 2 };
    return insights
      .filter((item) => (status === "semua" || item.assessment === status) && (!sectorFilter || sector(item.category) === sectorFilter) && (!needle || plain(item.name).toLowerCase().includes(needle)))
      .sort((a, b) => order[a.assessment] - order[b.assessment] || sector(a.category).localeCompare(sector(b.category), "id") || plain(a.name).localeCompare(plain(b.name), "id"));
  }, [insights, status, sectorFilter, query]);
  const filters: Array<[StatusFilter, string]> = [["semua", "Semua"], ["memburuk", "Memburuk"], ["netral", "Belum dinilai"], ["membaik", "Membaik"]];
  return <section className="panel-card all-indicators" aria-labelledby="semua-indikator">
    <header className="card-head"><div><h2 id="semua-indikator">Semua indikator kinerja</h2><p>{insights.length.toLocaleString("id-ID")} indikator RPJMD dan usulan OPD yang sudah terbit, dengan nilai terbaru, tren, dan OPD penanggung jawab. "Belum dinilai" berarti arah baik-buruknya belum ditetapkan. "Data belum cukup" berarti baru ada kurang dari 3 tahun data, sehingga tren belum dapat dinilai.</p></div></header>
    <div className="all-filters">
      <div className="chip-row" role="group" aria-label="Filter status">{filters.map(([value, label]) => <button key={value} type="button" className={status === value ? "chip active" : "chip"} aria-pressed={status === value} onClick={() => setStatus(value)}>{label} <b>{counts[value]}</b></button>)}</div>
      <label className="select-inline"><span className="sr-only">Filter sektor</span><select value={sectorFilter} onChange={(event) => setSectorFilter(event.target.value)}><option value="">Semua sektor</option>{sectors.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <label className="search-field"><Search aria-hidden /><span className="sr-only">Cari indikator</span><input type="search" value={query} placeholder="Cari indikator" onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    <InlineLegend label="Arti warna status" items={[{ tone: "success", name: "Membaik", text: "bergerak ke arah yang diinginkan" }, { tone: "danger", name: "Memburuk", text: "menjauhi arah yang diinginkan" }, { tone: "neutral", name: "Belum dinilai", text: "arah baik-buruk belum ditetapkan atau data kurang dari 3 tahun" }]} />
    {rows.length === 0 ? <EmptyState title="Tidak ada indikator">Ubah filter atau kata kunci pencarian.</EmptyState> : <div className="table-scroll"><table className="all-table"><thead><tr><th>Indikator</th><th>Nilai terbaru</th><th>Tren</th><th>Perubahan</th><th>Status</th><th>OPD</th></tr></thead><tbody>
      {rows.slice(0, limit).map((item) => { const tone = toneOf(item.assessment); return <tr key={item.indicator_id}>
        <td><strong><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink></strong><small>{sector(item.category)} · Sumber: {plain(item.source_label)}</small>{item.links.length > 0 && <details className="row-links"><summary>{item.links.length} data pendukung Bank Data</summary><LinkedSeries links={item.links} baseYear={item.latest_year} title={false} /></details>}</td>
        <td className="num"><strong>{num(item.latest_value)}</strong><small>{plain(item.unit)} · {item.latest_year}</small></td>
        <td>{item.series.length >= 2 ? <Sparkline points={item.series} tone={tone} /> : <small>Baru {item.series.length} tahun</small>}</td>
        <td className={`num ${tone}`}>{pct(item.change_pct)}</td>
        <td><Badge tone={tone === "good" ? "success" : tone === "bad" ? "danger" : "neutral"}>{statusOf(item)}</Badge>{item.analysis.anomaly?.is_anomaly && <Badge tone="warning">Tidak biasa</Badge>}</td>
        <td>{item.opds.length ? item.opds.join(", ") : "-"}</td>
      </tr>; })}
    </tbody></table></div>}
    {rows.length > limit && <button type="button" className="button secondary all-more" onClick={() => setLimit((value) => value + 12)}>Tampilkan {Math.min(12, rows.length - limit)} lagi ({rows.length - limit} tersisa)</button>}
  </section>;
}

function DistrictPanel({ insights }: { insights: Insight[] }) {
  const geography = useKapuasGeography();
  const options = useMemo(() => insights.filter((item) => item.district_latest && item.district_latest.items.length >= 8).sort((a, b) => b.score - a.score), [insights]);
  const [chosen, setChosen] = useState<string>("");
  const [district, setDistrict] = useState<string | null>(null);
  const current = options.find((item) => item.indicator_id === chosen) ?? options[0];
  if (!current || !current.district_latest) return <EmptyState title="Belum ada indikator dengan data per kecamatan">Peta per indikator akan tampil otomatis begitu ada indikator yang memiliki nilai di minimal 8 kecamatan.</EmptyState>;
  const ranked = [...current.district_latest.items].sort((a, b) => b.value - a.value);
  const top = ranked[0]; const bottom = ranked[ranked.length - 1];
  const detail = district ? ranked.find((item) => normalizeName(item.name) === normalizeName(district)) : null;
  const maxValue = top?.value || 1;
  const minValue = bottom?.value ?? 0; const span = maxValue - minValue || 1;
  return <div className="district-embedded">
    <header className="card-head"><div><h3 id="sebaran">Sebaran satu indikator</h3><p>Nilai terbaru ({current.district_latest.year}) menurut kecamatan. Warna lebih tua berarti nilai lebih tinggi.</p></div>
      <label className="select-inline"><span className="sr-only">Pilih indikator</span><select value={current.indicator_id} onChange={(event) => { setChosen(event.target.value); setDistrict(null); }}>{options.map((item) => <option key={item.indicator_id} value={item.indicator_id}>{plain(item.name)}</option>)}</select></label>
    </header>
    <div className="district-split">
      <div className="district-map-col">{geography.data ? <DistrictMap geography={geography.data} items={current.district_latest.items} unit={current.unit} selected={district} onSelect={setDistrict} /> : <p className="muted">{geography.error ? "Peta wilayah belum tersedia." : "Memuat peta…"}</p>}</div>
      <div className="district-pane district-rank">
        {detail ? <p className="district-callout"><strong>{detail.name}</strong>: {num(detail.value)} {current.unit}{detail.previous !== null && detail.previous !== 0 ? ` (${pct(((detail.value - detail.previous) / Math.abs(detail.previous)) * 100)} dari periode sebelumnya)` : ""}</p>
          : <p className="district-callout">Tertinggi <strong>{top?.name}</strong> ({num(top?.value ?? 0)}), terendah <strong>{bottom?.name}</strong> ({num(bottom?.value ?? 0)}) {current.unit}.</p>}
        <ol>{ranked.map((item) => <li key={plain(item.name)} className={district && normalizeName(district) === normalizeName(item.name) ? "active" : undefined}>
          <button type="button" onClick={() => setDistrict(district && normalizeName(district) === normalizeName(item.name) ? null : item.name)}>
            <i className="rank-dot" style={{ background: shade((item.value - minValue) / span) }} aria-hidden /><span>{plain(item.name)}</span><span className="rank-bar" role="presentation"><i style={{ width: `${Math.max(3, (item.value / maxValue) * 100)}%` }} /></span><b>{num(item.value)}</b>
          </button></li>)}</ol>
      </div>
    </div>
  </div>;
}

function DistrictSection({ insights }: { insights: Insight[] }) {
  const [view, setView] = useState<"ringkasan" | "indikator">("ringkasan");
  return <section className="portal-wilayah-wrap" aria-labelledby={view === "ringkasan" ? "peta-judul" : "sebaran"}>
    <div className="portal-view portal-view-switch" role="group" aria-label="Tampilan peta"><button type="button" className={view === "ringkasan" ? "active" : ""} aria-pressed={view === "ringkasan"} onClick={() => setView("ringkasan")}>Status kecamatan</button><button type="button" className={view === "indikator" ? "active" : ""} aria-pressed={view === "indikator"} onClick={() => setView("indikator")}>Sebaran satu indikator</button></div>
    {view === "ringkasan" ? <DistrictSummaryPanel /> : <div className="portal-panel"><DistrictPanel insights={insights} /></div>}
  </section>;
}

export function BerandaPage() {
  const tab: DashTab = useDashTab();
  const [cardFilter, setCardFilter] = useState<CardFilter>("dinilai");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const changeTab = (id: DashTab) => goDashboard(id);
  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setSearch(draft.trim()); changeTab("indikator"); };
  const pickStatus = (filter: CardFilter) => { setCardFilter((current) => current === filter ? "dinilai" : filter); window.setTimeout(() => document.getElementById("sorotan-indikator")?.scrollIntoView({ block: "start", behavior: "smooth" }), 0); };
  const data = useAsync(async () => {
    const [kinerja, konteks, capaian] = await Promise.all([api<InsightsResponse>("/executive/insights?layer=kinerja&limit=100"), api<InsightsResponse>("/executive/insights?layer=konteks&limit=100"), api<AchievementResponse>("/executive/achievement")]);
    return { ...kinerja, context: konteks.context, konteks: konteks.insights, capaian };
  }, []);
  if (data.loading) return <PageLoading />;
  if (data.error || !data.data) return <ErrorState title="Dashboard belum dapat dimuat" onRetry={data.reload}>{data.error}</ErrorState>;
  const { summary, insights, generated_at, context, konteks, capaian } = data.data;
  const cap = capaian.summary;
  const capAssessed = cap.tercapai + cap.belum_tercapai;
  const donePct = capAssessed > 0 ? Math.round((cap.tercapai / capAssessed) * 100) : 0;
  const headLead = capAssessed > 0 && cap.tercapai > 0 ? `${cap.tercapai} dari ${capAssessed}` : "";
  const headRest = capAssessed > 0 && cap.tercapai > 0 ? ` indikator yang sudah memiliki realisasi telah mencapai target RPJMD (${donePct}%).` : "";
  const headline = capAssessed === 0 ? "Belum ada indikator yang dapat dinilai terhadap target RPJMD" : cap.tercapai > 0 ? `${cap.tercapai} dari ${capAssessed} indikator yang sudah memiliki realisasi telah mencapai target RPJMD (${donePct}%).` : `Dari ${capAssessed} indikator yang sudah memiliki realisasi, belum ada yang mencapai target RPJMD.`;
  const behindItems = capaian.items.filter((item) => item.status === "belum_tercapai").sort((a, b) => Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0));
  const worst = behindItems[0];
  const contextMovers = konteks.filter((item) => item.change_pct !== null).sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0)).slice(0, 6);
  const attention = insights.filter((item) => item.assessment === "memburuk" || item.analysis.anomaly?.is_anomaly);
  const spotlight = attention.slice(0, 3);
  const spotlightIds = new Set(spotlight.map((item) => item.indicator_id));
  const rest = attention.filter((item) => !spotlightIds.has(item.indicator_id)).slice(0, 6);
  const better = insights.filter((item) => item.assessment === "membaik").slice(0, 6);
  const seenMovers = new Set<string>();
  const movers = insights.filter((item) => item.change_pct !== null && item.assessment !== "netral").sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0))
    .filter((item) => { const key = `${item.latest_year}|${item.latest_value}|${item.change_pct}`; if (seenMovers.has(key)) return false; seenMovers.add(key); return true; }).slice(0, 8);
  const latestYear = Math.max(...insights.map((item) => item.latest_year), 0);
  const trends = new Map(insights.map((item) => [item.indicator_id, item] as const));
  const sectorStats = new Map<string, { total: number; done: number }>();
  for (const item of capaian.items) { if (item.status !== "tercapai" && item.status !== "belum_tercapai") continue; const row = sectorStats.get(item.sector) ?? { total: 0, done: 0 }; row.total += 1; if (item.status === "tercapai") row.done += 1; sectorStats.set(item.sector, row); }
  const strongest = [...sectorStats.entries()].filter(([, row]) => row.done >= 2).sort((a, b) => b[1].done / b[1].total - a[1].done / a[1].total || b[1].done - a[1].done)[0];

  const inIndicator = INDICATOR_GROUP.includes(tab);
  const subs: Array<[DashTab, string]> = [["indikator", `Semua indikator (${insights.length})`], ["tren", "Tren terbaru"], ["fokus", "Fokus kebijakan"]];
  return <div className="exec portal-exec">
    {tab === "ringkasan" && <>
    <section className="portal-hero" aria-labelledby="ikhtisar">
      <div className="portal-hero-copy">
        <h2 id="ikhtisar">{headLead ? <><em>{headLead}</em>{headRest}</> : headline}</h2>
        <p>{strongest && <>Sektor terkuat: <strong>{shortSector(strongest[0])}</strong> ({strongest[1].done} dari {strongest[1].total} indikator tercapai). </>}Pada tren terbaru, <strong>{summary.membaik}</strong> indikator membaik{summary.memburuk === 0 ? " dan tidak ada yang memburuk" : <>, <strong>{summary.memburuk}</strong> memburuk</>}. Perhatian tertuju pada <strong>{cap.belum_tercapai}</strong> indikator yang belum mencapai target dan <strong>{cap.belum_ada_data}</strong> indikator yang belum memiliki realisasi terbit. Dari <strong>{cap.total.toLocaleString("id-ID")}</strong> indikator bertarget, penilaian baru dapat dilakukan untuk <strong>{capAssessed}</strong> indikator.</p>
        <form className="portal-search" role="search" onSubmit={submitSearch}><input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} aria-label="Cari indikator" placeholder="Cari indikator, mis. kemiskinan" /><button type="submit">Cari</button></form>
      </div>
      <aside className="portal-ask" aria-label="Ruang tanya"><b>Ruang tanya</b><p>Ada pertanyaan tentang indikator atau wilayah? Tanyakan kepada asisten, jawabannya memuat sumber dan tahun data.</p><button type="button" className="portal-cta" onClick={() => navigate("/assistant")}><MessageCircle aria-hidden />Tanya Sababuka</button></aside>
    </section>

    <div className="portal-kpis" role="group" aria-label="Ringkasan capaian target">
      <button type="button" className="portal-kpi good" aria-pressed={cardFilter === "tercapai"} onClick={() => pickStatus("tercapai")}><span className="portal-kpi-ic" aria-hidden><CheckCircle2 /></span><span className="portal-kpi-tx"><b>{cap.tercapai}</b><span>Tercapai</span><small>Memenuhi target tahun yang sama.</small></span></button>
      <button type="button" className="portal-kpi bad" aria-pressed={cardFilter === "belum_tercapai"} onClick={() => pickStatus("belum_tercapai")}><span className="portal-kpi-ic" aria-hidden><AlertTriangle /></span><span className="portal-kpi-tx"><b>{cap.belum_tercapai}</b><span>Belum tercapai</span><small>{worst && worst.latest_value !== null && worst.target_value !== null ? `Selisih terjauh: ${plain(worst.name)}, ${num(worst.latest_value)} dari target ${num(worst.target_value)} (${worst.latest_year}).` : "Realisasi di bawah target."}</small></span></button>
      <button type="button" className="portal-kpi neutral" aria-pressed={cardFilter === "belum_ada_data"} onClick={() => pickStatus("belum_ada_data")}><span className="portal-kpi-ic" aria-hidden><Clock /></span><span className="portal-kpi-tx"><b>{cap.belum_ada_data}</b><span>Belum ada realisasi</span><small>Menunggu pengisian OPD atau belum terbit.</small></span></button>
    </div>


      <IndicatorCards items={capaian.items} allItems={capaian.items} trends={trends} filter={cardFilter} />
    </>}
    {tab === "peta" && <DistrictSection insights={[...insights, ...konteks]} />}
    {inIndicator && <>
      <div className="portal-chips" role="group" aria-label="Bagian indikator">{subs.map(([id, label]) => <button key={id} type="button" className={`portal-chip${tab === id ? " active" : ""}`} aria-pressed={tab === id} onClick={() => changeTab(id)}>{label}</button>)}</div>
      {tab === "indikator" && <AllIndicators key={search} insights={insights} initialQuery={search} />}
      {tab === "tren" && <>
    <header className="section-head"><h2>Tren terbaru</h2><p>Arah perubahan (membaik atau memburuk) dihitung dari tren tahunan, terpisah dari status capaian terhadap target di menu Capaian.</p></header>
    <div className={`exec-columns${spotlight.length + rest.length === 0 ? " solo" : ""}`}>
      {spotlight.length + rest.length > 0 && <section className="exec-main" aria-labelledby="sorotan">
        <header className="section-head"><h2 id="sorotan"><AlertTriangle aria-hidden />Sorotan utama</h2><p>Indikator yang memburuk atau berubah tidak wajar, diurutkan menurut tingkat prioritas.</p></header>
        {spotlight.length ? <div className="spotlight-list">{spotlight.map((item, index) => <Spotlight key={item.indicator_id} item={item} rank={index + 1} />)}</div> : null}
        {rest.length > 0 && <div className="panel-card compact-list"><h3>Perlu dipantau juga</h3><ul>{rest.map((item) => <li key={item.indicator_id}><Sparkline points={item.series} tone={toneOf(item.assessment)} /><span><strong><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink></strong><small>{sector(item.category)} · {item.opds.join(", ") || "OPD belum dipetakan"}</small></span><b className={toneOf(item.assessment)}>{pct(item.change_pct)}</b></li>)}</ul></div>}
      </section>}
      <aside className="exec-side" aria-label="Ringkasan pendukung">
        <section className="panel-card" aria-labelledby="perubahan"><header className="card-head"><div><h2 id="perubahan"><TrendingUp aria-hidden />Perubahan terbesar</h2><p>Dibanding periode sebelumnya.</p></div></header><ChangeBoard items={movers} /></section>
        <section className="panel-card" aria-labelledby="sektor"><header className="card-head"><div><h2 id="sektor">Kondisi per sektor</h2><p>Sektor dengan indikator memburuk terbanyak di atas.</p></div></header><SectorHealth insights={insights} /></section>
      </aside>
    </div>
    {better.length > 0 && <section className="panel-card" aria-labelledby="membaik"><header className="card-head"><div><h2 id="membaik"><CheckCircle2 aria-hidden />Perkembangan baik</h2><p>Capaian yang perlu dipertahankan dan dapat direplikasi.</p></div></header>
      <ul className="good-grid">{better.map((item) => <li key={item.indicator_id}><Sparkline points={item.series} tone="good" /><span><strong><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink></strong><small>{sector(item.category)}</small></span><b className="good">{pct(item.change_pct)}</b></li>)}</ul></section>}

      </>}
      {tab === "fokus" && <FocusSection />}
    </>}

    <p className="exec-footnote">Dihitung otomatis dari data tersimpan per {dateLabel(generated_at)}. Penilaian kinerja hanya dari indikator RPJMD dan usulan OPD yang diverifikasi. Data BPS Kabupaten Kapuas dan Satu Data Kapuas berstatus belum diverifikasi OPD dan BAPPERIDA, dipakai sebagai konteks dan pembanding. Tren menunjukkan arah, bukan sebab.</p>
  </div>;
}
