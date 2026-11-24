import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("migration penyederhanaan peran menjaga histori dan menutup akses lama", () => {
  const migration = read("../database/migrations/087_penyederhanaan_peran_dan_impor_manual.sql");
  assert.ok(migration.includes("code = 'DISKOMINFOSANTIK'"));
  assert.ok(migration.includes("role.code = 'kominfo'"));
  assert.ok(migration.includes("SET ends_at = GREATEST"));
  assert.ok(migration.includes("is_active = false"));
  assert.ok(migration.includes("'bank_data.view'"));
  assert.ok(migration.includes("role.code <> 'bapperida'"));
  assert.ok(migration.includes("sync_mode = 'manual'"));
  assert.ok(migration.includes("verification_mode = 'preview_required'"));
  assert.ok(migration.includes("source_integration_no_schedule_check"));
  assert.equal(migration.includes("DELETE FROM sababuka.users"), false);
  assert.equal(migration.includes("DELETE FROM sababuka.audit_events"), false);
});

test("server tidak menjalankan scheduler konektor", () => {
  const server = read("../src/server.ts");
  const service = read("../src/services/connector-service.ts");
  assert.equal(server.includes("runDueSchedules"), false);
  assert.equal(server.includes("Scheduled connector"), false);
  assert.equal(service.includes("runDueSchedules"), false);
  assert.equal(service.includes("scheduler@sababuka.local"), false);
});

test("route konektor menolak konfigurasi otomatis dan tidak mengekspos impor lama", () => {
  const routes = read("../src/routes/connectors.ts");
  assert.equal(routes.includes('enum: ["manual", "scheduled"]'), false);
  assert.equal(routes.includes('enum: ["preview_required", "auto_import"]'), false);
  assert.equal(routes.includes("express-import-all"), false);
  assert.equal(routes.includes("/sync\""), false);
  assert.equal(routes.includes("runs/:run_id/import"), false);
  assert.equal(routes.includes("/connectors/runs/:run_id"), false);
  assert.ok(routes.includes("/connectors/bank-data/bps/:variable_id/import"));
  assert.ok(routes.includes("/connectors/bank-data/satudata/:package_id/import"));
});
