import { useMemo, useState } from "react";
import { AppLink } from "./AppLink";
import type { AchievementItem, AchievementStatus } from "./AchievementSection";
import { indicatorPath, num } from "../insight";
import { plain } from "../text";

const statusLabel: Record<AchievementStatus, string> = { tercapai: "Tercapai", belum_tercapai: "Belum tercapai", belum_ada_data: "Belum ada realisasi", tanpa_arah: "Arah belum ditetapkan", tanpa_target: "Target belum ada" };
const statusTone = (status: AchievementStatus) => status === "tercapai" ? "ok" : status === "belum_tercapai" ? "bad" : "na";
const statusRank: Record<AchievementStatus, number> = { belum_tercapai: 0, tercapai: 1, belum_ada_data: 2, tanpa_arah: 3, tanpa_target: 4 };

/** Seberapa dekat realisasi dengan target (0 sampai 1), memperhitungkan arah baik indikator. */
function progress(item: AchievementItem): number {
  if (item.latest_value === null || item.target_value === null || item.target_value === 0) return 0;
  if (item.direction === "decrease") return item.latest_value <= 0 ? 1 : Math.max(0, Math.min(1, item.target_value / item.latest_value));
  return Math.max(0, Math.min(1, item.latest_value / item.target_value));
}

/** Kartu indikator bergaya portal data: lencana sektor dan status, nilai terbaru, kemajuan menuju target, tahun data. */
export function IndicatorCards({ items, onOpenAll, limit = 8 }: { items: AchievementItem[]; onOpenAll(): void; limit?: number }) {
  const [sector, setSector] = useState("");
  const sectors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.sector, (counts.get(item.sector) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id")).slice(0, 5).map(([name]) => name);
  }, [items]);
  const shown = useMemo(() => items
    .filter((item) => !sector || item.sector === sector)
    .sort((a, b) => statusRank[a.status] - statusRank[b.status] || Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0) || a.name.localeCompare(b.name, "id"))
    .slice(0, limit), [items, sector, limit]);
  return <section className="portal-section" aria-labelledby="sorotan-indikator">
    <header className="portal-section-head"><h2 id="sorotan-indikator">Indikator yang perlu diperhatikan</h2><p>Indikator yang belum mencapai target tampil lebih dahulu. Pilih kartu untuk membuka lembar indikatornya.</p></header>
    <div className="portal-chips" role="group" aria-label="Filter sektor">
      <button type="button" className={`portal-chip${sector === "" ? " active" : ""}`} aria-pressed={sector === ""} onClick={() => setSector("")}>Semua</button>
      {sectors.map((name) => <button key={name} type="button" className={`portal-chip${sector === name ? " active" : ""}`} aria-pressed={sector === name} title={plain(name)} onClick={() => setSector(name)}>{plain(name)}</button>)}
    </div>
    {shown.length === 0 ? <p className="muted">Belum ada indikator pada sektor ini.</p> : <div className="portal-cards">
      {shown.map((item) => {
        const tone = statusTone(item.status);
        const has = item.latest_value !== null;
        return <AppLink key={item.indicator_id} to={indicatorPath(item.indicator_id)} className="portal-card">
          <span className="portal-tags"><span className="portal-tag">{plain(item.sector)}</span><span className={`portal-tag ${tone}`}>{statusLabel[item.status]}</span></span>
          <h3>{plain(item.name)}</h3>
          <span className="portal-value">{has ? <><b>{num(item.latest_value!)}</b><span>{plain(item.unit)}</span></> : <><b>-</b><span>belum terbit</span></>}</span>
          <span className={`portal-progress ${tone}`} role="img" aria-label={has && item.target_value !== null ? `Capaian ${Math.round(progress(item) * 100)} persen menuju target` : "Belum ada realisasi"}><i style={{ width: `${Math.round(progress(item) * 100)}%` }} /></span>
          <small>{item.target_value !== null ? `Target ${item.target_year}: ${num(item.target_value)} ${plain(item.unit)}` : "Target belum ada"}{has ? ` · Data tahun ${item.latest_year}` : ""}</small>
          {item.opds.length > 0 && <small className="portal-opd">OPD: {item.opds.slice(0, 3).join(", ")}</small>}
        </AppLink>;
      })}
    </div>}
    <button type="button" className="portal-more" onClick={onOpenAll}>Lihat semua indikator</button>
  </section>;
}
