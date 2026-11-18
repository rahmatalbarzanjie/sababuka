import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import { Badge, EmptyState, ErrorState, Spinner, useAsync } from "../components";
import { indicatorPath, num, pct } from "../insight";
import { plain } from "../text";
import { AppLink } from "./AppLink";
import { DistrictMap, normalizeName, useKapuasGeography } from "./DistrictMap";

type Status = "tercapai" | "belum_tercapai" | "unggul" | "sedang" | "perhatian" | "tanpa_arah";
type Trend = "membaik" | "memburuk" | "stabil" | null;
interface Summary { name: string; indicators: number; counts: Record<Status, number>; attention_index: number | null; good_index: number | null; growth_index: number | null; trend_counts: { membaik: number; memburuk: number; stabil: number } }
interface ListResponse { generated_at: string; coverage: { indicators: number; with_target: number; by_source: { rpjmd: number; opd: number; bank_data: number } }; districts: Summary[] }
interface Cell {
  indicator_id: string; name: string; sector: string; unit: string; source_kind: "rpjmd" | "opd" | "bank_data"; year: number; value: number;
  change_pct: number | null; trend: Trend; rank: number; of: number; target: number | null; status: Status;
}
interface DetailResponse { summary: Summary; items: Cell[] }

const statusLabel: Record<Status, string> = { tercapai: "Tercapai", belum_tercapai: "Belum tercapai", unggul: "Unggul", sedang: "Sedang", perhatian: "Perlu perhatian", tanpa_arah: "Arah belum ditetapkan" };
const statusTone = (status: Status) => status === "tercapai" || status === "unggul" ? "success" : status === "belum_tercapai" || status === "perhatian" ? "danger" : "neutral";
const trendLabel: Record<string, string> = { membaik: "membaik", memburuk: "memburuk", stabil: "stabil" };
const PAGE = 12;

type MapMode = "kondisi" | "pertumbuhan";
const RED = [200, 40, 40]; const GREEN = [22, 128, 61]; const NEUTRAL = [226, 232, 240];
/** Skor -100 sampai 100 menjadi warna: merah (kurang baik), abu terang (seimbang), hijau (baik). */
function divergingColor(score: number): string {
  const t = Math.max(-1, Math.min(1, score / 100));
  const target = t < 0 ? RED : GREEN;
  const k = Math.min(1, Math.abs(t) * 1.15);
  const mix = NEUTRAL.map((value, index) => Math.round(value + (target[index]! - value) * k));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}
/** Kondisi: persentase indikator unggul dikurangi yang perlu perhatian. Pertumbuhan: indikator membaik dikurangi memburuk. */
function scoreOf(mode: MapMode, district: Summary): number | null {
  if (mode === "pertumbuhan") return district.growth_index;
  if (district.good_index === null && district.attention_index === null) return null;
  return (district.good_index ?? 0) - (district.attention_index ?? 0);
}
const modeText: Record<MapMode, { good: string; bad: string; note: string }> = {
  kondisi: { bad: "Banyak perlu perhatian", good: "Banyak yang unggul", note: "Merah: banyak indikator berada di seperempat terbawah dari 17 kecamatan atau belum mencapai target. Hijau: banyak indikator di seperempat teratas atau sudah tercapai. Abu: seimbang." },
  pertumbuhan: { bad: "Banyak memburuk", good: "Banyak membaik", note: "Merah: lebih banyak indikator yang memburuk dibanding periode sebelumnya. Hijau: lebih banyak yang membaik. Hanya indikator yang punya data pembanding yang dihitung; abu tua berarti belum ada." },
};

