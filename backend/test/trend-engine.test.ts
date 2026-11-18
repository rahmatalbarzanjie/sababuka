import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDistricts, analyzeSeries, buildNarrative, olsSlope } from "../src/services/trend-engine.js";

const series = (values: number[], start = 2018) => values.map((value, index) => ({ year: start + index, value }));

test("kemiringan OLS dan perubahan tahunan", () => {
  assert.equal(olsSlope(series([1, 2, 3, 4])), 1);
  const result = analyzeSeries(series([10, 12, 14, 16, 18, 20]), "increase")!;
  assert.equal(result.latest_value, 20);
  assert.equal(result.change, 2);
  assert.equal(Math.round(result.change_pct!), 11);
  assert.equal(result.trend, "naik");
  assert.equal(result.assessment, "membaik");
  assert.deepEqual(result.streak, { direction: "naik", length: 5, since: 2018 });
});

test("arah indikator menentukan membaik atau memburuk", () => {
  const rising = series([5, 6, 7, 8, 9, 10]);
  assert.equal(analyzeSeries(rising, "decrease")!.assessment, "memburuk");
  assert.equal(analyzeSeries(rising, null)!.assessment, "netral");
});

test("seri pendek ditolak dan seri datar dinilai stabil", () => {
  assert.equal(analyzeSeries(series([5]), null), null);
  assert.equal(analyzeSeries(series([100, 100.2, 100.1, 100, 100.1]), "increase")!.trend, "stabil");
});

test("anomali terdeteksi pada lonjakan mendadak", () => {
  const result = analyzeSeries(series([10, 11, 10.5, 11.2, 10.8, 40]), null)!;
  assert.equal(result.anomaly?.is_anomaly, true);
});

test("analisis kecamatan: tertinggi, terendah, kenaikan dan penurunan", () => {
  const result = analyzeDistricts([
    { name: "A", value: 100, previous: 80 }, { name: "B", value: 50, previous: 60 },
    { name: "C", value: 10, previous: 10 }, { name: "D", value: 30, previous: 20 },
  ])!;
  assert.equal(result.highest[0]!.name, "A");
  assert.equal(result.lowest[0]!.name, "C");
  assert.equal(result.biggest_rise!.name, "D");
  assert.equal(result.biggest_fall!.name, "B");
  assert.equal(result.spread_ratio, 10);
});

test("narasi memuat OPD dan saran sesuai penilaian", () => {
  const analysis = analyzeSeries(series([20, 18, 16, 14, 12, 10]), "increase")!;
  const districts = analyzeDistricts([{ name: "Selat", value: 5, previous: 9 }, { name: "Basarang", value: 10, previous: 10 }, { name: "Timpah", value: 20, previous: 19 }]);
  const text = buildNarrative({ name: "Angka Melek Huruf", unit: "%", analysis, districts, opds: ["Dinas Pendidikan"], direction: "increase" });
  assert.match(text.headline, /menurun/);
  assert.match(text.recommendation, /Dinas Pendidikan/);
  assert.match(text.recommendation, /Selat/);
});
