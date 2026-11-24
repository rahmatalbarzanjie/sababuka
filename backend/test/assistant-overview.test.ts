import assert from "node:assert/strict";
import test from "node:test";
import { buildOverview } from "../src/services/assistant-overview.js";

const row = (status: string) => ({ indicator_id: status, name: status, sector: "S", unit: "%", source_kind: "rpjmd", latest_year: 2025, latest_value: 1, target_year: 2025, target_value: 1, gap: 0, gap_pct: 0, status, opds: ["Dinkes"], follow_up: "x" });
const insight = (assessment: string, layer = "kinerja") => ({ layer, assessment }) as never;

test("ringkasan menghitung capaian, persen, dan tren", () => {
  const achievement = [row("tercapai"), row("tercapai"), row("tercapai"), row("belum_tercapai"), row("belum_ada_data"), row("belum_ada_data")] as never;
  const overview = buildOverview([insight("membaik"), insight("membaik"), insight("memburuk"), insight("membaik", "konteks")], achievement, "2026-11-24");
  assert.equal(overview.bertarget, 6);
  assert.deepEqual([overview.tercapai, overview.belum_tercapai, overview.belum_ada_realisasi], [3, 1, 2]);
  assert.equal(overview.persen_tercapai, 75);
  assert.deepEqual([overview.indikator_dianalisis, overview.membaik, overview.memburuk], [3, 2, 1]);
  assert.equal(overview.as_of, "2026-11-24");
});

test("tanpa indikator yang dinilai persen kosong", () => {
  assert.equal(buildOverview([], [row("belum_ada_data")] as never, null).persen_tercapai, null);
  assert.equal(buildOverview([], [], null).bertarget, 0);
});
