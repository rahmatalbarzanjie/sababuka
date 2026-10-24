import assert from "node:assert/strict";
import test from "node:test";
import { buildAutoPublicationNumber } from "../src/services/governance-service.js";

test("automatic publication numbers are unique per indicator key", () => {
  assert.equal(buildAutoPublicationNumber("AUTO_IKP", 1), "AUTO_IKP-001");
  assert.equal(
    buildAutoPublicationNumber("AUTO_KONTRIBUSI_INDUSTRI", 1),
    "AUTO_KONTRIBUSI_INDUSTRI-001",
  );
  assert.notEqual(
    buildAutoPublicationNumber("AUTO_IKP", 1),
    buildAutoPublicationNumber("AUTO_KONTRIBUSI_INDUSTRI", 1),
  );
});
