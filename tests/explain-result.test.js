const assert = require("node:assert/strict");
const { __test } = require("../api/explain-result.js");

function samplePayload() {
  return {
    question: "왜 투명성 점수가 낮나요?",
    episode: {
      title: "삭제되지 않은 얼굴",
      topic: "딥페이크 · 초상권",
      concept: "초상권과 동의",
    },
    score: 74,
    ending: "Normal End · 기준을 배우는 중",
    principles: [
      { name: "프라이버시 보호", score: 88, description: "동의와 자기결정권을 존중한다." },
      { name: "투명성", score: 50, description: "AI 활용 사실과 한계를 알린다." },
    ],
    analysis: {
      profile: "검증 실천형",
      profileDescription: "위험을 확인하고 행동으로 옮기는 경향이 있습니다.",
      proactiveRate: 67,
      riskRate: 0,
      dominantReason: "당사자의 동의와 피해를 먼저 생각했다",
      reflectionDelta: null,
    },
    choices: Array.from({ length: 15 }, (_, index) => ({
      scene: `장면 ${index + 1}`,
      choice: `선택 ${index + 1}`,
      level: "준수",
      reason: "피해 가능성을 확인했다",
    })),
  };
}

const normalized = __test.normalizePayload(samplePayload());
assert.equal(normalized.episode.title, "삭제되지 않은 얼굴");
assert.equal(normalized.principles.length, 2);
assert.equal(normalized.choices.length, 12);
assert.equal(normalized.analysis.reflectionDelta, null);

const longQuestion = "가".repeat(300);
const truncated = __test.normalizePayload({ ...samplePayload(), question: longQuestion });
assert.equal(truncated.question.length, 240);

assert.throws(
  () => __test.normalizePayload({ principles: [] }),
  (error) => error.status === 400 && error.code === "INVALID_REQUEST",
);
assert.throws(
  () => __test.normalizePayload("not-json"),
  (error) => error.status === 400 && error.code === "INVALID_REQUEST",
);

assert.equal(__test.decodeHtmlEntities("AI &amp; 윤리 &#39;학습&#39;"), "AI & 윤리 '학습'");
assert.equal(
  __test.extractOutputText({ output: [{ content: [{ type: "output_text", text: "설명" }] }] }),
  "설명",
);
assert.equal(
  __test.extractRefusal({ output: [{ content: [{ type: "refusal", refusal: "응답할 수 없습니다." }] }] }),
  "응답할 수 없습니다.",
);
assert.deepEqual(__test.parseStructuredOutput('```json\n{"summary":"설명"}\n```'), { summary: "설명" });

const schema = __test.explanationSchema();
assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.required, [
  "summary",
  "answer",
  "scoreReasons",
  "nextActions",
  "videoSearchQuery",
]);

const reasonPayload = __test.normalizeReasonPayload({
  task: "reason_options",
  episode: {
    title: "삭제되지 않은 얼굴",
    topic: "딥페이크 · 초상권",
    concept: "프라이버시 보호·책임성·투명성",
  },
  scene: {
    title: "합성 앱을 켠 친구들",
    text: "친구들이 축제 홍보용 얼굴 합성을 제안했다.",
  },
  choice: "당사자에게 먼저 동의를 구한다",
});
assert.equal(reasonPayload.task, "reason_options");
assert.equal(reasonPayload.choice, "당사자에게 먼저 동의를 구한다");
assert.equal(reasonPayload.allowedReasonCodes.length, 6);
assert.throws(
  () => __test.normalizeReasonPayload({ task: "reason_options", episode: {}, scene: {}, choice: "" }),
  (error) => error.status === 400 && error.code === "INVALID_REQUEST",
);

const reasonSchema = __test.reasonOptionsSchema();
assert.equal(reasonSchema.properties.reasons.minItems, 3);
assert.equal(reasonSchema.properties.reasons.maxItems, 3);
assert.deepEqual(reasonSchema.properties.reasons.items.properties.code.enum, [
  "rights",
  "verification",
  "action",
  "convenience",
  "social",
  "uncertain",
]);
assert.equal(__test.isCasualStudentReason("당사자가 불편할 것 같아서"), true);
assert.equal(__test.isCasualStudentReason("당사자를 먼저 배려해야 한다고 생각합니다."), false);
assert.equal(__test.isCasualStudentReason("친구들과 같이 해결하면 좋을 것 같아요"), false);

const fallback = __test.buildFallbackExplanation(normalized);
assert.match(fallback.summary, /투명성/);
assert.equal(fallback.scoreReasons.length, 3);
assert.equal(fallback.nextActions.length, 2);
assert.match(fallback.videoSearchQuery, /AI 윤리 교육/);

console.log("PASS: AI result/reason payload validation, limits, schemas, entity decoding, and response parsing");
