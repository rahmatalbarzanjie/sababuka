import assert from "node:assert/strict";
import test from "node:test";
import { formatStoredNumber, trimNumericText } from "../src/utils/number-format.ts";

test("trimNumericText membuang nol sisa numeric(30,10) tanpa mengubah angka", () => {
  assert.equal(trimNumericText("1234.0000000000"), "1234");
  assert.equal(trimNumericText("1.2340000000"), "1.234");
  assert.equal(trimNumericText("100.0000000000"), "100");
  assert.equal(trimNumericText("0.0000000000"), "0");
  assert.equal(trimNumericText("-5.5000000000"), "-5.5");
  assert.equal(trimNumericText("100"), "100");
  assert.equal(trimNumericText(82.75), "82.75");
  assert.equal(trimNumericText(null), "");
  assert.equal(trimNumericText("Baik"), "Baik");
});

test("formatStoredNumber menampilkan desimal sesuai yang dimasukkan", () => {
  assert.equal(formatStoredNumber("1.2340000000"), "1,234");
  assert.equal(formatStoredNumber("1234.0000000000"), "1.234");
  assert.equal(formatStoredNumber("82.7500000000"), "82,75");
  assert.equal(formatStoredNumber("0.0001234500"), "0,00012345");
  assert.equal(formatStoredNumber("abc"), "abc");
});
