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
  return { layer: kind === "bps" || kind === "satudata" ? "konteks" : "kinerja", links: [], limited: false, source_url: null, indicator_id: id, code: id, name, category: "Pendidikan", source_kind: kind, unit: "%", latest_year: analysis.latest_year, latest_value: analysis.latest_value, change_pct: analysis.change_pct, trend: analysis.trend, assessment: analysis.assessment, score: analysis.score, ...narrative, opds, direction_inferred: false, source_label: "BPS Kabupaten Kapuas", series: points, analysis, districts, district_latest: { year: 2024, items: [{ name: "Selat", value: 5, previous: 9 }, { name: "Basarang", value: 12, previous: 11 }, { name: "Timpah", value: 30, previous: 28 }] }, basis: "kabupaten" };
}

const insights = [make("a", "Angka Melek Huruf", [90, 92, 94, 95, 96, 97], ["Dinas Pendidikan"], "rpjmd"), make("b", "Produksi Padi", [100, 90, 80, 70, 60, 50], ["Dinas Pertanian"])];
const agent = new AgentService({} as Database);

test("alat tersedia lengkap dan prompt membatasi ruang lingkup Kapuas", () => {
  assert.deepEqual(AGENT_TOOLS.map((tool) => tool.name).sort(), ["ambil_kecamatan", "ambil_tren", "analisis_silang", "capaian_target", "cari_indikator", "indikator_opd", "kondisi_opd", "perubahan_terbesar", "ringkasan_fokus", "ringkasan_umum", "skor_opd", "wilayah_prioritas"]);
  assert.match(AGENT_SYSTEM_PROMPT, /HANYA hal yang berkaitan dengan Kabupaten Kapuas/);
});

test("cari_indikator juga menemukan indikator RPJMD bertarget yang baru punya satu tahun data", () => {
  const achievement = [{ indicator_id: "k", name: "Tingkat Kemiskinan", sector: "Kesejahteraan", unit: "%", source_kind: "rpjmd" as const, direction: "decrease" as const, latest_year: 2025, latest_value: 5.48, target_year: 2025, target_value: 5, gap: 0.48, gap_pct: 9.6, status: "belum_tercapai" as const, opds: ["Dinsos"], follow_up: "" }];
  const result = agent.execute("cari_indikator", { kata_kunci: "kemiskinan" }, insights, achievement).result as { jumlah: number; indikator_rpjmd_bertarget: Array<{ nama: string; realisasi: string; target: string }> };
  assert.equal(result.jumlah, 1);
  assert.equal(result.indikator_rpjmd_bertarget[0]!.nama, "Tingkat Kemiskinan");
  assert.equal(result.indikator_rpjmd_bertarget[0]!.target, "5");
  assert.equal((result.indikator_rpjmd_bertarget[0] as unknown as { selisih: string }).selisih, "0,48");
});

test("indikator bernilai 0 atau berubah ekstrem diberi peringatan", () => {
  const zero = make("z", "Usia Harapan Hidup", [69, 70, 71, 0], ["Dinkes"], "rpjmd");
  const brief = agent.execute("ambil_tren", { indikator_id: "z" }, [zero]).result as { peringatan?: string };
  assert.match(brief.peringatan ?? "", /0 kemungkinan belum diisi/);
  const jump = make("j", "Prevalensi Stunting", [22.5, 22.5, 7.7], ["Dinkes"], "rpjmd");
  assert.match((agent.execute("cari_indikator", { kata_kunci: "stunting" }, [jump]).result as { indikator: Array<{ peringatan?: string }> }).indikator[0]!.peringatan ?? "", /sangat besar/);
  assert.equal((agent.execute("ambil_tren", { indikator_id: "a" }, insights).result as { peringatan?: string }).peringatan, undefined);
});

