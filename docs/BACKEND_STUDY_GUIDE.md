# twAIve 백엔드 담당자 공부 교재

> 대상: 백엔드를 처음 배우는 전공 1학년 수준
>
> 목표: 코드를 외우는 것이 아니라 로그인, 저장, 권한, 교수자 통계, AI 서버 요청이 왜 이렇게 연결되는지 자기 말로 설명한다.

---

# 1. 네가 맡은 백엔드를 한 문장으로 말하기

> 저는 Supabase Auth와 PostgreSQL을 이용해 회원 인증과 학습 기록 저장 구조를 설계하고, RLS로 개인별 접근 권한을 제한했습니다. 교수자 통계는 SQL RPC에서 익명 집계하며, OpenAI 비밀 키가 필요한 요청은 로그인 토큰을 검증하는 Vercel Serverless Function을 거치도록 구현했습니다.

더 쉽게 말하면 네 책임은 다음 여섯 가지다.

1. **누구인지 확인한다**: 회원가입, 로그인, 세션, 로그아웃
2. **무엇을 저장할지 정한다**: 프로필과 에피소드 기록 DB 설계
3. **저장하고 다시 불러온다**: 진행 기록 upsert와 복구
4. **누가 무엇을 볼지 제한한다**: RLS와 교수자 권한
5. **서버에서만 해야 할 일을 처리한다**: Vercel Serverless API
6. **배포 환경을 관리한다**: Vercel 환경변수, Supabase 설정

---

# 2. 우리 백엔드 구조는 무엇인가

## 2.1 결론부터 말하면

twAIve는 Spring, Django, Express처럼 항상 실행되는 자체 서버를 두지 않았다.

대신 다음 관리형 서비스를 조합한 **BaaS + Serverless 아키텍처**다.

```text
사용자 브라우저
  ├─ Supabase Auth: 회원가입·로그인·세션
  ├─ Supabase Data API: 프로필·학습 기록 조회와 저장
  ├─ Supabase RPC: 아이디 중복 확인·교수자 통계
  └─ Vercel Serverless API: 비밀 키가 필요한 AI 요청

Supabase
  ├─ Auth 사용자 저장
  ├─ PostgreSQL 데이터베이스
  ├─ RLS 접근 제어
  └─ SQL 함수 실행

Vercel
  ├─ 정적 웹 배포
  ├─ Node.js 서버 함수 실행
  └─ OpenAI·YouTube 비밀 키 보관
```

## 2.2 “Supabase를 썼으면 백엔드를 개발한 게 아닌가요?”에 대한 답

Supabase가 인증 서버와 PostgreSQL 실행 환경을 제공하지만, 다음은 프로젝트에서 직접 설계한 부분이다.

- 사용자와 학습 기록의 데이터 구조
- 표 사이의 관계와 삭제 규칙
- 아이디 중복 확인 함수
- 사용자별 RLS 정책
- 에피소드 저장·복구 로직
- 교수자 권한 표
- 개인정보를 제외한 집계 RPC
- 브라우저와 DB 사이의 요청 흐름
- Vercel 서버 함수의 인증·검증·오류 처리
- 비밀 키와 공개 키의 분리

정확한 표현:

> 인증 서버와 데이터베이스 인프라는 Supabase의 관리형 서비스를 사용했고, 그 위의 스키마, 접근 정책, RPC, 저장 흐름, 서버리스 API는 프로젝트 요구에 맞게 직접 설계했습니다.

---

# 3. 꼭 봐야 하는 파일과 공부 순서

## 1순위: `supabase/schema.sql`

백엔드의 중심이다.

여기서 공부할 것:

- `profiles` 표
- `user_episode_progress` 표
- `teacher_accounts` 표
- 외래키와 unique 제약
- RLS 정책
- `is_username_available()` RPC
- `get_teacher_dashboard()` RPC
- 권한 부여와 회수

## 2순위: `js/app.js`의 인증 부분

중요 함수:

- `loadSession()` 1224줄 부근
- `login()` 1266줄 부근
- `loadProfile()` 1299줄 부근
- `loadTeacherDashboard()` 1342줄 부근
- `checkUsernameAvailability()` 1388줄 부근
- `signup()` 1450줄 부근
- `saveProfile()` 1517줄 부근
- `updateProfileSettings()` 1536줄 부근
- `logout()` 1591줄 부근

## 3순위: `js/app.js`의 학습 기록 부분

- `loadEpisodeProgress()` 2391줄 부근
- `loadAllProgress()` 2436줄 부근
- `saveEpisodeProgress()` 2466줄 부근

## 4순위: `api/explain-result.js`

백엔드 서버 함수다.

- `verifySupabaseUser()` 126줄 부근
- `requestOpenAiExplanation()` 345줄 부근
- `requestOpenAiReasonOptions()` 366줄 부근
- `searchYouTubeVideos()` 443줄 부근
- `handler()` 490줄 부근

## 5순위: 설정 파일

- `js/config/supabase-config.js`: 브라우저가 사용하는 공개 Supabase 설정
- `.env.example`: 서버 환경변수 이름 예시
- `supabase/teacher-dashboard.sql`: 교수자 계정 등록
- `index.html`: Supabase SDK와 스크립트 로드 순서

---

# 4. 데이터베이스를 아주 쉽게 이해하기

## 4.1 데이터베이스 표란 무엇인가

