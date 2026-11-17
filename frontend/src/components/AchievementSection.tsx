import { useMemo, useState } from "react";
import { Badge } from "../components";
import { AppLink } from "./AppLink";
import { indicatorPath, num } from "../insight";
import { plain } from "../text";

export type AchievementStatus = "tercapai" | "belum_tercapai" | "belum_ada_data" | "tanpa_arah" | "tanpa_target";
export interface AchievementItem {
  indicator_id: string; name: string; sector: string; unit: string; source_kind: "rpjmd" | "opd";
  latest_year: number | null; latest_value: number | null; target_year: number | null; target_value: number | null;
  gap: number | null; gap_pct: number | null; status: AchievementStatus; opds: string[]; follow_up: string;
}
export interface AchievementResponse {
  generated_at: string; current_year: number;
  summary: { total: number; tercapai: number; belum_tercapai: number; belum_ada_data: number; tanpa_arah: number; tanpa_target: number };
  items: AchievementItem[];
}

const statusLabel: Record<AchievementStatus, string> = { tercapai: "Tercapai", belum_tercapai: "Belum tercapai", belum_ada_data: "Belum ada data", tanpa_arah: "Arah belum ditetapkan", tanpa_target: "Target belum ada" };
const tone = (status: AchievementStatus) => status === "tercapai" ? "success" : status === "belum_tercapai" ? "warning" : "neutral";
const order: Record<AchievementStatus, number> = { belum_tercapai: 0, belum_ada_data: 1, tanpa_target: 2, tanpa_arah: 3, tercapai: 4 };
const signed = (value: number) => `${value > 0 ? "+" : ""}${num(value)}`;

function SectorBlock({ sector, items }: { sector: string; items: AchievementItem[] }) {
  const sorted = [...items].sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, "id"));
  const done = items.filter((item) => item.status === "tercapai").length;
  const behind = sorted.filter((item) => item.status === "belum_tercapai");
  const missing = sorted.filter((item) => item.status === "belum_ada_data");
  const worst = [...behind].sort((a, b) => Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0))[0];
  const opds = [...new Set([...behind, ...missing].flatMap((item) => item.opds))];
  const summary = behind.length
    ? `${done} dari ${items.length} indikator tercapai. ${behind.length} belum tercapai${worst && worst.latest_value !== null && worst.target_value !== null ? `; selisih terbesar pada ${plain(worst.name)}: ${num(worst.latest_value)} dari target ${num(worst.target_value)} (${worst.latest_year}).` : "."}${missing.length ? ` ${missing.length} belum ada realisasi.` : ""}`
    : `${done} dari ${items.length} indikator tercapai.${missing.length ? ` ${missing.length} belum ada realisasi yang terbit.` : ""}`;
  return <section className="achv-sector" aria-label={plain(sector)}>
    <header><h3>{plain(sector)}</h3><Badge tone={behind.length ? "warning" : missing.length ? "neutral" : "success"}>{done} dari {items.length} tercapai</Badge></header>
    <p className="achv-summary">{summary}</p>
    <div className="table-scroll"><table className="all-table achv-table"><thead><tr><th>Indikator</th><th>Realisasi</th><th>Target</th><th>Selisih</th><th>Status</th></tr></thead><tbody>
      {sorted.map((item) => <tr key={item.indicator_id}>
        <td><strong><AppLink to={indicatorPath(item.indicator_id)}>{plain(item.name)}</AppLink></strong><small>{item.opds.join(", ") || "OPD belum dipetakan"}</small></td>
        <td className="num">{item.latest_value === null ? "-" : <><strong>{num(item.latest_value)}</strong><small>{plain(item.unit)} · {item.latest_year}</small></>}</td>
        <td className="num">{item.target_value === null ? "-" : <><strong>{num(item.target_value)}</strong><small>target {item.target_year}</small></>}</td>
        <td className={`num ${item.status === "belum_tercapai" ? "bad" : item.status === "tercapai" ? "good" : ""}`}>{item.gap === null ? "-" : signed(item.gap)}</td>
        <td><Badge tone={tone(item.status)}>{statusLabel[item.status]}</Badge></td>
      </tr>)}
    </tbody></table></div>
    {(behind.length > 0 || missing.length > 0) && <dl className="brief-list achv-brief">
      <div><dt>Tindak lanjut</dt><dd><ul>{[...behind, ...missing].map((item) => <li key={item.indicator_id}><b>{plain(item.name)}.</b> {plain(item.follow_up)}</li>)}</ul></dd></div>
      <div><dt>OPD yang perlu diarahkan</dt><dd>{opds.length ? opds.join(", ") : "OPD penanggung jawab belum dipetakan."}</dd></div>
    </dl>}
  </section>;
}

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

