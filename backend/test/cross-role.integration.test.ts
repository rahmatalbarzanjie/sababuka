import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { hashPassword } from "../src/security/password.js";
import { testConfig } from "./test-config.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const password = "role-test-password-not-for-production";

test("akses dan menu lintas role mengikuti permission serta scope", { skip: !databaseUrl }, async () => {
  const db = createDatabase(databaseUrl!); const passwordHash = await hashPassword(password);
  const app = await buildApp({ config: { ...testConfig, databaseUrl: databaseUrl! }, db, logger: false });
  try {
    const organizations = await db.query<{ id: string; code: string }>(`SELECT id::text, code FROM sababuka.organizations WHERE code IN ('DKPP','DINKES','DISKOMINFOSANTIK')`);
    const dkpp = organizations.rows.find((item) => item.code === "DKPP")!.id;
    const diskominfo = organizations.rows.find((item) => item.code === "DISKOMINFOSANTIK")!.id;
    const users: Record<string, string> = {};
    const identities = [
      { key: "bapperida", role: "bapperida", organization: null, scope: "global" },
      { key: "pembina_statistik", role: "pembina_statistik", organization: null, scope: "global" },
      { key: "opd", role: "opd", organization: dkpp, scope: "organization" },
      { key: "diskominfo", role: "opd", organization: diskominfo, scope: "organization" },
      { key: "pimpinan", role: "pimpinan", organization: null, scope: "published" },
    ] as const;
    for (const identity of identities) {
      const email = `${identity.key}.qa@sababuka.test`;
      const user = await db.query<{ id: string }>(`INSERT INTO sababuka.users (email, full_name, password_hash, status, must_change_password, mfa_required) VALUES ($1,$2,$3,'active',false,false) RETURNING id::text`, [email, `QA ${identity.key}`, passwordHash]);
      users[identity.key] = user.rows[0]!.id;
      await db.query(`INSERT INTO sababuka.user_role_assignments (user_id, role_id, organization_id, scope_type) SELECT $1,id,$2,$3 FROM sababuka.roles WHERE code=$4`, [user.rows[0]!.id, identity.organization, identity.scope, identity.role]);
      if (identity.organization) await db.query(`INSERT INTO sababuka.organization_memberships (user_id, organization_id, is_primary) VALUES ($1,$2,true)`, [user.rows[0]!.id, identity.organization]);
    }
    const login = async (role: string) => {
      const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { identifier: `${role}.qa@sababuka.test`, password } });
      assert.equal(response.statusCode, 200, response.body);
      return { cookie: String(response.headers["set-cookie"]).split(";", 1)[0]!, csrf: response.json().csrf_token as string };
    };
    const menuCodes = async (cookie: string) => {
      const response = await app.inject({ method: "GET", url: "/api/v1/me/menu", headers: { cookie } });
      assert.equal(response.statusCode, 200, response.body);
      return response.json().data.map((item: { code: string }) => item.code) as string[];
    };

    const opd = await login("opd"); const opdMenu = await menuCodes(opd.cookie);
    assert.deepEqual(opdMenu, ["operations", "opd-profile", "submissions", "consolidation", "governance"]);
    assert.ok(!opdMenu.includes("reviews") && !opdMenu.includes("administration"));
    const opdOperations = await app.inject({ method: "GET", url: "/api/v1/operations/dashboard", headers: { cookie: opd.cookie } });
    assert.equal(opdOperations.statusCode, 200, opdOperations.body);
    assert.ok(opdOperations.json().organizations.every((item: { organization_id: string }) => item.organization_id === dkpp));
    const forbiddenCategory = await app.inject({ method: "POST", url: "/api/v1/categories", headers: { cookie: opd.cookie, "x-csrf-token": opd.csrf }, payload: { code: "FORBIDDEN_QA", name: "Tidak boleh" } });
    assert.equal(forbiddenCategory.statusCode, 403, forbiddenCategory.body);

    const bapperida = await login("bapperida"); const bappMenu = await menuCodes(bapperida.cookie);
    assert.deepEqual([...bappMenu].sort(), ["assistant", "audit", "bank-data", "connectors", "consolidation", "dashboard", "governance", "operations", "publications", "reviews"]);
    const bappMe = await app.inject({ method: "GET", url: "/api/v1/me", headers: { cookie: bapperida.cookie } });
    assert.equal(bappMe.statusCode, 200, bappMe.body);
    assert.ok(!bappMe.json().permissions.includes("indicator.submit"));
    const bappOperations = await app.inject({ method: "GET", url: "/api/v1/operations/dashboard", headers: { cookie: bapperida.cookie } });
    assert.equal(bappOperations.statusCode, 200, bappOperations.body);
    const forbiddenSystem = await app.inject({ method: "GET", url: "/api/v1/system/configuration", headers: { cookie: bapperida.cookie } });
    assert.equal(forbiddenSystem.statusCode, 403, forbiddenSystem.body);

    const pimpinan = await login("pimpinan"); const pimpinanMenu = await menuCodes(pimpinan.cookie);
    assert.deepEqual(pimpinanMenu, ["assistant"]);
    assert.ok(!pimpinanMenu.includes("executive"));
    assert.ok(!pimpinanMenu.includes("submissions") && !pimpinanMenu.includes("audit"));
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/executive/dashboard", headers: { cookie: pimpinan.cookie } })).statusCode, 403);
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/submissions", headers: { cookie: pimpinan.cookie } })).statusCode, 403);
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/audit/events", headers: { cookie: pimpinan.cookie } })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: "/api/v1/assistant/sessions", headers: { cookie: pimpinan.cookie, "x-csrf-token": pimpinan.csrf }, payload: { title: "QA" } })).statusCode, 201);

    const diskominfoOpd = await login("diskominfo"); const diskominfoMenu = await menuCodes(diskominfoOpd.cookie);
    assert.deepEqual(diskominfoMenu, opdMenu);
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/connectors/integrations", headers: { cookie: diskominfoOpd.cookie } })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: "/api/v1/publications", headers: { cookie: diskominfoOpd.cookie, "x-csrf-token": diskominfoOpd.csrf }, payload: { publication_key: "QA", publication_number: "QA-1", title: "Tidak boleh" } })).statusCode, 403);

    const pembina = await login("pembina_statistik"); const pembinaMenu = await menuCodes(pembina.cookie);
    assert.deepEqual(pembinaMenu, ["bank-data"]);
    assert.equal((await app.inject({ method: "GET", url: "/api/v1/executive/bank-data", headers: { cookie: pembina.cookie } })).statusCode, 200);
  } finally { await app.close(); await db.end(); }
});
