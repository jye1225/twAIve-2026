const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("js/app.js", "utf8");
const css = fs.readFileSync("css/styles.css", "utf8");
assert.match(css, /\.ai-coach-output\s*\{[^}]*color: var\(--ai-copy\);[^}]*font-size: 14px;/);
assert.match(css, /\.ai-explanation-summary\s*\{[^}]*color: var\(--ai-emphasis\);[^}]*font-size: 15px;/);
assert.match(css, /\.ai-coach-input-row input\s*\{\s*font-size: 14px;/);
assert.match(css, /\.ai-coach-output h5\s*\{[^}]*color: var\(--ai-accent\);/);
const episodes = [{ id: "deepfake" }, { id: "rumor" }];
const state = { episodeIndex: 0, view: "story", storyMode: "report", reportTab: "analysis" };
const buttons = [];
const context = {
  episodes, state, URL, URLSearchParams,
  window: {
    location: { href: "https://example.test/?report=analysis&episode=rumor", get search() { return new URL(this.href).search; } },
    history: { replaceState(_state, _title, url) { context.window.location.href = url.toString(); } },
  },
  els: { sceneText: { scrollTop: 300 }, choices: { appendChild(button) { buttons.push(button); } } },
  document: { createElement() { return { addEventListener(_name, handler) { this.click = handler; } }; } },
  activeEpisode() { return episodes[state.episodeIndex]; },
  async loadEpisodeProgress() { return context.hasRecord; },
  syncNav() {}, render() {},
  guidelineDiagnosis() { return null; },
  aiCoachHtml() { return "AI panel"; },
  scoreBreakdownHtml() { return "Analysis panel"; },
  learnerAnalysisHtml() { return ""; }, currentLearningAnalysis() {}, reportInsightsHtml() { return ""; },
};
vm.createContext(context);
vm.runInContext(
  source.slice(source.indexOf("async function applyRequestedReportRoute("), source.indexOf("function reportInsightsHtml(")) +
  source.slice(source.indexOf("function reportDetailTabsHtml("), source.indexOf("function reportOverviewHtml(")) +
  source.slice(source.indexOf("function renderChoices("), source.indexOf("function recordEpisodeHistory(")) +
  "\nObject.assign(this, {applyRequestedReportRoute, setLearningView, reportDetailHtml, renderChoices});",
  context,
);

async function main() {
  context.hasRecord = true;
  assert.equal(await context.applyRequestedReportRoute(), true);
  assert.equal(state.reportTab, "analysis");
  assert.equal(state.episodeIndex, 1);
  for (const tab of ["analysis", "ai"]) {
    state.reportTab = tab;
    const html = context.reportDetailHtml(episodes[1], {});
    assert.equal((html.match(/role="tab"/g) || []).length, 2);
    assert.doesNotMatch(html, /핵심 개념|data-report-tab="concept"/);
  }
  context.renderChoices({});
  assert.equal(buttons.length, 2);
  assert.match(buttons[0].innerHTML, /결과 요약으로 돌아가기/);
  assert.match(buttons[1].innerHTML, /핵심 개념 보기/);
  buttons[1].click();
  assert.equal(state.view, "learn");
  assert.equal(state.learningEpisodeId, "rumor");
  assert.equal(context.els.sceneText.scrollTop, 0);
  assert.match(context.window.location.href, /view=learn/);
  assert.doesNotMatch(context.window.location.href, /report=/);

  for (const route of ["?report=concept&episode=deepfake", "?view=learn&episode=rumor"]) {
    context.window.location.href = "https://example.test/" + route;
    context.hasRecord = false;
    assert.equal(await context.applyRequestedReportRoute(), true, "Concepts must work without saved progress");
    assert.equal(state.view, "learn");
    assert.doesNotMatch(context.window.location.href, /report=/);
  }
  context.window.location.href = "https://example.test/?view=learn&report=ai&episode=deepfake";
  context.hasRecord = true;
  assert.equal(await context.applyRequestedReportRoute(), true);
  assert.equal(state.view, "story", "Explicit report routes take precedence over stale learning parameters");
  assert.equal(state.reportTab, "ai");
  console.log("PASS: two detail tabs, learning action, selected episode, reload route, and legacy concept links");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
