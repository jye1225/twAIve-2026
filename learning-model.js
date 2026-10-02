(function initLearningModel(root, factory) {
  const model = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = model;
  }

  root.TWAIVE_LEARNING_MODEL = model;
})(typeof globalThis !== "undefined" ? globalThis : window, function createLearningModel() {
  const MODEL_VERSION = "1.0.0";
  const GROUP_BY_PRINCIPLE = {
    humanCenteredness: "agency",
    privacy: "rights",
    fairness: "rights",
    responsibility: "action",
    safety: "action",
    reliability: "verification",
    transparency: "verification",
  };
  const PROFILES = {
    pending: {
      key: "pending",
      name: "분석 대기",
      description: "선택 기록이 쌓이면 판단 패턴을 분석해.",
    },
    balanced: {
      key: "balanced",
      name: "균형 실천형",
      description: "여러 윤리원칙을 함께 살피고 확인한 내용을 행동으로 옮기는 편이야.",
    },
    agency: {
      key: "agency",
      name: "AI 의존 점검형",
      description: "AI의 도움과 사람의 판단 사이의 경계를 더 구체적으로 연습하면 좋아.",
    },
    rights: {
      key: "rights",
      name: "권리 보호 점검형",
      description: "동의, 개인정보, 차별 가능성을 선택 전에 먼저 확인하는 연습이 필요해.",
    },
    action: {
      key: "action",
      name: "책임 행동 보완형",
      description: "문제를 알아차린 뒤 신고, 피해 회복, 재발 방지까지 이어가는 연습이 필요해.",
    },
    verification: {
      key: "verification",
      name: "검증 강화형",
      description: "AI 결과의 출처와 한계를 확인하고 사용 사실을 분명히 알리는 연습이 필요해.",
    },
    risk: {
      key: "risk",
      name: "위험 신호 점검형",
      description: "편리함보다 피해 가능성을 먼저 멈춰 확인하는 연습이 필요해.",
    },
  };
  const ACTION_BY_PRINCIPLE = {
    humanCenteredness: "AI가 대신 정하면 안 되는 사람의 판단이 무엇인지 먼저 적어봐.",
    privacy: "사용 전에 당사자의 동의와 정보 공개 범위를 확인해봐.",
    fairness: "다른 사람이나 집단에 불리한 결과가 생기지 않는지 비교해봐.",
    responsibility: "문제를 발견하면 알리는 데서 끝내지 말고 수정 담당과 후속 조치까지 정해봐.",
    safety: "누가 어떤 피해를 입을 수 있는지 예상하고 확산을 멈추는 행동부터 해봐.",
    reliability: "AI 결과를 원문이나 다른 출처와 한 번 더 대조해봐.",
    transparency: "AI를 사용한 부분과 사람이 확인한 부분을 구분해 밝혀봐.",
  };

  function clampRate(value) {
    return Math.min(1, Math.max(0, Number(value) || 0));
  }

  function average(values) {
    const numbers = values.filter(Number.isFinite);
    return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
  }

  function extractFeatures(principleItems, history, assessment = {}) {
    const assessed = (principleItems || []).filter((item) => Number.isFinite(item.score));
    const decisions = (history || []).filter((item) => item.rubric && Number.isFinite(item.rubric.level));
    const levels = decisions.map((item) => item.rubric.level);
    const responseTimes = decisions
      .map((item) => Number(item.responseTimeMs))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const ranked = assessed.slice().sort((a, b) => a.score - b.score);
    const weakest = ranked[0] || null;
    const strongest = ranked[ranked.length - 1] || null;
    const reasonCount = decisions.filter((item) => item.reasonCode).length;
    const preLevel = Number(assessment.pre?.level);
    const postLevel = Number(assessment.post?.level);

    return {
      decisionCount: decisions.length,
      overallScore: Math.round(average(assessed.map((item) => item.score))),
      riskRate: levels.length ? levels.filter((level) => level <= 1).length / levels.length : 0,
      proactiveRate: levels.length ? levels.filter((level) => level >= 3).length / levels.length : 0,
      reasonCoverage: decisions.length ? reasonCount / decisions.length : 0,
      averageResponseSeconds: responseTimes.length
        ? Math.round((average(responseTimes) / 1000) * 10) / 10
        : null,
      reflectionDelta: Number.isFinite(preLevel) && Number.isFinite(postLevel)
        ? postLevel - preLevel
        : null,
      attemptCount: Math.max(1, Number(assessment.attemptCount || 1)),
      weakestPrinciple: weakest
        ? { key: weakest.key, name: weakest.name, score: weakest.score }
        : null,
      strongestPrinciple: strongest
        ? { key: strongest.key, name: strongest.name, score: strongest.score }
        : null,
      scoreSpread: weakest && strongest ? strongest.score - weakest.score : 0,
    };
  }

  function confidenceFromFeatures(features) {
    const score = Math.round(
      Math.min(features.decisionCount / 12, 1) * 50 +
      clampRate(features.reasonCoverage) * 25 +
      (features.reflectionDelta === null ? 0 : 15) +
      (features.attemptCount >= 2 ? 10 : 0),
    );
    return {
      score,
      band: score >= 75 ? "높음" : score >= 45 ? "보통" : "낮음",
    };
  }

  function classify(features) {
    if (!features.decisionCount || !features.weakestPrinciple) {
      return { ...PROFILES.pending, rule: "분석 가능한 선택 기록이 없음" };
    }
    if (features.riskRate >= 0.4) {
      return { ...PROFILES.risk, rule: "위험 단계 선택 비율이 40% 이상" };
    }
    if (features.overallScore >= 75 && features.riskRate <= 0.25 && features.scoreSpread <= 35) {
      return { ...PROFILES.balanced, rule: "전체 75점 이상 · 위험 선택 25% 이하 · 원칙 편차 35점 이하" };
    }

    const group = GROUP_BY_PRINCIPLE[features.weakestPrinciple.key] || "action";
    return {
      ...PROFILES[group],
      rule: `가장 낮은 원칙이 ${features.weakestPrinciple.name} ${features.weakestPrinciple.score}점`,
    };
  }

  function recommend(features) {
    const weakest = features.weakestPrinciple;
    if (!weakest) {
      return {
        title: "먼저 에피소드를 완료해봐",
        action: "선택과 판단 이유를 기록하면 맞춤 행동을 추천해.",
        basis: "분석 기록 없음",
      };
    }
    return {
      title: `${weakest.name}부터 연습해봐`,
      action: ACTION_BY_PRINCIPLE[weakest.key] || "선택 전에 피해 가능성과 후속 행동을 한 번 더 확인해봐.",
      basis: `${weakest.name} ${weakest.score}점 · 위험 선택 ${Math.round(features.riskRate * 100)}%`,
    };
  }

  function analyze(principleItems, history, assessment = {}) {
    const features = extractFeatures(principleItems, history, assessment);
    const profile = classify(features);
    const confidence = confidenceFromFeatures(features);
    const recommendation = recommend(features);

    return {
      version: MODEL_VERSION,
      type: "explainable-rule-based",
      features,
      profile,
      confidence,
      recommendation,
      trace: [
        `${features.decisionCount}개 선택에서 위험 ${Math.round(features.riskRate * 100)}%, 적극 실천 ${Math.round(features.proactiveRate * 100)}%를 추출`,
        profile.rule,
        `${recommendation.title}: ${recommendation.basis}`,
      ],
    };
  }

  return Object.freeze({
    MODEL_VERSION,
    analyze,
    classify,
    confidenceFromFeatures,
    extractFeatures,
    recommend,
  });
});