function downloadCsv(name: string, items: Cell[]) {
  const cell = (value: unknown) => `"${plain(String(value ?? "")).replace(/"/g, '""')}"`;
  const head = ["Indikator", "Sektor", "Satuan", "Sumber", "Tahun", "Nilai", "Peringkat", "Dari", "Perubahan (%)", "Tren", "Target", "Status"];
  const lines = items.map((item) => [item.name, item.sector, item.unit, item.source_kind === "bank_data" ? "Bank Data (belum diverifikasi)" : item.source_kind === "rpjmd" ? "RPJMD" : "OPD", item.year, item.value, item.rank, item.of,
    item.change_pct === null ? "" : item.change_pct.toFixed(1), item.trend ? trendLabel[item.trend] : "", item.target ?? "", statusLabel[item.status]].map(cell).join(","));
  const blob = new Blob(["﻿" + [head.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = `status-indikator-kecamatan-${normalizeName(name).replace(/\s+/g, "-")}.csv`; link.click();
  URL.revokeObjectURL(url);
}

/** Layar sempit: rincian tampil sebagai lembar bawah yang dirender ke body agar tidak terpotong panel induk bertransform. */
function useNarrow(): boolean {
  const query = "(max-width: 959px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return narrow;
}

function writeQuery(name: string | null) {
  try {
    const url = new URL(window.location.href);
    if (name) url.searchParams.set("kecamatan", name); else url.searchParams.delete("kecamatan");
    window.history.replaceState(null, "", url.toString());
  } catch { /* pembaruan alamat bersifat tambahan */ }
}

function IndicatorRow({ item, showSource }: { item: Cell; showSource: boolean }) {
  const detail = [`${num(item.value)} ${plain(item.unit)} (${item.year})`, `peringkat ${item.rank} dari ${item.of}`, item.trend ? `${trendLabel[item.trend]}${item.change_pct !== null ? ` ${pct(item.change_pct)}` : ""}` : null, item.target !== null ? `target ${num(item.target)}` : null].filter(Boolean).join(" · ");
  return <li>
    <div className="dd-row-top"><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink><Badge tone={statusTone(item.status)}>{statusLabel[item.status]}</Badge></div>
    <small>{plain(item.sector)}{showSource ? " · Bank Data" : ""}</small>
    <span className="dd-row-detail">{detail}</span>
  </li>;
}

function DistrictDetail({ name, onClose }: { name: string; onClose(): void }) {
  const detail = useAsync(() => api<DetailResponse>(`/executive/districts/${encodeURIComponent(name)}`), [name]);
  const [filter, setFilter] = useState<Status | "semua">("semua");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setFilter("semua"); setQuery(""); setShown(PAGE); }, [name]);
  const items = detail.data?.items ?? [];
  const filtered = useMemo(() => items.filter((item) => (filter === "semua" || item.status === filter) && (!query.trim() || `${item.name} ${item.sector}`.toLowerCase().includes(query.trim().toLowerCase()))), [items, filter, query]);
  const head = (summary?: Summary) => <header className="dd-head">
    <div><h3>Kecamatan {plain(summary?.name ?? name)}</h3>{summary && <p>{summary.indicators.toLocaleString("id-ID")} indikator berdata{summary.attention_index !== null ? ` · indeks perhatian ${summary.attention_index.toLocaleString("id-ID")}%` : ""}</p>}</div>
    <div className="dd-actions">{summary && <button type="button" className="button secondary compact" onClick={() => downloadCsv(summary.name, items)}>CSV</button>}<button type="button" className="icon-close" aria-label="Kembali ke daftar semua kecamatan" onClick={onClose}><X aria-hidden /></button></div>
  </header>;
  if (detail.loading) return <div className="dd">{head()}<div className="panel-loading"><Spinner /></div></div>;
  if (detail.error || !detail.data) return <div className="dd">{head()}<ErrorState title="Rincian belum dapat dimuat" onRetry={detail.reload}>{detail.error}</ErrorState></div>;
  const { summary } = detail.data;
  const c = summary.counts;
  const allBank = items.every((item) => item.source_kind === "bank_data");
  return <div className="dd">
    {head(summary)}
    <p className="dd-note">Diurut dari yang perlu perhatian. {allBank ? "Seluruhnya dari Bank Data (belum diverifikasi OPD dan BAPPERIDA)." : "Bank Data diberi tanda."}</p>
    <div className="dd-chips" role="group" aria-label="Saring menurut status">
      {(["semua", "belum_tercapai", "perhatian", "sedang", "unggul", "tercapai", "tanpa_arah"] as const).map((key) => {
        const count = key === "semua" ? summary.indicators : c[key];
        if (key !== "semua" && !count) return null;
        return <button key={key} type="button" className={`chip${filter === key ? " active" : ""}`} aria-pressed={filter === key} onClick={() => { setFilter(key); setShown(PAGE); }}>{key === "semua" ? "Semua" : statusLabel[key]} <b>{count}</b></button>;
      })}
    </div>
    <label className="search-field dd-search"><span className="sr-only">Cari indikator</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setShown(PAGE); }} placeholder="Cari indikator atau sektor" /></label>
    {filtered.length === 0 ? <EmptyState title="Tidak ada indikator yang cocok">Ubah status atau kata pencarian.</EmptyState> : <>
      <ul className="dd-list">{filtered.slice(0, shown).map((item) => <IndicatorRow key={item.indicator_id} item={item} showSource={!allBank && item.source_kind === "bank_data"} />)}</ul>
      {filtered.length > shown && <button type="button" className="button secondary dd-more" onClick={() => setShown((value) => value + PAGE)}>Tampilkan {Math.min(PAGE, filtered.length - shown)} lagi ({filtered.length - shown} tersisa)</button>}
    </>}
  </div>;
}

