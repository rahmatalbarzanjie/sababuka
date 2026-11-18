import assert from "node:assert/strict";
import test from "node:test";
import { buildSeries, isCategoricalVariable, type BpsRowLike } from "../src/services/bank-series.js";

const row = (tahun: number, vervar: string, label: string, nilai: number | string | null, turvar = "0", turLabel = "Tidak ada", turtahun = "35"): BpsRowLike =>
  ({ tahun, nilai, vervar, vervar_label: label, turvar, turvar_label: turLabel, turtahun });
const pdrb = [row(2024, "1", "A. Pertanian", 100), row(2025, "1", "A. Pertanian", 110), row(2024, "2", "B. Pertambangan", 50), row(2025, "2", "B. Pertambangan", "55,5"), row(2025, "3", "Total", null)];
const names = new Set(["selat", "basarang"]);
const hasDistrict = (label: string) => names.has(label.toLowerCase());
const isRegency = (label: string) => ["kapuas", "kabupaten kapuas", "6203"].includes(label.toLowerCase());

test("variabel berkategori tanpa wilayah dikenali dan diimpor per kategori di tingkat kabupaten", () => {
  assert.equal(isCategoricalVariable(pdrb, 3, hasDistrict, isRegency), true);
  const series = buildSeries({ rows: pdrb, preferredTurtahun: "35", categorical: true, turvarCount: 1, geoOf: () => null, regencyId: "kab", yearMin: 1990, yearMax: 2035 });
  assert.equal(series.size, 2);
  const first = series.get("1|0")!;
  assert.equal(first.label, "A. Pertanian");
  assert.deepEqual([...first.points.values()].map((point) => [point.geography_id, point.year, point.value]), [["kab", 2024, 100], ["kab", 2025, 110]]);
  assert.equal(series.get("2|0")!.points.get("kab:2025")!.value, 55.5);
});

test("variabel per kecamatan atau kabupaten tidak berubah: tetap per wilayah dengan seri menurut turvar", () => {
  const rows = [row(2022, "1", "Selat", 10, "9", "Laki-laki"), row(2022, "2", "Basarang", 8, "9", "Laki-laki"), row(2022, "1", "Selat", 12, "10", "Perempuan")];
  assert.equal(isCategoricalVariable(rows, 2, hasDistrict, isRegency), false);
  const geoOf = (label: string) => (names.has(label.toLowerCase()) ? `geo-${label}` : null);
  const series = buildSeries({ rows, preferredTurtahun: null, categorical: false, turvarCount: 2, geoOf, regencyId: "kab", yearMin: 1990, yearMax: 2035 });
  assert.equal(series.size, 2);
  assert.equal(series.get("9")!.points.size, 2);
});

test("satu kategori saja atau ada baris kabupaten eksplisit bukan variabel berkategori", () => {
  assert.equal(isCategoricalVariable(pdrb.slice(0, 2), 1, hasDistrict, isRegency), false);
  assert.equal(isCategoricalVariable([row(2025, "1", "Kabupaten Kapuas", 5), row(2025, "2", "Kabupaten Lain", 6)], 2, hasDistrict, isRegency), false);
});

test("jika ada beberapa kolom tahun, judul seri memuat nama turvar dan tahun di luar rentang dibuang", () => {
  const rows = [row(2025, "1", "A. Pertanian", 1, "5", "Harga Berlaku"), row(1980, "1", "A. Pertanian", 2, "5", "Harga Berlaku"), row(2025, "1", "A. Pertanian", 3, "6", "Harga Konstan")];
  const series = buildSeries({ rows, preferredTurtahun: null, categorical: true, turvarCount: 2, geoOf: () => null, regencyId: "kab", yearMin: 1990, yearMax: 2035 });
  assert.deepEqual([...series.values()].map((item) => item.label), ["A. Pertanian - Harga Berlaku", "A. Pertanian - Harga Konstan"]);
  assert.equal(series.get("1|5")!.points.size, 1);
});