엑셀 시트처럼 행과 열이 있는 저장 공간이다.

- 열: 어떤 종류의 값을 저장하는지
- 행: 사용자나 학습 기록 한 건
- 기본키: 행을 구분하는 고유 번호
- 외래키: 다른 표의 행과 연결하는 값

twAIve는 PostgreSQL을 사용한다. Supabase 안에서 PostgreSQL이 실행된다.

## 4.2 `auth.users`

Supabase Auth가 관리하는 시스템 표다.

저장되는 것:

- 사용자 UUID
- 내부 인증 이메일
- 안전하게 처리된 비밀번호 인증 정보
- 사용자 메타데이터

앱에서 비밀번호 원문을 직접 저장하거나 조회하지 않는다.

교수님 질문:

**Q. 비밀번호는 어느 표에 저장했나요?**

> 프로젝트의 `profiles` 표에는 비밀번호를 저장하지 않습니다. 비밀번호 인증 정보는 Supabase Auth가 관리하는 `auth.users` 영역에서 안전하게 처리합니다. 앱 코드는 비밀번호 원문을 DB에서 읽을 수 없습니다.

## 4.3 `profiles` 표

`supabase/schema.sql` 5줄 부근에서 만든다.

| 열 | 형식 | 뜻 |
|---|---|---|
| `id` | UUID | Auth 사용자 ID와 같은 기본키 |
| `username` | text | 화면에서 쓰는 로그인 아이디 |
| `auth_email` | text | Supabase 인증에 사용하는 내부 문자열 |
| `display_name` | text | 화면에 표시할 이름 |
| `analytics_consent` | boolean | 익명 연구 분석 활용 동의 |
| `created_at` | timestamptz | 가입 시각 |

### 핵심 관계

```sql
id uuid primary key references auth.users(id) on delete cascade
```

뜻:

- `profiles.id`는 `auth.users.id`에 실제로 존재해야 한다.
- Auth 사용자가 삭제되면 연결된 프로필도 자동 삭제된다.
- `on delete cascade`가 이 자동 삭제 규칙이다.

### 아이디 중복 방지

```sql
username text not null unique
```

- `not null`: 값이 반드시 있어야 한다.
- `unique`: 같은 아이디가 두 번 들어갈 수 없다.

프론트의 중복확인은 사용자 편의를 위한 사전 검사다. 동시에 DB의 `unique` 제약이 최종 방어선이다. 두 사용자가 거의 동시에 같은 아이디로 가입해도 DB가 중복을 막는다.

## 4.4 `user_episode_progress` 표

사용자 한 명의 에피소드별 최신 진행 상황을 저장한다.

| 열 | 뜻 |
|---|---|
| `id` | 기록 자체의 UUID |
| `user_id` | 어떤 사용자의 기록인지 |
| `episode_id` | 어떤 에피소드인지 |
| `scene_id` | 현재 또는 마지막 장면 |
| `score` | 에피소드 종합 점수 |
| `scores` | 원칙별 점수 JSON |
| `history` | 선택, 이유, 루브릭, 응답 시간 JSON 배열 |
| `feedback` | 마지막 피드백 |
| `story_mode` | pre/story/reason/post/report 단계 |
| `assessment` | 사전·사후 응답과 시도 횟수 JSON |
| `completed` | 완료 여부 |
| `ending` | Good/Normal/Bad End |
| `created_at` | 처음 생성한 시각 |
| `updated_at` | 마지막 저장 시각 |

### 사용자와 연결

```sql
user_id uuid not null references auth.users(id) on delete cascade
```

사용자 계정이 삭제되면 그 사용자의 학습 기록도 자동으로 삭제된다.

### 사용자당 에피소드 하나의 최신 행

```sql
unique (user_id, episode_id)
```

같은 사용자가 같은 에피소드에 두 개의 진행 행을 만들 수 없게 한다. 그래서 `upsert`로 계속 최신 상태를 갱신할 수 있다.

## 4.5 왜 `JSONB`를 사용했는가

`scores`, `history`, `assessment`는 구조가 복잡하고 항목이 늘어날 수 있어 JSONB로 저장한다.

예시 `history` 한 항목:

```json
{
  "sceneId": "d2",
  "choiceIndex": 0,
  "scene": "합성 앱을 켠 친구들",
  "choice": "당사자에게 먼저 동의를 구한다",
  "reasonCode": "rights",
  "reasonLabel": "친구 얼굴을 허락 없이 쓰면 안 될 것 같아서",
  "responseTimeMs": 5300,
  "rubric": {
    "version": 3,
    "ratings": {
      "privacy": 4,
      "responsibility": 3
    }
  }
}
```

장점:

- 선택마다 여러 원칙 점수와 이유를 한 묶음으로 저장 가능
- 필드가 추가되어도 표의 열을 매번 만들 필요가 적음
- PostgreSQL의 JSON 함수로 집계 가능

단점:

- 잘못된 형태가 들어가도 일반 열보다 DB 제약을 세밀하게 걸기 어려움
- 복잡한 통계 쿼리가 어려워질 수 있음
- 앱과 테스트에서 JSON 구조를 일관되게 관리해야 함

교수님께는 장점만 말하지 말고 이 단점도 알고 있다고 답하는 것이 좋다.

## 4.6 `teacher_accounts` 표

교수자 화면을 볼 수 있는 사용자 ID만 저장한다.