/** Peta kiri, rincian kanan: klik kecamatan langsung menampilkan statusnya di samping peta (lembar bawah di ponsel). */
export function DistrictSummaryPanel() {
  const list = useAsync(() => api<ListResponse>("/executive/districts"), []);
  const geography = useKapuasGeography();
  const [district, setDistrict] = useState<string | null>(() => { try { return new URLSearchParams(window.location.search).get("kecamatan"); } catch { return null; } });
  const select = (name: string | null) => { setDistrict(name); writeQuery(name); };
  const narrow = useNarrow();
  const [mode, setMode] = useState<MapMode>("kondisi");
  useEffect(() => {
    if (!district) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setDistrict(null); writeQuery(null); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [district]);
  if (list.loading) return <div className="panel-loading"><Spinner /></div>;
  if (list.error || !list.data) return <ErrorState title="Ringkasan kecamatan belum dapat dimuat" onRetry={list.reload}>{list.error}</ErrorState>;
  const { districts, coverage } = list.data;
  if (!districts.length) return <EmptyState title="Belum ada data per kecamatan yang terbit">Ringkasan akan tampil otomatis begitu ada indikator yang memiliki nilai per kecamatan.</EmptyState>;
  const mapItems = districts.flatMap((item) => { const score = scoreOf(mode, item); return score === null ? [] : [{ name: item.name, value: score, previous: null }]; });
  const ranked = [...districts].sort((a, b) => (scoreOf(mode, a) ?? 999) - (scoreOf(mode, b) ?? 999));
  const withoutData = districts.length - mapItems.length;
  const active = district ? districts.find((item) => normalizeName(item.name) === normalizeName(district)) ?? null : null;
  return <div className={`district-split${active ? " has-selection" : ""}`}>
    <div className="district-map-col">
      <div className="dd-chips map-modes" role="group" aria-label="Dasar warna peta">
        <button type="button" className={`chip${mode === "kondisi" ? " active" : ""}`} aria-pressed={mode === "kondisi"} onClick={() => setMode("kondisi")}>Kondisi</button>
        <button type="button" className={`chip${mode === "pertumbuhan" ? " active" : ""}`} aria-pressed={mode === "pertumbuhan"} onClick={() => setMode("pertumbuhan")}>Pertumbuhan</button>
      </div>
      {geography.data ? <DistrictMap geography={geography.data} items={mapItems} unit="skor" selected={active?.name ?? null} onSelect={select} colorOf={divergingColor}
        valueText={(value) => `${value < -5 ? modeText[mode].bad.toLowerCase() : value > 5 ? modeText[mode].good.toLowerCase() : "seimbang"} (skor ${value > 0 ? "+" : ""}${Math.round(value)})`}
        legend={<figcaption className="map-scale"><span>{modeText[mode].bad}</span><i className="scale-bar" aria-hidden /><span>{modeText[mode].good}</span></figcaption>} /> : <p className="muted">{geography.error ? "Peta wilayah belum tersedia." : "Memuat peta..."}</p>}
      <p className="map-caption">{modeText[mode].note}{withoutData > 0 ? ` ${withoutData} dari ${districts.length} kecamatan belum punya data untuk dasar warna ini.` : ""}</p>
      <details className="district-howto"><summary>Cara membaca peta</summary>
        <p>Indeks perhatian adalah persentase indikator kecamatan yang berada di seperempat terbawah dari 17 kecamatan, atau belum mencapai target bila ada target kecamatan. {coverage.with_target > 0 ? `${coverage.with_target} indikator sudah memiliki target kecamatan.` : "Belum ada target tingkat kecamatan, jadi statusnya berupa posisi relatif."} Sumber Bank Data belum diverifikasi OPD.</p></details>
    </div>
    {active && narrow ? createPortal(<div className="sheet-layer"><button type="button" className="sheet-backdrop" aria-label="Tutup rincian kecamatan" onClick={() => select(null)} /><aside className="district-pane sheet" role="dialog" aria-label={`Rincian kecamatan ${plain(active.name)}`}><DistrictDetail name={active.name} onClose={() => select(null)} /></aside></div>, document.body) : null}
    <aside className="district-pane" aria-live="polite" aria-label="Rincian kecamatan">
      {active && !narrow
        ? <DistrictDetail name={active.name} onClose={() => select(null)} />
        : <div className="district-rank">
          <p className="district-callout">Klik kecamatan pada peta atau daftar untuk melihat status seluruh indikatornya.</p>
          <ol>{ranked.map((item) => <li key={item.name}>
            {(() => { const score = scoreOf(mode, item); return <button type="button" onClick={() => select(item.name)}>
              <i className="rank-dot" style={{ background: score === null ? "var(--ui-rule)" : divergingColor(score) }} aria-hidden />
              <span>{plain(item.name)}</span>
              <span className="rank-bar" role="presentation">{mode === "kondisi"
                ? <><i className="bad" style={{ width: `${item.attention_index ?? 0}%` }} /><i className="good" style={{ width: `${item.good_index ?? 0}%` }} /></>
                : score !== null && <i className={score >= 0 ? "good" : "bad"} style={{ width: `${Math.max(3, Math.abs(score))}%` }} />}</span>
              <b>{mode === "kondisi" ? (item.attention_index === null ? "-" : `${item.attention_index.toLocaleString("id-ID")}%`) : score === null ? "-" : `${score > 0 ? "+" : ""}${Math.round(score)}%`}</b>
            </button>; })()}</li>)}</ol>
          <p className="rank-hint">{mode === "kondisi" ? "Bilah: merah = perlu perhatian, hijau = unggul. Angka: persentase perlu perhatian." : "Angka: selisih persentase indikator membaik dan memburuk."}</p>
        </div>}
    </aside>
  </div>;
}
