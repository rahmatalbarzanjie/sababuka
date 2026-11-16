import assert from "node:assert/strict";
import test from "node:test";
import type { QueryResult } from "pg";
import { buildApp } from "../src/app.js";
import type { Database, QueryResultRow } from "../src/database.js";
import { testConfig } from "./test-config.js";

function result<R extends QueryResultRow>(rows: R[]): QueryResult<R> {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

const fakeDb: Database = {
  query: async <R extends QueryResultRow>() => result<R>([]),
  connect: async () => {
    throw new Error("connect tidak digunakan pada health test");
  },
  end: async () => undefined,
};

test("GET /api/v1/health mengembalikan status ok", async () => {
  const app = await buildApp({ config: testConfig, db: fakeDb, logger: false });
  const response = await app.inject({ method: "GET", url: "/api/v1/health" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "ok");
  assert.equal(typeof response.headers["x-request-id"], "string");
  await app.close();
});

test("GET /api/v1/me tanpa sesi ditolak", async () => {
  const app = await buildApp({ config: testConfig, db: fakeDb, logger: false });
  const response = await app.inject({ method: "GET", url: "/api/v1/me" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().error.code, "AUTH_REQUIRED");
  assert.equal(response.headers["x-request-id"], response.json().error.request_id);
  await app.close();
});

test("galat 4xx Fastify tanpa validation dilaporkan sebagai 400, bukan 500", async () => {
  const app = await buildApp({ config: testConfig, db: fakeDb, logger: false });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    headers: { "content-type": "application/json" },
    payload: "",
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "BAD_REQUEST");
  assert.equal(response.json().error.request_id, response.headers["x-request-id"]);
  await app.close();
});

test("trustProxyHops membatasi alamat klien dari X-Forwarded-For", async () => {
  const probe = async (hops: number) => {
    const app = await buildApp({ config: { ...testConfig, trustProxyHops: hops }, db: fakeDb, logger: false });
    app.addHook("onSend", async (request, reply, payload) => { reply.header("x-seen-ip", request.ip); return payload; });
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
      remoteAddress: "127.0.0.1",
      headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.9, 172.70.1.1" },
    });
    return String(response.headers["x-seen-ip"]);
  };
  assert.equal(await probe(0), "127.0.0.1");
  assert.equal(await probe(2), "203.0.113.9");
});