```sql
create table if not exists public.teacher_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
```

학생이 회원가입 화면에서 교수자를 선택하도록 하지 않는다. 관리자가 신뢰할 계정을 SQL로 등록한다.

이유:

- 아무 사용자가 교수자라고 체크하는 것을 막음
- 학생 전체 통계 접근 권한을 관리자가 통제

---

# 5. 회원가입 흐름

## 5.1 브라우저에서 Supabase 클라이언트 만들기

`index.html`에서 Supabase JavaScript SDK를 CDN으로 불러온다.

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

`js/app.js`에서는 다음 설정으로 클라이언트를 만든다.

```js
window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
```

이 객체를 이용해 인증, 표 조회, RPC 호출을 한다.

## 5.2 왜 이메일 입력 없이 내부 이메일을 만드는가

Supabase의 이메일·비밀번호 인증 방식을 아이디 로그인처럼 사용하기 위해서다.

```js
function usernameToAuthEmail(username) {
  return `${normalizeUsername(username)}@twaive-user.example.com`;
}
```

예:

```text
사용자 입력: rina_01
Supabase 인증 문자열: rina_01@twaive-user.example.com
```

이것은 실제 이메일이 아니다. 현재 시스템은 이메일 인증과 이메일 비밀번호 복구를 지원하지 않는다.

## 5.3 아이디 형식 검사

```js
/^[a-z0-9_]{3,20}$/
```

허용:

- 영문 소문자
- 숫자
- 밑줄
- 3~20자

형식을 제한하면 내부 인증 문자열을 예측 가능하고 안전하게 만들 수 있다.

## 5.4 중복확인 RPC

브라우저는 다음처럼 호출한다.

```js
supabaseClient.rpc("is_username_available", {
  requested_username: username
})
```

SQL 함수는 다음 개념으로 작동한다.

```text
profiles에 같은 username이 존재하지 않으면 true
존재하면 false
```

함수가 `security definer`인 이유:

- 회원가입 전 사용자는 아직 로그인하지 않았다.
- 일반 사용자가 `profiles` 전체를 직접 검색하도록 허용하면 아이디 목록이 노출될 수 있다.
- 함수는 DB 소유자 권한으로 존재 여부만 검사하고 boolean 하나만 반환한다.

`set search_path = public`은 `security definer` 함수가 예상한 스키마만 사용하도록 범위를 고정하는 보안 습관이다.

## 5.5 `signup()` 순서

`js/app.js` 1450줄 부근을 다음 순서로 읽는다.

1. Supabase 클라이언트 존재 확인
2. 아이디 소문자 정규화
3. 정규식 검사
4. 중복확인을 마쳤는지 검사
5. 이름 검사
6. 비밀번호 6자 이상 검사
7. 비밀번호 확인 일치 검사
8. `supabase.auth.signUp()` 호출
9. 사용자 메타데이터에 아이디와 이름 저장
10. 세션이 있으면 `saveProfile()` 호출
11. 세션이 없으면 로그인 화면으로 이동

### Auth와 profile을 따로 저장하는 이유

- Auth: 로그인과 비밀번호를 안전하게 처리
- profile: 앱에서 필요한 아이디, 이름, 동의 여부 저장

인증 정보와 서비스 정보를 역할별로 분리한 것이다.

## 5.6 `saveProfile()`

```js
supabaseClient.from("profiles").upsert({
  id: user.id,
  username,
  auth_email: user.email,
  display_name: displayName
})
```

`id`가 이미 있으면 갱신하고 없으면 새로 만든다.

이 요청은 로그인 사용자만 가능하고 RLS의 `auth.uid() = id` 검사를 통과해야 한다.

---

# 6. 로그인과 세션

## 6.1 `login()`

```js
supabaseClient.auth.signInWithPassword({
  email: usernameToAuthEmail(username),
  password
})
```

성공하면:

1. `currentUser` 설정
2. 프로필 불러오기
3. 전체 학습 기록 불러오기
4. 교수자 권한 확인
5. 현재 에피소드 기록 불러오기
6. 홈 화면 렌더링

## 6.2 세션과 토큰

세션은 로그인 상태를 유지하는 정보다. 세션 안에는 access token이 있다.

access token은 서버에 다음을 증명한다.

```text
이 요청은 Supabase가 인증한 특정 사용자에게서 왔다.
```

Vercel API 요청에서는 다음 헤더로 보낸다.

```http
Authorization: Bearer <access_token>
```

## 6.3 `loadSession()`

사이트를 새로 열거나 새로고침했을 때 `getSession()`으로 기존 로그인 상태를 확인한다.

- 세션 있음: 앱 데이터 로드
- 세션 없음: 로그인 화면
- 네트워크 오류: Supabase 연결 오류 표시

새로고침해도 로그인이 유지되는 이유가 세션이다.

## 6.4 `logout()`

```js
await supabaseClient.auth.signOut();
```

그다음 브라우저 안의 사용자 상태, 프로필, 학습 기록, 교수자 상태를 초기화한다. 서버 로그아웃만 하고 화면 상태를 남겨두면 다른 사람이 이전 사용자의 정보를 볼 수 있으므로 둘 다 정리한다.

---

# 7. RLS를 정확하게 설명하기

## 7.1 RLS란

Row Level Security, 즉 행 단위 보안이다.

