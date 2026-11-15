import { AlertTriangle, ArrowDownRight, ArrowUpRight, Building2, CheckCircle2, Minus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, ErrorState, PageLoading, useAsync } from "../components";
import { DistrictMap, normalizeName, useKapuasGeography, type DistrictValue } from "../components/DistrictMap";
import { Sparkline, TrendChart } from "../components/InsightVisuals";
import { plain } from "../text";

type Assessment = "membaik" | "memburuk" | "netral";
interface Insight {
  indicator_id: string; name: string; category: string; unit: string; latest_year: number; latest_value: number;
  change_pct: number | null; trend: "naik" | "turun" | "stabil" | "fluktuatif"; assessment: Assessment;
  score: number; headline: string; detail: string; recommendation: string; opds: string[]; source_label: string; source_kind: string;
  series: Array<{ year: number; value: number }>;
  analysis: { anomaly: { is_anomaly: boolean } | null; change_pct: number | null; previous_year: number | null; cagr_pct: number | null; years: number; first_year: number; streak: { direction: "naik" | "turun" | null; length: number } };
  district_latest: { year: number; items: DistrictValue[] } | null;
}
interface InsightsResponse { generated_at: string; analyzed: number; summary: { membaik: number; memburuk: number; naik: number; turun: number; anomali: number }; insights: Insight[] }

