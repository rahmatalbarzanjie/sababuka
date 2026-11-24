import assert from "node:assert/strict";
import test from "node:test";
import { publicSourceUrl } from "../src/services/public-source-url.js";

test("alamat WebAPI BPS diubah ke halaman tabel statistik publik Kapuas", () => {
  assert.equal(publicSourceUrl("https://webapi.bps.go.id/v1/api/list/model/data/domain/6203/var/104"), `https://kapuaskab.bps.go.id/id/statistics-table/2/${Buffer.from("104#2").toString("base64")}/data.html`);
  assert.equal(Buffer.from("MTA0IzI=", "base64").toString(), "104#2");
});

test("alamat lain tidak diubah dan nilai kosong tetap kosong", () => {
  assert.equal(publicSourceUrl("https://satudata.kapuaskab.go.id/dataset/agen-dan-pasar-rakyat"), "https://satudata.kapuaskab.go.id/dataset/agen-dan-pasar-rakyat");
  assert.equal(publicSourceUrl(null), null);
  assert.equal(publicSourceUrl("bukan url"), "bukan url");
  assert.equal(publicSourceUrl("https://webapi.bps.go.id/v1/api/list/domain"), "https://kapuaskab.bps.go.id/");
});
