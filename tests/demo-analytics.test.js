const assert = require("assert");
const DemoAnalytics = require("../js/analysis/demo-analytics.js");

const episodes = Array.from({ length: 5 }, (_, episodeIndex) => ({
  id: `episode-${episodeIndex + 1}`,
  meters: ["humanCenteredness", "responsibility", "transparency"],
  scenes: Object.fromEntries(Array.from({ length: 4 }, (_, sceneIndex) => [
    `scene-${sceneIndex + 1}`,
    { title: `질문 ${episodeIndex + 1}-${sceneIndex + 1}` },
  ])),
}));

const first = DemoAnalytics.createDashboard(episodes, { learnerCount: 120, seed: 42 });
const second = DemoAnalytics.createDashboard(episodes, { learnerCount: 120, seed: 42 });

assert.deepStrictEqual(first, second);
assert.strictEqual(first.isDemo, true);
assert.strictEqual(first.activeLearners, 120);
assert.ok(first.simulatedResponses > 0);
assert.ok(first.questionRiskRates.length > 0);
assert.ok(first.weakestPrinciples.length > 0);
assert.strictEqual(first.episodeCompletion.length, 5);
assert.ok(first.completionRate > 0 && first.completionRate < 100);
assert.ok(!Object.hasOwn(first, "consentingRecords"));

console.log("PASS: deterministic synthetic dashboard data stays separate from training readiness");