const pct = (value: number | null) => value === null ? "-" : `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
const num = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });
const sector = (category: string) => plain(category.replace(/^Bank Data · /u, ""));
const toneOf = (assessment: Assessment) => assessment === "membaik" ? "good" : assessment === "memburuk" ? "bad" : "neutral";
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const signed = (value: number | null, digits = 1) => value === null ? "-" : `${value > 0 ? "+" : ""}${value.toLocaleString("id-ID", { maximumFractionDigits: digits })}%`;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  return <div className="stat"><span>{label}</span><strong className={tone}>{value}</strong></div>;
}

function Spotlight({ item, rank }: { item: Insight; rank: number }) {
  const tone = toneOf(item.assessment);
  const Icon = item.trend === "naik" ? ArrowUpRight : item.trend === "turun" ? ArrowDownRight : Minus;
  const a = item.analysis;
  const streak = a.streak.direction && a.streak.length >= 2 ? `${a.streak.length} tahun` : null;
  const extra = plain(item.detail).split(/(?<=\.)\s+/u).filter((line) => line && !/^(Naik|Turun) \d+ tahun berturut-turut\./u.test(line) && !/^Laju rata-rata/u.test(line) && !/^Belum ada pola khusus/u.test(line));
  return <article className={`spotlight ${tone}`}>
    <header>
      <span className="spotlight-rank" aria-hidden>{rank}</span>
      <div><small>{sector(item.category)}</small><h3>{plain(item.name)}</h3></div>
      <span className="spotlight-badges">{a.anomaly?.is_anomaly && <Badge tone="warning">Perubahan tidak biasa</Badge>}<Badge tone={tone === "good" ? "success" : tone === "bad" ? "warning" : "neutral"}><Icon aria-hidden />{pct(item.change_pct)}</Badge></span>
    </header>
    <div className="spotlight-grid">
      <TrendChart points={item.series} unit={plain(item.unit)} title={`Tren ${item.series[0]?.year ?? ""}-${item.latest_year}`} tone={tone} />
      <div className="spotlight-copy">
        <p className="spotlight-latest"><strong>{num(item.latest_value)}</strong> <span>{plain(item.unit)} · {item.latest_year}</span></p>
        <div className="stat-row">
          <Stat label={`Dari ${a.previous_year ?? "sebelumnya"}`} value={signed(a.change_pct)} tone={tone} />
          <Stat label={`Laju per tahun${a.first_year ? ` sejak ${a.first_year}` : ""}`} value={a.years >= 4 ? signed(a.cagr_pct) : "-"} />
          <Stat label={a.streak.direction === "turun" ? "Turun beruntun" : a.streak.direction === "naik" ? "Naik beruntun" : "Rentetan"} value={streak ?? "Tidak ada"} />
        </div>
        {extra.length > 0 && <p className="muted">{extra.join(" ")}</p>}
      </div>
    </div>
    <p className="spotlight-action"><b>Tindak lanjut.</b> {plain(item.recommendation)}</p>
    <footer>{item.opds.length > 0 && <span><Building2 aria-hidden />{item.opds.join(", ")}</span>}<small>Sumber: {plain(item.source_label)}</small></footer>
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

function DistrictPanel({ insights }: { insights: Insight[] }) {
  const geography = useKapuasGeography();
  const options = useMemo(() => insights.filter((item) => item.district_latest && item.district_latest.items.length >= 8).sort((a, b) => b.score - a.score), [insights]);
  const [chosen, setChosen] = useState<string>("");
  const [district, setDistrict] = useState<string | null>(null);
  const current = options.find((item) => item.indicator_id === chosen) ?? options[0];
  if (!current || !current.district_latest) return null;
  const ranked = [...current.district_latest.items].sort((a, b) => b.value - a.value);
  const top = ranked[0]; const bottom = ranked[ranked.length - 1];
  const detail = district ? ranked.find((item) => normalizeName(item.name) === normalizeName(district)) : null;
  const maxValue = top?.value || 1;
  return <section className="panel-card district-panel" aria-labelledby="sebaran">
    <header className="card-head"><div><h2 id="sebaran">Sebaran per kecamatan</h2><p>Nilai terbaru ({current.district_latest.year}) menurut kecamatan. Warna lebih tua berarti nilai lebih tinggi.</p></div>
      <label className="select-inline"><span className="sr-only">Pilih indikator</span><select value={current.indicator_id} onChange={(event) => { setChosen(event.target.value); setDistrict(null); }}>{options.map((item) => <option key={item.indicator_id} value={item.indicator_id}>{plain(item.name)}</option>)}</select></label>
    </header>
    <div className="district-layout">
      <div>{geography.data ? <DistrictMap geography={geography.data} items={current.district_latest.items} unit={current.unit} selected={district} onSelect={setDistrict} /> : <p className="muted">{geography.error ? "Peta wilayah belum tersedia." : "Memuat peta…"}</p>}</div>
      <div className="district-rank">
        {detail ? <p className="district-callout"><strong>{detail.name}</strong>: {num(detail.value)} {current.unit}{detail.previous !== null && detail.previous !== 0 ? ` (${pct(((detail.value - detail.previous) / Math.abs(detail.previous)) * 100)} dari periode sebelumnya)` : ""}</p>
          : <p className="district-callout">Tertinggi <strong>{top?.name}</strong> ({num(top?.value ?? 0)}), terendah <strong>{bottom?.name}</strong> ({num(bottom?.value ?? 0)}) {current.unit}.</p>}
        <ol>{ranked.map((item) => <li key={plain(item.name)} className={district && normalizeName(district) === normalizeName(item.name) ? "active" : undefined}>
          <button type="button" onClick={() => setDistrict(district && normalizeName(district) === normalizeName(item.name) ? null : item.name)}>
            <span>{plain(item.name)}</span><span className="rank-bar" role="presentation"><i style={{ width: `${Math.max(3, (item.value / maxValue) * 100)}%` }} /></span><b>{num(item.value)}</b>
          </button></li>)}</ol>
      </div>
    </div>
  </section>;
}

export function BerandaPage() {
  const data = useAsync(() => api<InsightsResponse>("/executive/insights?limit=100"), []);
  if (data.loading) return <PageLoading />;
  if (data.error || !data.data) return <ErrorState title="Dashboard belum dapat dimuat" onRetry={data.reload}>{data.error}</ErrorState>;
  const { summary, insights, analyzed, generated_at } = data.data;
  const assessed = summary.membaik + summary.memburuk;
  const netral = Math.max(0, analyzed - assessed);
  const attention = insights.filter((item) => item.assessment === "memburuk" || item.analysis.anomaly?.is_anomaly);
  const spotlight = attention.slice(0, 3);
  const spotlightIds = new Set(spotlight.map((item) => item.indicator_id));
  const rest = attention.filter((item) => !spotlightIds.has(item.indicator_id)).slice(0, 6);
  const better = insights.filter((item) => item.assessment === "membaik").slice(0, 6);
  const seenMovers = new Set<string>();
  const movers = insights.filter((item) => item.change_pct !== null && item.assessment !== "netral").sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0))
    .filter((item) => { const key = `${item.latest_year}|${item.latest_value}|${item.change_pct}`; if (seenMovers.has(key)) return false; seenMovers.add(key); return true; }).slice(0, 8);
  const latestYear = Math.max(...insights.map((item) => item.latest_year), 0);
  const focusNames = spotlight.map((item) => plain(item.name)).join("; ");

  return <div className="exec">
    <section className="exec-brief" aria-labelledby="ikhtisar">
      <div>
        <h2 id="ikhtisar">{summary.memburuk > summary.membaik ? "Lebih banyak indikator memburuk daripada membaik" : summary.memburuk === 0 ? "Tidak ada indikator yang memburuk" : `${summary.memburuk} indikator memburuk perlu ditindaklanjuti`}</h2>
        <p>Dari <strong>{analyzed.toLocaleString("id-ID")}</strong> indikator yang dipantau (data hingga {latestYear || "-"}), <strong>{summary.membaik}</strong> membaik, <strong>{summary.memburuk}</strong> memburuk, dan <strong>{summary.anomali}</strong> berubah tidak biasa.{focusNames ? ` Sorotan utama: ${focusNames}.` : ""} Setiap sorotan dilengkapi OPD penanggung jawab dan tindak lanjut.</p>
      </div>
      <div className="exec-composition" role="img" aria-label={`${summary.membaik} membaik, ${netral} tanpa penilaian, ${summary.memburuk} memburuk`}>
        <span className="composition-bar"><i className="good" style={{ flexGrow: Math.max(summary.membaik, 0.001) }} /><i className="neutral" style={{ flexGrow: Math.max(netral, 0.001) }} /><i className="bad" style={{ flexGrow: Math.max(summary.memburuk, 0.001) }} /></span>
        <span className="composition-legend"><span><i className="good" />Membaik <b>{summary.membaik}</b></span><span><i className="neutral" />Tanpa penilaian <b>{netral}</b></span><span><i className="bad" />Memburuk <b>{summary.memburuk}</b></span></span>
      </div>
    </section>

    <div className="exec-columns">
      <section className="exec-main" aria-labelledby="sorotan">
        <header className="section-head"><h2 id="sorotan"><AlertTriangle aria-hidden />Sorotan utama</h2><p>Indikator yang memburuk atau berubah tidak wajar, diurutkan menurut tingkat prioritas.</p></header>
        {spotlight.length ? <div className="spotlight-list">{spotlight.map((item, index) => <Spotlight key={item.indicator_id} item={item} rank={index + 1} />)}</div> : <EmptyState title="Tidak ada sorotan">Tidak ada indikator yang memburuk atau berubah tidak wajar.</EmptyState>}
        {rest.length > 0 && <div className="panel-card compact-list"><h3>Perlu dipantau juga</h3><ul>{rest.map((item) => <li key={item.indicator_id}><Sparkline points={item.series} tone={toneOf(item.assessment)} /><span><strong>{plain(item.name)}</strong><small>{sector(item.category)} · {item.opds.join(", ") || "OPD belum dipetakan"}</small></span><b className={toneOf(item.assessment)}>{pct(item.change_pct)}</b></li>)}</ul></div>}
      </section>
      <aside className="exec-side" aria-label="Ringkasan pendukung">
        <section className="panel-card" aria-labelledby="perubahan"><header className="card-head"><div><h2 id="perubahan"><TrendingUp aria-hidden />Perubahan terbesar</h2><p>Dibanding periode sebelumnya.</p></div></header><ChangeBoard items={movers} /></section>
        <section className="panel-card" aria-labelledby="sektor"><header className="card-head"><div><h2 id="sektor">Kondisi per sektor</h2><p>Sektor dengan indikator memburuk terbanyak di atas.</p></div></header><SectorHealth insights={insights} /></section>
      </aside>
    </div>

    <DistrictPanel insights={insights} />

    {better.length > 0 && <section className="panel-card" aria-labelledby="membaik"><header className="card-head"><div><h2 id="membaik"><CheckCircle2 aria-hidden />Perkembangan baik</h2><p>Capaian yang perlu dipertahankan dan dapat direplikasi.</p></div></header>
      <ul className="good-grid">{better.map((item) => <li key={item.indicator_id}><Sparkline points={item.series} tone="good" /><span><strong>{plain(item.name)}</strong><small>{sector(item.category)}</small></span><b className="good">{pct(item.change_pct)}</b></li>)}</ul></section>}

    <p className="exec-footnote">Dihitung otomatis dari data tersimpan per {dateLabel(generated_at)}. Data bersumber BPS Kabupaten Kapuas, Satu Data Kapuas, dan indikator RPJMD; data Bank Data berstatus belum diverifikasi OPD dan BAPPERIDA. Tren menunjukkan arah, bukan sebab.</p>
  </div>;
}
