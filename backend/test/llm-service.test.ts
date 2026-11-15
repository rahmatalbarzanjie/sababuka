import assert from "node:assert/strict";
import test from "node:test";
import { numbersGrounded } from "../src/services/llm-service.js";

const facts = JSON.stringify({ nilai: "9,5", perubahan: "-5,3%", riwayat: ["2023: 10,02", "2024: 9,5"], jumlah: "1.250" });

test("angka yang ada pada fakta diterima", () => {
  assert.equal(numbersGrounded("Kemiskinan turun 5,3% menjadi 9,5% pada 2024; jumlahnya 1.250 jiwa.", facts), true);
});

test("angka karangan model ditolak", () => {
  assert.equal(numbersGrounded("Kemiskinan turun 7,8% pada 2024.", facts), false);
});

test("tahun dan bilangan kecil diabaikan", () => {
  assert.equal(numbersGrounded("Selama 3 tahun terakhir, sejak 2021, ada 2 kecamatan terdampak.", facts), true);
});
