import type { Database, QueryResultRow } from "../database.js";
import { AchievementService, type AchievementItem } from "./achievement-service.js";
import { CrossAnalysisService, type IndicatorContext } from "./cross-analysis-service.js";
import { plainDash } from "./plain-text.js";

export interface FocusIndicator {
  indicator_id: string; name: string; unit: string; sheet_code: string | null; status: AchievementItem["status"];
  latest_year: number | null; latest_value: number | null; target_year: number | null; target_value: number | null; gap_pct: number | null; primary_opds: string[]; support_opds: string[];
}
export interface FocusIssue { issue_group: string; sheet_code: string | null; gap: boolean; note: string | null; indicators: FocusIndicator[] }
export interface FocusSummary {
  number: number; name: string; total: number; tercapai: number; belum_tercapai: number; belum_ada_data: number; tanpa_target: number;
  narrative: string; issues: FocusIssue[]; lead_opds: Array<{ opd: string; total: number; belum_tercapai: number }>;
}
export interface FocusOverview { generated_at: string; focuses: FocusSummary[] }

export interface IssueGapRow { focus_number: number; issue_group: string }

const count = (items: FocusIndicator[], status: AchievementItem["status"]) => items.filter((item) => item.status === status).length;

/** Ringkasan per fokus kebijakan Bupati: capaian terhadap target, kelompok isu, dan beban OPD penanggung jawab utama. Narasi memakai templat, bukan kalimat bebas. */
export function buildFocusOverview(contexts: Map<string, IndicatorContext>, achievement: AchievementItem[], gaps: IssueGapRow[], focusNames: Map<number, string>): FocusOverview {
  const byAchievement = new Map(achievement.map((item) => [item.indicator_id, item]));
  const focuses = new Map<number, FocusIndicator[]>();
  for (const ctx of contexts.values()) {
    if (ctx.focus_number === null) continue;
    const item = byAchievement.get(ctx.indicator_id);
    const row: FocusIndicator = {
      indicator_id: ctx.indicator_id, name: item?.name ?? ctx.name, unit: item?.unit ?? "", sheet_code: ctx.sheet_code, status: item?.status ?? "tanpa_target",
      latest_year: item?.latest_year ?? null, latest_value: item?.latest_value ?? null, target_year: item?.target_year ?? null, target_value: item?.target_value ?? null, gap_pct: item?.gap_pct ?? null,
      primary_opds: ctx.primary_opds, support_opds: ctx.support_opds,
    };
    focuses.set(ctx.focus_number, [...(focuses.get(ctx.focus_number) ?? []), row]);
  }
  const summaries: FocusSummary[] = [...focusNames.entries()].sort((a, b) => a[0] - b[0]).map(([number, name]) => {
    const rows = focuses.get(number) ?? [];
    const issues = new Map<string, FocusIssue>();
    for (const row of rows) {
      const ctx = contexts.get(row.indicator_id)!;
      const entry = issues.get(ctx.issue_group) ?? { issue_group: ctx.issue_group, sheet_code: row.sheet_code, gap: false, note: null, indicators: [] };
      entry.indicators.push(row); issues.set(ctx.issue_group, entry);
    }
    for (const gap of gaps.filter((item) => item.focus_number === number)) if (!issues.has(gap.issue_group)) issues.set(gap.issue_group, { issue_group: gap.issue_group, sheet_code: null, gap: true, note: "Belum ada indikator capaian pada Tabel 3.3 RPJMD untuk kelompok isu ini.", indicators: [] });
    const ordered = [...issues.values()].sort((a, b) => (a.sheet_code ?? "99").localeCompare(b.sheet_code ?? "99", "id", { numeric: true }) || a.issue_group.localeCompare(b.issue_group, "id"));
    for (const issue of ordered) issue.indicators.sort((a, b) => Number(b.status === "belum_tercapai") - Number(a.status === "belum_tercapai") || Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0) || a.name.localeCompare(b.name, "id"));
    const load = new Map<string, { total: number; belum: number }>();
    for (const row of rows) { const lead = row.primary_opds[0]; if (!lead) continue; const entry = load.get(lead) ?? { total: 0, belum: 0 }; entry.total += 1; if (row.status === "belum_tercapai") entry.belum += 1; load.set(lead, entry); }
    const tercapai = count(rows, "tercapai"); const belum = count(rows, "belum_tercapai"); const nodata = count(rows, "belum_ada_data");
    const assessed = tercapai + belum;
    const worst = [...rows].filter((row) => row.status === "belum_tercapai").sort((a, b) => Math.abs(b.gap_pct ?? 0) - Math.abs(a.gap_pct ?? 0))[0];
    const narrative = rows.length === 0 ? "Belum ada indikator RPJMD yang terpetakan pada fokus ini."
      : assessed === 0 ? `Belum ada indikator pada fokus ini yang dapat dinilai terhadap target; ${nodata} menunggu realisasi.`
        : `${tercapai} dari ${assessed} indikator yang sudah memiliki realisasi telah mencapai target${belum > 0 ? `; ${belum} belum tercapai${worst ? `, selisih terbesar pada ${worst.name}` : ""}` : ""}${nodata > 0 ? `; ${nodata} menunggu realisasi` : ""}.`;
    return {
      number, name: plainDash(name), total: rows.length, tercapai, belum_tercapai: belum, belum_ada_data: nodata, tanpa_target: rows.length - tercapai - belum - nodata,
      narrative: plainDash(narrative), issues: ordered, lead_opds: [...load.entries()].map(([opd, value]) => ({ opd, total: value.total, belum_tercapai: value.belum })).sort((a, b) => b.belum_tercapai - a.belum_tercapai || b.total - a.total || a.opd.localeCompare(b.opd, "id")),
    };
  });
  return { generated_at: new Date().toISOString(), focuses: summaries };
}

export class FocusService {
  constructor(private readonly db: Database) {}

  async overview(known?: { contexts?: Map<string, IndicatorContext>; achievement?: AchievementItem[] }): Promise<FocusOverview> {
    const [contexts, achievement] = await Promise.all([known?.contexts ?? new CrossAnalysisService(this.db).contexts(), known?.achievement ?? new AchievementService(this.db).list().then((result) => result.items)]);
    const focusRows = await this.db.query<QueryResultRow & { code: string; name: string }>(`SELECT code, name FROM sababuka.policy_focuses WHERE is_active = true ORDER BY display_order, code`);
    const focusNames = new Map<number, string>();
    for (const row of focusRows.rows) { const number = Number(/(\d+)$/u.exec(row.code)?.[1] ?? NaN); if (Number.isFinite(number)) focusNames.set(number, row.name); }
    const gapRows = await this.db.query<QueryResultRow & { code: string; name: string }>(
      `SELECT pf.code, c.name FROM sababuka.categories c JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id
       WHERE c.is_active = true AND c.name NOT LIKE 'Uji otomatis%'
         AND NOT EXISTS (SELECT 1 FROM sababuka.indicators i WHERE i.category_id = c.id AND i.is_active = true AND i.origin_type = 'rpjmd_master')`,
    );
    const gaps: IssueGapRow[] = gapRows.rows.map((row) => ({ focus_number: Number(/(\d+)$/u.exec(row.code)?.[1] ?? NaN), issue_group: plainDash(row.name) })).filter((row) => Number.isFinite(row.focus_number));
    return buildFocusOverview(contexts, achievement, gaps, focusNames);
  }
}
