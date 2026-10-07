(function initPrincipleScorer(root, factory) {
  const scorer = factory();
  if (typeof module === "object" && module.exports) module.exports = scorer;
  root.TWAIVE_PRINCIPLE_SCORER = scorer;
})(typeof globalThis !== "undefined" ? globalThis : window, function createPrincipleScorer() {
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

  function buildRubricRecord(choiceRubric, version, levelDefinitions) {
    const ratings = validRatings(choiceRubric?.ratings);
    const values = Object.values(ratings);
    if (!values.length) throw new Error("선택지의 원칙별 평가 수준이 없습니다.");

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

  return Object.freeze({ average, buildRubricRecord, performanceBand, scorePrinciples, validRatings });
});
