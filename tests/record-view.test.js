const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const engine = require("../js/scoring-engine.js");

const source = fs.readFileSync("js/app.js", "utf8");
const context = {
  window: {
    location: { href: "https://example.test/?report=analysis&episode=rumor" },
    history: { replaceState(_state, _title, url) { context.lastUrl = url.toString(); } },
    TWAIVE_SCORING: engine,
    TWAIVE_LEARNING_MODEL: require("../js/learning-model.js"),
    TWAIVE_DEMO_ANALYTICS: require("../js/analysis/demo-analytics.js"),
  },
  clearTimeout() {},
  URL,
  syncNav() {},
  render() {},
  els: { sceneText: { scrollTop: 500 } },
};
vm.createContext(context);
vm.runInContext(
  source.slice(0, source.indexOf("const SUPABASE_CONFIG")) +
    source.slice(source.indexOf("function recordEpisodeHistory("), source.indexOf("function learningHtml(")) +
    `
    function activeEpisode() { return episodes[state.episodeIndex]; }
    function escapeHtml(value) { return String(value); }
    function escapeAttribute(value) { return String(value); }
    function refreshGuidelineScores() {
      state.scores = { _version: SCORING_VERSION, ...Object.fromEntries(
        ScoringEngine.scorePrinciples(activeEpisode().meters, state.history, SCORING_VERSION, GUIDELINE_PRINCIPLES)
          .map((item) => [item.key, item.score])
      ) };
    }
    this.fixture = { episodes, rubrics: GUIDELINE_RUBRICS, levels: RUBRIC_LEVELS, state };
    this.recordHtml = recordHtml;
    this.openRecordedReport = openRecordedReport;
    `,
  context,
);

const { episodes, rubrics, levels, state } = context.fixture;
const episode = episodes[0];
let sceneId = episode.start;
const history = [1, 0, 0, 0].map((choiceIndex) => {
  const scene = episode.scenes[sceneId];
  const choice = scene.choices[choiceIndex];
  const record = {
    scene: scene.title,
    choice: choice.label,
    feedback: choice.feedback,
    rubric: engine.buildRubricRecord(rubrics[episode.id][sceneId][choiceIndex], 3, levels),
  };
  sceneId = choice.next;
  return record;
});
const saved = {
  scene_id: sceneId,
  history,
  scores: { _version: 3 },
  completed: true,
  assessment: { pre: { level: 1 }, post: { level: 4 } },
};
state.progress.deepfake = saved;
state.episodeIndex = 1;
state.recordEpisodeId = "deepfake";
state.history = [{ choice: "Other episode", rubric: history[0].rubric }];

const html = context.recordHtml();
assert.match(html, /86점/);
assert.match(html, /학습 완료/);
assert.match(html, /data-record-report="deepfake"/);
assert.doesNotMatch(html, /disabled|Other episode/);
const snapshot = JSON.stringify(saved);
context.openRecordedReport("deepfake");
assert.equal(state.episodeIndex, 0);
assert.equal(state.sceneId, sceneId);
assert.equal(state.storyMode, "report");
assert.equal(state.reportTab, "summary");
assert.equal(state.scores.privacy, 88);
assert.equal(context.els.sceneText.scrollTop, 0);
assert.match(context.lastUrl, /report=summary&episode=deepfake/);
assert.equal(JSON.stringify(saved), snapshot, "Viewing a saved report must not modify saved progress");
state.history[0].choice = "Changed copy";
state.assessments.deepfake.post.level = 0;
assert.equal(JSON.stringify(saved), snapshot, "Report state must not alias the saved record");

saved.completed = false;
assert.match(context.recordHtml(), /진행 중/);
assert.match(context.recordHtml(), /data-record-report="deepfake" disabled/);
const index = state.episodeIndex;
context.openRecordedReport("privacy");
assert.equal(state.episodeIndex, index);
saved.completed = true;
saved.scores._version = 2;
state.episodeIndex = 1;
context.openRecordedReport("deepfake");
assert.equal(state.episodeIndex, 1, "Old scoring versions cannot be opened as current reports");
state.recordEpisodeId = "chatbot";
assert.match(context.recordHtml(), /기록이 아직 없어요/);
assert.doesNotMatch(context.recordHtml(), /record-score-summary/);

const css = fs.readFileSync("css/styles.css", "utf8");
assert.doesNotMatch(css, /#405b7c|#6c7e94/i);
assert.doesNotMatch(css, /\.story-stage\.is-scene-stage \+ \.choice-dock \.choice-button > span\s*\{\s*font-size: var\(--choice-copy-size\)/);
assert.match(source, /const validTabs = \["summary", "analysis", "ai", "concept"\]/);
console.log("PASS: episode record scores, read-only saved report restore, incomplete/version guards, and theme regressions");
