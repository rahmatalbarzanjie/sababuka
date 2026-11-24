import assert from "node:assert/strict";
import test from "node:test";
import { splitFollowUp } from "../src/utils/follow-up.ts";

test("tindak lanjut berbutir dipisah dari teks sebelum dan sesudahnya", () => {
  const parts = splitFollowUp("**Kesimpulan**\nKemiskinan stabil.\n\n**Tindak lanjut**\n1. Minta Dinsos menyampaikan data 2025.\n2. Pantau angka di atas 5,25 %.\n\n**Catatan**\nData belum diverifikasi.");
  assert.ok(parts);
  assert.deepEqual(parts.items, ["Minta Dinsos menyampaikan data 2025.", "Pantau angka di atas 5,25 %."]);
  assert.match(parts.before, /Kesimpulan/);
  assert.match(parts.after, /Catatan/);
});

test("jawaban aturan dengan satu kalimat tindak lanjut menjadi satu butir", () => {
  const parts = splitFollowUp("**Kesimpulan**\nX.\n\n**Tindak lanjut**\nMinta OPD menyampaikan rencana percepatan.");
  assert.deepEqual(parts?.items, ["Minta OPD menyampaikan rencana percepatan."]);
});

test("tanpa bagian tindak lanjut tidak dipisah", () => {
  assert.equal(splitFollowUp("**Kesimpulan**\nTidak ada."), null);
  assert.equal(splitFollowUp("**Tindak lanjut**"), null);
});
