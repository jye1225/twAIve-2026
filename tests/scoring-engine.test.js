const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const engine = require("../js/scoring-engine.js");
const learningModel = require("../js/learning-model.js");
const demoAnalytics = require("../js/analysis/demo-analytics.js");

const levelDefinitions = {
  0: { label: "위반" },
  1: { label: "위험" },
  2: { label: "부분 충족" },
  3: { label: "준수" },
  4: { label: "적극 실천" },
};

const record = engine.buildRubricRecord(
  {
    ratings: { privacy: 4, responsibility: 2 },
    evidence: ["KAI-2.3", "KAI-4.1"],
    legalReferences: ["AI법 제31조"],
  },
  3,
  levelDefinitions,
);

assert.deepStrictEqual(record.ratings, { privacy: 4, responsibility: 2 });
assert.strictEqual(record.level, 3);
assert.strictEqual(record.levelLabel, "준수");

const scored = engine.scorePrinciples(
  ["privacy", "responsibility"],
  [{ rubric: record }],
  3,
  {
    privacy: { code: "KAI-2", name: "프라이버시 보호" },
    responsibility: { code: "KAI-4", name: "책임성" },
  },
);

assert.strictEqual(scored[0].score, 100);
assert.strictEqual(scored[1].score, 50);
assert.deepStrictEqual(scored[0].evidence, ["KAI-2.3"]);
assert.deepStrictEqual(scored[1].evidence, ["KAI-4.1"]);
assert.strictEqual(engine.average(scored.map((item) => item.score)), 75);
assert.strictEqual(engine.performanceBand(75), "안정적으로 실천");

const riskRecord = engine.buildRubricRecord(
  { ratings: { privacy: 1 }, evidence: ["KAI-2.3"] },
  3,
  levelDefinitions,
);
const proactiveRecord = engine.buildRubricRecord(
  { ratings: { privacy: 4 }, evidence: ["KAI-2.3"] },
  3,
  levelDefinitions,
);
const analysis = engine.analyzeLearning(
  scored,
  [
    {
      rubric: riskRecord,
      reasonCode: "convenience",
      reasonLabel: "빠르고 편리해서",
      responseTimeMs: 2000,
    },
    {
      rubric: proactiveRecord,
      reasonCode: "rights",
      reasonLabel: "권리와 피해를 고려해서",
      responseTimeMs: 4000,
    },
    {
      rubric: proactiveRecord,
      reasonCode: "rights",
      reasonLabel: "권리와 피해를 고려해서",
      responseTimeMs: 3000,
    },
  ],
  { pre: { level: 1 }, post: { level: 4 }, attemptCount: 2 },
);

assert.strictEqual(analysis.decisionCount, 3);
assert.strictEqual(analysis.riskCount, 1);
assert.strictEqual(analysis.proactiveCount, 2);
assert.strictEqual(analysis.averageResponseSeconds, 3);
assert.strictEqual(analysis.dominantReason.code, "rights");
assert.strictEqual(analysis.reflectionDelta, 3);
assert.strictEqual(analysis.attemptCount, 2);

const source = fs.readFileSync("js/app.js", "utf8");
const prefix = source.slice(0, source.indexOf("const state ="));
const context = {
  window: {
    TWAIVE_SCORING: engine,
    TWAIVE_LEARNING_MODEL: learningModel,
    TWAIVE_DEMO_ANALYTICS: demoAnalytics,
  },
};
vm.createContext(context);
vm.runInContext(
  `${prefix}\nthis.__episodes = episodes; this.__rubrics = GUIDELINE_RUBRICS; this.__principles = GUIDELINE_PRINCIPLES;`,
  context,
);

const coveredPrinciples = new Set();
let sceneCount = 0;
let choiceCount = 0;

for (const episode of context.__episodes) {
  assert.strictEqual(episode.assessment.preOptions.length, 3, `${episode.id}: pre options`);
  assert.strictEqual(episode.assessment.postOptions.length, 3, `${episode.id}: post options`);
  [...episode.assessment.preOptions, ...episode.assessment.postOptions].forEach((option) => {
    assert.ok(option.text.length >= 10, `${episode.id}: assessment option is too vague`);
    assert.ok(Number.isInteger(option.level) && option.level >= 0 && option.level <= 4);
  });

  for (const [sceneId, scene] of Object.entries(episode.scenes)) {
    if (scene.end) continue;
    sceneCount += 1;
    choiceCount += scene.choices.length;

    const rubrics = context.__rubrics[episode.id]?.[sceneId];
    assert.ok(rubrics, `Missing rubric: ${episode.id}/${sceneId}`);
    assert.strictEqual(
      rubrics.length,
      scene.choices.length,
      `Choice count mismatch: ${episode.id}/${sceneId}`,
    );

    rubrics.forEach((choiceRubric, choiceIndex) => {
      const ratings = Object.entries(choiceRubric.ratings || {});
      assert.ok(ratings.length, `Missing ratings: ${episode.id}/${sceneId}/${choiceIndex}`);
      ratings.forEach(([key, level]) => {
        assert.ok(context.__principles[key], `Unknown principle: ${key}`);
        assert.ok(episode.meters.includes(key), `Principle not shown by episode: ${key}`);
        assert.ok(Number.isInteger(level) && level >= 0 && level <= 4, `Invalid level: ${level}`);
        coveredPrinciples.add(key);
      });
    });
  }
}

assert.strictEqual(sceneCount, 22);
assert.strictEqual(choiceCount, 61);
assert.deepStrictEqual(
  [...coveredPrinciples].sort(),
  Object.keys(context.__principles).sort(),
  "All seven national principles must be represented",
);

const pathSummaries = [];

for (const episode of context.__episodes) {
  const scores = [];

  function walk(sceneId, history) {
    const scene = episode.scenes[sceneId];
    if (scene.end) {
      const items = engine.scorePrinciples(
        episode.meters,
        history,
        3,
        context.__principles,
      );
      assert.ok(items.every((item) => Number.isFinite(item.score)), `${episode.id}: unscored principle`);
      scores.push(engine.average(items.map((item) => item.score)));
      return;
    }

    scene.choices.forEach((choice, choiceIndex) => {
      const rubric = engine.buildRubricRecord(
        context.__rubrics[episode.id][sceneId][choiceIndex],
        3,
        levelDefinitions,
      );
      walk(choice.next, [...history, { rubric }]);
    });
  }

  walk(episode.start, []);
  assert.ok(scores.every((score) => score >= 0 && score <= 100), `${episode.id}: score range`);
  assert.ok(Math.max(...scores) >= 75, `${episode.id}: no strong-performance path`);
  assert.ok(Math.min(...scores) <= 25, `${episode.id}: no low-performance path`);
  pathSummaries.push(`${episode.id} ${scores.length} paths (${Math.min(...scores)}-${Math.max(...scores)})`);
}

console.log(
  `PASS: ${sceneCount} scenes, ${choiceCount} choices, ${coveredPrinciples.size} principles; ${pathSummaries.join(", ")}`,
);
