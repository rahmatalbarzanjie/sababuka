import assert from "node:assert/strict";
import test from "node:test";
import tls from "node:tls";
import { SECTIGO_DV_R36_PEM, installExtraCaCertificates } from "../src/security/extra-ca.js";
import { describeError } from "../src/services/error-text.js";

test("perantara Sectigo R36 valid dan ditambahkan ke CA bawaan tanpa duplikasi", () => {
  assert.match(SECTIGO_DV_R36_PEM, /^-----BEGIN CERTIFICATE-----/u);
  const api = tls as typeof tls & { getCACertificates?: (type?: string) => string[] };
  if (!installExtraCaCertificates()) return; // Node lama: fitur tidak tersedia
  assert.ok(api.getCACertificates!("default").includes(SECTIGO_DV_R36_PEM));
  const before = api.getCACertificates!("default").length;
  installExtraCaCertificates();
  assert.equal(api.getCACertificates!("default").length, before);
});

test("describeError menyertakan penyebab dari fetch failed", () => {
  const cause = Object.assign(new Error("unable to verify the first certificate"), { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" });
  const error = new TypeError("fetch failed", { cause });
  assert.equal(describeError(error), "fetch failed (UNABLE_TO_VERIFY_LEAF_SIGNATURE: unable to verify the first certificate)");
  assert.equal(describeError("x"), "x");
});
