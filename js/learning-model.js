// Compatibility entry point for Node.js tests and older imports.
// Browser pages load the individual files in js/analysis/ to expose the architecture.
(function exposeLearningModel(root) {
  if (typeof module === "object" && module.exports) {
    module.exports = require("./analysis/learning-model.js");
    return;
  }
  if (!root.TWAIVE_LEARNING_MODEL) {
    throw new Error("js/analysis/learning-model.js를 먼저 불러와야 합니다.");
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
