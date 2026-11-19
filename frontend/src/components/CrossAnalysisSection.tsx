import { useState } from "react";
import { api, jsonBody } from "../api";
import { useAuth } from "../auth";
import { Badge } from "../components";
import { toast } from "../toast";
import { AppLink } from "./AppLink";
import { indicatorPath, num } from "../insight";
import { plain } from "../text";
import type { AchievementStatus } from "./AchievementSection";

export interface CrossRelated {
  indicator_id: string; name: string; unit: string; relation: "tautan_seri" | "isu_sama" | "fokus_sama"; relation_label: string; validated: boolean; review: "confirmed" | null;
  compare: { year: number; mine: number; related: number; mine_change_pct: number | null; related_change_pct: number | null; movement: "searah" | "berlawanan" | "stabil" | null } | null;
  latest_year: number; latest_value: number; same_year_value: number | null; year_match: boolean; status: AchievementStatus | null;
  trend: string; opds: string[]; correlation: { rho: number; years: number; direction: "searah" | "berlawanan" } | null;
}
export interface CrossRecommendation { opd: string; action: string; basis: string }
export interface CrossAnalysis {
  indicator: { indicator_id: string; name: string; focus_number: number | null; focus_name: string | null; issue_group: string; sheet_code: string | null; rpjmd_level: string | null; rpjmd_page: string | null; official_source: string | null };
  opd: { primary: string[]; support: string[]; support_text: string | null; basis: string | null };
  related: CrossRelated[];
  pending: Array<{ indicator_id: string; name: string; relation: string; opds: string[] }>;
  rejected: Array<{ indicator_id: string; name: string }>;
  districts: { available: boolean; year: number | null; priority: Array<{ name: string; value: number; previous: number | null }> };
  recommendations: CrossRecommendation[];
  limits: string[];
}

const statusLabel: Record<AchievementStatus, string> = { tercapai: "Tercapai", belum_tercapai: "Belum tercapai", belum_ada_data: "Belum ada data", tanpa_arah: "Arah belum ditetapkan", tanpa_target: "Target belum ada" };
const statusTone = (status: AchievementStatus) => status === "tercapai" ? "success" as const : status === "belum_tercapai" ? "danger" as const : "neutral" as const;
const basisLabel: Record<string, string> = { rpjmd_tabel_3_5: "Tabel 3.5 RPJMD", analisis_tusi: "Analisis tugas dan fungsi OPD" };

