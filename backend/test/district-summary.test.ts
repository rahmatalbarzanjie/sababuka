import assert from "node:assert/strict";
import test from "node:test";
import { buildCells, summarize } from "../src/services/district-summary-service.js";

const meta = (direction: "increase" | "decrease" | "maintain" | null) => ({
  indicator_id: "i1", name: "Indikator uji", sector: "Sektor uji", unit: "%", source_kind: "bank_data" as const, direction, source_label: "BPS",
});
const names = ["A", "B", "C", "D", "E", "F", "G", "H"];
const current = (values: number[], targets: Array<number | null> = []) => new Map(names.map((name, index) => [name, { value: values[index]!, target: targets[index] ?? null }]));

test("tanpa target: kuartil atas unggul, kuartil bawah perhatian menurut arah naik", () => {
  const cells = buildCells({ indicator: meta("increase"), year: 2024, current: current([80, 70, 60, 50, 40, 30, 20, 10]), previous: new Map() });
  assert.equal(cells.get("A")!.status, "unggul");
  assert.equal(cells.get("B")!.status, "unggul");
  assert.equal(cells.get("D")!.status, "sedang");
  assert.equal(cells.get("G")!.status, "perhatian");
  assert.equal(cells.get("H")!.status, "perhatian");
  assert.equal(cells.get("A")!.rank, 1);
  assert.equal(cells.get("H")!.of, 8);
});

test("arah turun membalik peringkat: nilai terendah paling baik", () => {
  const cells = buildCells({ indicator: meta("decrease"), year: 2024, current: current([80, 70, 60, 50, 40, 30, 20, 10]), previous: new Map() });
  assert.equal(cells.get("H")!.status, "unggul");
  assert.equal(cells.get("A")!.status, "perhatian");
});

test("tanpa arah: status tanpa_arah dan tidak ada tren baik-buruk", () => {
  const cells = buildCells({ indicator: meta(null), year: 2024, current: current([8, 7, 6, 5, 4, 3, 2, 1]), previous: new Map([["A", 4]]) });
  assert.equal(cells.get("A")!.status, "tanpa_arah");
  assert.equal(cells.get("A")!.trend, null);
  assert.equal(cells.get("A")!.change_pct, 100);
});

test("target tingkat kecamatan otomatis dipakai: tercapai atau belum tercapai", () => {
  const cells = buildCells({ indicator: meta("increase"), year: 2026, current: current([80, 70, 60, 50, 40, 30, 20, 10], [75, 75, 55, 55, 45, 25, 25, 5]), previous: new Map() });
  assert.equal(cells.get("A")!.status, "tercapai");
  assert.equal(cells.get("B")!.status, "belum_tercapai");
  assert.equal(cells.get("F")!.status, "tercapai");
  assert.equal(cells.get("G")!.status, "belum_tercapai");
  assert.equal(cells.get("A")!.target, 75);
});

test("tren: naik pada indikator arah naik berarti membaik, dan perubahan kecil dianggap stabil", () => {
  const cells = buildCells({ indicator: meta("increase"), year: 2024, current: current([110, 99, 60, 50, 40, 30, 20, 10]), previous: new Map([["A", 100], ["B", 100], ["C", 100]]) });
  assert.equal(cells.get("A")!.trend, "membaik");
  assert.equal(cells.get("B")!.trend, "stabil");
  assert.equal(cells.get("C")!.trend, "memburuk");
});

test("ringkasan: indeks perhatian menghitung perhatian dan belum tercapai terhadap indikator yang dinilai", () => {
  const up = buildCells({ indicator: meta("increase"), year: 2024, current: current([80, 70, 60, 50, 40, 30, 20, 10]), previous: new Map() });
  const none = buildCells({ indicator: meta(null), year: 2024, current: current([1, 2, 3, 4, 5, 6, 7, 8]), previous: new Map() });
  const summary = summarize("H", [up.get("H")!, none.get("H")!]);
  assert.equal(summary.indicators, 2);
  assert.equal(summary.counts.perhatian, 1);
  assert.equal(summary.counts.tanpa_arah, 1);
  assert.equal(summary.attention_index, 100);
  assert.equal(summarize("X", [none.get("A")!]).attention_index, null);
});
