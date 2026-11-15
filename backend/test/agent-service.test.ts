import assert from "node:assert/strict";
import test from "node:test";
import type { Database } from "../src/database.js";
import { AGENT_SYSTEM_PROMPT, AGENT_TOOLS, AgentService } from "../src/services/agent-service.js";
import type { Insight } from "../src/services/insight-service.js";
import { ungroundedNumbers } from "../src/services/llm-service.js";
import { analyzeDistricts, analyzeSeries, buildNarrative } from "../src/services/trend-engine.js";

function make(id: string, name: string, values: number[], opds: string[], kind: Insight["source_kind"] = "bps"): Insight {
  const points = values.map((value, index) => ({ year: 2019 + index, value }));
  const analysis = analyzeSeries(points, "increase")!;
  const districts = analyzeDistricts([{ name: "Selat", value: 5, previous: 9 }, { name: "Basarang", value: 12, previous: 11 }, { name: "Timpah", value: 30, previous: 28 }]);
  const narrative = buildNarrative({ name, unit: "%", analysis, districts, opds, direction: "increase" });
  return { indicator_id: id, code: id, name, category: "Pendidikan", source_kind: kind, unit: "%", latest_year: analysis.latest_year, latest_value: analysis.latest_value, change_pct: analysis.change_pct, trend: analysis.trend, assessment: analysis.assessment, score: analysis.score, ...narrative, opds, direction_inferred: false, source_label: "BPS Kabupaten Kapuas", series: points, analysis, districts, district_latest: { year: 2024, items: [{ name: "Selat", value: 5, previous: 9 }, { name: "Basarang", value: 12, previous: 11 }, { name: "Timpah", value: 30, previous: 28 }] }, basis: "kabupaten" };
}

const insights = [make("a", "Angka Melek Huruf", [90, 92, 94, 95, 96, 97], ["Dinas Pendidikan"], "rpjmd"), make("b", "Produksi Padi", [100, 90, 80, 70, 60, 50], ["Dinas Pertanian"])];
const agent = new AgentService({} as Database);

test("alat tersedia lengkap dan prompt membatasi ruang lingkup Kapuas", () => {
  assert.deepEqual(AGENT_TOOLS.map((tool) => tool.name).sort(), ["ambil_kecamatan", "ambil_tren", "cari_indikator", "indikator_opd", "perubahan_terbesar", "ringkasan_umum", "skor_opd"]);
  assert.match(AGENT_SYSTEM_PROMPT, /HANYA hal yang berkaitan dengan Kabupaten Kapuas/);
});

test("cari_indikator dan ambil_tren mengembalikan data dan visual", () => {
  const found = agent.execute("cari_indikator", { kata_kunci: "melek huruf" }, insights).result as { indikator: Array<{ indikator_id: string; status_data: string }> };
  assert.equal(found.indikator[0]!.indikator_id, "a");
  assert.match(found.indikator[0]!.status_data, /RPJMD/);
  const trend = agent.execute("ambil_tren", { indikator_id: "b" }, insights);
  assert.equal(trend.visual?.kind, "trend");
  assert.equal((trend.result as { penilaian: string }).penilaian, "memburuk");
});

test("ambil_kecamatan memberi urutan dan visual batang", () => {
  const outcome = agent.execute("ambil_kecamatan", { indikator_id: "a" }, insights);
  const result = outcome.result as { kecamatan: Array<{ nama: string }> };
  assert.equal(result.kecamatan[0]!.nama, "Timpah");
  assert.equal(outcome.visual?.kind, "districts");
});

test("perubahan_terbesar, indikator_opd, ringkasan, dan alat tak dikenal", () => {
  const worst = agent.execute("perubahan_terbesar", { jenis: "memburuk" }, insights).result as { indikator: Array<{ nama: string }> };
  assert.equal(worst.indikator[0]!.nama, "Produksi Padi");
  const opd = agent.execute("indikator_opd", { nama_opd: "pendidikan" }, insights).result as { jumlah: number };
  assert.equal(opd.jumlah, 1);
  assert.equal((agent.execute("ringkasan_umum", {}, insights).result as { indikator_dianalisis: number }).indikator_dianalisis, 2);
  assert.ok("galat" in (agent.execute("hapus_semua", {}, insights).result as object));
});

test("angka di luar hasil alat terdeteksi", () => {
  const evidence = JSON.stringify({ nilai: "97", perubahan: "+1%", riwayat: [{ tahun: 2024, nilai: "97" }] });
  assert.deepEqual(ungroundedNumbers("Melek huruf 97% pada 2024, naik 1%.", evidence), []);
  assert.deepEqual(ungroundedNumbers("Melek huruf 99,5% pada 2024.", evidence), ["99,5"]);
});

test("putaran agen: panggil alat, koreksi angka karangan, lalu jawab", async () => {
  const originalFetch = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-1234567890";
  const db = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Database;
  const replies = [
    { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "ringkasan_umum", input: {} }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Ada 777 indikator dianalisis." }] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Belum ada indikator yang dapat dianalisis saat ini." }] },
  ];
  const bodies: Array<{ messages: unknown[] }> = [];
  globalThis.fetch = (async (_url: unknown, init: { body: string }) => { bodies.push(JSON.parse(init.body)); return new Response(JSON.stringify(replies[bodies.length - 1]), { status: 200 }); }) as typeof fetch;
  try {
    const result = await new AgentService(db).run("Bagaimana kondisi Kapuas?", []);
    assert.ok(result);
    assert.match(result!.answer, /Belum ada indikator/);
    assert.deepEqual(result!.toolsUsed, ["ringkasan_umum"]);
    assert.equal(bodies.length, 3);
  } finally { globalThis.fetch = originalFetch; delete process.env.ANTHROPIC_API_KEY; }
});

test("agen mengembalikan null bila model terus memakai angka di luar data", async () => {
  const originalFetch = globalThis.fetch;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-1234567890";
  const db = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Database;
  globalThis.fetch = (async () => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "Totalnya 4.321 jiwa." }] }), { status: 200 })) as typeof fetch;
  try { assert.equal(await new AgentService(db).run("Berapa penduduk?", []), null); }
  finally { globalThis.fetch = originalFetch; delete process.env.ANTHROPIC_API_KEY; }
});