/** Keterkaitan satu indikator dengan indikator dan OPD lain pada isu atau fokus yang sama. Perbandingan hanya pada tahun yang sama. */
export function CrossAnalysisSection({ cross, onChanged }: { cross: CrossAnalysis | null; onChanged?: () => void }) {
  const { user } = useAuth();
  const canReview = user?.permissions.includes("connector.map") ?? false;
  const [busy, setBusy] = useState<string | null>(null);
  const review = async (relatedId: string, status: "confirmed" | "rejected" | "reset") => {
    if (!cross) return;
    setBusy(relatedId);
    try {
      await api(`/executive/indicators/${encodeURIComponent(cross.indicator.indicator_id)}/relations/${encodeURIComponent(relatedId)}`, { method: "PUT", mutation: true, body: jsonBody({ status }) });
      toast.success(status === "confirmed" ? "Keterkaitan divalidasi" : status === "rejected" ? "Keterkaitan dikecualikan dari analisis" : "Keterkaitan dikembalikan menjadi usulan sistem");
      onChanged?.();
    } catch (error) { toast.error("Validasi belum tersimpan", error instanceof Error ? error.message : undefined); }
    finally { setBusy(null); }
  };
  if (!cross) return <p className="muted">Keterkaitan lintas OPD belum dapat dimuat untuk indikator ini.</p>;
  const { indicator, opd } = cross;
  return <>
    {indicator.focus_number !== null && <dl className="cross-meta">
      <div><dt>Fokus kebijakan</dt><dd>{indicator.focus_number}. {plain(indicator.focus_name ?? "")}</dd></div>
      <div><dt>Kelompok isu</dt><dd>{plain(indicator.issue_group)}{indicator.sheet_code ? ` (${indicator.sheet_code})` : ""}</dd></div>
      {indicator.rpjmd_level && <div><dt>Level di RPJMD</dt><dd>{indicator.rpjmd_level}{indicator.rpjmd_page ? `, hal. ${indicator.rpjmd_page}` : ""}</dd></div>}
      <div><dt>OPD penanggung jawab utama</dt><dd>{opd.primary.length ? opd.primary.join(", ") : "Belum dipetakan"}{opd.basis ? ` (${basisLabel[opd.basis] ?? opd.basis})` : ""}</dd></div>
      <div><dt>OPD pendukung</dt><dd>{opd.support.length ? opd.support.join(", ") : "Belum dipetakan"}</dd></div>
      {indicator.official_source && <div><dt>Sumber data resmi</dt><dd>{plain(indicator.official_source)}</dd></div>}
    </dl>}
    {cross.related.length === 0 ? <p className="muted">Belum ada indikator terkait yang datanya tersedia untuk dibandingkan.</p> : <div className="table-scroll"><table className="all-table cross-table">
      <thead><tr><th>Indikator terkait</th><th>Hubungan</th><th>Nilai terbaru</th><th>Status</th><th>OPD</th>{canReview && <th>Validasi</th>}</tr></thead>
      <tbody>{cross.related.map((entry) => <tr key={entry.indicator_id}>
        <td><AppLink to={indicatorPath(entry.indicator_id)}>{plain(entry.name)}</AppLink><small>Tren {entry.trend}</small></td>
        <td><Badge tone={entry.validated ? "success" : "neutral"}>{entry.review === "confirmed" ? "Divalidasi BAPPERIDA" : entry.validated ? "Tautan BAPPERIDA" : "Usulan sistem"}</Badge><small>{entry.relation === "isu_sama" ? "Isu yang sama" : entry.relation === "fokus_sama" ? "Fokus yang sama" : "Seri Data tertaut"}</small>
          {entry.correlation && Math.abs(entry.correlation.rho) >= 0.6 && <small>Korelasi {num(entry.correlation.rho)} ({entry.correlation.direction}, {entry.correlation.years} tahun)</small>}</td>
        <td>{num(entry.latest_value)} {plain(entry.unit)}<small>{entry.year_match ? `Tahun ${entry.latest_year}` : `Tahun ${entry.latest_year}, berbeda dari indikator ini`}</small>
          {entry.compare && !entry.year_match && <small>Pada {entry.compare.year} (tahun bersama): {num(entry.compare.mine)} dan {num(entry.compare.related)}{entry.compare.movement ? `, bergerak ${entry.compare.movement}` : ""}</small>}
          {entry.compare && entry.year_match && entry.compare.movement && <small>Dari tahun sebelumnya bergerak {entry.compare.movement}</small>}
          {!entry.compare && <small>Tidak punya tahun yang sama, tidak dibandingkan</small>}</td>
        <td>{entry.status ? <Badge tone={statusTone(entry.status)}>{statusLabel[entry.status]}</Badge> : <span className="muted">Tanpa target</span>}</td>
        <td>{entry.opds.length ? entry.opds.slice(0, 2).join(", ") : "-"}</td>
        {canReview && <td>{entry.relation === "tautan_seri" ? <span className="muted">Tautan Seri Data</span> : <span className="cross-actions">
          {entry.review !== "confirmed" && <button type="button" className="button secondary" disabled={busy === entry.indicator_id} onClick={() => void review(entry.indicator_id, "confirmed")}>Validasi</button>}
          {entry.review === "confirmed" && <button type="button" className="button secondary" disabled={busy === entry.indicator_id} onClick={() => void review(entry.indicator_id, "reset")}>Batalkan</button>}
          <button type="button" className="button secondary" disabled={busy === entry.indicator_id} onClick={() => void review(entry.indicator_id, "rejected")}>Kecualikan</button></span>}</td>}
      </tr>)}</tbody></table></div>}
    {canReview && cross.rejected.length > 0 && <p className="muted cross-pending">Dikecualikan dari analisis: {cross.rejected.map((entry) => <span key={entry.indicator_id}>{plain(entry.name)} <button type="button" className="link-button" disabled={busy === entry.indicator_id} onClick={() => void review(entry.indicator_id, "reset")}>Pulihkan</button>{"; "}</span>)}</p>}
    {cross.pending.length > 0 && <p className="muted cross-pending">Belum terbit pada isu atau fokus yang sama: {cross.pending.slice(0, 4).map((entry) => `${plain(entry.name)}${entry.opds.length ? ` (${entry.opds.slice(0, 2).join(", ")})` : ""}`).join("; ")}.</p>}
    {cross.districts.priority.length > 0 && <p><strong>Kecamatan prioritas ({cross.districts.year}):</strong> {cross.districts.priority.map((entry) => `${entry.name} (${num(entry.value)})`).join(", ")}, yaitu nilai paling jauh dari arah yang diharapkan.</p>}
    {cross.limits.length > 0 && <ul className="cross-limits">{cross.limits.map((text) => <li key={text}>{plain(text)}</li>)}</ul>}
  </>;
}

/** Rekomendasi per OPD hasil analisis silang. */
export function CrossRecommendations({ cross }: { cross: CrossAnalysis | null }) {
  if (!cross || cross.recommendations.length === 0) return null;
  return <ol className="cross-recs" aria-label="Rekomendasi per OPD">{cross.recommendations.map((entry, index) => <li key={`${entry.opd}-${index}`}><strong>{plain(entry.opd)}</strong><span>{plain(entry.action)}</span><small>Dasar: {plain(entry.basis)}</small></li>)}</ol>;
}
