const assert = require("assert");
const strategy = require("../js/analysis/teaching-strategy.js");

const principles = {
  privacy: { name: "프라이버시 보호" },
  safety: { name: "안전성" },
  transparency: { name: "투명성" },
};
const guides = strategy.recommendMany([
  { key: "safety", score: 64, samples: 7 },
  { key: "privacy", score: 42, samples: 8 },
  { key: "transparency", score: 55, samples: 6 },
], principles, 2);

assert.equal(guides.length, 2);
assert.equal(guides[0].principleKey, "privacy");
assert.equal(guides[0].principleName, "프라이버시 보호");
assert.match(guides[0].activity, /동의/);
assert.equal(guides[1].principleKey, "transparency");

console.log("Teaching strategy recommendations passed.");