같은 `user_episode_progress` 표에 여러 학생의 행이 있어도 현재 로그인 사용자가 자기 행만 읽고 수정하게 한다.

## 7.2 GRANT와 POLICY의 차이

둘 다 필요하다.

```text
GRANT: 이 역할이 이 표에서 SELECT라는 행동 자체를 할 수 있는가?
POLICY: SELECT할 때 구체적으로 어느 행을 볼 수 있는가?
```

예를 들어 `authenticated` 역할에 SELECT 권한이 있어도 RLS 정책이 자기 ID 행만 허용하면 다른 학생 행은 볼 수 없다.

## 7.3 프로필 정책

조회:

```sql
using (auth.uid() = id)
```

추가:

```sql
with check (auth.uid() = id)
```

수정:

```sql
using (auth.uid() = id)
with check (auth.uid() = id)
```

`using`은 기존 행에 접근할 수 있는지 검사한다. `with check`는 새로 넣거나 수정한 행이 허용 조건을 만족하는지 검사한다.

## 7.4 학습 기록 정책

모든 조건이 다음 원칙이다.

```sql
auth.uid() = user_id
```

프론트 코드를 변조해 다른 사람 UUID를 넣더라도 DB가 요청자의 토큰 ID와 비교해서 막는다.

## 7.5 anon key가 공개되어도 되는 이유

Supabase anon key는 브라우저 사용을 전제로 한 공개 키다. 이것만 있으면 현재 사용자는 `anon` 역할이고, 로그인하면 토큰에 의해 `authenticated` 역할과 사용자 ID가 적용된다.

보안은 anon key를 숨기는 데 의존하지 않는다.

- RLS 활성화
- 최소 GRANT
- 사용자 토큰
- RPC 권한 제한

반대로 다음 키는 절대 브라우저에 넣으면 안 된다.

- Supabase service role key
- OpenAI API key
- YouTube API key

현재 앱은 service role key를 사용하지 않는다.

---

# 8. 학습 기록 저장과 복구

## 8.1 `saveEpisodeProgress()`

현재 앱 상태를 DB에 저장한다.

```js
supabaseClient.from("user_episode_progress").upsert(
  {
    user_id: currentUser.id,
    episode_id: activeEpisode().id,
    scene_id: state.sceneId,
    score: scoreAverage(),
    scores: state.scores,
    history: state.history,
    feedback: state.feedback,
    story_mode: state.storyMode,
    assessment: state.assessments[activeEpisode().id] || {},
    completed: Boolean(scene.end),
    ending: scene.end ? endingName() : null,
    updated_at: new Date().toISOString()
  },
  { onConflict: "user_id,episode_id" }
)
```

`onConflict`는 `(user_id, episode_id)`가 이미 존재할 때 새 행을 만들지 말고 갱신하라는 뜻이다.

## 8.2 언제 저장하는가

학생이 행동과 판단 이유를 확정한 뒤 저장한다. 판단 이유까지 한 묶음으로 기록하기 위해서다.

에피소드 재시작 때도 초기 상태를 저장할 수 있다.

## 8.3 `loadEpisodeProgress()`

특정 에피소드의 저장 기록을 하나 읽는다.

```text
user_id = 현재 사용자
episode_id = 선택한 에피소드
```

`.maybeSingle()`은 결과가 없으면 오류로 터뜨리지 않고 `null`, 있으면 한 행을 반환한다.

## 8.4 점수 버전 검사

```js
if (data.scores?._version !== SCORING_VERSION) {
  // 이전 점수 기록을 현재 모델과 섞지 않음
}
```

점수 계산 방식이 변경되었는데 예전 점수와 새 점수를 그대로 비교하면 잘못된 분석이 된다. 그래서 버전이 다르면 새 기준으로 다시 진단한다.

## 8.5 `loadAllProgress()`

홈, 마이페이지, 전체 분석을 위해 현재 사용자의 모든 에피소드 기록을 읽는다.

여기서도 현재 점수 버전과 같은 기록만 사용한다.

## 8.6 저장 실패 처리

네트워크 오류나 DB 오류가 나면 `state.feedback`에 오류를 넣어 화면에 보여준다.

현재 구조의 한계:

- 오프라인 저장 큐는 없음
- 저장 재시도 횟수를 별도로 관리하지 않음
- 사용자가 네트워크가 끊긴 상태에서 창을 닫으면 마지막 선택이 저장되지 않을 수 있음

이 한계를 물으면 숨기지 말고, 개선안으로 로컬 큐와 재시도 정책을 말하면 된다.

---

# 9. 교수자 대시보드 백엔드

## 9.1 권한 등록

`supabase/teacher-dashboard.sql`에서 관리자가 아이디를 지정해 `teacher_accounts`에 넣는다.

```sql
insert into public.teacher_accounts (user_id)
select id
from public.profiles
where username = '교수자아이디'
on conflict (user_id) do nothing;
```

`on conflict do nothing`은 이미 등록된 계정을 다시 실행해도 오류가 나지 않게 한다.

## 9.2 브라우저 호출

`loadTeacherDashboard()`가 다음 RPC를 호출한다.

```js
supabaseClient.rpc("get_teacher_dashboard")
```

## 9.3 서버의 첫 번째 권한 검사

```sql
if auth.uid() is null or not exists (
  select 1
  from public.teacher_accounts
  where user_id = auth.uid()
) then
  raise exception 'teacher access required' using errcode = '42501';
end if;
```