test("wilayah_prioritas mengurutkan kecamatan dan menjelaskan dasar penilaiannya", () => {
  const empty = { counts: { tercapai: 0, belum_tercapai: 0, unggul: 0, sedang: 0, perhatian: 0, tanpa_arah: 0 }, trend_counts: { membaik: 0, memburuk: 0, stabil: 0 } };
  const districts = { generated_at: "", coverage: { indicators: 12, with_target: 0, by_source: { rpjmd: 0, opd: 0, bank_data: 12 } }, districts: [
    { name: "Selat", indicators: 10, ...empty, attention_index: 10, good_index: 60, growth_index: 20 },
    { name: "Timpah", indicators: 10, ...empty, attention_index: 70, good_index: 10, growth_index: -30 },
  ] };
  const outcome = agent.execute("wilayah_prioritas", { mode: "kondisi" }, insights, [], { contexts: new Map(), focus: null, districts, districtDetails: new Map() });
  const result = outcome.result as { kecamatan_paling_perlu_perhatian: Array<{ nama: string; skor: string }>; catatan: string };
  assert.equal(result.kecamatan_paling_perlu_perhatian[0]!.nama, "Timpah");
  assert.equal(result.kecamatan_paling_perlu_perhatian[0]!.skor, "-60");
  assert.deepEqual(ungroundedNumbers("Timpah memiliki 70 persen indikator perlu perhatian dan skor -60,5", JSON.stringify({ a: "70", b: "-60,5" })), []);
  assert.match(result.catatan, /belum diverifikasi/);
  assert.equal(outcome.visual?.kind, "districts");
  assert.ok("galat" in (agent.execute("wilayah_prioritas", {}, insights).result as object));
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

test("capaian_target menyajikan status terhadap target tanpa menghitung ulang", () => {
  const item = (name: string, status: string, latest: number | null, target: number, gapPct: number | null) => ({ indicator_id: name, name, sector: "S", unit: "%", source_kind: "rpjmd", latest_year: latest === null ? null : 2025, latest_value: latest, target_year: 2025, target_value: target, gap: latest === null ? null : latest - target, gap_pct: gapPct, status, opds: ["Dinsos"], follow_up: "x" });
  const rows = [item("A", "belum_tercapai", 5.48, 5, -9.6), item("B", "tercapai", 7, 5, 40), item("C", "belum_ada_data", null, 5, null)] as never;
  const result = agent.execute("capaian_target", {}, insights, rows).result as { tercapai: number; belum_tercapai: number; belum_ada_realisasi: number; indikator: Array<{ nama: string; selisih: string }> };
  assert.deepEqual([result.tercapai, result.belum_tercapai, result.belum_ada_realisasi], [1, 1, 1]);
  assert.deepEqual(result.indikator.map((entry) => entry.nama), ["A"]);
  assert.equal(result.indikator[0]!.selisih, "0,48");
  assert.match(AGENT_SYSTEM_PROMPT, /tidak menyimpan tanggapan atau rencana OPD/);
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
  try {
    const service = new AgentService(db);
    assert.equal(await service.run("Berapa penduduk?", []), null);
    assert.equal(service.failure, "angka_tidak_terverifikasi");
  } finally { globalThis.fetch = originalFetch; delete process.env.ANTHROPIC_API_KEY; }
});

test("agen mencatat alasan bila model tidak tersedia", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const db = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Database;
  const service = new AgentService(db);
  assert.equal(await service.run("Berapa penduduk?", []), null);
  assert.equal(service.failure, "llm_tidak_tersedia");
});

test("kondisi_opd menggabungkan capaian target, tren, dan kelengkapan realisasi per OPD", () => {
  const row = (name: string, opd: string, status: string, latest: number | null, target: number, gapPct: number | null) => ({ indicator_id: name, name, sector: "S", unit: "%", source_kind: "rpjmd", latest_year: latest === null ? null : 2025, latest_value: latest, target_year: 2025, target_value: target, gap: latest === null ? null : latest - target, gap_pct: gapPct, status, opds: [opd], follow_up: "x" });
  const rows = [
    row("A1", "Dinas Pendidikan", "tercapai", 7, 5, 40), row("A2", "Dinas Pendidikan", "tercapai", 9, 5, 80), row("A3", "Dinas Pendidikan", "tercapai", 6, 5, 20),
    row("B1", "Dinas Pertanian", "belum_tercapai", 4, 8, -50), row("B2", "Dinas Pertanian", "belum_ada_data", null, 5, null), row("B3", "Dinas Pertanian", "belum_tercapai", 1, 2, -50),
    row("C1", "Dinas Kecil", "tercapai", 7, 5, 40),
  ] as never;
  const result = agent.execute("kondisi_opd", {}, insights, rows).result as { opd: Array<{ nama: string; skor: number | null; kondisi: string; belum_ada_realisasi: number; tertinggal: Array<{ nama: string }> }> };
  const byName = (name: string) => result.opd.find((entry) => entry.nama === name)!;
  assert.equal(byName("Dinas Pendidikan").kondisi, "baik");
  assert.equal(byName("Dinas Pertanian").belum_ada_realisasi, 1);
  assert.equal(byName("Dinas Pertanian").tertinggal.length, 2);
  assert.ok(byName("Dinas Pendidikan").skor! > byName("Dinas Pertanian").skor!);
  assert.equal(byName("Dinas Kecil").skor, null, "kurang dari 3 indikator bertarget tidak diberi skor");
  const single = agent.execute("kondisi_opd", { nama_opd: "pertanian" }, insights, rows).result as { opd: unknown[] };
  assert.equal(single.opd.length, 1);
  assert.match(AGENT_SYSTEM_PROMPT, /kondisi OPD/);
});

test("angka desimal pada hasil alat wilayah ditulis gaya Indonesia agar lolos pemeriksaan angka", () => {
  const empty = { counts: { tercapai: 0, belum_tercapai: 0, unggul: 0, sedang: 0, perhatian: 0, tanpa_arah: 0 }, trend_counts: { membaik: 0, memburuk: 0, stabil: 0 } };
  const districts = { generated_at: "", coverage: { indicators: 12, with_target: 0, by_source: { rpjmd: 0, opd: 0, bank_data: 12 } }, districts: [{ name: "Timpah", indicators: 10, ...empty, attention_index: 59.7, good_index: 10.5, growth_index: -44.9 }] };
  const json = JSON.stringify(agent.execute("wilayah_prioritas", { mode: "pertumbuhan" }, insights, [], { contexts: new Map(), focus: null, districts, districtDetails: new Map() }).result);
  assert.deepEqual(ungroundedNumbers("Timpah: skor pertumbuhan -44,9 dan 59,7 persen indikator perlu perhatian, 10,5 persen unggul.", json), []);
});

test("localizeNumbers menulis desimal gaya Indonesia dan membiarkan bilangan bulat", async () => {
  const { localizeNumbers } = await import("../src/services/agent-service.js");
  assert.deepEqual(localizeNumbers({ korelasi: -0.49, gini: 0.287, tahun: 2025, jumlah: 7991, daftar: [{ nilai: 5.25 }], teks: "0.5", kosong: null }), { korelasi: "-0,49", gini: "0,287", tahun: 2025, jumlah: 7991, daftar: [{ nilai: "5,25" }], teks: "0.5", kosong: null });
  assert.deepEqual(ungroundedNumbers("Korelasi -0,49 dan 5,25 persen", JSON.stringify(localizeNumbers({ a: -0.49, b: 5.25 }))), []);
});
