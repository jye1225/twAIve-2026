(function initLearnerClassifier(root, factory) {
  const classifier = factory();
  if (typeof module === "object" && module.exports) module.exports = classifier;
  root.TWAIVE_LEARNER_CLASSIFIER = classifier;
})(typeof globalThis !== "undefined" ? globalThis : window, function createLearnerClassifier() {
  const CLASSIFIER_VERSION = "1.0.0";
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
    pending: ["분석 대기", "선택 기록이 쌓이면 판단 패턴을 분석해."],
    balanced: ["균형 실천형", "여러 윤리원칙을 함께 살피고 확인한 내용을 행동으로 옮기는 편이야."],
    agency: ["AI 의존 점검형", "AI의 도움과 사람의 판단 사이의 경계를 더 구체적으로 연습하면 좋아."],
    rights: ["권리 보호 점검형", "동의, 개인정보, 차별 가능성을 선택 전에 먼저 확인하는 연습이 필요해."],
    action: ["책임 행동 보완형", "문제를 알아차린 뒤 신고, 피해 회복, 재발 방지까지 이어가는 연습이 필요해."],
    verification: ["검증 강화형", "AI 결과의 출처와 한계를 확인하고 사용 사실을 분명히 알리는 연습이 필요해."],
    risk: ["위험 신호 점검형", "편리함보다 피해 가능성을 먼저 멈춰 확인하는 연습이 필요해."],
  };

  function profile(key, rule) {
    const [name, description] = PROFILES[key];
    return { key, name, description, rule };
  }

  function confidence(features) {
    const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));
    const score = Math.round(
      Math.min(features.decisionCount / 12, 1) * 50 +
      clamp(features.reasonCoverage) * 25 +
      (features.reflectionDelta === null ? 0 : 15) +
      (features.attemptCount >= 2 ? 10 : 0),
    );
    return { score, band: score >= 75 ? "높음" : score >= 45 ? "보통" : "낮음" };
  }

  function classify(features) {
    if (!features.decisionCount || !features.weakestPrinciple) {
      return profile("pending", "분석 가능한 선택 기록이 없음");
    }
    if (features.riskRate >= 0.4) {
      return profile("risk", "위험 단계 선택 비율이 40% 이상");
    }
    if (features.overallScore >= 75 && features.riskRate <= 0.25 && features.scoreSpread <= 35) {
      return profile("balanced", "전체 75점 이상 · 위험 선택 25% 이하 · 원칙 편차 35점 이하");
    }
    const group = GROUP_BY_PRINCIPLE[features.weakestPrinciple.key] || "action";
    return profile(
      group,
      `가장 낮은 원칙이 ${features.weakestPrinciple.name} ${features.weakestPrinciple.score}점`,
    );
  }

  return Object.freeze({ CLASSIFIER_VERSION, classify, confidence });
});
