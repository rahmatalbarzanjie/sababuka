import { useMemo, useState } from "react";
import { AppLink } from "./AppLink";
import { indicatorPath, num } from "../insight";
import { shortSector } from "./IndicatorCards";
import { plain } from "../text";

export type AchievementStatus = "tercapai" | "belum_tercapai" | "belum_ada_data" | "tanpa_arah" | "tanpa_target";
export interface AchievementItem {
  indicator_id: string; name: string; sector: string; unit: string; source_kind: "rpjmd" | "opd";
  direction?: "increase" | "decrease" | null; latest_year: number | null; latest_value: number | null; target_year: number | null; target_value: number | null;
  gap: number | null; gap_pct: number | null; status: AchievementStatus; opds: string[]; follow_up: string;
}
export interface AchievementResponse {
  generated_at: string; current_year: number;
  summary: { total: number; tercapai: number; belum_tercapai: number; belum_ada_data: number; tanpa_arah: number; tanpa_target: number };
  items: AchievementItem[];
}

export type AchievementFilter = "semua" | "tercapai" | "belum_tercapai" | "belum_ada_data";
const filterLabel: Record<AchievementFilter, string> = { semua: "Semua", tercapai: "Tercapai", belum_tercapai: "Belum tercapai", belum_ada_data: "Belum ada realisasi" };
const statusLabel: Record<AchievementStatus, string> = { tercapai: "Tercapai", belum_tercapai: "Belum tercapai", belum_ada_data: "Belum ada data", tanpa_arah: "Arah belum ditetapkan", tanpa_target: "Target belum ada" };
const signed = (value: number) => `${value > 0 ? "+" : ""}${num(value)}`;

