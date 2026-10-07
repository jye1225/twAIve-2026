(function initTeachingStrategy(root, factory) {
  const strategy = factory();
  if (typeof module === "object" && module.exports) module.exports = strategy;
  root.TWAIVE_TEACHING_STRATEGY = strategy;
})(typeof globalThis !== "undefined" ? globalThis : window, function createTeachingStrategy() {
  const STRATEGY_VERSION = "1.0.0";
  const STRATEGIES = {
    humanCenteredness: {
      title: "사람이 결정해야 할 부분 구분하기",
      activity: "같은 상황에서 AI에게 맡길 일과 사람이 직접 판단할 일을 두 칸으로 나눠 적게 해봐.",
      observation: "AI의 답을 그대로 따르지 않고 자신의 판단 근거를 말하는지 관찰해.",
    },
    privacy: {
      title: "동의와 공개 범위 먼저 확인하기",
      activity: "사진이나 개인정보를 사용하기 전에 누구에게 어떤 허락(동의)을 받아야 하는지 역할극으로 연습해봐.",
      observation: "당사자 동의와 정보 공개 범위를 선택 전에 확인하는지 관찰해.",
    },
    fairness: {
      title: "누가 불리해지는지 비교하기",
      activity: "AI 결과로 이익을 얻는 사람과 불이익을 받는 사람을 찾아 근거를 비교하게 해봐.",
      observation: "자신과 다른 입장의 피해 가능성까지 설명하는지 관찰해.",
    },
    responsibility: {
      title: "발견 이후의 행동까지 계획하기",
      activity: "문제를 발견한 뒤 신고, 수정, 피해 회복, 재발 방지를 순서대로 정하게 해봐.",
      observation: "문제를 다른 사람에게 알리는 데서 멈추지 않고 후속 행동을 제안하는지 관찰해.",
    },
    safety: {
      title: "피해를 예상하고 먼저 멈추기",
      activity: "공유하기 전 생길 수 있는 신체적·정신적·사회적 피해를 세 가지 이상 찾아보게 해봐.",
      observation: "재미나 편리함보다 피해 예방 행동을 먼저 선택하는지 관찰해.",
    },
    reliability: {
      title: "AI 답을 다른 출처와 대조하기",
      activity: "AI 답변과 원문 자료를 나란히 두고 사실, 출처, 빠진 정보를 직접 표시하게 해봐.",
      observation: "AI 결과를 사실로 단정하지 않고 추가 출처를 확인하는지 관찰해.",
    },
    transparency: {
      title: "AI를 쓴 부분을 분명히 밝히기",
      activity: "과제나 게시물에서 AI가 만든 부분, 사람이 고친 부분, 확인한 출처를 구분해 적게 해봐.",
      observation: "AI 사용 사실과 한계를 상대가 이해할 수 있게 설명하는지 관찰해.",
    },
  };

  function recommend(item, principles = {}) {
    const strategy = STRATEGIES[item?.key];
    if (!strategy) return null;
    return {
      principleKey: item.key,
      principleName: principles[item.key]?.name || item.key,
      score: Number(item.score || 0),
      samples: Number(item.samples || 0),
      ...strategy,
    };
  }

  function recommendMany(items, principles = {}, limit = 3) {
    return (items || [])
      .slice()
      .sort((left, right) => Number(left.score || 0) - Number(right.score || 0))
      .map((item) => recommend(item, principles))
      .filter(Boolean)
      .slice(0, limit);
  }

  return Object.freeze({ STRATEGIES, STRATEGY_VERSION, recommend, recommendMany });
});
