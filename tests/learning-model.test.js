const assert = require("node:assert/strict");
const model = require("../js/learning-model.js");
const featureExtractor = require("../js/analysis/feature-extractor.js");
const principleScorer = require("../js/analysis/principle-scorer.js");
const learnerClassifier = require("../js/analysis/learner-classifier.js");
const contentRecommender = require("../js/analysis/content-recommender.js");

const principles = [
  { key: "privacy", name: "프라이버시 보호", score: 45 },
  { key: "responsibility", name: "책임성", score: 80 },
  { key: "transparency", name: "투명성", score: 70 },
];
const history = [
  { rubric: { level: 1 }, reasonCode: "convenience", responseTimeMs: 2000 },
  { rubric: { level: 3 }, reasonCode: "rights", responseTimeMs: 6000 },
  { rubric: { level: 4 }, reasonCode: "action", responseTimeMs: 10000 },
  { rubric: { level: 2 }, reasonCode: "verification", responseTimeMs: 14000 },
];

const features = featureExtractor.extract(principles, history, {
  pre: { level: 1 },
  post: { level: 3 },
  attemptCount: 2,
});
assert.equal(features.decisionCount, 4);
assert.equal(features.weakestPrinciple.key, "privacy");
assert.equal(features.strongestPrinciple.key, "responsibility");
assert.equal(features.riskRate, 0.25);
assert.equal(features.proactiveRate, 0.5);
assert.equal(features.reasonCoverage, 1);
assert.equal(features.averageResponseSeconds, 8);
assert.equal(features.reflectionDelta, 2);

const result = model.analyze(principles, history, {
  pre: { level: 1 },
  post: { level: 3 },
  attemptCount: 2,
});
assert.equal(result.version, "2.0.0");
assert.equal(result.type, "explainable-rule-based");
assert.deepEqual(result.modules, {
  featureExtractor: "1.0.0",
  learnerClassifier: "1.0.0",
  contentRecommender: "1.0.0",
});
assert.equal(result.profile.key, "rights");
assert.match(result.profile.rule, /프라이버시 보호 45점/);
assert.match(result.recommendation.action, /동의/);
assert.equal(result.trace.length, 3);

const riskResult = model.analyze(principles, [
  { rubric: { level: 0 } },
  { rubric: { level: 1 } },
  { rubric: { level: 4 } },
], {});
assert.equal(riskResult.profile.key, "risk");

const pending = model.analyze([], [], {});
assert.equal(pending.profile.key, "pending");
assert.equal(pending.confidence.band, "낮음");

assert.equal(learnerClassifier.classify(features).key, "rights");
assert.equal(contentRecommender.recommend(features).episodeId, "privacy");
assert.equal(principleScorer.performanceBand(74), "기준을 이해하는 중");

console.log("PASS: modular feature extraction, scoring, classification, confidence, and recommendation");
