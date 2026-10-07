(function initFeatureExtractor(root, factory) {
  const extractor = factory();
  if (typeof module === "object" && module.exports) module.exports = extractor;
  root.TWAIVE_FEATURE_EXTRACTOR = extractor;
})(typeof globalThis !== "undefined" ? globalThis : window, function createFeatureExtractor() {
  const FEATURE_VERSION = "1.0.0";

  function average(values) {
    const numbers = values.filter(Number.isFinite);
    return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
  }

  function extract(principleItems, history, assessment = {}) {
    const assessed = (principleItems || []).filter((item) => Number.isFinite(item.score));
    const decisions = (history || []).filter((item) => item.rubric && Number.isFinite(item.rubric.level));
    const levels = decisions.map((item) => item.rubric.level);
    const responseTimes = decisions
      .map((item) => Number(item.responseTimeMs))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const ranked = assessed.slice().sort((a, b) => a.score - b.score);
    const weakest = ranked[0] || null;
    const strongest = ranked[ranked.length - 1] || null;
    const reasonCounts = {};

    decisions.forEach((item) => {
      if (!item.reasonCode) return;
      if (!reasonCounts[item.reasonCode]) {
        reasonCounts[item.reasonCode] = { code: item.reasonCode, label: item.reasonLabel, count: 0 };
      }
      reasonCounts[item.reasonCode].count += 1;
    });
    const reasonDistribution = Object.values(reasonCounts).sort((a, b) => b.count - a.count);
    const reasonCount = decisions.filter((item) => item.reasonCode).length;
    const preLevel = Number(assessment.pre?.level);
    const postLevel = Number(assessment.post?.level);
    const riskCount = levels.filter((level) => level <= 1).length;
    const proactiveCount = levels.filter((level) => level >= 3).length;

    return {
      featureVersion: FEATURE_VERSION,
      decisionCount: decisions.length,
      overallScore: Math.round(average(assessed.map((item) => item.score))),
      riskCount,
      riskRate: levels.length ? riskCount / levels.length : 0,
      proactiveCount,
      proactiveRate: levels.length ? proactiveCount / levels.length : 0,
      reasonCoverage: decisions.length ? reasonCount / decisions.length : 0,
      reasonDistribution,
      dominantReason: reasonDistribution[0] || null,
      averageResponseSeconds: responseTimes.length
        ? Math.round((average(responseTimes) / 1000) * 10) / 10
        : null,
      reflectionDelta: Number.isFinite(preLevel) && Number.isFinite(postLevel)
        ? postLevel - preLevel
        : null,
      attemptCount: Math.max(1, Number(assessment.attemptCount || 1)),
      principleScores: Object.fromEntries(assessed.map((item) => [item.key, item.score])),
      weakestPrinciple: weakest
        ? { key: weakest.key, name: weakest.name, score: weakest.score }
        : null,
      strongestPrinciple: strongest
        ? { key: strongest.key, name: strongest.name, score: strongest.score }
        : null,
      scoreSpread: weakest && strongest ? strongest.score - weakest.score : 0,
    };
  }

  return Object.freeze({ FEATURE_VERSION, extract });
});
