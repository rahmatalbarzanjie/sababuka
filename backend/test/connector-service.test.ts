import test from "node:test";
import assert from "node:assert/strict";
import type { QueryResult } from "pg";
import type { Database, QueryResultRow } from "../src/database.js";
import { readFileSync } from "node:fs";
import { buildBpsDomainUrl, CONNECTOR_YEAR_MAX, CONNECTOR_YEAR_MIN, ConnectorService, extractBpsDomains, parseCsv } from "../src/services/connector-service.js";
import { testConfig } from "./test-config.js";

function result<R extends QueryResultRow>(rows: R[]): QueryResult<R> {
  return { command: "SELECT", rowCount: rows.length, oid: 0, fields: [], rows };
}

test("parseCsv preserves quoted commas and escaped quotes", () => {
  const rows = parseCsv('tahun,wilayah,nilai,catatan\n2025,6203,"24,07","Angka ""resmi"""\n');
  assert.deepEqual(rows, [{ tahun: "2025", wilayah: "6203", nilai: "24,07", catatan: 'Angka "resmi"' }]);
});

test("parseCsv returns an empty list for header-only resources", () => {
  assert.deepEqual(parseCsv("tahun,nilai\n"), []);
});

test("BPS domain request uses the current public API contract", () => {
  const url = new URL(buildBpsDomainUrl("https://webapi.bps.go.id/v1/api/", "secret key"));
  assert.equal(url.pathname, "/v1/api/domain");
  assert.equal(url.searchParams.get("type"), "kab");
  assert.equal(url.searchParams.get("key"), "secret key");
  assert.equal(url.toString().includes("adminkab"), false);
});

test("BPS domains are extracted from the documented paginated response", () => {
  const domains = extractBpsDomains({ status: "OK", data: [{ page: 1, pages: 1 }, [{ domain_id: "6203", domain_name: "Kabupaten Kapuas" }]] });
  assert.deepEqual(domains, [{ domain_id: "6203", domain_name: "Kabupaten Kapuas" }]);
});

test("BPS connection profile exposes sanitized metrics and candidate summary", async () => {
  const originalKey = process.env.BPS_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.BPS_API_KEY = "mock-bps-key-2026";
  const fakeDb: Database = {
    query: async <R extends QueryResultRow>(sql: string) => {
      if (sql.includes("FROM sababuka.data_sources WHERE code")) return result<R>([{ id: "source-1", code: "BPS_KAPUAS", name: "BPS", source_type: "bps", base_url: "https://example.test/v1/api", connection_config: { domain_code: "6203" }, credential_reference: "BPS_API_KEY", last_checked_at: null }] as unknown as R[]);
      if (sql.includes("FROM sababuka.connector_secrets")) return result<R>([]);
      if (sql.includes("SELECT 'category' AS type")) return result<R>([{ type: "indicator", code: "IKP", name: "Indeks Ketahanan Pangan", indicator_version_id: "version-1" }] as unknown as R[]);
      if (sql.includes("FROM sababuka.indicator_source_mappings")) return result<R>([]);
      return result<R>([]);
    },
    connect: async () => { throw new Error("connect tidak digunakan"); },
    end: async () => undefined,
  };
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.pathname, "/v1/api/domain");
    assert.equal(url.searchParams.get("type"), "kab");
    return new Response(JSON.stringify({ status: "OK", data: [{ page: 1, pages: 1 }, [{ domain_id: "6203", domain_name: "Indeks Ketahanan Pangan" }]] }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const profile = await new ConnectorService(fakeDb, testConfig).testSource("BPS_KAPUAS", { actorId: "user-1", requestId: "req-1", ipAddress: null, userAgent: null });
    assert.equal(profile.reachable, true);
    assert.equal(profile.platform, "BPS WebAPI");
    assert.equal(profile.publishers[0], "BPS Kabupaten Kapuas");
    assert.equal(profile.candidate_summary.candidate_count, 1);
    assert.equal(JSON.stringify(profile).includes("mock-bps-key-2026"), false);
    globalThis.fetch = async () => new Response("unauthorized", { status: 401 });
    const failed = await new ConnectorService(fakeDb, testConfig).testSource("BPS_KAPUAS", { actorId: "user-1", requestId: "req-2", ipAddress: null, userAgent: null });
    assert.equal(failed.reachable, false);
    assert.equal(failed.error, "API key ditolak oleh WebAPI BPS. Periksa kembali key yang dimasukkan.");
    assert.equal(JSON.stringify(failed).includes("mock-bps-key-2026"), false);
    globalThis.fetch = async () => new Response(JSON.stringify({ status: "Error", error: "UserNotFound" }), { status: 200, headers: { "content-type": "application/json" } });
    const rejected = await new ConnectorService(fakeDb, testConfig).testSource("BPS_KAPUAS", { actorId: "user-1", requestId: "req-3", ipAddress: null, userAgent: null });
    assert.equal(rejected.reachable, false);
    assert.match(rejected.error ?? "", /Periksa API key, aplikasi yang terdaftar, dan parameter endpoint/u);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.BPS_API_KEY; else process.env.BPS_API_KEY = originalKey;
  }
});

