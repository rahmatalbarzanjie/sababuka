import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MODEL, buildConverseBody } from "../src/services/llm-service.js";

const tools = [{ name: "a", description: "a", input_schema: {} }, { name: "b", description: "b", input_schema: {} }];

test("model baku Versi 1 adalah model murah", () => {
  assert.equal(DEFAULT_MODEL, "claude-haiku-5-5");
});

test("permintaan percakapan menandai sistem, alat terakhir, dan pesan terakhir untuk cache", () => {
  const messages = [{ role: "user" as const, content: "Halo" }, { role: "assistant" as const, content: [{ type: "tool_use", id: "t1", name: "a", input: {} }] }, { role: "user" as const, content: [{ type: "tool_result", tool_use_id: "t1", content: "{}" }] }];
  const body = buildConverseBody("m", "sistem", messages, tools, 100);
  assert.deepEqual(body.system, [{ type: "text", text: "sistem", cache_control: { type: "ephemeral" } }]);
  assert.equal((body.tools[0] as { cache_control?: unknown }).cache_control, undefined);
  assert.deepEqual((body.tools[1] as { cache_control?: unknown }).cache_control, { type: "ephemeral" });
  const last = body.messages[2]!.content as Array<{ cache_control?: unknown }>;
  assert.deepEqual(last[0]!.cache_control, { type: "ephemeral" });
  assert.equal(body.messages[0]!.content, "Halo");
  // pesan asli tidak diubah
  assert.equal((messages[2]!.content[0] as { cache_control?: unknown }).cache_control, undefined);
});

test("pesan terakhir berupa teks biasa diubah menjadi blok bercache", () => {
  const body = buildConverseBody("m", "s", [{ role: "user", content: "Bagaimana kondisi OPD?" }], tools, 100);
  assert.deepEqual(body.messages[0]!.content, [{ type: "text", text: "Bagaimana kondisi OPD?", cache_control: { type: "ephemeral" } }]);
});
