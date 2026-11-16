import assert from "node:assert/strict";
import test from "node:test";
import { buildReply, matchInsights, opdScoreboard, parseIntent, tokenize } from "../src/services/assistant-intents.js";
import type { Insight } from "../src/services/insight-service.js";
import { analyzeDistricts, analyzeSeries, buildNarrative } from "../src/services/trend-engine.js";

function make(name: string, values: number[], opds: string[], direction: "increase" | "decrease" | null = "increase", withDistricts = true): Insight {
  const points = values.map((value, index) => ({ year: 2019 + index, value }));
  const analysis = analyzeSeries(points, direction)!;
  const districts = withDistricts ? analyzeDistricts([{ name: "Selat", value: 5, previous: 9 }, { name: "Basarang", value: 12, previous: 11 }, { name: "Timpah", value: 30, previous: 28 }]) : null;
  const narrative = buildNarrative({ name, unit: "%", analysis, districts, opds, direction });
  return { layer: "konteks", links: [], limited: false, indicator_id: name, code: name, name, category: "Kemiskinan", source_kind: "bps", unit: "%", latest_year: analysis.latest_year, latest_value: analysis.latest_value, change_pct: analysis.change_pct, trend: analysis.trend, assessment: analysis.assessment, score: analysis.score, ...narrative, opds, direction_inferred: false, source_label: "BPS Kabupaten Kapuas", series: points, analysis, districts, district_latest: districts ? { year: 2024, items: [{ name: "Selat", value: 5, previous: 9 }, { name: "Basarang", value: 12, previous: 11 }, { name: "Timpah", value: 30, previous: 28 }] } : null, basis: "kabupaten" };
}

const insights = [
  make("Persentase Penduduk Miskin", [11, 10.5, 10, 9.8, 9.5, 9.0], ["Dinas Sosial"], "decrease"),
  make("Angka Melek Huruf", [97, 96, 95, 94, 92, 90], ["Dinas Pendidikan"]),
  make("Produksi Padi", [100, 110, 105, 120, 118, 130], ["Dinas Pertanian"], "increase", false),
];

test("niat pertanyaan terbaca", () => {
  const intent = parseIntent("Bagaimana kemiskinan per kecamatan pada 2023? Apa rekomendasinya?");
  assert.equal(intent.district, true);
  assert.equal(intent.recommendation, true);
  assert.equal(intent.year, 2023);
  assert.ok(tokenize("Bagaimana tren melek huruf?").includes("melek"));
});

test("pencocokan memilih indikator yang tepat", () => {
  const found = matchInsights(tokenize("bagaimana tren penduduk miskin"), insights);
  assert.equal(found[0]!.insight.name, "Persentase Penduduk Miskin");
});

test("jawaban indikator memuat tren, OPD, kecamatan, dan sumber", () => {
  const reply = buildReply("Bagaimana kemiskinan per kecamatan, apa rekomendasinya?", insights);
  assert.match(reply.answer, /Dinas Sosial/);
  assert.match(reply.answer, /Selat|Timpah/);
  assert.equal(reply.visuals[0]!.kind, "trend");
  assert.equal(reply.visuals[1]!.kind, "districts");
  assert.equal(reply.sources[0]!.source, "BPS Kabupaten Kapuas");
});

test("indikator memburuk memunculkan tindak lanjut tanpa diminta", () => {
  const reply = buildReply("angka melek huruf", insights);
  assert.match(reply.answer, /Tindak lanjut: Minta Dinas Pendidikan/);
});

test("pertanyaan umum menghasilkan ringkasan prioritas", () => {
  const reply = buildReply("Ringkas kondisi terbaru, apa yang perlu perhatian?", insights);
  assert.match(reply.answer, /Angka Melek Huruf/);
  assert.equal(reply.sufficiency, "partial");
});

test("pertanyaan di luar data dijawab jujur", () => {
  const reply = buildReply("berapa harga bitcoin", insights);
  assert.equal(reply.sufficiency, "insufficient");
});

test("pertanyaan peringkat OPD dijawab dengan skor, bukan pencarian indikator acak", () => {
  const many = [
    make("A1", [5, 6, 7, 8, 9, 10], ["Dinas Pendidikan"]), make("A2", [5, 6, 7, 8, 9, 10], ["Dinas Pendidikan"]), make("A3", [5, 6, 7, 8, 9, 10], ["Dinas Pendidikan"]),
    make("B1", [10, 9, 8, 7, 6, 5], ["Dinas Sosial"]), make("B2", [10, 9, 8, 7, 6, 5], ["Dinas Sosial"]), make("B3", [10, 9, 8, 7, 6, 5], ["Dinas Sosial"]),
  ];
  assert.equal(parseIntent("Opd mana yang paling baik kinerjanya tahun ini").rankOpd, true);
  const board = opdScoreboard(many);
  assert.equal(board.find((entry) => entry.name === "Dinas Pendidikan")!.score, 100);
  assert.equal(board.find((entry) => entry.name === "Dinas Sosial")!.score, -100);
  const reply = buildReply("Opd mana yang paling baik kinerjanya tahun ini", many);
  assert.match(reply.answer, /terbaik: Dinas Pendidikan/);
  assert.match(reply.answer, /bukan penilaian kinerja resmi/);
  assert.ok(!/Indeks Gini/.test(reply.answer));
});

test("peringkat OPD jujur bila data penilaian belum cukup", () => {
  const reply = buildReply("OPD mana yang kinerjanya terburuk?", [make("X", [1, 2, 3, 4, 5, 6], ["Dinas A"], null)]);
  assert.match(reply.answer, /belum cukup/);
});