- 로그인하지 않았거나
- 현재 ID가 교수자 표에 없으면
- 즉시 함수 실행 중단

브라우저는 `42501`을 받으면 교수자 메뉴를 숨긴다.

## 9.4 왜 `security definer`인가

일반 교수자 계정이 학생들의 원본 행을 직접 SELECT하게 하지 않기 위해서다.

함수 내부에서만 필요한 행을 읽고 집계한 뒤 JSON 통계만 반환한다.

```text
나쁜 구조:
모든 학생 원본 → 교수자 브라우저 → 브라우저에서 평균 계산

현재 구조:
모든 학생 원본 → DB 안에서 집계 → 익명 통계만 교수자 브라우저
```

## 9.5 반환 통계

- 학습 참여자 수
- 완료 에피소드 수와 완료율
- 평균 사전·사후 변화
- 연구 활용 동의자와 동의 기록 수
- 분석 조건을 충족한 기록 수
- 원칙별 평균 점수
- 문항별 위험 선택 비율
- 에피소드별 완료율

## 9.6 동의의 현재 사용 범위

현재 SQL에서 `analytics_consent = true` 조건은 연구용 군집분석 준비도에 쓰는 동의 인원과 적격 기록 계산에 적용한다.

운영 목적의 교수자 집계인 완료율, 원칙 평균, 문항 위험률은 전체 학습 기록을 익명 집계한다.

교수님이 개인정보 연구 동의를 물으면 이렇게 답한다.

> 교수자 수업 운영 통계와 연구용 데이터 활용을 구분했습니다. 개인 식별 정보는 대시보드에 반환하지 않고, 연구용 군집분석 준비도에는 명시적으로 동의한 기록만 포함합니다. 다만 실제 연구를 진행하기 전에는 학교의 연구윤리 기준에 맞춰 동의 문구와 보유 기간을 추가 검토해야 합니다.

## 9.7 현재 개선할 점

- 학습자 집단 분석은 기록 수보다 고유 참여자 수 기준이 더 적절함
- 소수 집단에서 재식별 위험을 줄이기 위한 최소 집계 인원 기준 필요
- 관리자용 교수자 등록 UI는 없고 SQL로만 등록
- 통계 기간 필터와 반·그룹 구분이 없음

이것들은 “못 했다”가 아니라 다음 단계의 설계 과제로 말하면 된다.

---

# 10. Vercel Serverless API

## 10.1 왜 필요한가

Supabase 데이터 요청은 RLS가 보호하므로 브라우저에서 직접 가능하다. 하지만 OpenAI API 키는 브라우저에 공개하면 안 된다.

그래서 `/api/explain-result`가 비밀 키를 가진 서버 중간 계층 역할을 한다.

## 10.2 Serverless란

항상 켜둔 서버 프로그램을 직접 관리하지 않고 요청이 올 때 플랫폼이 함수를 실행하는 방식이다.

```text
브라우저 POST /api/explain-result
→ Vercel이 api/explain-result.js의 handler 실행
→ 응답 반환
```

물리적인 서버가 아예 없다는 뜻이 아니라, 서버 운영을 Vercel이 관리한다는 뜻이다.

## 10.3 요청 전체 흐름

```text
1. 브라우저가 Supabase 세션에서 access token 획득
2. Authorization: Bearer 토큰으로 Vercel API 호출
3. Vercel 함수가 Supabase /auth/v1/user로 토큰 검증
4. 요청 body 길이와 형식 검사
5. OpenAI API 호출
6. 응답 JSON 형식 검사
7. 필요하면 YouTube API 호출
8. 브라우저에 정리된 JSON 반환
```

## 10.4 `verifySupabaseUser()`

환경변수에서 다음을 읽는다.

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

요청 헤더가 `Bearer `로 시작하는지 확인하고, Supabase의 사용자 조회 endpoint에 토큰을 보낸다.

토큰이 유효하지 않으면 HTTP 401을 반환한다.

중요:

> 브라우저가 “나는 로그인했어”라고 말하는 것을 믿는 것이 아니라, 서버가 Supabase에 토큰을 다시 확인한다.

## 10.5 입력 검증

서버는 브라우저가 보낸 값을 그대로 OpenAI에 전달하지 않는다.

- 질문 최대 240자
- 선택 기록 최대 12개
- 원칙 최대 7개
- 점수 0~100으로 제한
- 문자열 앞뒤 공백과 연속 공백 정리
- 필수 에피소드와 원칙 정보 확인

브라우저 코드는 사용자가 수정할 수 있으므로 서버 검증이 반드시 필요하다.

## 10.6 `ApiError`

오류에 HTTP 상태, 코드, 사용자 메시지를 함께 넣는다.

예:

- 400 `INVALID_REQUEST`: 요청 형식 문제
- 401 `AUTH_REQUIRED`: 로그인 토큰 문제
- 405 `METHOD_NOT_ALLOWED`: POST가 아닌 요청
- 502 `OPENAI_ERROR`: 외부 AI 호출 실패
- 503 `SERVER_NOT_CONFIGURED`: 환경변수 누락

## 10.7 응답 형식 제한

OpenAI에 자유로운 글을 요청하지 않고 JSON Schema로 필요한 구조를 지정한다.

결과 설명:

