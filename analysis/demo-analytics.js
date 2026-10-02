(function attachDemoAnalytics(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.TWAIVE_DEMO_ANALYTICS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDemoAnalyticsModule() {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_PRINCIPLES = [
    "humanCenteredness",
    "privacy",
    "fairness",
    "responsibility",
    "safety",
    "reliability",
    "transparency",
  ];
  const PRINCIPLE_BASELINES = {
    humanCenteredness: 79,
    privacy: 68,
    fairness: 64,
    responsibility: 72,
    safety: 75,
    reliability: 61,
    transparency: 66,
  };

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function random() {
      value += 0x6d2b79f5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function round(value, digits = 1) {
    const scale = 10 ** digits;
    return Math.round(value * scale) / scale;
  }

  function sceneTitles(episode) {
    return Object.values(episode.scenes || {})
      .filter((scene) => !scene.end)
      .map((scene) => scene.title)
      .filter(Boolean);
  }

  function createDashboard(episodes, options = {}) {
    const learnerCount = Number(options.learnerCount || 120);
    const random = seededRandom(Number(options.seed || 20261002));
    const principleKeys = options.principleKeys || DEFAULT_PRINCIPLES;
    const principleValues = Object.fromEntries(principleKeys.map((key) => [key, []]));
    const episodeStats = new Map();
    const questionStats = new Map();
    const reflectionDeltas = [];
    let completedEpisodes = 0;
    let simulatedResponses = 0;

    episodes.forEach((episode, episodeIndex) => {
      episodeStats.set(episode.id, { episodeId: episode.id, participants: 0, completedLearners: 0 });
      sceneTitles(episode).forEach((title, sceneIndex) => {
        questionStats.set(`${episode.id}:${title}`, {
          episodeId: episode.id,
          scene: title,
          responses: 0,
          riskCount: 0,
          riskThreshold: 0.08 + episodeIndex * 0.025 + (sceneIndex % 3) * 0.045,
        });
      });
    });

    for (let learner = 0; learner < learnerCount; learner += 1) {
      episodes.forEach((episode, episodeIndex) => {
        const participationRate = 0.96 - episodeIndex * 0.06;
        if (random() > participationRate) return;

        const stats = episodeStats.get(episode.id);
        stats.participants += 1;
        const completed = random() < 0.86 - episodeIndex * 0.075;
        if (completed) {
          stats.completedLearners += 1;
          completedEpisodes += 1;
        }

        const titles = sceneTitles(episode);
        const answeredCount = completed
          ? titles.length
          : Math.max(1, Math.ceil(titles.length * (0.25 + random() * 0.5)));
        titles.slice(0, answeredCount).forEach((title) => {
          const question = questionStats.get(`${episode.id}:${title}`);
          question.responses += 1;
          simulatedResponses += 1;
          if (random() < question.riskThreshold) question.riskCount += 1;
        });

        (episode.meters || principleKeys).forEach((key) => {
          if (!principleValues[key]) return;
          const baseline = PRINCIPLE_BASELINES[key] || 70;
          const variation = (random() - 0.5) * 30 + (completed ? 4 : -4);
          principleValues[key].push(clamp(baseline + variation, 20, 98));
        });

        reflectionDeltas.push(round(clamp(0.2 + random() * 1.5 + (completed ? 0.25 : 0), -1, 2), 1));
      });
    }

    const expectedCompletions = learnerCount * episodes.length;
    const weakestPrinciples = principleKeys
      .map((key) => ({
        key,
        score: round(average(principleValues[key]), 1),
        samples: principleValues[key].length,
      }))
      .filter((item) => item.samples > 0)
      .sort((left, right) => left.score - right.score);
    const questionRiskRates = [...questionStats.values()]
      .map((item) => ({
        episodeId: item.episodeId,
        scene: item.scene,
        responses: item.responses,
        riskCount: item.riskCount,
        riskRate: round((item.riskCount / Math.max(1, item.responses)) * 100, 1),
      }))
      .sort((left, right) => right.riskRate - left.riskRate || right.responses - left.responses)
      .slice(0, 12);
    const episodeCompletion = [...episodeStats.values()].map((item) => ({
      episodeId: item.episodeId,
      completedLearners: item.completedLearners,
      completionRate: round((item.completedLearners / learnerCount) * 100, 1),
    }));

    return {
      isDemo: true,
      demoVersion: VERSION,
      activeLearners: learnerCount,
      completedEpisodes,
      expectedCompletions,
      completionRate: round((completedEpisodes / expectedCompletions) * 100, 1),
      averageReflectionDelta: round(average(reflectionDeltas), 2),
      simulatedResponses,
      weakestPrinciples,
      questionRiskRates,
      episodeCompletion,
      generatedAt: options.generatedAt || "2026-10-02T00:00:00.000Z",
    };
  }

  return { VERSION, createDashboard };
});
