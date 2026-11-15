import assert from "node:assert/strict";
import test from "node:test";
import { inferDirection } from "../src/services/direction-inference.js";

test("arah baik diperkirakan dari nama indikator", () => {
  assert.equal(inferDirection("Persentase Penduduk Miskin"), "decrease");
  assert.equal(inferDirection("Angka Melek Huruf"), "increase");
  assert.equal(inferDirection("Produksi Padi Sawah"), "increase");
  assert.equal(inferDirection("Jumlah Kendaraan Bermotor"), null);
});
