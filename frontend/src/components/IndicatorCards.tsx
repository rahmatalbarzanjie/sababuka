import { useMemo, useState } from "react";
import { AppLink } from "./AppLink";
import { downloadCsv } from "./AchievementSection";
import type { AchievementItem, AchievementStatus } from "./AchievementSection";
import { indicatorPath, num, toneOf, type Insight } from "../insight";
import { Sparkline } from "./InsightVisuals";
import { plain } from "../text";

/** Nama sektor yang dipendekkan untuk chip dan lencana kartu. Nama lengkap tetap tersedia lewat title. */
const SHORT: Record<string, string> = {
  "Kesejahteraan, kemiskinan, dan ketenagakerjaan": "Kesejahteraan", "Ketersediaan dan diversifikasi pangan": "Pangan", "Pariwisata dan ekonomi berbasis budaya": "Pariwisata",
  "Kualitas lingkungan hidup": "Lingkungan", "Kesehatan dan stunting": "Kesehatan", "Konektivitas darat-sungai": "Konektivitas", "Produktivitas dan nilai tambah pertanian": "Pertanian",
  "Pertumbuhan dan daya saing daerah": "Ekonomi", "Industrialisasi berbasis SDA lokal": "Industri", "Iklim, ekonomi hijau, dan keanekaragaman hayati": "Iklim dan hijau",
  "Kemandirian dan akuntabilitas fiskal": "Fiskal", "Digitalisasi pemerintahan dan inovasi": "Digitalisasi", "Kemandirian desa": "Desa", "Pendidikan dan literasi": "Pendidikan",
  "Hilirisasi perikanan": "Perikanan", "UMKM, perdagangan, dan kewirausahaan": "UMKM", "Iklim dan daya tarik investasi": "Investasi", "Pelayanan publik dan profesionalitas ASN": "Pelayanan publik",
  "Keluarga, gender, dan perlindungan anak": "Keluarga", "Air minum, sanitasi, dan drainase": "Air dan sanitasi", "Permukiman layak": "Permukiman", "Pengendalian tata ruang": "Tata ruang",
  "Reformasi birokrasi dan akuntabilitas": "Birokrasi", "Stabilitas harga pangan dan barang pokok": "Harga pangan", "Pengurangan risiko bencana": "Kebencanaan", "Kerukunan dan kohesi sosial": "Kerukunan", "Pelestarian budaya": "Budaya",
};
export const shortSector = (name: string): string => SHORT[name] ?? plain(name).split(/,| dan /)[0]!.trim();

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
export type CardFilter = "dinilai" | "tercapai" | "belum_tercapai" | "belum_ada_data";
const filterText: Record<CardFilter, { title: string; text: string }> = {
  dinilai: { title: "Indikator tercapai dan belum tercapai", text: "Indikator yang sudah memiliki realisasi dibandingkan target tahun yang sama. Yang belum tercapai tampil lebih dahulu. Pilih kartu untuk membuka lembar indikatornya." },
  tercapai: { title: "Indikator yang sudah tercapai", text: "Realisasi terbaru memenuhi target tahun yang sama. Capaian yang perlu dipertahankan." },
  belum_tercapai: { title: "Indikator yang belum tercapai", text: "Realisasi di bawah target. Diurutkan menurut selisih terbesar terhadap target." },
  belum_ada_data: { title: "Indikator yang belum ada realisasi", text: "Menunggu pengisian OPD atau belum terbit, sehingga belum dapat dinilai terhadap target." },
};
const PAGE = 12;

/** Daftar kartu indikator menurut filter dari pita angka, dapat disaring per sektor, dengan unduhan CSV seluruh capaian. */
export function IndicatorCards({ items, trends, filter, allItems }: { items: AchievementItem[]; trends: Map<string, Insight>; filter: CardFilter; allItems: AchievementItem[] }) {
  const [shown, setShown] = useState(PAGE);
  const inFilter = useMemo(() => items.filter((item) => filter === "dinilai" ? item.status === "tercapai" || item.status === "belum_tercapai" : item.status === filter), [items, filter]);
  const [sector, setSector] = useState("");
  const sectors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of inFilter) counts.set(item.sector, (counts.get(item.sector) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "id")).slice(0, 5).map(([name]) => name);
  }, [items]);
  const list = useMemo(() => inFilter
    .filter((item) => !sector || item.sector === sector)
    .sort((a, b) => statusRank[a.status] - statusRank[b.status] || Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0) || a.name.localeCompare(b.name, "id")), [inFilter, sector]);
  return <section className="portal-section" aria-labelledby="sorotan-indikator">
    <header className="portal-section-head portal-section-split"><div><h2 id="sorotan-indikator">{filterText[filter].title} ({inFilter.length})</h2><p>{filterText[filter].text}</p></div><button type="button" className="portal-more" onClick={() => downloadCsv(allItems)}>Unduh CSV</button></header>
    <div className="portal-chips" role="group" aria-label="Filter sektor">
      <button type="button" className={`portal-chip${sector === "" ? " active" : ""}`} aria-pressed={sector === ""} onClick={() => { setSector(""); setShown(PAGE); }}>Semua</button>
      {sectors.map((name) => <button key={name} type="button" className={`portal-chip${sector === name ? " active" : ""}`} aria-pressed={sector === name} title={plain(name)} onClick={() => { setSector(name); setShown(PAGE); }}>{shortSector(name)}</button>)}
    </div>
    {list.length === 0 ? <p className="muted">Belum ada indikator pada pilihan ini.</p> : <div className="portal-cards">
      {list.slice(0, shown).map((item) => {
        const tone = statusTone(item.status);
        const has = item.latest_value !== null;
        return <AppLink key={item.indicator_id} to={indicatorPath(item.indicator_id)} className="portal-card">
          <span className="portal-tags"><span className="portal-tag" title={plain(item.sector)}>{shortSector(item.sector)}</span><span className={`portal-tag ${tone}`}>{statusLabel[item.status]}</span></span>
          <h3>{plain(item.name)}</h3>
          <span className="portal-value">{has ? <><b>{num(item.latest_value!)}</b><span>{plain(item.unit)}</span></> : <><b>-</b><span>belum terbit</span></>}{(() => { const trend = trends.get(item.indicator_id); return trend && trend.series.length >= 2 ? <span className="portal-spark" aria-label={`Tren ${trend.series[0]!.year} sampai ${trend.latest_year}`} role="img"><Sparkline points={trend.series} tone={toneOf(trend.assessment)} /></span> : null; })()}</span>
          <span className={`portal-progress ${tone}`} role="img" aria-label={has && item.target_value !== null ? `Capaian ${Math.round(progress(item) * 100)} persen menuju target` : "Belum ada realisasi"}><i style={{ width: `${Math.round(progress(item) * 100)}%` }} /></span>
          <small>{item.target_value !== null ? `Target ${item.target_year}: ${num(item.target_value)} ${plain(item.unit)}` : "Target belum ada"}{has ? ` · Data tahun ${item.latest_year}` : ""}</small>
          {item.opds.length > 0 && <small className="portal-opd">OPD: {item.opds.slice(0, 3).join(", ")}</small>}
        </AppLink>;
      })}
    </div>}
    {list.length > shown && <button type="button" className="portal-more" onClick={() => setShown((value) => value + PAGE)}>Tampilkan {Math.min(PAGE, list.length - shown)} lagi ({list.length - shown} tersisa)</button>}
  </section>;
}
