const assert = require("node:assert/strict");
const fs = require("node:fs");

const terms = fs.readFileSync("terms.html", "utf8");
const privacy = fs.readFileSync("privacy.html", "utf8");
const app = fs.readFileSync("js/app.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("css/legal.css", "utf8");

for (const html of [terms, privacy]) {
  assert.ok(html.includes('lang="ko"'));
  assert.ok(html.includes('name="viewport"'));
  assert.ok(html.includes("twAlve 프로젝트 팀"));
  assert.ok(html.includes("mailto:yeeun7117@sookmyung.ac.kr"));
  assert.ok(html.includes("2026년 10월 8일"));
  assert.ok(html.includes("css/legal.css?v=20261008-2"));
  assert.doesNotMatch(html, /\[(?:입력|확인) 필요[^\]]*\]/);
}

assert.ok(terms.includes("AI로 생성한 자료"));
assert.ok(terms.includes("독점적 권리 확보를 보증하지"));
assert.ok(terms.includes("외부 폰트"));
assert.ok(terms.includes("공식 평가가 아닙니다"));
assert.ok(terms.includes("페이지 갱신만으로"));

for (const section of ["data", "research", "providers", "retention", "rights"]) {
  assert.ok(privacy.includes(`id="${section}"`));
  assert.ok(privacy.includes(`href="#${section}"`));
}
for (const provider of ["Supabase", "Vercel", "GitHub Pages", "OpenAI API", "YouTube", "jsDelivr"]) {
  assert.ok(privacy.includes(provider));
}
assert.ok(privacy.includes("일본 도쿄(ap-northeast-1)"));
assert.ok(privacy.includes("최대 보유 기간은 1년"));
assert.ok(privacy.includes("자동 파기가 이미 운영되고"));
assert.ok(privacy.includes("Zero Data Retention 적용은 확인되지"));
assert.ok(privacy.includes("완전히 익명인 정보가 아닙니다"));
assert.ok(privacy.includes("연구 동의 여부와 별개"));
assert.ok(privacy.includes("동의는 기본 미동의"));
assert.ok(privacy.includes("거부·철회해도 학습 이용에는 불이익이 없습니다"));
assert.ok(privacy.includes("스토리 선택 뒤 이유 추천은"));
assert.ok(privacy.includes("localStorage"));
assert.ok(privacy.includes("비밀번호는 보내지 마세요"));

assert.ok(app.includes('href="privacy.html#research"'));
assert.ok(app.includes('href="privacy.html#rights"'));
assert.ok(app.includes("선택 기록을 식별정보와 분리해"));
assert.doesNotMatch(app, /익명화된 선택 기록을 졸업 연구/);
assert.ok(index.includes("js/app.js?v=20261008-8"));
assert.doesNotMatch(css, /font-size:[^;]*vw|#405b7c|#6c7e94/i);
assert.ok(css.includes("overflow-wrap: anywhere"));
assert.ok(css.includes("minmax(0, 1fr)"));
console.log("PASS: policy disclosures, AI asset limits, optional research and withdrawal, verified DB region, retention caveats, contact links and mobile rules");
