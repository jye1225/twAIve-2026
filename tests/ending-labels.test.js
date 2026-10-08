const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("js/app.js", "utf8");
function definition(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

let score = 0;
const context = {
  state: { history: [{}], progress: {} },
  scoreAverage: () => score,
};
vm.createContext(context);
vm.runInContext([
  "endingName", "displayEndingName", "endingClassName", "episodeProgressLabel",
].map(definition).join("\n"), context);

for (const [value, label, className] of [
  [0, "Bad End · 다음에는 다르게 해보기", "is-bad"],
  [47, "Bad End · 다음에는 다르게 해보기", "is-bad"],
  [49, "Bad End · 다음에는 다르게 해보기", "is-bad"],
  [50, "Normal End · 기준을 배우는 중", "is-normal"],
  [74, "Normal End · 기준을 배우는 중", "is-normal"],
  [75, "Good End · 책임 있는 실천", "is-good"],
  [100, "Good End · 책임 있는 실천", "is-good"],
]) {
  score = value;
  assert.equal(context.endingName(), label);
  assert.equal(context.endingClassName(), className);
}
context.state.history = [];
assert.equal(context.endingName(), "진단 전");
assert.equal(context.endingClassName(), "is-pending");

const saved = { completed: true, score: 47, ending: "다시 연습 · 다음에는 다르게 해보기" };
context.state.progress.deepfake = saved;
assert.equal(context.episodeProgressLabel({ id: "deepfake" }), "Bad End · 다음에는 다르게 해보기 · 47점");
assert.equal(saved.ending, "다시 연습 · 다음에는 다르게 해보기", "Display updates must not rewrite saved records");
assert.equal(context.displayEndingName("Good End · 책임 있는 실천"), "Good End · 책임 있는 실천");
assert.equal(context.displayEndingName(null), null);
assert.ok(source.includes('`최근 엔딩: ${displayEndingName(recentItem?.progress.ending) || "-"}`'));
console.log("PASS: ending labels, unchanged score thresholds and non-mutating saved-label display");
