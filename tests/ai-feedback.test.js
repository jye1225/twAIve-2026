const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const handler = require("../api/explain-result.js");
const { validateExplanation, normalizePayload, buildFallbackExplanation, BLOCKED_CATEGORIES } = handler.__test;

const explanation = {
  summary: "AI가 위로한다는 이유만으로 친구가 안전하다고 판단한 선택이 반영됐어.",
  answer: "걱정되는 신호가 있었지만 확인이나 도움 요청으로 이어지지 않은 선택이 많았어. 마지막에 상담 선생님과 이야기하기로 한 점은 잘했어.",
  scoreReasons: [
    "혼자 있는 친구를 모른 척 지나갔어. 부담을 주지 않게 안부를 묻는 방법도 있어.",
    "AI가 있으니 괜찮다고 생각했어. 위로를 받는 것과 안전을 확인하는 것은 달라.",
    "마지막에는 상담 선생님과 이야기하기로 했어. 사람의 도움을 연결한 점은 잘했어.",
  ],
  nextActions: [
    "친구에게 지금 괜찮은지 조심스럽게 안부를 물어봐.",
    "걱정되는 신호가 보이면 혼자 해결하려 하지 말고 믿을 만한 어른에게 도움을 구해봐.",
  ],
  videoSearchQuery: "청소년 AI 챗봇 한계 도움 요청",
};
const payload = {
  question: "왜 이 점수가 나왔나요?",
  episode: { title: "AI 챗봇과 마음의 거리", topic: "AI 챗봇 · 정신건강", concept: "AI의 한계와 도움 연결" },
  score: 34,
  ending: "Bad End · 다시 점검 필요",
  principles: [
    { name: "신뢰성", score: 42 },
    { name: "안전성", score: 31 },
  ],
  choices: [
    { scene: "혼자 있는 친구", choice: "그냥 모른 척 지나간다" },
    { scene: "위험한 대화", choice: "AI가 있으니까 괜찮다" },
    { scene: "사람의 도움", choice: "상담 선생님과 함께 이야기한다" },
  ],
};

assert.deepEqual(validateExplanation(explanation), explanation);
assert.throws(() => validateExplanation({ ...explanation, answer: "가".repeat(701) + "." }));
assert.throws(() => validateExplanation({ ...explanation, answer: "도움을 연결하는 판단이" }));
assert.throws(() => validateExplanation({ ...explanation, summary: "**설명이야.**" }));
assert.throws(() => validateExplanation({ ...explanation, summary: "하나야. 둘이야." }));
assert.throws(() => validateExplanation({ ...explanation, scoreReasons: [42, "설명이야."] }));
assert.throws(() => validateExplanation({ ...explanation, scoreReasons: Array(4).fill("설명이야.") }));
assert.throws(() => validateExplanation({ ...explanation, nextActions: ["해봐.", "해봐.", "해봐."] }));
assert.equal(validateExplanation({ ...explanation, answer: "첫 문장이야.\n\n마지막 문장이야." }).answer, "첫 문장이야. 마지막 문장이야.");
assert.equal(validateExplanation(buildFallbackExplanation(normalizePayload(payload))).nextActions.length, 2);

// Exercise the full API handler with fake auth/model responses, never real keys or charges.
async function requestWithResponses(responses, moderation = { results: [{ categories: Object.fromEntries(BLOCKED_CATEGORIES.map(key => [key, false])) }] }) {
  const originalFetch = global.fetch;
  const names = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "OPENAI_API_KEY", "YOUTUBE_API_KEY"];
  const oldEnv = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const requests = [];
  try {
    process.env.SUPABASE_URL = "https://auth.example.test";
    process.env.SUPABASE_ANON_KEY = "test-only";
    process.env.OPENAI_API_KEY = "test-only";
    delete process.env.YOUTUBE_API_KEY;
    global.fetch = async (url, options) => {
      if (url === "https://auth.example.test/auth/v1/user") return { ok: true, json: async () => ({ id: "test-only" }) };
      if (url === "https://api.openai.com/v1/moderations") return { ok: true, json: async () => moderation };
      assert.equal(url, "https://api.openai.com/v1/responses");
      requests.push(JSON.parse(options.body));
      const response = responses.shift();
      assert.ok(response, "Unexpected extra API attempt");
      return { ok: true, json: async () => response };
    };
    const res = {
      setHeader() {},
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await handler({ method: "POST", headers: { authorization: "Bearer test-only" }, body: payload }, res);
    assert.equal(res.statusCode, 200);
    return { body: res.body, requests };
  } finally {
    global.fetch = originalFetch;
    for (const name of names) {
      if (oldEnv[name] === undefined) delete process.env[name];
      else process.env[name] = oldEnv[name];
    }
  }
}

