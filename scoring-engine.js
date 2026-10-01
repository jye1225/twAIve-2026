(function initScoringEngine(root, factory) {
  const engine = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = engine;
  }

  root.TWAIVE_SCORING = engine;
})(typeof globalThis !== "undefined" ? globalThis : window, function createScoringEngine() {
  function validRatings(ratings) {
    return Object.fromEntries(
      Object.entries(ratings || {}).filter(
        ([, value]) => Number.isInteger(value) && value >= 0 && value <= 4,
      ),
    );
  }

  function average(values) {
    const numbers = values.filter((value) => Number.isFinite(value));
    return numbers.length
      ? Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length)
      : 0;
  }

  function performanceBand(score) {
    if (score >= 75) return "안정적으로 실천";
    if (score >= 50) return "기준을 이해하는 중";
    if (score >= 25) return "추가 연습 필요";
    return "우선 점검 필요";
  }

  function learnerProfile(principleItems, overallScore, riskRate) {
    const assessed = principleItems.filter((item) => Number.isFinite(item.score));
    if (!assessed.length) {
      return {
        key: "pending",
        name: "분석 대기",
        description: "선택 기록이 쌓이면 판단 패턴을 분석합니다.",
      };
    }

    if (overallScore >= 75 && riskRate <= 0.25) {
      return {
        key: "balanced",
        name: "균형 실천형",
        description: "여러 윤리원칙을 함께 고려하며 예방과 후속 행동까지 연결하는 경향이 있습니다.",
      };
    }

    const weakest = assessed.slice().sort((a, b) => a.score - b.score)[0];
    const profiles = {
      humanCenteredness: {
        key: "agency",
        name: "AI 의존 점검형",
        description: "AI의 도움과 사람의 판단·관계 사이의 경계를 더 구체적으로 연습하면 좋습니다.",
      },
      privacy: {
        key: "rights",
        name: "권리 보호 점검형",
        description: "동의, 개인정보 자기결정권, 피해 가능성을 먼저 확인하는 연습이 필요합니다.",
      },
      fairness: {
        key: "rights",
        name: "권리 보호 점검형",
        description: "나에게 보이는 결과뿐 아니라 다른 집단의 차별과 접근 기회도 함께 살펴보세요.",
      },
      responsibility: {
        key: "action",
        name: "책임 행동 보완형",
        description: "문제 인식에서 멈추지 않고 신고, 피해 회복, 재발 방지로 이어가는 연습이 필요합니다.",
      },
      safety: {
        key: "action",
        name: "위험 대응 보완형",
        description: "개인과 사회에 생길 수 있는 피해를 예상하고 확산을 줄이는 행동을 연습해보세요.",
      },
      reliability: {
        key: "verification",
        name: "검증 강화형",
        description: "AI 결과를 그대로 믿기보다 출처, 성능, 한계를 다른 자료와 함께 확인해보세요.",
      },
      transparency: {
        key: "verification",
        name: "검증 강화형",
        description: "AI 사용 사실과 판단 근거, 결과의 한계를 분명하게 알리는 연습이 필요합니다.",
      },
    };

    return { ...profiles[weakest.key], weakestKey: weakest.key, weakestScore: weakest.score };
  }

  function analyzeLearning(principleItems, history, assessment = {}) {
    const decisions = history.filter((item) => item.rubric);
    const levels = decisions.map((item) => item.rubric.level).filter(Number.isFinite);
    const responseTimes = decisions
      .map((item) => item.responseTimeMs)
      .filter((value) => Number.isFinite(value) && value >= 0);
    const reasonCounts = {};

    decisions.forEach((item) => {
      if (!item.reasonCode) return;
      if (!reasonCounts[item.reasonCode]) {
        reasonCounts[item.reasonCode] = { code: item.reasonCode, label: item.reasonLabel, count: 0 };
      }
      reasonCounts[item.reasonCode].count += 1;
    });

    const overallScore = average(principleItems.map((item) => item.score));
    const riskCount = levels.filter((level) => level <= 1).length;
    const proactiveCount = levels.filter((level) => level >= 3).length;
    const riskRate = levels.length ? riskCount / levels.length : 0;
    const reasonRate = decisions.length
      ? decisions.filter((item) => item.reasonCode).length / decisions.length
      : 0;
    const preLevel = assessment.pre?.level;
    const postLevel = assessment.post?.level;
    const reflectionDelta = Number.isFinite(preLevel) && Number.isFinite(postLevel)
      ? postLevel - preLevel
      : null;
    const averageResponseSeconds = responseTimes.length
      ? Math.round((responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length / 1000) * 10) / 10
      : null;
    const confidence = decisions.length >= 12 && reasonRate >= 0.8
      ? "높음"
      : decisions.length >= 4 && reasonRate >= 0.5
        ? "보통"
        : "낮음";

    return {
      overallScore,
      profile: learnerProfile(principleItems, overallScore, riskRate),
      decisionCount: decisions.length,
      riskCount,
      riskRate,
      proactiveCount,
      proactiveRate: levels.length ? proactiveCount / levels.length : 0,
      averageResponseSeconds,
      reasonDistribution: Object.values(reasonCounts).sort((a, b) => b.count - a.count),
      dominantReason: Object.values(reasonCounts).sort((a, b) => b.count - a.count)[0] || null,
      reflectionDelta,
      attemptCount: Math.max(1, Number(assessment.attemptCount || 1)),
      confidence,
    };
  }

  function buildRubricRecord(choiceRubric, version, levelDefinitions) {
    const ratings = validRatings(choiceRubric?.ratings);
    const values = Object.values(ratings);

    if (!values.length) {
      throw new Error("선택지의 원칙별 평가 수준이 없습니다.");
    }

    const summaryLevel = Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length,
    );

    return {
      version,
      ratings,
      level: summaryLevel,
      levelLabel: levelDefinitions[summaryLevel].label,
      principles: Object.keys(ratings),
      evidence: [...new Set(choiceRubric.evidence || [])],
      legalReferences: [...new Set(choiceRubric.legalReferences || [])],
    };
  }

  function scorePrinciples(principleKeys, history, version, definitions) {
    const totals = Object.fromEntries(
      principleKeys.map((key) => [
        key,
        { earned: 0, possible: 0, count: 0, evidence: new Set(), legalReferences: new Set() },
      ]),
    );

    history.forEach((item) => {
      const rubric = item.rubric;
      if (rubric?.version !== version) return;

      Object.entries(validRatings(rubric.ratings)).forEach(([key, level]) => {
        if (!totals[key]) return;
        totals[key].earned += level;
        totals[key].possible += 4;
        totals[key].count += 1;
        rubric.evidence
          .filter(
            (code) =>
              !code.startsWith("KAI-") ||
              !definitions[key]?.code ||
              code.startsWith(`${definitions[key].code}.`),
          )
          .forEach((code) => totals[key].evidence.add(code));
        rubric.legalReferences.forEach((code) => totals[key].legalReferences.add(code));
      });
    });

    return principleKeys.map((key) => {
      const total = totals[key];
      return {
        key,
        ...definitions[key],
        ...total,
        evidence: [...total.evidence],
        legalReferences: [...total.legalReferences],
        score: total.possible ? Math.round((total.earned / total.possible) * 100) : null,
      };
    });
  }

  return Object.freeze({
    analyzeLearning,
    average,
    buildRubricRecord,
    performanceBand,
    scorePrinciples,
  });
});
