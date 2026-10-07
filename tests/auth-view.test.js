const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("js/app.js", "utf8");
const classes = new Set(["is-authenticated", "is-visual-novel", "is-game-home", "is-teacher-view"]);
const signupItems = [{ hidden: true }, { hidden: true }];
const loginItems = [{ hidden: false }];
let focusOptions;
const els = {
  authIntro: { hidden: false },
  loginForm: { hidden: true, scrollTop: 120 },
  userLabel: {},
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
  document: { getElementById() { return {}; }, body: { classList: {
    add(...names) { names.forEach(name => classes.add(name)); },
    contains(name) { return classes.has(name); },
    toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
    remove(...names) { names.forEach(name => classes.delete(name)); },
  } } },
  els,
  state: { profile: {} },
  requestAnimationFrame(callback) { callback(); },
  showPasswordCheckMessage() {},
};
vm.createContext(context);
vm.runInContext(
  'let authMode = "login"; let checkedUsername = "previous-user"; let currentUser = null;\n' +
  source.slice(source.indexOf("function showApp("), source.indexOf("function showAuthError(")) +
  "\nObject.assign(this, {setAuthMode, showLogin, finishAuthIntro, showApp});",
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
assert.equal(els.loginForm.scrollTop, 0);

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
assert.equal(focusOptions, undefined, "Do not focus the hidden login form during the splash");

assert.doesNotMatch(source, /authIntroTimer|startAuthIntro/, "The startup screen must have no auto-advance timer");
context.finishAuthIntro();
assert.equal(els.authIntro.hidden, true);
assert.equal(els.loginForm.hidden, false);
assert.equal(focusOptions.preventScroll, true);

context.setAuthMode("signup");
context.showLogin();
assert.equal(els.authIntro.hidden, true, "Mode switches and logout must not replay the splash");

els.authIntro.hidden = false;
els.loginForm.hidden = true;
focusOptions = undefined;
context.showApp();
assert.equal(focusOptions, undefined, "Returning to the game must not focus a hidden login field");
assert.equal(classes.has("is-authenticated"), true);
context.showLogin();
assert.equal(els.authIntro.hidden, true);
assert.equal(focusOptions.preventScroll, true);
const html = fs.readFileSync("index.html", "utf8");
assert.match(html, /class="auth-intro-logo"[^>]+src="assets\/twaive-logo.webp"/);
assert.doesNotMatch(html, /auth-intro-title|auth-intro-brand/);
console.log("PASS: click-only logo splash, auth modes, session bypass, logout, and focus scroll prevention");
