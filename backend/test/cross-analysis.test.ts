import assert from "node:assert/strict";
import test from "node:test";
import type { AchievementItem } from "../src/services/achievement-service.js";
import { AgentService } from "../src/services/agent-service.js";
import type { Database } from "../src/database.js";
import { buildCrossAnalysis, formatCrossAnalysis, sharedYearCorrelation, spearman, type IndicatorContext } from "../src/services/cross-analysis-service.js";
import { buildFocusOverview } from "../src/services/focus-service.js";
import type { Insight } from "../src/services/insight-service.js";
import { analyzeDistricts, analyzeSeries, buildNarrative } from "../src/services/trend-engine.js";

function make(id: string, name: string, points: Array<{ year: number; value: number }>, opds: string[], withDistricts = false, kind: Insight["source_kind"] = "rpjmd"): Insight {
  const analysis = analyzeSeries(points, "increase")!;
  const districtItems = [{ name: "Selat", value: 5, previous: 9 }, { name: "Basarang", value: 12, previous: 11 }, { name: "Timpah", value: 30, previous: 28 }, { name: "Mantangai", value: 20, previous: 19 }];
  const districts = withDistricts ? analyzeDistricts(districtItems) : null;
  const narrative = buildNarrative({ name, unit: "%", analysis, districts, opds, direction: "increase" });
  return { layer: "kinerja", links: [], limited: false, source_url: null, indicator_id: id, code: id, name, category: "Isu A", source_kind: kind, unit: "%", latest_year: analysis.latest_year, latest_value: analysis.latest_value, change_pct: analysis.change_pct, trend: analysis.trend, assessment: analysis.assessment, score: analysis.score, ...narrative, opds, direction_inferred: false, source_label: "RPJMD", series: points, analysis, districts, district_latest: withDistricts ? { year: analysis.latest_year, items: districtItems } : null, basis: "kabupaten" };
}
const years = (values: number[], start = 2020) => values.map((value, index) => ({ year: start + index, value }));
const ctx = (id: string, issue: string, focus: number, primary: string[], support: string[] = []): IndicatorContext => ({ indicator_id: id, name: id, focus_number: focus, focus_name: `Fokus ${focus}`, issue_group: issue, sheet_code: "1.1", rpjmd_level: "Tujuan", rpjmd_page: "III-19", official_source: "Sumber", primary_opds: primary, support_opds: support, support_text: null, opd_basis: "rpjmd_tabel_3_5" });
const item = (id: string, status: AchievementItem["status"], over: Partial<AchievementItem> = {}): AchievementItem => ({ indicator_id: id, name: id, sector: "S", unit: "%", source_kind: "rpjmd", direction: "increase", opds: [], latest_year: 2025, latest_value: 80, target_year: 2025, target_value: 90, gap: -10, gap_pct: -11, status, follow_up: "Selisih 10 % dari target 2025 (80 dari 90).", ...over });

test("korelasi Spearman: searah, berlawanan, dan seri konstan", () => {
  assert.equal(spearman([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]), 1);
  assert.equal(spearman([1, 2, 3, 4, 5], [50, 40, 30, 20, 10]), -1);
  assert.equal(spearman([1, 2, 3, 4], [7, 7, 7, 7]), null);
});

test("korelasi hanya pada tahun yang sama dan minimal 5 tahun", () => {
  assert.equal(sharedYearCorrelation(years([1, 2, 3, 4]), years([2, 4, 6, 8])), null);
  assert.equal(sharedYearCorrelation(years([1, 2, 3, 4, 5, 6]), years([1, 2, 3, 4], 2022)), null);
  assert.deepEqual(sharedYearCorrelation(years([1, 2, 3, 4, 5, 6]), years([6, 5, 4, 3, 2, 1])), { rho: -1, years: 6 });
});

const insights = [
  make("ikp", "Indeks Ketahanan Pangan", years([80, 82, 83, 84, 85, 80]), ["DKPP"], true),
  make("pph", "Skor PPH", years([70, 72, 74, 76, 78, 80]), ["DKPP"]),
  make("harga", "Stabilitas Harga", years([5, 4, 3, 3], 2022), ["Disperindag"]),
  make("irigasi", "Irigasi Baik", years([50, 51, 52, 53, 54, 55]), ["Dinas PUPR"]),
  make("lain", "Indikator Lain", years([1, 2, 3, 4, 5, 6]), ["Dinkes"]),
];
const contexts = new Map<string, IndicatorContext>([
  ["ikp", ctx("ikp", "Pangan", 1, ["DKPP"], ["Distan"])], ["pph", ctx("pph", "Pangan", 1, ["DKPP"])], ["harga", ctx("harga", "Pangan", 1, ["Disperindag"])],
  ["irigasi", ctx("irigasi", "Produktivitas", 1, ["Dinas PUPR"])], ["lain", ctx("lain", "Kesehatan", 4, ["Dinkes"])],
]);
const achievement = [item("ikp", "belum_tercapai"), item("pph", "tercapai"), item("harga", "belum_tercapai"), item("irigasi", "belum_tercapai"), item("lain", "tercapai")];

test("analisis silang: relasi isu dan fokus, tanpa fokus lain, dengan label usulan sistem", () => {
  const analysis = buildCrossAnalysis({ indicatorId: "ikp", insights, achievement, contexts })!;
  assert.deepEqual(analysis.related.map((entry) => [entry.indicator_id, entry.relation]), [["harga", "isu_sama"], ["pph", "isu_sama"], ["irigasi", "fokus_sama"]]);
  assert.ok(analysis.related.every((entry) => !entry.validated));
  assert.ok(analysis.limits.some((text) => /usulan sistem/.test(text)));
  assert.deepEqual(analysis.opd.support, ["Distan"]);
});

