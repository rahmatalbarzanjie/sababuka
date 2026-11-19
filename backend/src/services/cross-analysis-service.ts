import type { Database, QueryResultRow } from "../database.js";
import { AchievementService, type AchievementItem } from "./achievement-service.js";
import { InsightService, type Insight } from "./insight-service.js";
import { plainDash } from "./plain-text.js";

/** Konteks matriks RPJMD satu indikator: fokus kebijakan, kelompok isu, dan OPD utama serta pendukung. */
export interface IndicatorContext {
  indicator_id: string; name: string; focus_number: number | null; focus_name: string | null; issue_group: string;
  sheet_code: string | null; rpjmd_level: string | null; rpjmd_page: string | null; official_source: string | null;
  primary_opds: string[]; support_opds: string[]; support_text: string | null; opd_basis: string | null;
}

export type RelationKind = "tautan_seri" | "isu_sama" | "fokus_sama";
export type ReviewStatus = "confirmed" | "rejected";
/** Kunci pasangan indikator tanpa urutan: dipakai untuk validasi BAPPERIDA. */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
/** Perbandingan pada tahun bersama terbaru kedua seri, dengan perubahan dari tahun sebelumnya bila tersedia di keduanya. */
export interface JointComparison { year: number; mine: number; related: number; mine_change_pct: number | null; related_change_pct: number | null; movement: "searah" | "berlawanan" | "stabil" | null }
export interface RelatedIndicator {
  indicator_id: string; name: string; unit: string; relation: RelationKind; relation_label: string; validated: boolean; review: "confirmed" | null;
  latest_year: number; latest_value: number; same_year_value: number | null; year_match: boolean; compare: JointComparison | null;
  status: AchievementItem["status"] | null; target_year: number | null; target_value: number | null;
  trend: Insight["trend"]; assessment: Insight["assessment"]; opds: string[];
  correlation: { rho: number; years: number; direction: "searah" | "berlawanan" } | null;
}
export interface PendingIndicator { indicator_id: string; name: string; relation: RelationKind; opds: string[] }
export interface PriorityDistrict { name: string; value: number; previous: number | null }
export interface CrossRecommendation { opd: string; action: string; basis: string }
export interface CrossAnalysis {
  indicator: { indicator_id: string; name: string; unit: string; source_kind: Insight["source_kind"]; focus_number: number | null; focus_name: string | null; issue_group: string; sheet_code: string | null; rpjmd_level: string | null; rpjmd_page: string | null; official_source: string | null };
  position: { status: AchievementItem["status"] | null; latest_year: number; latest_value: number; target_year: number | null; target_value: number | null; gap: number | null; trend: Insight["trend"]; assessment: Insight["assessment"]; direction: AchievementItem["direction"] | null };
  opd: { primary: string[]; support: string[]; support_text: string | null; basis: string | null };
  related: RelatedIndicator[];
  pending: PendingIndicator[];
  rejected: Array<{ indicator_id: string; name: string }>;
  correlation: { eligible: number; total: number; min_years: number };
  districts: { available: boolean; year: number | null; year_matches: boolean; direction_known: boolean; priority: PriorityDistrict[] };
  recommendations: CrossRecommendation[];
  limits: string[];
}

export const MIN_CORRELATION_YEARS = 5;
export const STRONG_CORRELATION = 0.6;

const num = (value: number, digits = 2) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(value);

function ranks(values: number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) j += 1;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) result[order[k]!.index] = rank;
    i = j + 1;
  }
  return result;
}

/** Korelasi peringkat Spearman; null bila data kurang atau salah satu seri konstan. */
export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const a = ranks(xs); const b = ranks(ys);
  const mean = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / list.length;
  const ma = mean(a); const mb = mean(b);
  let cov = 0; let va = 0; let vb = 0;
  for (let i = 0; i < a.length; i += 1) { cov += (a[i]! - ma) * (b[i]! - mb); va += (a[i]! - ma) ** 2; vb += (b[i]! - mb) ** 2; }
  if (va === 0 || vb === 0) return null;
  return cov / Math.sqrt(va * vb);
}

