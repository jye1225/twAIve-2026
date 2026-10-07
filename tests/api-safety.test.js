const assert = require("node:assert/strict");
const handler = require("../api/explain-result.js");
const { checkRequestLimit, fetchJsonWithTimeout, checkGeneratedContent, BLOCKED_CATEGORIES } = handler.__test;
const safeCategories = Object.fromEntries(BLOCKED_CATEGORIES.map(key => [key, false]));
async function main() {
  for (let i = 0; i < 12; i += 1) checkRequestLimit("quota-test", 1000);
  assert.throws(() => checkRequestLimit("quota-test", 1000), error => error.status === 429);
  checkRequestLimit("quota-test", 61000);
  const originalFetch = global.fetch;
  try {
    global.fetch = (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    await assert.rejects(fetchJsonWithTimeout("https://test.invalid/", {}, 5), error => error.code === "UPSTREAM_TIMEOUT");
    global.fetch = async () => ({ ok: true, json: async () => ({ results: [{ categories: { ...safeCategories, "self-harm/instructions": true } }] }) });
    await assert.rejects(checkGeneratedContent("test-only"), error => error.code === "UNSAFE_OUTPUT");
    global.fetch = async () => ({ ok: true, json: async () => ({ results: [{ categories: { ...safeCategories, "self-harm": true } }] }) });
    await checkGeneratedContent("safe educational discussion");
    global.fetch = async () => ({ ok: true, json: async () => ({ results: [{ categories: {} }] }) });
    await assert.rejects(checkGeneratedContent("test-only"), error => error.code === "SAFETY_CHECK_FAILED");
    global.fetch = async () => ({ ok: false, json: async () => ({}) });
    await assert.rejects(checkGeneratedContent("test-only"), error => error.code === "SAFETY_CHECK_FAILED");
  } finally { global.fetch = originalFetch; }
  console.log("PASS: bounded upstream calls, per-instance request limits, unsafe/missing moderation rejection, educational mental-health discussion");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