test("rentang tahun konektor 2024-2029 konsisten dengan CHECK database", () => {
  assert.equal(CONNECTOR_YEAR_MIN, 2024);
  assert.equal(CONNECTOR_YEAR_MAX, 2029);
  const migration = readFileSync(new URL("../database/migrations/053_connector_year_range_2024.sql", import.meta.url), "utf8");
  assert.ok(migration.includes(`CHECK (year BETWEEN ${CONNECTOR_YEAR_MIN} AND ${CONNECTOR_YEAR_MAX})`));
});

test("API key BPS tetap tersimpan terenkripsi dan uji gagal tercatat sebagai riwayat", async () => {
  const originalFetch = globalThis.fetch;
  const plaintext = "kunci-bps-uji-gagal-2026";
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const fakeDb: Database = {
    query: async <R extends QueryResultRow>(sql: string, params: unknown[] = []) => {
      statements.push({ sql, params });
      if (sql.includes("FROM sababuka.data_sources WHERE code")) return result<R>([{ id: "source-1", code: "BPS_KAPUAS", name: "BPS", source_type: "bps", base_url: "https://example.test/v1/api", connection_config: { domain_code: "6203" }, credential_reference: null, last_checked_at: null }] as unknown as R[]);
      if (sql.includes("FROM sababuka.connector_secrets")) return result<R>([]);
      return result<R>([]);
    },
    connect: async () => { throw new Error("connect tidak digunakan"); },
    end: async () => undefined,
  };
  globalThis.fetch = async () => new Response("unauthorized", { status: 401 });
  try {
    const outcome = await new ConnectorService(fakeDb, testConfig).saveBpsSecret({ user: { id: "user-1" } } as never, plaintext, { actorId: "user-1", requestId: "req-save", ipAddress: null, userAgent: null });
    assert.equal(outcome.profile.reachable, false);
    const secretWrite = statements.find((item) => item.sql.includes("INSERT INTO sababuka.connector_secrets"));
    assert.ok(secretWrite, "key harus tetap disimpan walau uji gagal");
    assert.equal(secretWrite.params[4], "failed");
    assert.match(String(secretWrite.params[5]), /ditolak/u);
    assert.notEqual(secretWrite.params[1], plaintext);
    assert.equal(JSON.stringify(statements.map((item) => item.params)).includes(plaintext), false, "key asli tidak boleh muncul di parameter query mana pun");
    assert.ok(statements.some((item) => item.sql.includes("INSERT INTO sababuka.connector_connection_checks")), "hasil uji terakhir harus diperbarui");
    const history = statements.find((item) => item.sql.includes("INSERT INTO sababuka.connector_check_history"));
    assert.ok(history, "setiap uji gagal harus menambah riwayat");
    assert.equal(history.params[2], false);
    assert.equal(history.params[8], "user-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
