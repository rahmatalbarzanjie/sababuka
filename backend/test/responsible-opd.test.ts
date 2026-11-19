import assert from "node:assert/strict";
import test from "node:test";
import type { Database } from "../src/database.js";
import type { AuthContext } from "../src/types/auth.js";
import { ResponsibleOpdService } from "../src/services/responsible-opd-service.js";
import type { AuditContext } from "../src/services/audit-service.js";

const A = "11111111-1111-4111-8111-111111111111"; const B = "22222222-2222-4222-8222-222222222222"; const C = "33333333-3333-4333-8333-333333333333";
const IND = "99999999-9999-4999-8999-999999999999";

function fake(existing: Array<{ organization_id: string; is_primary: boolean; basis: string }>, validOrgs: string[]) {
  const inserts: unknown[][] = []; const log: string[] = [];
  const client = {
    query: async (sql: string, values: unknown[] = []) => {
      log.push(sql.trim().split(/\s+/u).slice(0, 3).join(" "));
      if (/^SELECT organization_id/u.test(sql.trim())) return { rows: existing };
      if (/^INSERT INTO sababuka.indicator_responsible_opd/u.test(sql.trim())) inserts.push(values);
      return { rows: [] };
    },
    release: () => undefined,
  };
  const db = {
    query: async (sql: string) => {
      if (/FROM sababuka.indicators WHERE id/u.test(sql)) return { rows: [{ name: "Indikator Uji" }] };
      if (/FROM sababuka.organizations/u.test(sql)) return { rows: validOrgs.map((id) => ({ id })) };
      return { rows: [], rowCount: 1 };
    },
    connect: async () => client,
  } as unknown as Database;
  return { db, inserts, log };
}
const auth = { user: { id: "u" } } as unknown as AuthContext;
const audit = { requestId: "r", ipAddress: null, userAgent: null, actorId: "u" } as unknown as AuditContext;

test("relasi OPD: dasar penetapan asal dipertahankan bila peran tidak berubah, selain itu manual", async () => {
  const { db, inserts, log } = fake([{ organization_id: A, is_primary: true, basis: "rpjmd_tabel_3_5" }, { organization_id: B, is_primary: false, basis: "analisis_tusi" }], [A, B, C]);
  await new ResponsibleOpdService(db).set(auth, IND, { primary_organization_id: A, support_organization_ids: [B, C, C, A] }, audit);
  assert.deepEqual(inserts.map((values) => [values[1], values[2]]), [[A, "rpjmd_tabel_3_5"], [B, "analisis_tusi"], [C, "manual"]]);
  assert.ok(log.includes("BEGIN") && log.includes("COMMIT"));
});

test("relasi OPD: organisasi tidak valid ditolak sebelum menyentuh data", async () => {
  const { db, inserts } = fake([], [A]);
  await assert.rejects(new ResponsibleOpdService(db).set(auth, IND, { primary_organization_id: A, support_organization_ids: [B] }, audit), /bukan OPD/);
  assert.equal(inserts.length, 0);
});
