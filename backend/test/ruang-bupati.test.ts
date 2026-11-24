import assert from "node:assert/strict";
import test from "node:test";
import type { Insight } from "../src/services/insight-service.js";
import { buildBriefing } from "../src/services/ruang-bupati-service.js";
import { analyzeSeries, buildNarrative } from "../src/services/trend-engine.js";

function make(id: string, name: string, values: number[], opd: string): Insight {
  const points = values.map((value, index) => ({ year: 2019 + index, value }));
  const analysis = analyzeSeries(points, "increase")!;
  const narrative = buildNarrative({ name, unit: "%", analysis, districts: null, opds: [opd], direction: "increase" });
  return { layer: "kinerja", links: [], limited: false, source_url: null, indicator_id: id, code: id, name, category: "Pendidikan", source_kind: "rpjmd", unit: "%", latest_year: analysis.latest_year, latest_value: analysis.latest_value, change_pct: analysis.change_pct, trend: analysis.trend, assessment: analysis.assessment, score: analysis.score, ...narrative, opds: [opd], direction_inferred: false, source_label: "RPJMD", series: points, analysis, districts: null, district_latest: null, basis: "kabupaten" };
}
const row = (name: string, opd: string, status: string) => ({ indicator_id: name, name, sector: "S", unit: "%", source_kind: "rpjmd", latest_year: status === "belum_ada_data" ? null : 2025, latest_value: status === "belum_ada_data" ? null : 5, target_year: 2025, target_value: 5, gap: 0, gap_pct: 0, status, opds: [opd], follow_up: "x" });

test("briefing memuat tiga butir berurutan dengan pertanyaan lanjutan", () => {
  const insights = [make("a", "Angka Melek Huruf", [90, 92, 94, 95, 96, 97], "Dinas Pendidikan"), make("b", "Produksi Padi", [100, 90, 80, 70, 60, 50], "Dinas Pertanian")];
  const achievement = [
    row("A1", "Dinas Pendidikan", "tercapai"), row("A2", "Dinas Pendidikan", "tercapai"), row("A3", "Dinas Pendidikan", "tercapai"),
    row("B1", "Dinas Pertanian", "belum_tercapai"), row("B2", "Dinas Pertanian", "belum_tercapai"), row("B3", "Dinas Pertanian", "belum_ada_data"),
  ] as never;
  const items = buildBriefing(insights, achievement);
  assert.deepEqual(items.map((item) => item.key), ["perhatian", "target", "opd"]);
  assert.match(items[0]!.title, /Produksi Padi/);
  assert.match(items[1]!.title, /2 indikator belum mencapai target/);
  assert.match(items[1]!.detail, /3 tercapai, 1 masih menunggu realisasi/);
  assert.match(items[2]!.question, /OPD/);
  assert.ok(items.every((item) => !/[\u2013\u2014]/u.test(`${item.title}${item.detail}`)));
});

test("briefing tidak menyorot nilai nol mendadak yang lazimnya data belum terisi", () => {
  const insights = [make("z", "Usia Harapan Hidup", [70, 70.5, 71, 71.2, 71.4, 0], "Dinkes"), make("b", "Produksi Padi", [100, 90, 80, 70, 60, 50], "Dinas Pertanian")];
  const items = buildBriefing(insights, []);
  assert.match(items[0]!.title, /Produksi Padi/);
  assert.ok(items.every((item) => !/Usia Harapan Hidup/.test(item.title)));
});

test("briefing tanpa data tidak membuat butir kosong", () => {
  assert.deepEqual(buildBriefing([], []), []);
});

import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("pantauan, catatan, dan status briefing dibatasi pemilik dan mutasi wajib CSRF", () => {
  const service = read("../src/services/ruang-bupati-service.ts");
  const route = read("../src/routes/assistant.ts");
  const migration = read("../database/migrations/092_ruang_bupati.sql");
  assert.match(service, /WHERE id = \$1 AND user_id = \$2 RETURNING id/u);
  assert.match(service, /WHERE user_id = \$1 ORDER BY created_at DESC/u);
  assert.match(service, /DELETE FROM sababuka\.assistant_pins WHERE user_id = \$1 AND indicator_id = \$2/u);
  assert.match(service, /maksimal 12/u);
  const mutations = route.split("\n").filter((line) => /app\.(post|put|delete)<[^>]*>?\(\s*"\/assistant\/(briefing|pins|notes)/u.test(line) || /app\.(post|put|delete)(<.*>)?\("\/assistant\/(briefing|pins|notes)/u.test(line));
  assert.ok(mutations.length >= 4);
  for (const line of mutations) assert.match(line, /requireCsrf\(request\)/u);
  assert.match(migration, /char_length\(content\) BETWEEN 2 AND 1000/u);
});
