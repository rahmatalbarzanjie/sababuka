import assert from "node:assert/strict";
import test from "node:test";
import { formatTanggal } from "../src/utils/date.ts";

test("formatTanggal memakai bentuk tanggal Indonesia yang konsisten", () => {
  assert.equal(formatTanggal("2026-10-08"), "8 Okt 2026");
});

test("formatTanggal memakai zona waktu Asia/Makassar dan pemisah waktu titik", () => {
  assert.equal(formatTanggal("2026-10-08T10:46:00Z", "tanggal-waktu"), "8 Okt 2026, 18.46");
  assert.equal(formatTanggal("2026-10-08T10:46:00Z", "waktu"), "18.46");
});

test("formatTanggal mengembalikan tanda kosong untuk nilai yang tidak dapat dibaca", () => {
  assert.equal(formatTanggal(null), "-");
  assert.equal(formatTanggal("bukan-tanggal"), "-");
});
