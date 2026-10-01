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

const schema = __test.explanationSchema();
assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.required, [
  "summary",
  "answer",
  "scoreReasons",
  "nextActions",
  "videoSearchQuery",
]);

console.log("PASS: AI result payload validation, limits, entity decoding, and response parsing");
