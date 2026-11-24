import assert from "node:assert/strict";
import test from "node:test";
import { greetingFor } from "../src/utils/greeting.ts";

test("sapaan mengikuti jam", () => {
  assert.equal(greetingFor(6), "Selamat pagi");
  assert.equal(greetingFor(10), "Selamat pagi");
  assert.equal(greetingFor(11), "Selamat siang");
  assert.equal(greetingFor(14), "Selamat siang");
  assert.equal(greetingFor(15), "Selamat sore");
  assert.equal(greetingFor(17), "Selamat sore");
  assert.equal(greetingFor(18), "Selamat malam");
  assert.equal(greetingFor(2), "Selamat pagi");
});
