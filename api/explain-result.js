const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const MAX_QUESTION_LENGTH = 240;
const MAX_CHOICES = 12;
const REASON_CODES = ["rights", "verification", "action", "convenience", "social", "uncertain"];
const ALLOWED_ORIGINS = new Set([
  "https://kindarabbit.github.io",
  "https://twaive-2026.vercel.app",
]);
const videoCache = new Map();

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function applyCorsHeaders(req, res) {
  const origin = req.headers?.origin;
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Vary", "Origin");
}

function cleanText(value, maxLength = 300) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isCasualStudentReason(value) {
  const label = cleanText(value, 100);
  if (!label) return false;
  return !/(니다|습니까|이에요|예요|해요|돼요|같아요|있어요|없어요|좋아요|보여요|싶어요|주세요|하세요)(?:[.!?]?|$)/.test(label);
}

function clampNumber(value, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function parseRequestBody(body) {
  let payload = body;
  if (typeof body === "string") {
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new ApiError(400, "INVALID_REQUEST", "요청 데이터를 읽을 수 없습니다.");
    }
  }
  if (!payload || typeof payload !== "object") {
    throw new ApiError(400, "INVALID_REQUEST", "분석할 결과 데이터가 없습니다.");
  }
  return payload;
}

function normalizePayload(body) {
  const payload = parseRequestBody(body);

  const principles = Array.isArray(payload.principles)
    ? payload.principles.slice(0, 7).map((item) => ({
        name: cleanText(item.name, 60),
        score: Math.round(clampNumber(item.score)),
        description: cleanText(item.description, 240),
      }))
    : [];
  const choices = Array.isArray(payload.choices)
    ? payload.choices.slice(0, MAX_CHOICES).map((item) => ({
        scene: cleanText(item.scene, 100),
        choice: cleanText(item.choice, 180),
        level: cleanText(item.level, 40),
        reason: cleanText(item.reason, 220),
      }))
    : [];

  if (!cleanText(payload.episode?.title, 100) || !principles.length) {
    throw new ApiError(400, "INVALID_REQUEST", "에피소드와 원칙별 점수 정보가 필요합니다.");
  }

  return {
    question: cleanText(payload.question, MAX_QUESTION_LENGTH),
    episode: {
      title: cleanText(payload.episode.title, 100),
      topic: cleanText(payload.episode.topic, 100),
      concept: cleanText(payload.episode.concept, 140),
    },
    score: Math.round(clampNumber(payload.score)),
    ending: cleanText(payload.ending, 100),
    principles,
    analysis: {
      profile: cleanText(payload.analysis?.profile, 80),
      profileDescription: cleanText(payload.analysis?.profileDescription, 240),
      proactiveRate: Math.round(clampNumber(payload.analysis?.proactiveRate)),
      riskRate: Math.round(clampNumber(payload.analysis?.riskRate)),
      dominantReason: cleanText(payload.analysis?.dominantReason, 220),
      reflectionDelta:
        payload.analysis?.reflectionDelta !== null &&
        payload.analysis?.reflectionDelta !== undefined &&
        Number.isFinite(Number(payload.analysis.reflectionDelta))
          ? Number(payload.analysis.reflectionDelta)
          : null,
    },
    choices,
    policyBasis: [
      "대한민국 인공지능 윤리원칙(2026)",
      "인공지능 발전과 신뢰 기반 조성 등에 관한 기본법",
      "대학 AI 활용 윤리 가이드라인",
      "KISDI 인공지능 윤리기준 자율점검표",
    ],
  };
}

function normalizeReasonPayload(body) {
  const payload = parseRequestBody(body);
  const normalized = {
    task: "reason_options",
    episode: {
      title: cleanText(payload.episode?.title, 100),
      topic: cleanText(payload.episode?.topic, 100),
      concept: cleanText(payload.episode?.concept, 140),
    },
    scene: {
      title: cleanText(payload.scene?.title, 100),
      text: cleanText(payload.scene?.text, 500),
    },
    choice: cleanText(payload.choice, 180),
    allowedReasonCodes: REASON_CODES,
  };

  if (!normalized.episode.title || !normalized.scene.title || !normalized.choice) {
    throw new ApiError(400, "INVALID_REQUEST", "에피소드, 장면과 선택 정보가 필요합니다.");
  }
  return normalized;
}