function completed(value) {
  return { status: "completed", output_text: JSON.stringify(value) };
}

function testRendering() {
  class Element {
    constructor(tagName) { this.tagName = tagName; this.children = []; this.classList = { remove() {} }; }
    appendChild(element) { this.children.push(element); }
    replaceChildren() { this.children = []; }
  }
  const output = new Element("div");
  const context = {
    document: { getElementById: () => output, createElement: tag => new Element(tag) },
    scoreAverage: () => 34,
    endingName: () => "Bad End · 다시 점검 필요",
  };
  const source = fs.readFileSync("js/app.js", "utf8");
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf("function appendTextElement("), source.indexOf("function showAiCoachError(")) + "\nthis.renderAiExplanation = renderAiExplanation;", context);
  context.renderAiExplanation({ explanation, videos: [], videoSearchUrl: "https://www.youtube.com/results?search_query=test" });
  const sections = output.children.filter(element => element.className?.includes("ai-explanation-section"));
  assert.deepEqual(sections.map(section => section.children[0].textContent), ["한눈에 보기", "질문에 대한 답", "내 선택 돌아보기", "다음에는 이렇게"]);
  assert.equal(sections[0].children[1].textContent, "34점 · 다시 점검 필요");
  assert.equal(sections[0].children[2].textContent, explanation.summary);
  assert.equal(sections[1].children[1].textContent, explanation.answer);
  assert.equal(sections[2].children[1].tagName, "ol");
  assert.equal(sections[2].children[1].children.length, 3);
  assert.equal(sections[3].children[1].children.length, 2);
  assert.equal(output.children.filter(element => element.className === "ai-explanation-disclaimer").length, 1);
  context.renderAiExplanation({ explanation, explanationSource: "local-fallback", videos: [], videoSearchUrl: "https://example.test" });
  assert.equal(output.children[0].className, "ai-explanation-notice");
}

async function main() {
  testRendering();
  const success = await requestWithResponses([completed(explanation)]);
  assert.equal(success.body.explanationSource, "openai");
  assert.equal(success.body.explanation.answer, explanation.answer, "Return complete validated copy without slicing");
  assert.match(success.requests[0].instructions, /중·고등학생/);
  assert.doesNotMatch(success.requests[0].instructions, /대학생을 위한/);
  assert.equal(success.requests[0].store, false);
  assert.equal(success.requests[0].text.format.strict, true);
  for (const invalid of [
    completed({ ...explanation, answer: "가".repeat(701) + "." }),
    completed({ ...explanation, answer: "도움을 연결하는 판단이" }),
    { status: "incomplete", incomplete_details: { reason: "max_output_tokens" } },
  ]) {
    const retry = await requestWithResponses([invalid, completed(explanation)]);
    assert.equal(retry.body.explanationSource, "openai-retry");
    assert.equal(retry.requests.length, 2);
    assert.match(retry.requests[1].instructions, /더 짧게/);
    assert.equal(retry.body.explanation.answer, explanation.answer);
  }
  const invalid = completed({ ...explanation, answer: "끝나지 않은 문장" });
  const fallback = await requestWithResponses([invalid, invalid]);
  assert.equal(fallback.body.explanationSource, "local-fallback");
  assert.ok(fallback.body.explanation.answer.endsWith("."));
  assert.equal(fallback.body.explanation.nextActions.length, 2);
  for (const moderation of [
    { results: [{ categories: {} }] },
    { results: [{ categories: { ...Object.fromEntries(BLOCKED_CATEGORIES.map(key => [key, false])), "self-harm/instructions": true } }] },
  ]) {
    const safeFallback = await requestWithResponses([completed(explanation)], moderation);
    assert.equal(safeFallback.body.explanationSource, "local-fallback");
    assert.equal(safeFallback.requests.length, 1, "Safety failures must not trigger repeated generation");
  }
  console.log("PASS: teen feedback, complete short sentences, bounded retry/fallback, no truncation, sectioned safe rendering");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