/** Capaian terhadap target RPJMD: yang belum tercapai di depan agar Bupati dapat langsung mengarahkan OPD. */
function downloadCsv(items: AchievementItem[]) {
  const cell = (value: unknown) => `"${plain(String(value ?? "")).replace(/"/g, '""')}"`;
  const head = ["Indikator", "Sektor", "Satuan", "OPD terkait", "Tahun realisasi", "Realisasi", "Tahun target", "Target", "Selisih", "Status"];
  const lines = items.map((item) => [item.name, item.sector, item.unit, item.opds.join("; "), item.latest_year, item.latest_value, item.target_year, item.target_value, item.gap, statusLabel[item.status]].map(cell).join(","));
  const blob = new Blob(["\uFEFF" + [head.map(cell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "capaian-target-rpjmd.csv"; link.click();
  URL.revokeObjectURL(url);
}

const rank: Record<AchievementStatus, number> = { belum_tercapai: 0, belum_ada_data: 1, tanpa_target: 2, tanpa_arah: 3, tercapai: 4 };
const PAGE = 20;

/** Satu baris capaian: nama, nilai, target dan selisih, status, serta arahan sistem yang bisa dibuka. */
function CapaianRow({ item }: { item: AchievementItem }) {
  const has = item.latest_value !== null;
  const t = item.status === "tercapai" ? "ok" : item.status === "belum_tercapai" ? "bad" : "na";
  const open = item.status === "belum_tercapai";
  return <div className="portal-row" role="listitem">
    <div className="portal-row-name"><strong>{plain(item.name)}</strong><small>{shortSector(item.sector)} · {item.opds.slice(0, 3).join(", ") || "OPD belum dipetakan"}</small></div>
    <div className="portal-row-num">{has ? <><span><b>{num(item.latest_value!)}</b> {plain(item.unit)}</span><small>Data tahun {item.latest_year}</small></> : <><b>-</b><small>belum terbit</small></>}</div>
    <div className="portal-row-num">{item.target_value === null ? <><b>-</b><small>target belum ada</small></> : <><span>Target {item.target_year}: <b>{num(item.target_value)}</b></span><small className={item.status === "belum_tercapai" ? "bad" : item.status === "tercapai" ? "good" : ""}>{item.gap === null ? "Menunggu pelaporan OPD" : `Selisih ${signed(item.gap)} ${plain(item.unit)}`}</small></>}</div>
    <AppLink to={indicatorPath(item.indicator_id)} className="portal-open"><span className={`portal-tag ${t}`}>{statusLabel[item.status]}</span>Buka</AppLink>
    {open && <details className="portal-row-more"><summary>Arahan sistem</summary><p><span className="portal-tag warn">Belum ada tanggapan OPD</span> {plain(item.follow_up)}</p></details>}
  </div>;
}

export function AchievementSection({ data, filter, onFilter }: { data: AchievementResponse; filter: AchievementFilter; onFilter(value: AchievementFilter): void }) {
  const [view, setView] = useState<"daftar" | "opd">("daftar");
  const [shown, setShown] = useState(PAGE);
  const scoped = useMemo(() => filter === "semua" ? data.items : data.items.filter((item) => item.status === filter), [data.items, filter]);
  const ordered = useMemo(() => [...scoped].sort((a, b) => rank[a.status] - rank[b.status] || Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0) || a.name.localeCompare(b.name, "id")), [scoped]);
  const opdBoard = useMemo(() => {
    const map = new Map<string, { opd: string; behind: string[]; missing: string[] }>();
    for (const item of scoped) {
      if (item.status !== "belum_tercapai" && item.status !== "belum_ada_data") continue;
      for (const opd of item.opds.length ? item.opds : ["OPD belum dipetakan"]) {
        const row = map.get(opd) ?? { opd, behind: [], missing: [] };
        (item.status === "belum_tercapai" ? row.behind : row.missing).push(plain(item.name)); map.set(opd, row);
      }
    }
    return [...map.values()].sort((a, b) => b.behind.length - a.behind.length || b.missing.length - a.missing.length);
  }, [scoped]);
  const effectiveView = filter === "tercapai" ? "daftar" : view;
  return <section className="portal-capaian" aria-labelledby="capaian-judul">
    <header className="portal-page-head"><div><h2 id="capaian-judul">Capaian target RPJMD</h2><p>Status capaian (tercapai atau belum tercapai) dinilai terhadap target tahun terakhir yang punya realisasi. Status ini terpisah dari status tren.</p></div><button type="button" className="portal-more" onClick={() => downloadCsv(data.items)}>Unduh CSV</button></header>
    <div className="portal-chips" role="group" aria-label="Filter status capaian">{(Object.keys(filterLabel) as AchievementFilter[]).map((key) => {
      const count = key === "semua" ? data.summary.total : data.summary[key];
      return <button key={key} type="button" className={`portal-chip${filter === key ? " active" : ""}`} aria-pressed={filter === key} onClick={() => { onFilter(key); setShown(PAGE); }}>{filterLabel[key]} {count}</button>;
    })}</div>
    <div className="portal-legend"><span><i className="ok" />Tercapai</span><span><i className="bad" />Belum tercapai</span><span><i className="na" />Belum ada realisasi</span>
      {filter !== "tercapai" && <span className="portal-view" role="group" aria-label="Tampilan capaian"><button type="button" className={view === "daftar" ? "active" : ""} aria-pressed={view === "daftar"} onClick={() => setView("daftar")}>Daftar indikator</button><button type="button" className={view === "opd" ? "active" : ""} aria-pressed={view === "opd"} onClick={() => setView("opd")}>Per OPD</button></span>}</div>
    {effectiveView === "daftar" ? (ordered.length === 0 ? <p className="muted">Tidak ada indikator pada status ini.</p> : <>
      <div className="portal-list" role="list">{ordered.slice(0, shown).map((item) => <CapaianRow key={item.indicator_id} item={item} />)}</div>
      {ordered.length > shown && <button type="button" className="portal-more" onClick={() => setShown((value) => value + PAGE)}>Tampilkan {Math.min(PAGE, ordered.length - shown)} lagi ({ordered.length - shown} tersisa)</button>}
    </>) : <>
      <h3 className="portal-sub">OPD yang perlu diarahkan ({opdBoard.length})</h3>
      {opdBoard.length === 0 ? <p className="muted">Tidak ada OPD yang perlu diarahkan.</p> : <div className="portal-list" role="list">{opdBoard.map((row) => <div key={row.opd} className="portal-row portal-row-opd" role="listitem"><div className="portal-row-name"><strong>{row.opd}</strong><small>{row.behind.length ? row.behind.join("; ") : "Tidak ada indikator yang belum tercapai"}</small></div><div className="portal-row-num"><b>{row.behind.length}</b><small>belum tercapai</small></div><div className="portal-row-num"><b>{row.missing.length}</b><small>belum ada realisasi</small></div></div>)}</div>}
    </>}
  </section>;
}
