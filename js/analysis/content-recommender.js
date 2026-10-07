(function initContentRecommender(root, factory) {
  const recommender = factory();
  if (typeof module === "object" && module.exports) module.exports = recommender;
  root.TWAIVE_CONTENT_RECOMMENDER = recommender;
})(typeof globalThis !== "undefined" ? globalThis : window, function createContentRecommender() {
  const RECOMMENDER_VERSION = "1.0.0";
  const EPISODE_BY_PRINCIPLE = {
    humanCenteredness: { id: "chatbot", title: "AI 챗봇과 마음의 거리" },
    privacy: { id: "privacy", title: "추천 알고리즘이 아는 것" },
    fairness: { id: "privacy", title: "추천 알고리즘이 아는 것" },
    responsibility: { id: "deepfake", title: "삭제되지 않은 얼굴" },
    safety: { id: "rumor", title: "진실은 클릭 뒤에 있다" },
    reliability: { id: "rumor", title: "진실은 클릭 뒤에 있다" },
    transparency: { id: "assignment", title: "AI가 써준 수행평가" },
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

  function recommend(features, context = {}) {
    const weakest = features.weakestPrinciple;
    if (!weakest) {
      return {
        title: "먼저 에피소드를 완료해봐",
        action: "선택과 판단 이유를 기록하면 맞춤 행동을 추천해.",
        basis: "분석 기록 없음",
        episodeId: null,
        episodeTitle: null,
      };
    }
    const episode = EPISODE_BY_PRINCIPLE[weakest.key];
    const completedIds = new Set(context.completedEpisodeIds || []);
    const isReview = episode?.id === context.currentEpisodeId || completedIds.has(episode?.id);
    return {
      title: `${weakest.name}부터 연습해봐`,
      action: ACTION_BY_PRINCIPLE[weakest.key] || "선택 전에 피해 가능성과 후속 행동을 한 번 더 확인해봐.",
      basis: `${weakest.name} ${weakest.score}점 · 위험 선택 ${Math.round(features.riskRate * 100)}%`,
      episodeId: episode?.id || null,
      episodeTitle: episode?.title || null,
      mode: isReview ? "review" : "next",
    };
  }

  return Object.freeze({ EPISODE_BY_PRINCIPLE, RECOMMENDER_VERSION, recommend });
});