async function verifySupabaseUser(req) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const authorization = req.headers?.authorization || req.headers?.Authorization;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new ApiError(503, "SERVER_NOT_CONFIGURED", "Supabase 서버 환경변수가 설정되지 않았습니다.");
  }
  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인 후 AI 설명을 이용해주세요.");
  }

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      Authorization: authorization,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    throw new ApiError(401, "AUTH_REQUIRED", "로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
  }

  return response.json();
}

function explanationSchema() {
  return {
    type: "object",
    properties: {
      summary: { type: "string" },
      answer: { type: "string" },
      scoreReasons: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 3,
      },
      nextActions: {
        type: "array",
        items: { type: "string" },
        minItems: 2,
        maxItems: 3,
      },
      videoSearchQuery: { type: "string" },
    },
    required: ["summary", "answer", "scoreReasons", "nextActions", "videoSearchQuery"],
    additionalProperties: false,
  };
}

function reasonOptionsSchema() {
  return {
    type: "object",
    properties: {
      reasons: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            code: { type: "string", enum: REASON_CODES },
            label: { type: "string" },
          },
          required: ["code", "label"],
          additionalProperties: false,
        },
      },
    },
    required: ["reasons"],
    additionalProperties: false,
  };
}

function extractOutputText(responseData) {
  if (typeof responseData.output_text === "string") return responseData.output_text;
  for (const item of responseData.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return "";
}

function extractRefusal(responseData) {
  for (const item of responseData.output || []) {
    for (const content of item.content || []) {
      if (content.type === "refusal" && typeof content.refusal === "string") {
        return cleanText(content.refusal, 300);
      }
    }
  }
  return "";
}

function parseStructuredOutput(outputText) {
  const trimmed = String(outputText || "").trim();
  if (!trimmed) throw new Error("empty output");

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (!fenced) throw error;
    return JSON.parse(fenced[1]);
  }
}

function validateExplanation(value) {
  if (
    !value ||
    typeof value.summary !== "string" ||
    typeof value.answer !== "string" ||
    !Array.isArray(value.scoreReasons) ||
    value.scoreReasons.length < 2 ||
    !Array.isArray(value.nextActions) ||
    value.nextActions.length < 2 ||
    typeof value.videoSearchQuery !== "string"
  ) {
    throw new Error("invalid explanation shape");
  }
  return value;
}

function buildFallbackExplanation(payload) {
  const ranked = [...payload.principles].sort((a, b) => a.score - b.score);
  const weakest = ranked[0];
  const strongest = ranked[ranked.length - 1];
  const recentChoice = payload.choices[payload.choices.length - 1];
  const questionLead = payload.question
    ? `질문한 내용은 이번 선택 기록에서 ${weakest.name} 기준과 가장 밀접해.`
    : `이번 결과에서는 ${weakest.name} 기준을 먼저 살펴보면 이해하기 쉬워.`;

  return {
    summary: `${payload.episode.title}에서 ${strongest.name}은 강점으로, ${weakest.name}은 보완할 기준으로 나타났어.`,
    answer: `${questionLead} ${weakest.name} 점수는 관련 선택에서 위험을 확인하거나 설명하고 후속 행동으로 옮긴 정도를 반영한 결과야.`,
    scoreReasons: [
      `${strongest.name}은 ${strongest.score}점으로, 관련 상황에서 기준을 비교적 꾸준히 적용했어.`,
      `${weakest.name}은 ${weakest.score}점으로, 판단을 실제 확인이나 설명 행동까지 이어가는 연습이 더 필요해.`,
      recentChoice ? `마지막 선택인 “${recentChoice.choice}”도 전체 선택 흐름에 함께 반영됐어.` : "에피소드에서 고른 선택의 행동 단계를 종합해 점수를 계산했어.",
    ],
    nextActions: [
      `비슷한 상황에서는 ${weakest.name}과 관련된 위험이나 영향을 먼저 한 가지 확인해봐.`,
      "확인한 내용을 당사자에게 설명하고, 필요한 동의나 수정 행동까지 이어가봐.",
    ],
    videoSearchQuery: `${payload.episode.topic} ${weakest.name} AI 윤리 교육`,
  };
}

