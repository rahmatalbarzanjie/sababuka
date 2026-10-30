import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { createDatabase } from "../src/database.js";
import { testConfig } from "./test-config.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
const password = process.env.INTEGRATION_ADMIN_PASSWORD ?? "integration-password-not-for-production";

test("rujukan data: OPD boleh mencari, pimpinan dan anonim ditolak", { skip: !databaseUrl }, async () => {
  const db = createDatabase(databaseUrl!);
  const app = await buildApp({ config: { ...testConfig, databaseUrl: databaseUrl! }, db, logger: false });
  try {
    const login = async (identifier: string) => {
      const response = await app.inject({ method: "POST", url: "/api/v1/auth/login", payload: { identifier, password } });
      assert.equal(response.statusCode, 200, response.body);
      return (response.headers["set-cookie"] as string).split(";", 1)[0]!;
    };
    const search = (cookie?: string) => app.inject({ method: "GET", url: "/api/v1/reference/datasets?q=kemiskinan&source=bps", headers: cookie ? { cookie } : {} });

    assert.equal((await search()).statusCode, 401);
    assert.equal((await search(await login("pimpinan@sababuka.com"))).statusCode, 403);
    // OPD lolos otorisasi; hasilnya bergantung pada kunci/jaringan BPS, jadi hanya pastikan bukan 401/403.
    const opd = await search(await login("opd.dkpp@sababuka.com"));
    assert.ok(![401, 403].includes(opd.statusCode), `OPD ditolak: ${opd.statusCode} ${opd.body}`);

    const menu = await app.inject({ method: "GET", url: "/api/v1/me", headers: { cookie: await login("opd.dkpp@sababuka.com") } });
    assert.ok(menu.json().permissions.includes("reference.search"));
  } finally {
    await app.close();
    await db.end();
  }
});
