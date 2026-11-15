import assert from "node:assert/strict";
import test from "node:test";
import { inferUnit, resolveUnit } from "../src/services/unit-inference.js";

test("satuan resmi sumber dipakai bila bermakna", () => {
  assert.equal(resolveUnit("Ton", "Produksi Padi"), "Ton");
  assert.equal(resolveUnit("Angka", "Jumlah Kendaraan Bermotor - Sepeda Motor"), "Unit");
  assert.equal(resolveUnit(null, "Rasio Murid-Guru SD"), "Rasio");
});

test("tebakan dari judul tabel Satu Data", () => {
  assert.equal(inferUnit("Jumlah Tenaga Kesehatan di Kabupaten Kapuas 2022 - Tenaga Medis"), "Orang");
  assert.equal(inferUnit("Jumlah Fasilitas Kesehatan - Puskesmas"), "Unit");
  assert.equal(inferUnit("Luas Lahan Sawah Menurut Kecamatan - Irigasi"), "Hektar");
  assert.equal(inferUnit("Rata-Rata Data Harga Pangan Harga Pangan Strategis (Rp/Kg) - Beras Umum"), "Rp/Kg");
  assert.equal(inferUnit("Jumlah Kasus HIV atau AIDS - DBD"), "Kasus");
});

test("tidak pernah mengembalikan Angka", () => {
  assert.notEqual(resolveUnit(null, "Sesuatu Yang Tidak Dikenal"), "Angka");
  assert.equal(resolveUnit(null, "Jumlah Sesuatu"), "Jumlah");
  assert.equal(resolveUnit("", "Sesuatu"), "Nilai");
});
