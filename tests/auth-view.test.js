const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("js/app.js", "utf8");
const classes = new Set(["is-authenticated", "is-visual-novel", "is-game-home", "is-teacher-view"]);
const signupItems = [{ hidden: true }, { hidden: true }];
const loginItems = [{ hidden: false }];
let focusOptions;
const els = {
  signupOnlyItems: signupItems,
  loginOnlyItems: loginItems,
  displayNameInput: {},
  passwordConfirmInput: { value: "previous-password" },
  passwordInput: { value: "previous-password" },
  authSubmitButton: {},
  authModeCopy: {},
  loginError: {},
  usernameInput: { focus(options) { focusOptions = options; } },
};
const context = {
  document: { body: { classList: {
    toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
    remove(...names) { names.forEach(name => classes.delete(name)); },
  } } },
  els,
  requestAnimationFrame(callback) { callback(); },
  showPasswordCheckMessage() {},
};
vm.createContext(context);
vm.runInContext(
  'let authMode = "login"; let checkedUsername = "previous-user";\n' +
  source.slice(source.indexOf("function setAuthMode("), source.indexOf("function showAuthError(")) +
  "\nthis.setAuthMode = setAuthMode; this.showLogin = showLogin;",
  context,
);

context.setAuthMode("signup");
assert.equal(classes.has("is-signup"), true);
assert.ok(signupItems.every(item => !item.hidden));
assert.ok(loginItems.every(item => item.hidden));
assert.equal(els.displayNameInput.required, true);
assert.equal(els.passwordConfirmInput.required, true);
assert.equal(els.authSubmitButton.textContent, "회원가입");
assert.equal(els.authModeCopy.textContent, "회원가입");
assert.equal(vm.runInContext("checkedUsername", context), "");

context.showLogin("로그인 오류 안내");
assert.equal(classes.size, 0, "Game layout classes must not clip the authentication page");
assert.ok(signupItems.every(item => item.hidden));
assert.ok(loginItems.every(item => !item.hidden));
assert.equal(els.displayNameInput.required, false);
assert.equal(els.passwordConfirmInput.required, false);
assert.equal(els.passwordInput.value, "");
assert.equal(els.passwordConfirmInput.value, "");
assert.equal(els.loginError.textContent, "로그인 오류 안내");
assert.equal(els.authModeCopy.textContent, "로그인");
assert.equal(focusOptions.preventScroll, true);
console.log("PASS: login/signup mode, validation fields, logout layout reset, and initial focus scroll prevention");
