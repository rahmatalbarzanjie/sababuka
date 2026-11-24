import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("riwayat chat dibatasi pemilik dan pesan memiliki kunci idempotensi", () => {
  const service = read("../src/services/assistant-service.ts");
  const route = read("../src/routes/assistant.ts");
  const migration = read("../database/migrations/088_riwayat_chat_bupati.sql");

  assert.match(service, /s\.user_id = \$1 AND s\.status = \$2/u);
  assert.match(service, /WHERE id = \$1 AND user_id = \$2/u);
  assert.match(route, /client_message_id/u);
  assert.match(migration, /UNIQUE INDEX IF NOT EXISTS assistant_messages_client_id_unique/u);
  assert.match(migration, /message_role = 'user'/u);
});

test("catatan BPS tidak mengubah nilai dan hanya penyelesai yang berwenang dapat menutup", () => {
  const migration = read("../database/migrations/089_catatan_pembinaan_bank_data.sql");
  const service = read("../src/services/bank-data-guidance-service.ts");
  const route = read("../src/routes/bank-data-guidance.ts");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS sababuka\.bank_data_guidance_notes/u);
  assert.match(migration, /WHERE r\.code = 'pembina_statistik'/u);
  assert.match(migration, /WHERE r\.code IN \('superadmin', 'bapperida'\)/u);
  assert.doesNotMatch(service, /UPDATE sababuka\.observations/u);
  assert.match(route, /requirePermission\(request, "bank_data\.note"\)/u);
  assert.match(route, /requirePermission\(request, "bank_data\.resolve_note"\)/u);
});
