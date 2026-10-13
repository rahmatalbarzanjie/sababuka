import assert from "node:assert/strict";
import test from "node:test";
import { allowedScopesForRole, assertRoleScope, registrationRoleCodesForOrganization } from "../src/services/admin-service.js";

test("matriks role-scope mengikuti desain SABABUKA", () => {
  assert.deepEqual(allowedScopesForRole("superadmin"), ["global"]);
  assert.deepEqual(allowedScopesForRole("bapperida"), ["global"]);
  assert.deepEqual(allowedScopesForRole("kominfo"), ["global"]);
  assert.deepEqual(allowedScopesForRole("opd"), ["organization"]);
  assert.deepEqual(allowedScopesForRole("pimpinan"), ["published"]);
  assert.deepEqual(allowedScopesForRole("role-tidak-dikenal"), []);
  assert.doesNotThrow(() => assertRoleScope("opd", "organization", "org-1"));
  assert.doesNotThrow(() => assertRoleScope("pimpinan", "published"));
  assert.throws(() => assertRoleScope("opd", "global"), { code: "INVALID_ROLE_SCOPE" });
  assert.throws(() => assertRoleScope("pimpinan", "organization", "org-1"), { code: "INVALID_ROLE_SCOPE" });
  assert.throws(() => assertRoleScope("opd", "organization"), { code: "VALIDATION_ERROR" });
});

test("paket peran pendaftaran mengikuti instansi", () => {
  assert.deepEqual(registrationRoleCodesForOrganization("BAPPERIDA"), ["opd", "bapperida"]);
  assert.deepEqual(registrationRoleCodesForOrganization("DISKOMINFOSANTIK"), ["opd", "kominfo"]);
  assert.deepEqual(registrationRoleCodesForOrganization("BPS_KAPUAS"), ["opd", "pembina_statistik"]);
  assert.deepEqual(registrationRoleCodesForOrganization("DINKES"), ["opd"]);
});
