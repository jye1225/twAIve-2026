(function initScoringEngine(root, factory) {
  const dependencies = typeof module === "object" && module.exports
    ? {
        principleScorer: require("./analysis/principle-scorer.js"),
        learningModel: require("./analysis/learning-model.js"),
      }
    : {
        principleScorer: root.TWAIVE_PRINCIPLE_SCORER,
        learningModel: root.TWAIVE_LEARNING_MODEL,
      };
  const engine = factory(dependencies);
  if (typeof module === "object" && module.exports) module.exports = engine;
  root.TWAIVE_SCORING = engine;
})(typeof globalThis !== "undefined" ? globalThis : window, function createScoringEngine(dependencies) {
  const { principleScorer, learningModel } = dependencies;
  if (!principleScorer || !learningModel) {
    throw new Error("점수 계산 엔진의 하위 모듈을 불러오지 못했습니다.");
  }

  function analyzeLearning(principleItems, history, assessment = {}) {
    const model = learningModel.analyze(principleItems, history, assessment);
    return {
      ...model.features,
      profile: model.profile,
      confidence: model.confidence.band,
      model,
    };
  }

  return Object.freeze({
    analyzeLearning,
    average: principleScorer.average,
    buildRubricRecord: principleScorer.buildRubricRecord,
    performanceBand: principleScorer.performanceBand,
    scorePrinciples: principleScorer.scorePrinciples,
  });
});
