import assert from "node:assert/strict";
import test from "node:test";
import { capaianStatusLabel, statusLabel } from "../src/utils/status-label.ts";

test("status indikator memakai sudut pandang OPD", () => {
  assert.equal(statusLabel("opd_verification", "opd"), "Perlu Anda verifikasi");
  assert.equal(statusLabel("in_review", "opd"), "Menunggu pemeriksaan BAPPERIDA");
});

test("status yang sama menjelaskan pihak berikutnya bagi BAPPERIDA", () => {
  assert.equal(statusLabel("opd_verification", "bapperida"), "Menunggu verifikasi OPD");
  assert.equal(statusLabel("in_review", "bapperida"), "Perlu Anda periksa");
});

test("status capaian menonjolkan tindakan pengguna", () => {
  assert.equal(capaianStatusLabel("returned", "opd"), "Perlu Anda perbaiki");
  assert.equal(capaianStatusLabel("submitted", "bapperida"), "Perlu Anda periksa");
});
