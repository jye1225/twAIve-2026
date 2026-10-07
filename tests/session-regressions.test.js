const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const engine = require("../js/scoring-engine.js");
const source = fs.readFileSync("js/app.js", "utf8");
function definition(name) {
  const start = source.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
  assert.ok(start >= 0, name);
  const next = /^(?:(?:async )?function \w+\(|const els =)/m.exec(source.slice(start + 1));
  return source.slice(start, next ? start + 1 + next.index : source.length);
}
class Element {
  constructor(tag = "div") {
    this.tagName = tag; this.children = []; this.dataset = {}; this.hidden = false;
    this.handlers = {}; this.classList = { add() {}, remove() {}, contains: () => false };
  }
  appendChild(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  setAttribute() {} removeAttribute() {}
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { top: 0, height: 0 }; }
}
const writes = [];
let failWrites = false;
let heldWrite = null;
let heldRead = null;
let user = { id: "a" };
const elements = { saveStatus: new Element(), aiCoachOutput: new Element(), aiExplainButton: new Element("button"), aiQuestionInput: { value: "왜 이 점수가 나왔나요?" } };
const context = {
  window: {
    TWAIVE_SCORING: engine,
    TWAIVE_LEARNING_MODEL: require("../js/learning-model.js"),
    TWAIVE_DEMO_ANALYTICS: require("../js/analysis/demo-analytics.js"),
    setTimeout, clearTimeout, location: { protocol: "https:", href: "https://example.test/?report=ai&episode=deepfake" },
    history: { replaceState() {} }, confirm: () => false,
  },
  URL, AbortController, document: { baseURI: "https://example.test/", getElementById: id => elements[id], querySelectorAll: () => [], querySelector: () => null, createElement: tag => new Element(tag) },
  els: { authSubmitButton: {}, scoreLabel: {}, storyStage: new Element(), choices: new Element(), sceneText: { scrollTop: 0, scrollTo() {}, getBoundingClientRect: () => ({ top: 0 }) } },
  supabaseClient: {
    auth: { signOut: async () => ({}), signInWithPassword: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { access_token: "test-only" } }, error: null }) },
    from() {
      return {
        select() { return this; }, eq() { return this; },
        async maybeSingle() { return heldRead ? await heldRead : { data: null, error: null }; },
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
        async upsert(row) { writes.push(row); return heldWrite ? await heldWrite : { error: failWrites ? { message: "network offline" } : null }; },
      };
    },
  },
  showLogin() {}, showApp() {}, render() {}, syncNav() {}, setTeacherNavigation() {}, showAuthError() {},
  loadProfile: async () => null, loadTeacherDashboard: async () => null, applyRequestedReportRoute: async () => false,
  usernameToAuthEmail: value => value + "@test.invalid", supabaseConnectionMessage: error => error.message,
  AI_EXPLANATION_API_URL: "https://example.test/api", buildAiExplanationPayload: () => ({ score: context.scoreAverage(), ending: context.endingName(), episode: { title: "deepfake" } }),
};
vm.createContext(context);
const functions = [
  "fetchWithDeadline",
  "scoreBadgeHtml",
  "sessionContext", "sameSession", "cancelStoryWork", "resetSessionLearningState", "updateSaveStatus", "goHome", "replayEpisode", "hasUnsavedProgress", "clearEpisodeIntroTimer",
  "login", "logout", "activeEpisode", "activeScene", "resetScores", "guidelineScoreItems", "refreshGuidelineScores", "activeAssessmentResponse", "answerAssessment", "overallLearningAnalysis", "loadEpisodeProgress", "loadAllProgress", "saveEpisodeProgress", "persistEpisodeSnapshot", "startEpisode", "recordEpisodeHistory", "fallbackDecisionReasons", "scoreAverage", "endingName", "transitionToScene", "appendTextElement", "appendExplanationList", "renderAiExplanation", "showAiCoachError", "requestAiExplanation",
];
vm.runInContext(source.slice(0, source.indexOf("const SUPABASE_CONFIG")) + `
  let currentUser = null, sessionVersion = 0, episodeLoadVersion = 0, transitionTimer = null;
  let aiExplanationController = null, decisionReasonController = null, saveSequence = 0;
  const initialLearningState = JSON.parse(JSON.stringify(state));
  const episodeSaveStates = new Map();
` + functions.map(definition).join("\n") + `
  this.fixture = { state, episodes, rubrics: GUIDELINE_RUBRICS, levels: RUBRIC_LEVELS, episodeSaveStates };
`, context);
const { state, episodes, rubrics, levels, episodeSaveStates } = context.fixture;
function completeEpisode(index) {
  state.episodeIndex = index; state.history = [];
  const episode = episodes[index]; let id = episode.start;
  while (!episode.scenes[id].end) {
    const scene = episode.scenes[id]; const choice = scene.choices[0];
    state.history.push({ scene: scene.title, choice: choice.label, rubric: engine.buildRubricRecord(rubrics[episode.id][id][0], 3, levels) });
    id = choice.next;
  }
  state.sceneId = id; state.view = "story"; state.storyMode = "report";
  state.assessments[episode.id] = { pre: { level: 1 }, post: { level: 4 }, attemptCount: 1 };
  context.refreshGuidelineScores();
}
const tick = () => new Promise(resolve => setImmediate(resolve));
async function main() {
  context.resetSessionLearningState(user); completeEpisode(0); await context.saveEpisodeProgress();
  await context.logout(); user = { id: "b" }; await context.login("b", "test-only");
  assert.equal(state.history.length, 0); assert.equal(Object.keys(state.assessments).length, 0);
  assert.equal(context.recordEpisodeHistory("deepfake").length, 0); assert.equal(context.overallLearningAnalysis().decisionCount, 0);

  completeEpisode(0); await context.saveEpisodeProgress(); const before = writes.length;
  state.view = "record"; context.goHome(); assert.equal(state.view, "home"); assert.equal(writes.length, before);
  context.replayEpisode(); assert.equal(writes.length, before); assert.equal(state.history.length, 4);
  context.window.confirm = () => true; await context.replayEpisode(); assert.equal(writes.length, before, "Replay must not erase saved progress before the learner starts");

  completeEpisode(0); failWrites = true; await context.answerAssessment("post", { text: "post", level: 4 }, 0);
  assert.equal(state.storyMode, "report"); assert.equal(episodeSaveStates.get("deepfake").status, "error");
  assert.equal(elements.saveStatus.hidden, false); assert.match(elements.saveStatus.children[0].textContent, /아직 저장되지/);
  failWrites = false; await elements.saveStatus.children[1].handlers.click();
  assert.equal(episodeSaveStates.get("deepfake").status, "saved"); assert.equal(state.progress.deepfake.completed, true);
  assert.match(context.els.scoreLabel.innerHTML, /\d+점/);
  state.assessments.deepfake.post = undefined; await context.saveEpisodeProgress(); assert.equal(writes.at(-1).completed, false, "An ending scene alone is not a completed assessment");

  let releaseWrite; heldWrite = new Promise(resolve => { releaseWrite = resolve; });
  completeEpisode(0); const saving = context.saveEpisodeProgress(); await tick();
  const queued = context.saveEpisodeProgress(); await context.logout(); user = { id: "c" }; context.resetSessionLearningState(user);
  const oldCount = writes.length; releaseWrite({ error: null }); heldWrite = null; await saving; await queued;
  assert.equal(writes.length, oldCount, "A queued old-session write must never execute");
  assert.equal(Object.keys(state.progress).length, 0); assert.equal(episodeSaveStates.size, 0);

  let releaseRead; heldRead = new Promise(resolve => { releaseRead = resolve; });
  state.episodeIndex = 0; const reading = context.loadEpisodeProgress(0);
  context.resetSessionLearningState({ id: "d" }); releaseRead({ data: writes[0], error: null }); heldRead = null;
  assert.equal(await reading, false); assert.equal(state.history.length, 0);

  heldRead = Promise.resolve({ data: null, error: { message: "network offline" } });
  const readFailureWrites = writes.length;
  await context.startEpisode(0);
  assert.equal(state.view, "home"); assert.equal(state.loadIssue.index, 0);
  assert.equal(writes.length, readFailureWrites, "A failed read must never replace saved progress");
  heldRead = null; await context.startEpisode(0); assert.equal(state.loadIssue, null);

  context.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    const abort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
  });
  await assert.rejects(context.fetchWithDeadline("https://example.test", {}, 5), { name: "AbortError" });
  const external = new AbortController();
  const canceled = context.fetchWithDeadline("https://example.test", { signal: external.signal }, 1000);
  external.abort(); await assert.rejects(canceled, { name: "AbortError" });
  assert.doesNotMatch(definition("loadSession"), /await saveProfile/, "Restoring a session must not overwrite edited profile data");

  const reasons = context.fallbackDecisionReasons({ choice: "그냥 모른 척 지나간다" });
  assert.equal(reasons.length, 3); assert.ok(reasons.every(item => !/가장 덜 피해|안전.*보장/.test(item.label)));
  assert.match(source, /맞는 이유가 없거나 아직 잘 모르겠어/); assert.match(source, /reasonSource:/);

  completeEpisode(0); let releaseAi; let started;
  const waiting = new Promise(resolve => { started = resolve; });
  context.fetch = () => { started(); return new Promise(resolve => { releaseAi = resolve; }); };
  const request = context.requestAiExplanation({ preventDefault() {} }); await waiting;
  const replacement = new Element(); elements.aiCoachOutput = replacement; completeEpisode(1);
  releaseAi({ ok: true, json: async () => ({ explanation: { summary: "old episode", answer: "old", scoreReasons: [], nextActions: [] }, videos: [] }) });
  await request; assert.equal(replacement.children.length, 0, "Old AI responses must not render into a replacement report");

  let ran = false; context.transitionToScene(() => { ran = true; }); context.goHome();
  await new Promise(resolve => setTimeout(resolve, 220)); assert.equal(ran, false);
  console.log("PASS: account isolation, delayed reads/writes, non-destructive home/replay, save failure/retry, assessment completion, neutral reasons, stale AI, canceled transitions");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
