import test from "node:test";
import assert from "node:assert/strict";
import { bpsYearWindows, findKapuasOption, buildBpsDataUrl, findAmbiguousYears, parseBpsDataContent, redactBpsUrl, summarizeBpsVariables } from "../src/services/bps-adapter.js";

// Bentuk respons nyata WebAPI BPS (model data) untuk variabel 393, Kabupaten Kapuas.
const sample = {
  status: "OK",
  "data-availability": "available",
  subject: [{ val: 520, label: "Tenaga Kerja" }],
  var: [{ val: 393, label: "Pengangguran Terbuka Menurut Pendidikan", unit: "Jiwa", subj: "Tenaga Kerja", def: "", decimal: 0, note: "Sumber: BPS" }],
  turvar: [{ val: "0", label: "Tidak ada" }],
  labelvervar: "Pendidikan Tertinggi yang Ditamatkan",
  vervar: [{ val: 1, label: "Tidak/ Belum Tamat SD" }, { val: 2, label: "SD" }, { val: 7, label: "Jumlah" }],
  tahun: [{ val: 122, label: "2022" }, { val: 123, label: "2023" }],
  turtahun: [{ val: 0, label: "Tahun" }],
  datacontent: { "139301220": 958, "239301220": 1925, "239301230": 811, "739301220": 7221, "739301230": 7991 },
};

test("kunci datacontent diurai menjadi baris per tahun dengan filter kategori", () => {
  const parsed = parseBpsDataContent(sample, { vervar: "7" });
  assert.deepEqual(parsed.rows.map((row) => [row.tahun, row.nilai, row.vervar_label]), [[2022, 7221, "Jumlah"], [2023, 7991, "Jumlah"]]);
  assert.equal(parsed.rows[0]!.satuan, "Jiwa");
  assert.equal(parsed.rows[0]!.wilayah, "6203");
  assert.equal(parsed.variable.id, "393");
  assert.deepEqual(parsed.years, [2022, 2023]);
  assert.equal(parsed.vervars.length, 3);
});

test("tanpa filter, tahun yang sama dengan beberapa kategori dikenali ambigu", () => {
  const parsed = parseBpsDataContent(sample);
  assert.deepEqual(findAmbiguousYears(parsed.rows), [2022, 2023]);
  assert.deepEqual(findAmbiguousYears(parseBpsDataContent(sample, { vervar: "7" }).rows), []);
});

test("jendela tanpa data (datacontent array kosong) menghasilkan nol baris, bukan galat", () => {
  const parsed = parseBpsDataContent({ status: "OK", "data-availability": "available", subject: [], var: [], turvar: [], vervar: [], tahun: [], turtahun: [], datacontent: [] });
  assert.equal(parsed.rows.length, 0);
  assert.deepEqual(parsed.years, []);
});

test("respons status error ditolak", () => {
  assert.throws(() => parseBpsDataContent({ status: "error", message: "x" }), /BPS_RESPONSE_ERROR/u);
});

test("rentang tahun dipecah per 3 tahun sesuai batas BPS", () => {
  assert.deepEqual(bpsYearWindows(2024, 2029), ["124:126", "127:129"]);
  assert.deepEqual(bpsYearWindows(2021, 2029), ["121:123", "124:126", "127:129"]);
  assert.deepEqual(bpsYearWindows(2029, 2029), ["129"]);
});

test("URL data BPS dan penyamaran kunci", () => {
  const url = buildBpsDataUrl("https://webapi.bps.go.id/v1/api/", "6203", "393", "124:126", "kunci rahasia");
  assert.equal(url, "https://webapi.bps.go.id/v1/api/list/model/data/domain/6203/var/393/th/124:126/key/kunci%20rahasia");
  assert.equal(redactBpsUrl(url).includes("rahasia"), false);
});

test("daftar variabel BPS diringkas menjadi metadata", () => {
  const summary = summarizeBpsVariables({ status: "OK", data: [{ page: 1, pages: 2, per_page: 10, count: 1, total: 17 }, [{ var_id: 63, title: "Penduduk Bekerja", sub_name: "Tenaga Kerja", unit: "Jiwa", def: "", notes: "Sumber: BPS" }]] });
  assert.deepEqual(summary, { total: 17, pages: 2, page: 1, results: [{ id: "63", title: "Penduduk Bekerja", subject: "Tenaga Kerja", unit: "Jiwa", description: "Sumber: BPS" }] });
});

test("baris Kabupaten Kapuas dipilih dari daftar kab/kota provinsi, bukan wilayah serupa", () => {
  const list = [{ val: "1", label: "Kapuas Hulu" }, { val: "5", label: "Kab. Kapuas" }, { val: "9", label: "Pulang Pisau" }];
  assert.equal(findKapuasOption(list)?.val, "5");
  assert.equal(findKapuasOption([{ val: "2", label: "Kapuas" }])?.val, "2");
  assert.equal(findKapuasOption([{ val: "1", label: "Kapuas Hulu" }]), null);
});