- `summary`
- `answer`
- `scoreReasons`
- `nextActions`
- `videoSearchQuery`

판단 이유:

- 이유 정확히 3개
- 허용된 이유 코드만 사용
- 코드와 문장 외 추가 필드 금지

서버는 받은 뒤에도 다시 구조를 검사한다.

## 10.8 fallback

AI 결과 설명이 실패하면:

1. 출력 형식 문제나 토큰 부족이면 한 번 재시도
2. 그래도 실패하면 서버가 가장 높은 원칙과 낮은 원칙으로 로컬 설명 생성

판단 이유 생성이 실패하면 브라우저의 `fallbackDecisionReasons()`가 기본 3개를 보여준다.

핵심 점수와 학습 진행은 OpenAI 장애와 무관하게 계속 동작한다.

## 10.9 YouTube API

`YOUTUBE_API_KEY`가 있으면 한국어, 한국 지역, strict safe search, embeddable video 조건으로 최대 3개를 검색한다.

키가 없거나 오류가 나면 영상 목록 대신 YouTube 검색 링크를 반환한다.

## 10.10 캐시 정책

API 응답 헤더:

```js
res.setHeader("Cache-Control", "no-store")
```

개인화된 학습 결과가 중간 캐시에 저장되는 것을 막는다.

판단 이유는 같은 브라우저 세션 안에서는 프론트 메모리 캐시를 사용해 OpenAI 중복 호출을 줄인다.

---

# 11. 환경변수와 키 관리

## 11.1 브라우저 공개 설정

`js/config/supabase-config.js`:

- Supabase project URL
- Supabase anon key

이 파일은 사용자에게 다운로드되므로 비밀을 넣으면 안 된다.

## 11.2 서버 비밀 설정