async function requestOpenAiExplanationAttempt(payload, maxOutputTokens) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: maxOutputTokens,
      instructions: [
        "당신은 대학생을 위한 AI 윤리 학습 튜터입니다.",
        "입력된 점수는 대한민국 인공지능 윤리원칙을 교육용 0~4 행동 루브릭으로 변환한 결과입니다.",
        "점수를 다시 계산하거나 공식 정부 점수·법률 판정·심리검사라고 표현하지 마세요.",
        "제공된 선택 기록과 정책 근거 안에서만 왜 이런 결과가 나왔는지 쉬운 한국어로 설명하세요.",
        "강점만 칭찬하지 말고 보완할 판단 기준과 바로 실행할 행동을 구체적으로 제안하세요.",
        "사용자 질문이 있으면 먼저 직접 답하고, 없으면 전체 결과를 설명하세요.",
        "영상 검색어는 현재 에피소드의 취약 원칙을 학습할 수 있는 한국어 교육 검색어로 작성하세요.",
      ].join(" "),
      input: JSON.stringify(payload),
      text: {
        format: {
          type: "json_schema",
          name: "twaive_result_explanation",
          strict: true,
          schema: explanationSchema(),
        },
      },
    }),
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("OpenAI Responses API error", response.status, responseData.error?.code || "unknown");
    throw new ApiError(502, "OPENAI_ERROR", "AI 설명 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  const refusal = extractRefusal(responseData);
  if (refusal) {
    console.warn("OpenAI explanation refusal", responseData.id || "unknown");
    throw new ApiError(502, "OPENAI_REFUSAL", "요청한 내용을 AI가 설명하지 못했습니다.");
  }
  if (responseData.status === "incomplete") {
    const reason = responseData.incomplete_details?.reason || "unknown";
    const error = new ApiError(502, "OPENAI_INCOMPLETE", "AI 설명이 완성되기 전에 중단되었습니다.");
    error.retryable = reason === "max_output_tokens";
    throw error;
  }

  const outputText = extractOutputText(responseData);
  if (!outputText) {
    const error = new ApiError(502, "OPENAI_EMPTY", "OpenAI 응답에서 설명을 찾지 못했습니다.");
    error.retryable = true;
    throw error;
  }

  try {
    return validateExplanation(parseStructuredOutput(outputText));
  } catch (error) {
    const parseError = new ApiError(502, "OPENAI_INVALID_FORMAT", "AI 설명 형식을 확인하지 못했습니다.");
    parseError.retryable = true;
    throw parseError;
  }
}

async function requestOpenAiExplanation(payload) {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(503, "SERVER_NOT_CONFIGURED", "OpenAI API 키가 설정되지 않았습니다.");
  }

  try {
    return { explanation: await requestOpenAiExplanationAttempt(payload, 1600), source: "openai" };
  } catch (error) {
    if (error.retryable) {
      try {
        return { explanation: await requestOpenAiExplanationAttempt(payload, 2400), source: "openai-retry" };
      } catch (retryError) {
        console.warn("OpenAI explanation retry failed", retryError.code || "unknown");
      }
    } else {
      console.warn("OpenAI explanation fallback", error.code || "unknown");
    }
    return { explanation: buildFallbackExplanation(payload), source: "local-fallback" };
  }
}

