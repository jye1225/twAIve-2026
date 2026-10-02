(function initLearningModel(root, factory) {
  const dependencies = typeof module === "object" && module.exports
    ? {
        featureExtractor: require("./feature-extractor.js"),
        learnerClassifier: require("./learner-classifier.js"),
        contentRecommender: require("./content-recommender.js"),
      }
    : {
        featureExtractor: root.TWAIVE_FEATURE_EXTRACTOR,
        learnerClassifier: root.TWAIVE_LEARNER_CLASSIFIER,
        contentRecommender: root.TWAIVE_CONTENT_RECOMMENDER,
      };
  const model = factory(dependencies);
  if (typeof module === "object" && module.exports) module.exports = model;
  root.TWAIVE_LEARNING_MODEL = model;
})(typeof globalThis !== "undefined" ? globalThis : window, function createLearningModel(dependencies) {
  const { featureExtractor, learnerClassifier, contentRecommender } = dependencies;
  if (!featureExtractor || !learnerClassifier || !contentRecommender) {
    throw new Error("학습 분석 모델의 하위 모듈을 불러오지 못했습니다.");
  }
  const MODEL_VERSION = "2.0.0";

  function analyze(principleItems, history, assessment = {}, context = {}) {
    const features = featureExtractor.extract(principleItems, history, assessment);
    const profile = learnerClassifier.classify(features);
    const confidence = learnerClassifier.confidence(features);
    const recommendation = contentRecommender.recommend(features, context);
    return {
      version: MODEL_VERSION,
      type: "explainable-rule-based",
      modules: {
        featureExtractor: featureExtractor.FEATURE_VERSION,
        learnerClassifier: learnerClassifier.CLASSIFIER_VERSION,
        contentRecommender: contentRecommender.RECOMMENDER_VERSION,
      },
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

  return Object.freeze({ MODEL_VERSION, analyze });
});