Vercel 환경변수:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `YOUTUBE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

`SUPABASE_ANON_KEY` 자체는 공개 가능하지만 서버가 토큰 검증할 때도 필요하므로 환경변수로 둔다.

절대 넣지 말 것:

- 실제 OpenAI 키를 GitHub 파일에 작성
- service role key를 프론트 코드에 작성
- 키 값을 발표 화면에 노출

## 11.3 `.env.example`

키 값 없이 필요한 변수 이름만 문서화한다. 팀원이 어떤 설정이 필요한지 알 수 있고, 실제 비밀은 저장소에 올라가지 않는다.

---

# 12. 백엔드 오류를 읽는 방법

## `Failed to fetch`

가능한 원인:

- Supabase 프로젝트 일시정지
- 네트워크 문제
- Project URL 오류
- 브라우저 보안 정책이나 DNS 문제

## `Could not find the table ... in the schema cache`

가능한 원인:

- SQL 표를 아직 만들지 않음
- 잘못된 프로젝트 SQL Editor에서 실행
- PostgREST schema cache가 갱신되지 않음

대응:

- `supabase/schema.sql` 실행
- `notify pgrst, 'reload schema';` 실행

## `Could not find the 'assessment' column`

기존 표에 새 열을 추가하는 SQL이 적용되지 않은 상태다.

```sql
alter table public.user_episode_progress
add column if not exists assessment jsonb not null default '{}'::jsonb;
```

## `42501 teacher access required`

오류가 아니라 교수자 권한이 없다는 정상 보안 결과다. `teacher_accounts` 등록 여부를 확인한다.

## 401 로그인 필요

- access token 누락
- 세션 만료
- 잘못된 토큰

로그아웃 후 다시 로그인하고 Vercel API의 `verifySupabaseUser()`를 확인한다.

## OpenAI 502

- 외부 API 오류
- 출력 중단
- 응답 형식 불일치

결과 설명은 서버 fallback을 사용하고, 판단 이유는 브라우저 fallback을 사용한다.

---

# 13. 교수님이 물을 수 있는 백엔드 질문

## Q1. 백엔드를 무슨 언어로 만들었나요?

> 클라이언트와 Vercel 서버 함수는 JavaScript를 사용했습니다. 데이터베이스 스키마, RLS, 집계 함수는 PostgreSQL SQL과 PL/pgSQL로 작성했습니다. 인증과 DB 실행 환경은 Supabase, 서버 함수 실행 환경은 Vercel Node.js입니다.

## Q2. Node.js와 JavaScript는 무엇이 다른가요?

> JavaScript는 언어이고, Node.js는 JavaScript를 브라우저 밖의 서버 환경에서 실행하는 런타임입니다. `js/app.js`는 브라우저에서 실행되고, `api/explain-result.js`는 Vercel의 Node.js 환경에서 실행됩니다.

## Q3. REST API를 직접 만들었나요?

> Supabase 표 접근에는 자동 생성된 Data API와 RPC를 사용했습니다. 비밀 키가 필요한 AI 기능에는 `/api/explain-result`라는 POST 서버 API를 직접 작성했습니다. 요청 검증, 토큰 검증, 외부 API 호출, 오류와 fallback 처리를 이 함수에서 담당합니다.

## Q4. JWT가 무엇인가요?

> 로그인 성공 후 Supabase가 발급하는 서명된 토큰입니다. 사용자 ID와 인증 상태를 서버가 검증할 수 있게 합니다. 프로젝트에서는 access token을 Bearer 헤더로 Vercel 함수에 보내고, 함수가 Supabase에 유효성을 다시 확인합니다.

## Q5. 왜 DB에 비밀번호가 없나요?

> 앱 서비스 표에 비밀번호를 저장하는 것은 위험합니다. Supabase Auth가 비밀번호 인증을 담당하고 앱은 인증 성공 결과와 사용자 UUID만 사용합니다.

## Q6. SQL Injection은 어떻게 막나요?

> 프론트에서 문자열로 SQL을 조립하지 않고 Supabase SDK의 구조화된 메서드와 매개변수 RPC를 사용합니다. SQL 함수에서도 입력값을 직접 실행문으로 이어 붙이는 동적 SQL을 사용하지 않습니다.

## Q7. XSS와 백엔드는 무슨 관계가 있나요?

> XSS는 주로 프론트 출력 문제지만, 백엔드도 입력 길이와 형식을 검증해야 합니다. Vercel API는 문자열을 정리하고 제한하며, 프론트는 서버 응답을 HTML 문자열로 그대로 삽입하지 않고 안전한 텍스트 노드와 escape 함수를 사용합니다.

## Q8. 동시 가입으로 중복 아이디가 생기지 않나요?

> 사전 중복확인만으로는 경쟁 상태가 생길 수 있습니다. 그래서 DB의 `username unique` 제약을 최종 방어선으로 두었습니다.

## Q9. `security definer`는 위험하지 않나요?

> 강한 권한으로 실행되므로 조심해야 합니다. 현재 함수는 `set search_path = public`으로 스키마를 고정하고, 반환 범위를 boolean 또는 익명 집계 JSON으로 제한하며, 함수 실행 권한도 필요한 역할에만 부여합니다. 교수자 함수는 내부에서 `teacher_accounts`를 먼저 검사합니다.

## Q10. service role key를 사용했나요?

> 사용하지 않았습니다. 프론트 데이터 접근은 anon key, 사용자 JWT, RLS 조합으로 처리합니다. 서버 AI 함수의 사용자 확인도 Supabase URL과 anon key로 `/auth/v1/user`를 호출합니다.

## Q11. 서버가 없는데 백엔드라고 할 수 있나요?

> 물리 서버를 직접 운영하지 않는 서버리스 구조입니다. 인증, DB, 권한 정책, 서버 함수는 모두 서버 측에서 실행됩니다. 인프라 운영은 플랫폼에 위임했지만 애플리케이션의 데이터 모델과 보안·API 로직은 직접 구현했습니다.

## Q12. 개인정보 삭제 기능이 있나요?

> 현재 사용자가 직접 계정을 삭제하는 UI는 없습니다. DB 관계에는 Auth 사용자 삭제 시 프로필과 진행 기록이 함께 삭제되는 cascade 구조가 있습니다. 실제 서비스 전에는 사용자 요청에 따른 계정 삭제 UI와 보유 기간 정책을 추가해야 합니다.

## Q13. API 사용량 공격을 막을 수 있나요?

> 현재는 로그인 토큰 검증과 요청 길이 제한이 있지만 사용자별 rate limiting은 아직 없습니다. 실제 공개 운영 단계에서는 사용자 ID와 시간 창을 기준으로 호출 횟수를 제한하고, Vercel·OpenAI 사용량 경보를 함께 설정해야 합니다.

## Q14. DB 백업은 어떻게 하나요?

> 관리형 PostgreSQL의 백업 정책은 Supabase 프로젝트 요금제와 설정에 의존합니다. 프로젝트 코드에는 별도 백업 자동화가 없습니다. 실제 운영 단계에서는 정기 백업, 복구 테스트, 보유 기간을 문서화해야 합니다.

---

# 14. 네가 직접 코드로 시연할 순서

교수님이 “백엔드 코드를 보여주세요”라고 하면 파일을 헤매지 말고 다음 순서로 연다.

## 1단계: DB 구조, 약 40초

`supabase/schema.sql`

1. `profiles`
2. `user_episode_progress`
3. `unique(user_id, episode_id)`
4. JSONB 열

설명:

> 인증 정보와 서비스 프로필을 분리했고, 사용자와 에피소드 조합을 고유하게 만들어 upsert로 진행 상황을 저장합니다. 선택 이력처럼 구조가 확장되는 데이터는 JSONB로 저장합니다.

## 2단계: 보안, 약 40초

같은 파일의 RLS 부분을 연다.

설명:

> 로그인 역할에 표 사용 권한을 주되, RLS가 `auth.uid() = user_id`인지 확인해 자기 행만 허용합니다. 프론트 요청이 변조돼도 DB 계층에서 막습니다.

## 3단계: 저장, 약 40초

`js/app.js`의 `saveEpisodeProgress()`를 연다.

설명:

> 행동 선택, 판단 이유, 응답 시간, 루브릭, 사전·사후 응답을 현재 사용자와 에피소드 키로 upsert합니다. 저장된 장면과 모드로 새로고침 뒤에도 진행을 복구합니다.

## 4단계: 교수자 통계, 약 40초

`get_teacher_dashboard()` 권한 검사와 집계 부분을 연다.

설명:

> 교수자 계정을 먼저 확인하고, 원본 데이터를 브라우저에 주지 않은 채 DB 안에서 평균과 비율을 계산해 JSON으로 반환합니다.

## 5단계: 서버 API, 약 40초

`api/explain-result.js`의 `verifySupabaseUser()`와 `handler()`를 연다.

설명:

> OpenAI 키는 서버 환경변수에 두고, 클라이언트의 Supabase 토큰을 서버가 검증한 뒤에만 요청을 처리합니다. 입력과 AI 출력도 다시 검증하고 장애 시 fallback을 사용합니다.

---

# 15. 네 파트 2분 발표 대본

> 저희 백엔드는 Supabase 기반 BaaS와 Vercel Serverless 구조로 설계했습니다. 먼저 회원가입과 로그인은 Supabase Auth가 담당하고, 화면에서 입력한 아이디는 내부 인증 문자열로 변환해 사용합니다. 비밀번호는 앱의 프로필 표에 저장하지 않고 Auth 시스템에서만 처리합니다.
>
> 데이터베이스에는 사용자 프로필과 에피소드 진행 기록을 분리했습니다. 진행 기록에는 현재 장면, 원칙별 점수, 선택 이력, 판단 이유, 응답 시간, 사전·사후 응답, 완료 여부를 저장합니다. 사용자와 에피소드 조합에 unique 제약을 두고 upsert하여 한 에피소드의 최신 상태를 유지하고, 새로고침 이후에도 저장된 장면부터 복구할 수 있습니다.
>
> 보안은 RLS로 처리했습니다. 로그인 사용자에게 표 접근 권한은 주지만 `auth.uid()`와 행의 사용자 ID가 같은 경우만 조회와 수정이 가능합니다. 교수자 대시보드는 별도 권한 표에 등록된 계정만 SQL RPC를 호출할 수 있고, 학생 원본 기록을 브라우저로 보내지 않고 DB 내부에서 집계한 비율과 평균만 반환합니다.
>
> OpenAI처럼 비밀 키가 필요한 기능은 브라우저에서 직접 호출하지 않습니다. Vercel 서버 함수가 Supabase access token을 검증하고, 입력값을 제한한 뒤 외부 API를 호출합니다. 응답 형식을 검사하고 실패하면 로컬 fallback을 사용해 핵심 학습 기능이 외부 AI 장애에 의존하지 않도록 했습니다.

---

# 16. 네가 반드시 직접 해볼 실습

읽기만 하면 교수님의 꼬리질문에서 막힌다. 다음은 직접 실행해봐야 한다.

## 실습 1: 회원가입 흐름 추적

종이에 다음 값을 적는다.

```text
입력 아이디
내부 auth_email
auth.users UUID
profiles.id
```

네 값들이 어떻게 연결되는지 설명한다.

## 실습 2: RLS 설명

다음 두 상황의 결과를 말한다.

1. 사용자 A가 자기 `user_id` 행을 조회
2. 사용자 A가 사용자 B의 `user_id` 행을 조회

왜 2번이 실패하는지 SQL 정책으로 짚는다.

## 실습 3: 저장 JSON 읽기

Supabase Table Editor에서 본인 학습 기록 한 건을 열고 다음을 찾는다.

- `scene_id`
- `story_mode`
- `history`의 마지막 선택
- `reasonCode`
- `responseTimeMs`
- `assessment.pre`
- `assessment.post`

개인정보가 포함된 화면은 발표 자료로 캡처하지 않는다.

## 실습 4: 교수자 권한 전후 비교

1. 일반 계정에서 RPC 호출 결과
2. `teacher_accounts` 등록 뒤 결과

권한이 어디서 바뀌었는지 설명한다.

## 실습 5: AI 키가 없어도 무엇이 되는지 확인

정답:

- 로그인과 DB 저장: 가능
- 점수 계산: 가능
- 결과 리포트: 가능
- OpenAI 자연어 설명: fallback 또는 설정 오류
- 판단 이유: 브라우저 fallback

## 실습 6: 네 담당 코드 작은 수정과 테스트

추천 작업:

- 저장 실패 재시도 UI 추가
- 교수자 집계 최소 인원 보호 추가
- 사용자 계정 삭제 흐름 설계
- 사용자별 API rate limiting 설계

최소 한 가지는 네가 직접 수정하고 변경 전후를 설명할 수 있어야 “최종 버전 백엔드 담당”이라는 말에 힘이 생긴다.

---

# 17. 마지막 암기 카드

## 기술

```text
JavaScript / Node.js
Supabase Auth
PostgreSQL
RLS
SQL RPC와 PL/pgSQL
Vercel Serverless Function
Bearer access token
JSON/JSONB
GitHub + Vercel 배포
```

## 저장

```text
Auth 사용자 → profiles
Auth 사용자 → user_episode_progress
사용자 + 에피소드 unique
선택 뒤 upsert
장면 + 모드로 복구
```

## 보안

```text
비밀번호는 Auth
개인 행은 RLS
교수자는 별도 허용 목록
집계는 DB 내부
OpenAI 키는 Vercel 환경변수
서버에서 로그인 토큰 재검증
```

## 한계

```text
이메일 복구 없음
사용자 계정 삭제 UI 없음
API rate limit 없음
오프라인 저장 큐 없음
연구 전 동의·보유 기간 추가 검토 필요
```

## 마지막 한 문장

> 제 백엔드 파트의 핵심은 데이터를 단순히 저장한 것이 아니라, 사용자 인증 정보와 학습 데이터를 분리하고, RLS와 권한형 RPC로 접근 범위를 제한하며, 비밀 키가 필요한 AI 요청을 인증된 서버리스 API로 분리한 것입니다.