/** Korelasi hanya pada tahun yang sama di kedua seri, minimal MIN_CORRELATION_YEARS tahun. */
export function sharedYearCorrelation(a: Array<{ year: number; value: number }>, b: Array<{ year: number; value: number }>): { rho: number; years: number } | null {
  const byYear = new Map(b.map((point) => [point.year, point.value]));
  const pairs = a.filter((point) => byYear.has(point.year)).map((point) => [point.value, byYear.get(point.year)!] as const);
  if (pairs.length < MIN_CORRELATION_YEARS) return null;
  const rho = spearman(pairs.map((pair) => pair[0]), pairs.map((pair) => pair[1]));
  return rho === null ? null : { rho: Math.round(rho * 100) / 100, years: pairs.length };
}

const relationWeight: Record<RelationKind, number> = { tautan_seri: 4, isu_sama: 3, fokus_sama: 1 };
const relationLabel: Record<RelationKind, string> = { tautan_seri: "Tautan Seri Data (ditetapkan BAPPERIDA)", isu_sama: "Kelompok isu yang sama (usulan sistem)", fokus_sama: "Fokus kebijakan yang sama (usulan sistem)" };
const joinNames = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}` : names[0] ?? "";
const needsAttention = (item: { status: AchievementItem["status"] | null; assessment: Insight["assessment"] }) => item.status === "belum_tercapai" || item.assessment === "memburuk";

export interface CrossInput { indicatorId: string; insights: Insight[]; achievement: AchievementItem[]; contexts: Map<string, IndicatorContext>; reviews?: Map<string, ReviewStatus> }

const STABLE_PCT = 0.5;
const changePct = (series: Array<{ year: number; value: number }>, year: number): number | null => {
  const now = series.find((point) => point.year === year); const before = series.find((point) => point.year === year - 1);
  return now && before && before.value !== 0 ? ((now.value - before.value) / Math.abs(before.value)) * 100 : null;
};

/** Bandingkan dua seri pada tahun bersama terbaru, bukan pada tahun terbaru masing-masing. */
export function jointComparison(a: Array<{ year: number; value: number }>, b: Array<{ year: number; value: number }>): JointComparison | null {
  const byYear = new Map(b.map((point) => [point.year, point.value]));
  const shared = a.filter((point) => byYear.has(point.year)).map((point) => point.year);
  if (!shared.length) return null;
  const year = Math.max(...shared);
  const mine = changePct(a, year); const other = changePct(b, year);
  const movement = mine === null || other === null ? null : Math.abs(mine) < STABLE_PCT && Math.abs(other) < STABLE_PCT ? "stabil" as const : Math.abs(mine) < STABLE_PCT || Math.abs(other) < STABLE_PCT ? null : Math.sign(mine) === Math.sign(other) ? "searah" as const : "berlawanan" as const;
  return { year, mine: a.find((point) => point.year === year)!.value, related: byYear.get(year)!, mine_change_pct: mine === null ? null : Math.round(mine * 10) / 10, related_change_pct: other === null ? null : Math.round(other * 10) / 10, movement };
}

/** Analisis silang satu indikator: posisi terhadap target, indikator terkait, wilayah prioritas, dan rekomendasi per OPD. Murni dari data tersimpan. */
export function buildCrossAnalysis(input: CrossInput): CrossAnalysis | null {
  const { indicatorId, insights, achievement, contexts } = input;
  const reviews = input.reviews ?? new Map<string, ReviewStatus>();
  const me = insights.find((item) => item.indicator_id === indicatorId);
  if (!me) return null;
  const ctx = contexts.get(indicatorId) ?? null;
  const mine = achievement.find((item) => item.indicator_id === indicatorId) ?? null;
  const achievementById = new Map(achievement.map((item) => [item.indicator_id, item]));
  const linked = new Set(me.links.map((link) => link.indicator_id));

  const candidates = new Map<string, { insight: Insight; kind: RelationKind }>();
  const rejected: Array<{ indicator_id: string; name: string }> = [];
  for (const link of me.links) { const found = insights.find((item) => item.indicator_id === link.indicator_id); if (found) candidates.set(found.indicator_id, { insight: found, kind: "tautan_seri" }); }
  if (ctx) for (const item of insights) {
    if (item.indicator_id === indicatorId || candidates.has(item.indicator_id)) continue;
    const other = contexts.get(item.indicator_id);
    if (!other) continue;
    if (reviews.get(pairKey(indicatorId, item.indicator_id)) === "rejected") { rejected.push({ indicator_id: item.indicator_id, name: item.name }); continue; }
    if (other.issue_group === ctx.issue_group) candidates.set(item.indicator_id, { insight: item, kind: "isu_sama" });
    else if (ctx.focus_number !== null && other.focus_number === ctx.focus_number) candidates.set(item.indicator_id, { insight: item, kind: "fokus_sama" });
  }

  const related: RelatedIndicator[] = [...candidates.values()].map(({ insight, kind }) => {
    const target = achievementById.get(insight.indicator_id) ?? null;
    const sameYear = insight.series.find((point) => point.year === me.latest_year)?.value ?? null;
    const confirmed = reviews.get(pairKey(indicatorId, insight.indicator_id)) === "confirmed" && kind !== "tautan_seri";
    const corr = sharedYearCorrelation(me.series, insight.series);
    return {
      indicator_id: insight.indicator_id, name: insight.name, unit: insight.unit, relation: kind, relation_label: confirmed ? "Divalidasi BAPPERIDA" : relationLabel[kind], validated: linked.has(insight.indicator_id) || confirmed, review: confirmed ? "confirmed" as const : null,
      latest_year: insight.latest_year, latest_value: insight.latest_value, same_year_value: sameYear, year_match: insight.latest_year === me.latest_year, compare: jointComparison(me.series, insight.series),
      status: target?.status ?? null, target_year: target?.target_year ?? null, target_value: target?.target_value ?? null,
      trend: insight.trend, assessment: insight.assessment, opds: contexts.get(insight.indicator_id)?.primary_opds.length ? contexts.get(insight.indicator_id)!.primary_opds : insight.opds,
      correlation: corr ? { rho: corr.rho, years: corr.years, direction: corr.rho >= 0 ? "searah" as const : "berlawanan" as const } : null,
    };
  }).sort((a, b) => relationWeight[b.relation] - relationWeight[a.relation] || Number(needsAttention(b)) - Number(needsAttention(a)) || a.name.localeCompare(b.name, "id")).slice(0, 8);

  const primary = ctx?.primary_opds.length ? ctx.primary_opds : me.opds.slice(0, 1);
  const support = ctx?.support_opds.filter((name) => !primary.includes(name)) ?? me.opds.slice(1);

  // Wilayah prioritas hanya bila indikator ini sendiri memiliki nilai per kecamatan dan arah baik-buruknya jelas.
  const direction = mine?.direction ?? null;
  const latestDistricts = me.district_latest;
  let priority: PriorityDistrict[] = [];
  if (latestDistricts && direction && direction !== "maintain" && latestDistricts.items.length >= 3) {
    const sorted = [...latestDistricts.items].sort((a, b) => direction === "increase" ? a.value - b.value : b.value - a.value);
    priority = sorted.slice(0, 3).map((item) => ({ name: item.name, value: item.value, previous: item.previous }));
  }
  const districts = { available: Boolean(latestDistricts), year: latestDistricts?.year ?? null, year_matches: latestDistricts?.year === me.latest_year, direction_known: Boolean(direction && direction !== "maintain"), priority };

  const recommendations: CrossRecommendation[] = [];
  const leadText = joinNames(primary) || "OPD penanggung jawab";
  const targetUnit = me.unit ? ` ${me.unit}` : "";
  if (mine?.status === "belum_tercapai" && mine.target_value !== null && mine.gap !== null) recommendations.push({ opd: leadText, action: `Susun rencana percepatan ${me.name}: realisasi ${num(me.latest_value)}${targetUnit} dari target ${num(mine.target_value)}${targetUnit} (${mine.target_year}), selisih ${num(Math.abs(mine.gap))}${targetUnit}. Sampaikan penyebab selisih dan jadwal percepatan kepada Bupati.`, basis: "Capaian terhadap target tahun yang sama" });
  else if (mine?.status === "belum_tercapai") recommendations.push({ opd: leadText, action: `Susun rencana percepatan ${me.name} dan sampaikan penyebab selisih kepada Bupati.`, basis: "Capaian terhadap target tahun yang sama" });
  else if (mine?.status === "tercapai") recommendations.push({ opd: leadText, action: `Pertahankan capaian ${me.name} dan dokumentasikan praktik yang berhasil.`, basis: "Capaian terhadap target tahun yang sama" });
  else if (me.assessment === "memburuk") recommendations.push({ opd: leadText, action: me.recommendation, basis: "Tren indikator memburuk" });
  if (support.length) recommendations.push({ opd: joinNames(support), action: `Sampaikan data dan program pendukung yang berpengaruh pada ${me.name} kepada ${leadText}.`, basis: "OPD pendukung menurut matriks RPJMD" });
  const shared = related.filter((item) => needsAttention(item) && item.relation !== "fokus_sama").slice(0, 3);
  for (const item of shared) {
    const others = item.opds.filter((name) => !primary.includes(name)).slice(0, 2);
    const owner = joinNames(others);
    const reason = item.status === "belum_tercapai" ? "belum mencapai target" : "menunjukkan tren memburuk";
    recommendations.push({ opd: owner ? `${leadText} dan ${owner}` : leadText, action: `Koordinasikan penanganan karena ${item.name} ${reason} pada isu yang sama.`, basis: item.validated ? "Tautan Seri Data" : "Kelompok isu yang sama (usulan sistem)" });
  }
  if (priority.length) recommendations.push({ opd: leadText, action: `Fokuskan intervensi pada ${joinNames(priority.map((item) => `Kecamatan ${item.name}`))} (nilai paling jauh dari arah yang diharapkan, ${districts.year}).`, basis: "Nilai per kecamatan" });
  const strong = related.filter((item) => item.correlation && Math.abs(item.correlation.rho) >= STRONG_CORRELATION).slice(0, 2);
  for (const item of strong) recommendations.push({ opd: leadText, action: `Periksa keterkaitan dengan ${item.name} (korelasi peringkat ${num(item.correlation!.rho)} pada ${item.correlation!.years} tahun, ${item.correlation!.direction}); ini keterkaitan statistik, belum membuktikan sebab-akibat.`, basis: "Korelasi tahun yang sama" });

  // Indikator pada isu atau fokus yang sama yang realisasinya belum terbit: tidak dapat dibandingkan, tetapi menunjukkan OPD yang perlu segera melapor.
  const insightIds = new Set(insights.map((entry) => entry.indicator_id));
  const pending: PendingIndicator[] = ctx ? [...contexts.values()].filter((other) => other.indicator_id !== indicatorId && !insightIds.has(other.indicator_id) && achievementById.get(other.indicator_id)?.status === "belum_ada_data" && (other.issue_group === ctx.issue_group || (ctx.focus_number !== null && other.focus_number === ctx.focus_number)))
    .map((other) => ({ indicator_id: other.indicator_id, name: other.name, relation: (other.issue_group === ctx.issue_group ? "isu_sama" : "fokus_sama") as RelationKind, opds: other.primary_opds }))
    .sort((a, b) => Number(b.relation === "isu_sama") - Number(a.relation === "isu_sama") || a.name.localeCompare(b.name, "id")).slice(0, 6) : [];
  const pendingSameIssue = pending.filter((entry) => entry.relation === "isu_sama");
  if (pendingSameIssue.length) recommendations.push({ opd: joinNames([...new Set(pendingSameIssue.flatMap((entry) => entry.opds))].slice(0, 3)) || "OPD terkait", action: `Percepat pelaporan realisasi ${joinNames(pendingSameIssue.slice(0, 3).map((entry) => entry.name))} agar keterkaitan dengan ${me.name} dapat dianalisis pada tahun yang sama.`, basis: "Realisasi belum terbit pada isu yang sama" });
  const eligible = related.filter((item) => item.correlation).length;
  const limits: string[] = [];
  if (!ctx) limits.push("Indikator ini belum masuk matriks fokus RPJMD, sehingga indikator terkait hanya berasal dari Tautan Seri Data.");
  else if (!related.length) limits.push("Belum ada indikator terkait yang datanya tersedia.");
  if (related.some((item) => !item.validated)) limits.push("Keterkaitan berdasarkan kelompok isu dan fokus adalah usulan sistem, belum divalidasi BAPPERIDA.");
  if (related.some((item) => !item.year_match && item.compare)) limits.push("Sebagian indikator terkait berakhir pada tahun berbeda; perbandingan memakai tahun bersama terbaru, bukan nilai terbarunya.");
  if (related.some((item) => !item.compare)) limits.push("Sebagian indikator terkait tidak punya tahun yang sama dengan indikator ini, sehingga tidak dibandingkan.");
  if (eligible === 0 && related.length) limits.push(`Korelasi belum dapat dihitung: butuh minimal ${MIN_CORRELATION_YEARS} tahun data bersama.`);
  if (!districts.available) limits.push("Indikator ini belum memiliki data per kecamatan, sehingga wilayah prioritas belum dapat ditentukan.");
  else if (!districts.direction_known) limits.push("Arah baik-buruk indikator belum ditetapkan, sehingga wilayah prioritas belum dapat diurutkan.");
  else if (!districts.year_matches) limits.push(`Data kecamatan tahun ${districts.year} berbeda dari tahun capaian kabupaten (${me.latest_year}).`);
  if (!mine) limits.push("Indikator ini belum memiliki target tahunan yang dapat dinilai.");
  if (ctx && support.length === 0 && ctx.support_text && ctx.support_text !== "-") limits.push(`OPD pendukung menurut matriks belum terdaftar sebagai OPD: ${ctx.support_text}.`);

  return {
    indicator: { indicator_id: me.indicator_id, name: me.name, unit: me.unit, source_kind: me.source_kind, focus_number: ctx?.focus_number ?? null, focus_name: ctx?.focus_name ?? null, issue_group: ctx?.issue_group ?? me.category, sheet_code: ctx?.sheet_code ?? null, rpjmd_level: ctx?.rpjmd_level ?? null, rpjmd_page: ctx?.rpjmd_page ?? null, official_source: ctx?.official_source ?? null },
    position: { status: mine?.status ?? null, latest_year: me.latest_year, latest_value: me.latest_value, target_year: mine?.target_year ?? null, target_value: mine?.target_value ?? null, gap: mine?.gap ?? null, trend: me.trend, assessment: me.assessment, direction },
    opd: { primary, support, support_text: ctx?.support_text ?? null, basis: ctx?.opd_basis ?? null },
    related, pending, rejected, correlation: { eligible, total: related.length, min_years: MIN_CORRELATION_YEARS }, districts, recommendations, limits: limits.map(plainDash),
  };
}

const statusText: Record<NonNullable<AchievementItem["status"]>, string> = { tercapai: "tercapai", belum_tercapai: "belum tercapai", belum_ada_data: "belum ada realisasi", tanpa_target: "tanpa target tahun itu", tanpa_arah: "arah belum ditetapkan" };

/** Kerangka jawaban tetap untuk asisten: Kondisi terhadap target, Faktor terkait, Wilayah prioritas, Rekomendasi per OPD, Keterbatasan data. */
export function formatCrossAnalysis(analysis: CrossAnalysis): string {
  const { position, related, districts } = analysis;
  const unit = analysis.indicator.unit ? ` ${analysis.indicator.unit}` : "";
  const condition = position.target_value !== null
    ? `${analysis.indicator.name}: ${num(position.latest_value)}${unit} pada ${position.latest_year}, target ${num(position.target_value)}${unit}${position.target_year && position.target_year !== position.latest_year ? ` (${position.target_year})` : ""}, ${position.status ? statusText[position.status] : "belum dinilai"}. Tren ${position.trend}.`
    : `${analysis.indicator.name}: ${num(position.latest_value)}${unit} pada ${position.latest_year}. Tren ${position.trend}; belum ada target tahunan yang dapat dinilai.`;
  const factors = related.slice(0, 5).map((item) => {
    const yearNote = item.year_match ? `${item.latest_year}` : `${item.latest_year}, tahun berbeda`;
    const joint = item.compare && !item.year_match ? ` Pada ${item.compare.year} (tahun bersama): ${num(item.compare.mine)} dan ${num(item.compare.related)}${item.compare.movement ? `, bergerak ${item.compare.movement}` : ""}.` : item.compare?.movement ? ` Dari tahun sebelumnya bergerak ${item.compare.movement}.` : "";
    const target = item.status ? `, ${statusText[item.status]}` : "";
    const corr = item.correlation && Math.abs(item.correlation.rho) >= STRONG_CORRELATION ? `, korelasi ${num(item.correlation.rho)} (${item.correlation.direction}, ${item.correlation.years} tahun)` : "";
    return `- ${item.name}: ${num(item.latest_value)}${item.unit ? ` ${item.unit}` : ""} (${yearNote})${target}, tren ${item.trend}${corr}. ${item.review === "confirmed" ? "Divalidasi BAPPERIDA" : item.validated ? "Tautan BAPPERIDA" : "Usulan sistem"}.${joint}`;
  });
  const waiting = analysis.pending.slice(0, 4).map((entry) => `- ${entry.name}: realisasi belum terbit${entry.opds.length ? ` (${entry.opds.slice(0, 2).join(", ")})` : ""}, belum dapat dibandingkan.`);
  const region = districts.priority.length
    ? `Kecamatan dengan nilai paling jauh dari arah yang diharapkan (${districts.year}): ${districts.priority.map((item) => `${item.name} (${num(item.value)})`).join(", ")}.`
    : "";
  const recs = analysis.recommendations.map((item, index) => `${index + 1}. ${item.opd}: ${item.action}`);
  return [
    `**Kondisi terhadap target**\n${condition}`,
    factors.length + waiting.length ? `**Faktor terkait**\n${[...factors, ...waiting].join("\n")}` : "",
    region ? `**Wilayah prioritas**\n${region}` : "",
    recs.length ? `**Rekomendasi per OPD**\n${recs.join("\n")}` : "",
    analysis.limits.length ? `**Keterbatasan data**\n${analysis.limits.map((limit) => `- ${limit}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

interface ContextRow extends QueryResultRow {
  indicator_id: string; indicator_name: string; category_name: string; focus_code: string | null; focus_name: string | null;
  sheet_code: string | null; rpjmd_level: string | null; rpjmd_page: string | null; official_source: string | null; support_opd_text: string | null; opd_basis: string | null;
  opd_label: string | null; is_primary: boolean | null;
}

export class CrossAnalysisService {
  constructor(private readonly db: Database) {}

  /** Konteks matriks seluruh indikator RPJMD (fokus, isu, OPD utama dan pendukung), satu kueri. */
  async contexts(): Promise<Map<string, IndicatorContext>> {
    const rows = await this.db.query<ContextRow>(
      `SELECT i.id::text AS indicator_id, i.name AS indicator_name, c.name AS category_name, pf.code AS focus_code, pf.name AS focus_name,
              m.sheet_code, m.rpjmd_level, m.rpjmd_page, m.official_source, m.support_opd_text, m.opd_basis,
              COALESCE(o.short_name, o.name) AS opd_label, r.is_primary
       FROM sababuka.indicators i
       JOIN sababuka.categories c ON c.id = i.category_id
       LEFT JOIN sababuka.policy_focuses pf ON pf.id = c.policy_focus_id
       LEFT JOIN sababuka.indicator_matrix_meta m ON m.indicator_id = i.id
       LEFT JOIN sababuka.indicator_responsible_opd r ON r.indicator_id = i.id
       LEFT JOIN sababuka.organizations o ON o.id = r.organization_id
       WHERE i.origin_type = 'rpjmd_master' AND i.is_active = true`,
    );
    const map = new Map<string, IndicatorContext>();
    for (const row of rows.rows) {
      const entry = map.get(row.indicator_id) ?? {
        indicator_id: row.indicator_id, name: plainDash(row.indicator_name), focus_number: row.focus_code ? Number(/(\d+)$/u.exec(row.focus_code)?.[1] ?? NaN) || null : null, focus_name: row.focus_name ? plainDash(row.focus_name) : null,
        issue_group: plainDash(row.category_name), sheet_code: row.sheet_code, rpjmd_level: row.rpjmd_level, rpjmd_page: row.rpjmd_page, official_source: row.official_source ? plainDash(row.official_source) : null,
        primary_opds: [], support_opds: [], support_text: row.support_opd_text ? plainDash(row.support_opd_text) : null, opd_basis: row.opd_basis,
      };
      if (row.opd_label) { const list = row.is_primary ? entry.primary_opds : entry.support_opds; if (!list.includes(row.opd_label)) list.push(row.opd_label); }
      map.set(row.indicator_id, entry);
    }
    return map;
  }

  /** Validasi BAPPERIDA atas keterkaitan usulan sistem, per pasangan indikator. */
  async reviews(): Promise<Map<string, ReviewStatus>> {
    const rows = await this.db.query<QueryResultRow & { indicator_a: string; indicator_b: string; status: ReviewStatus }>(`SELECT indicator_a::text, indicator_b::text, status FROM sababuka.indicator_relation_reviews`);
    return new Map(rows.rows.map((row) => [pairKey(row.indicator_a, row.indicator_b), row.status]));
  }

  async analyze(indicatorId: string): Promise<CrossAnalysis | null> {
    const [insights, achievement, contexts, reviews] = await Promise.all([new InsightService(this.db).all(), new AchievementService(this.db).list().then((result) => result.items), this.contexts(), this.reviews()]);
    return buildCrossAnalysis({ indicatorId, insights, achievement, contexts, reviews });
  }
}