async function requestOpenAiReasonOptions(payload) {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(503, "SERVER_NOT_CONFIGURED", "OpenAI API 키가 설정되지 않았습니다.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 400,
      instructions: [
        "당신은 10대 학생 대상 AI 윤리 선택형 학습 서비스의 문항 설계자입니다.",
        "사용자가 방금 고른 행동에 대해 ‘왜 이 선택을 했어?’라고 물었을 때 직접 답하는 자연스러운 한국어 이유 세 개를 만드세요.",
        "세 이유는 서로 다른 관점이어야 하며 정답을 암시하거나 사용자를 평가하지 마세요.",
        "권리·검증·후속 행동·편의·관계·불확실 중 장면에 가장 적합한 서로 다른 코드 세 개를 사용하세요.",
        "10대 학생이 실제 친구에게 말하듯 쉽고 자연스러운 반말만 사용하세요.",
        "각 이유는 ‘~해서’, ‘~같아서’, ‘~걱정돼서’, ‘~하고 싶어서’처럼 짧게 끝내고, 존댓말과 문어체, ‘~라고 생각했다’의 반복은 사용하지 마세요.",
        "각 문장은 70자 이내로 제한하세요.",
        "입력에 없는 사실, 법률 위반 여부, 점수는 만들어내지 마세요.",
      ].join(" "),
      input: JSON.stringify(payload),
      text: {
        format: {
          type: "json_schema",
          name: "twaive_decision_reasons",
          strict: true,
          schema: reasonOptionsSchema(),
        },
      },
    }),
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("OpenAI reason options error", response.status, responseData.error?.code || "unknown");
    throw new ApiError(502, "OPENAI_ERROR", "AI 이유 추천에 실패했습니다.");
  }

  const outputText = extractOutputText(responseData);
  if (!outputText) {
    throw new ApiError(502, "OPENAI_ERROR", "OpenAI 응답에서 추천 이유를 찾지 못했습니다.");
  }

  try {
    const parsed = JSON.parse(outputText);
    const seenCodes = new Set();
    const reasons = (parsed.reasons || [])
      .map((reason) => ({
        code: cleanText(reason.code, 30),
        label: cleanText(reason.label, 100),
      }))
      .filter((reason) => REASON_CODES.includes(reason.code) && isCasualStudentReason(reason.label) && !seenCodes.has(reason.code) && seenCodes.add(reason.code))
      .slice(0, 3);
    if (reasons.length !== 3) {
      throw new Error("invalid reason count");
    }
    return reasons;
  } catch (error) {
    throw new ApiError(502, "OPENAI_ERROR", "AI 이유 추천 형식을 확인하지 못했습니다.");
  }
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function searchYouTubeVideos(query) {
  const normalizedQuery = cleanText(query, 100) || "AI 윤리 교육";
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(normalizedQuery)}`;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return { videos: [], searchUrl, provider: "youtube-search-link" };
  }
  if (videoCache.has(normalizedQuery)) {
    return videoCache.get(normalizedQuery);
  }

  const params = new URLSearchParams({
    part: "snippet",
    q: normalizedQuery,
    type: "video",
    maxResults: "3",
    relevanceLanguage: "ko",
    regionCode: "KR",
    safeSearch: "strict",
    videoEmbeddable: "true",
    key: apiKey,
  });
  const response = await fetch(`${YOUTUBE_SEARCH_URL}?${params}`);
  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { videos: [], searchUrl, provider: "youtube-search-link" };
  }

  const result = {
    videos: (responseData.items || [])
      .filter((item) => item.id?.videoId)
      .slice(0, 3)
      .map((item) => ({
        id: item.id.videoId,
        title: decodeHtmlEntities(item.snippet?.title),
        channel: decodeHtmlEntities(item.snippet?.channelTitle),
        thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id.videoId)}`,
      })),
    searchUrl,
    provider: "youtube-data-api",
  };
  videoCache.set(normalizedQuery, result);
  return result;
}

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  applyCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ code: "METHOD_NOT_ALLOWED", message: "POST 요청만 지원합니다." });
  }

  try {
    await verifySupabaseUser(req);
    const requestBody = parseRequestBody(req.body);
    if (requestBody.task === "reason_options") {
      const payload = normalizeReasonPayload(requestBody);
      const reasons = await requestOpenAiReasonOptions(payload);
      return res.status(200).json({
        reasons,
        model: process.env.OPENAI_MODEL || "gpt-6-luna",
      });
    }

    const payload = normalizePayload(requestBody);
    const result = await requestOpenAiExplanation(payload);
    const explanation = result.explanation;
    const videoResult = await searchYouTubeVideos(explanation.videoSearchQuery);

    return res.status(200).json({
      explanation: {
        summary: cleanText(explanation.summary, 500),
        answer: cleanText(explanation.answer, 700),
        scoreReasons: explanation.scoreReasons.map((item) => cleanText(item, 300)),
        nextActions: explanation.nextActions.map((item) => cleanText(item, 300)),
      },
      videos: videoResult.videos,
      videoSearchUrl: videoResult.searchUrl,
      videoProvider: videoResult.provider,
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      explanationSource: result.source,
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
    const message = error instanceof ApiError ? error.message : "AI 설명을 준비하지 못했습니다.";
    return res.status(status).json({ code, message });
  }
}

module.exports = handler;
module.exports.__test = {
  applyCorsHeaders,
  cleanText,
  decodeHtmlEntities,
  explanationSchema,
  buildFallbackExplanation,
  extractRefusal,
  extractOutputText,
  isCasualStudentReason,
  normalizePayload,
  normalizeReasonPayload,
  parseRequestBody,
  parseStructuredOutput,
  reasonOptionsSchema,
  validateExplanation,
};