export function AchievementSection({ data }: { data: AchievementResponse }) {
  const [showAll, setShowAll] = useState(false);
  const groups = useMemo(() => {
    const map = new Map<string, AchievementItem[]>();
    for (const item of data.items) map.set(item.sector, [...(map.get(item.sector) ?? []), item]);
    return [...map.entries()].map(([sector, items]) => ({ sector, items, behind: items.filter((i) => i.status === "belum_tercapai").length, missing: items.filter((i) => i.status === "belum_ada_data").length }));
  }, [data.items]);
  const attention = groups.filter((g) => g.behind > 0 || g.missing > 0).sort((a, b) => b.behind - a.behind || b.missing - a.missing || a.sector.localeCompare(b.sector, "id"));
  const achieved = groups.filter((g) => g.behind === 0 && g.missing === 0).sort((a, b) => a.sector.localeCompare(b.sector, "id"));
  const opdBoard = useMemo(() => {
    const map = new Map<string, { opd: string; behind: string[]; missing: string[] }>();
    for (const item of data.items) {
      if (item.status !== "belum_tercapai" && item.status !== "belum_ada_data") continue;
      for (const opd of item.opds.length ? item.opds : ["OPD belum dipetakan"]) {
        const row = map.get(opd) ?? { opd, behind: [], missing: [] };
        (item.status === "belum_tercapai" ? row.behind : row.missing).push(plain(item.name)); map.set(opd, row);
      }
    }
    return [...map.values()].sort((a, b) => b.behind.length - a.behind.length || b.missing.length - a.missing.length).slice(0, 8);
  }, [data.items]);
  const shown = showAll ? attention : attention.slice(0, 4);
  return <section className="panel-card achievement" aria-labelledby="capaian">
    <header className="card-head"><div><h2 id="capaian">Capaian target RPJMD</h2><p>Realisasi terbit terbaru dibandingkan target tahun yang sama. Sektor dengan indikator belum tercapai ditampilkan lebih dulu.</p></div><button type="button" className="button secondary" onClick={() => downloadCsv(data.items)}>Unduh CSV</button></header>
    {attention.length === 0 ? <p className="muted">Seluruh indikator bertarget sudah tercapai.</p> : <>
      <h3 className="achv-heading">Belum tercapai atau belum ada data ({attention.length} sektor)</h3>
      {shown.map((group) => <SectorBlock key={group.sector} sector={group.sector} items={group.items} />)}
      {attention.length > 4 && <button type="button" className="button secondary" onClick={() => setShowAll((value) => !value)}>{showAll ? "Tampilkan lebih sedikit" : `Tampilkan ${attention.length - 4} sektor lainnya`}</button>}
    </>}
    {opdBoard.length > 0 && <>
      <h3 className="achv-heading">OPD yang perlu diarahkan</h3>
      <div className="table-scroll"><table className="all-table"><thead><tr><th>OPD</th><th>Belum tercapai</th><th>Belum ada data</th></tr></thead><tbody>
        {opdBoard.map((row) => <tr key={row.opd}><td><strong>{row.opd}</strong></td><td>{row.behind.length ? <><b>{row.behind.length}</b><small>{row.behind.join("; ")}</small></> : "-"}</td><td>{row.missing.length ? <><b>{row.missing.length}</b><small>{row.missing.join("; ")}</small></> : "-"}</td></tr>)}
      </tbody></table></div>
    </>}
    {achieved.length > 0 && <>
      <h3 className="achv-heading">Sudah tercapai ({achieved.length} sektor)</h3>
      <ul className="achv-done">{achieved.map((group) => <li key={group.sector}><Badge tone="success">Tercapai</Badge><span><strong>{plain(group.sector)}</strong><small>{group.items.map((item) => `${plain(item.name)} ${item.latest_value === null ? "" : num(item.latest_value)}`.trim()).join("; ")}</small></span></li>)}</ul>
    </>}
  </section>;
}
