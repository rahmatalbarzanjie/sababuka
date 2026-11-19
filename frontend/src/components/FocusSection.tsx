import { useState } from "react";
import { api } from "../api";
import { Badge, EmptyState, ErrorState, PageLoading, useAsync } from "../components";
import { AppLink } from "./AppLink";
import { indicatorPath, num } from "../insight";
import { plain } from "../text";
import type { AchievementStatus } from "./AchievementSection";

interface FocusIndicator {
  indicator_id: string; name: string; unit: string; sheet_code: string | null; status: AchievementStatus; latest_year: number | null; latest_value: number | null;
  target_year: number | null; target_value: number | null; primary_opds: string[]; support_opds: string[];
}
interface FocusIssue { issue_group: string; sheet_code: string | null; gap: boolean; note: string | null; indicators: FocusIndicator[] }
interface FocusSummary { number: number; name: string; total: number; tercapai: number; belum_tercapai: number; belum_ada_data: number; narrative: string; issues: FocusIssue[]; lead_opds: Array<{ opd: string; total: number; belum_tercapai: number }> }
interface FocusOverview { generated_at: string; focuses: FocusSummary[] }

const statusLabel: Record<AchievementStatus, string> = { tercapai: "Tercapai", belum_tercapai: "Belum tercapai", belum_ada_data: "Belum ada data", tanpa_arah: "Arah belum ditetapkan", tanpa_target: "Target belum ada" };
const tone = (status: AchievementStatus) => status === "tercapai" ? "success" as const : status === "belum_tercapai" ? "danger" as const : "neutral" as const;

/** Capaian per fokus kebijakan Bupati: pilih fokus, baca narasi, lalu telusuri kelompok isu, indikator, dan OPD penanggung jawab. */
export function FocusSection() {
  const data = useAsync(() => api<FocusOverview>("/executive/focus"), []);
  const [picked, setPicked] = useState<number | null>(null);
  if (data.loading) return <PageLoading />;
  if (data.error || !data.data) return <ErrorState title="Fokus kebijakan belum dapat dimuat" onRetry={data.reload}>{data.error}</ErrorState>;
  const focuses = data.data.focuses.filter((entry) => entry.total > 0 || entry.issues.length > 0);
  if (focuses.length === 0) return <EmptyState title="Belum ada fokus kebijakan">Indikator RPJMD belum dipetakan ke fokus kebijakan.</EmptyState>;
  const defaultFocus = [...focuses].sort((a, b) => b.belum_tercapai - a.belum_tercapai || a.number - b.number)[0]!.number;
  const active = focuses.find((entry) => entry.number === (picked ?? defaultFocus)) ?? focuses[0]!;
  return <section className="panel-card focus-section" aria-labelledby="fokus-judul">
    <header className="card-head"><div><h2 id="fokus-judul">Fokus kebijakan Bupati</h2><p>Pilih fokus untuk melihat capaian, kelompok isu, dan OPD penanggung jawab.</p></div></header>
    <div className="focus-picker" role="group" aria-label="Pilih fokus kebijakan">
      {focuses.map((entry) => <button key={entry.number} type="button" className={`focus-chip${entry.number === active.number ? " active" : ""}`} aria-pressed={entry.number === active.number} onClick={() => setPicked(entry.number)}>
        <b>Fokus {entry.number}</b><span>{plain(entry.name)}</span>
        <small>{entry.belum_tercapai > 0 ? `${entry.belum_tercapai} belum tercapai` : entry.tercapai > 0 ? `${entry.tercapai} tercapai` : `${entry.belum_ada_data} menunggu realisasi`}</small>
      </button>)}
    </div>
    <div className="focus-detail">
      <h3>{active.number}. {plain(active.name)}</h3>
      <p className="focus-narrative">{plain(active.narrative)}</p>
      <div className="achv-badges"><Badge tone="success">{active.tercapai} tercapai</Badge><Badge tone="danger">{active.belum_tercapai} belum tercapai</Badge><Badge tone="neutral">{active.belum_ada_data} belum ada realisasi</Badge></div>
      {active.lead_opds.length > 0 && <p className="muted focus-opds">OPD penanggung jawab utama: {active.lead_opds.map((lead) => `${lead.opd} (${lead.total} indikator${lead.belum_tercapai > 0 ? `, ${lead.belum_tercapai} belum tercapai` : ""})`).join("; ")}.</p>}
      {active.issues.map((issue) => <details key={issue.issue_group} className="achv-sector" open={issue.indicators.some((entry) => entry.status === "belum_tercapai")}>
        <summary><h4>{issue.sheet_code ? `${issue.sheet_code} ` : ""}{plain(issue.issue_group)}</h4><span className="achv-badges">{issue.gap ? <Badge tone="warning">Belum ada indikator</Badge> : <Badge tone="neutral">{issue.indicators.length} indikator</Badge>}</span></summary>
        {issue.gap ? <p className="muted">{plain(issue.note ?? "")}</p> : <div className="table-scroll"><table className="all-table achv-table"><thead><tr><th>Indikator</th><th>Realisasi</th><th>Target</th><th>Status</th><th>OPD utama</th></tr></thead><tbody>
          {issue.indicators.map((row) => <tr key={row.indicator_id}>
            <td><AppLink to={indicatorPath(row.indicator_id)}>{plain(row.name)}</AppLink></td>
            <td>{row.latest_value === null ? "-" : `${num(row.latest_value)} ${plain(row.unit)}`}{row.latest_year ? <small> {row.latest_year}</small> : null}</td>
            <td>{row.target_value === null ? "-" : `${num(row.target_value)} ${plain(row.unit)}`}{row.target_year ? <small> {row.target_year}</small> : null}</td>
            <td><Badge tone={tone(row.status)}>{statusLabel[row.status]}</Badge></td>
            <td>{row.primary_opds.length ? row.primary_opds.join(", ") : "-"}</td>
          </tr>)}</tbody></table></div>}
      </details>)}
    </div>
    <p className="muted focus-note">Pengelompokan fokus dan kelompok isu adalah hasil analisis, bukan klasifikasi resmi dokumen RPJMD.</p>
  </section>;
}