test("analisis silang: tahun berbeda ditandai dan korelasi memerlukan 5 tahun bersama", () => {
  const analysis = buildCrossAnalysis({ indicatorId: "ikp", insights, achievement, contexts })!;
  const harga = analysis.related.find((entry) => entry.indicator_id === "harga")!;
  assert.equal(harga.year_match, true);
  assert.equal(harga.correlation, null);
  const pph = analysis.related.find((entry) => entry.indicator_id === "pph")!;
  assert.ok(pph.correlation && pph.correlation.years === 6);
  const shifted = [insights[0]!, make("pph", "Skor PPH", years([70, 72, 74, 76, 78, 80], 2019), ["DKPP"])];
  const mismatch = buildCrossAnalysis({ indicatorId: "ikp", insights: shifted, achievement, contexts })!;
  assert.equal(mismatch.related[0]!.year_match, false);
  assert.ok(mismatch.limits.some((text) => /tahun yang sama/.test(text)));
});

test("analisis silang: kecamatan prioritas hanya bila ada data kecamatan dan arah jelas", () => {
  const withData = buildCrossAnalysis({ indicatorId: "ikp", insights, achievement, contexts })!;
  assert.deepEqual(withData.districts.priority.map((entry) => entry.name), ["Selat", "Basarang", "Mantangai"]);
  assert.ok(withData.recommendations.some((entry) => /Kecamatan Selat/.test(entry.action)));
  const noData = buildCrossAnalysis({ indicatorId: "pph", insights, achievement, contexts })!;
  assert.equal(noData.districts.available, false);
  assert.deepEqual(noData.districts.priority, []);
  assert.ok(noData.limits.some((text) => /wilayah prioritas belum dapat ditentukan/.test(text)));
  assert.ok(!noData.recommendations.some((entry) => /Kecamatan/.test(entry.action)));
});

test("analisis silang: rekomendasi menugaskan OPD utama, pendukung, dan koordinasi lintas OPD", () => {
  const analysis = buildCrossAnalysis({ indicatorId: "ikp", insights, achievement, contexts })!;
  assert.match(analysis.recommendations[0]!.opd, /DKPP/);
  assert.ok(analysis.recommendations.some((entry) => entry.opd === "Distan"));
  assert.ok(analysis.recommendations.some((entry) => /Disperindag/.test(entry.opd) && /Stabilitas Harga belum mencapai target/.test(entry.action)));
});

test("analisis silang: indikator tak dikenal null dan kerangka jawaban memuat bagian tetap", () => {
  assert.equal(buildCrossAnalysis({ indicatorId: "x", insights, achievement, contexts }), null);
  const text = formatCrossAnalysis(buildCrossAnalysis({ indicatorId: "ikp", insights, achievement, contexts })!);
  for (const heading of ["Kondisi terhadap target", "Faktor terkait", "Wilayah prioritas", "Rekomendasi per OPD", "Keterbatasan data"]) assert.ok(text.includes(`**${heading}**`), heading);
  assert.ok(!/[–—]/u.test(text));
});

test("ringkasan fokus: hitung capaian per fokus dan tandai kelompok isu tanpa indikator", () => {
  const overview = buildFocusOverview(contexts, achievement, [{ focus_number: 2, issue_group: "Kawasan Industri" }], new Map([[1, "Pangan"], [2, "Investasi"], [4, "SDM"]]));
  const one = overview.focuses.find((entry) => entry.number === 1)!;
  assert.equal(one.total, 4); assert.equal(one.tercapai, 1); assert.equal(one.belum_tercapai, 3);
  assert.match(one.narrative, /1 dari 4 indikator/);
  const two = overview.focuses.find((entry) => entry.number === 2)!;
  assert.equal(two.total, 0);
  assert.equal(two.issues[0]!.gap, true);
});

test("alat analisis_silang dan ringkasan_fokus pada agen", () => {
  const agent = new AgentService({} as Database);
  const focus = buildFocusOverview(contexts, achievement, [], new Map([[1, "Pangan"]]));
  const cross = agent.execute("analisis_silang", { indikator_id: "ikp" }, insights, achievement, { contexts, focus }).result as { related: unknown[]; catatan: string };
  assert.ok(cross.related.length > 0);
  assert.match(cross.catatan, /bukan sebab-akibat/);
  const summary = agent.execute("ringkasan_fokus", { nomor: 1 }, insights, achievement, { contexts, focus }).result as { fokus: Array<{ nomor: number }> };
  assert.equal(summary.fokus[0]!.nomor, 1);
  assert.ok("galat" in (agent.execute("analisis_silang", { indikator_id: "tidak-ada" }, insights, achievement, { contexts, focus }).result as object));
});

test("analisis silang: indikator se-isu yang realisasinya belum terbit dicatat dan memicu rekomendasi pelaporan", () => {
  const more = new Map(contexts); more.set("tunda", ctx("tunda", "Pangan", 1, ["Distan"]));
  const withPending = [...achievement, item("tunda", "belum_ada_data")];
  const analysis = buildCrossAnalysis({ indicatorId: "ikp", insights, achievement: withPending, contexts: more })!;
  assert.deepEqual(analysis.pending.map((entry) => entry.indicator_id), ["tunda"]);
  assert.ok(analysis.recommendations.some((entry) => /Percepat pelaporan realisasi tunda/.test(entry.action) && entry.opd === "Distan"));
  assert.match(formatCrossAnalysis(analysis), /tunda: realisasi belum terbit \(Distan\)/);
});
