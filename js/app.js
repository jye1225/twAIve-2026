const SCORING_VERSION = 3;
const TeachingStrategy = window.TWAIVE_TEACHING_STRATEGY;

const ETHICS_SOURCES = {
  primary: {
    code: "KAI",
    title: "대한민국 인공지능 윤리원칙",
    publisher: "대한민국 정부 관계부처 합동",
    publishedAt: "2026.08.21",
  },
  law: {
    code: "AI법",
    title: "인공지능 발전과 신뢰 기반 조성 등에 관한 기본법",
    publisher: "대한민국",
    effectiveAt: "2026.07.21",
    lawNumber: "법률 제21311호",
  },
  education: {
    code: "대학",
    title: "대학 AI 활용 윤리 가이드라인",
    publisher: "한국대학교육협의회",
    publishedAt: "2026.08.21",
  },
  practice: {
    code: "KISDI",
    title: "인공지능 윤리 소통채널 - 윤리기준 자율점검표",
    publisher: "정보통신정책연구원",
    url: "https://ai.kisdi.re.kr/aieth/main/contents.do?menuNo=400008",
  },
};

const NATIONAL_VALUES = ["인간의 존엄성", "사회의 공공선", "인류의 지속가능성"];

const GUIDELINE_PRINCIPLES = {
  humanCenteredness: {
    code: "KAI-1",
    shortName: "인간중심",
    name: "인간중심성",
    description: "AI가 사람의 판단과 선택을 지원하도록 활용하고 과도한 의존을 경계한다.",
  },
  privacy: {
    code: "KAI-2",
    shortName: "프라이버시",
    name: "프라이버시 보호",
    description: "사생활 침해를 막고 개인정보를 필요한 범위에서 처리하며 자기결정권을 존중한다.",
  },
  fairness: {
    code: "KAI-3",
    shortName: "공정·포용",
    name: "공정성·포용성",
    description: "편향과 부당한 차별을 방지하고 접근·혜택·참여 기회를 공평하게 보장한다.",
  },
  responsibility: {
    code: "KAI-4",
    shortName: "책임성",
    name: "책임성",
    description: "자신의 역할과 책임을 인식하고 문제가 생기면 책임 확인과 피해 구제에 참여한다.",
  },
  safety: {
    code: "KAI-5",
    shortName: "안전성",
    name: "안전성",
    description: "신체·정신·재산 피해와 오남용, 허위정보 확산 등 사회적 위험을 살피고 예방한다.",
  },
  reliability: {
    code: "KAI-6",
    shortName: "신뢰성",
    name: "신뢰성",
    description: "AI의 목적·성능·한계를 이해하고 결과와 작동 상태를 확인하며 사용한다.",
  },
  transparency: {
    code: "KAI-7",
    shortName: "투명성",
    name: "투명성",
    description: "AI 활용 사실과 수준·한계, 판단 기준과 위험을 이해하기 쉽게 알리고 확인한다.",
  },
};

const RUBRIC_LEVELS = {
  0: { label: "위반", description: "가이드라인을 직접 위반하거나 피해를 확대함" },
  1: { label: "위험", description: "핵심 위험을 무시하거나 책임을 회피함" },
  2: { label: "부분 충족", description: "문제를 인식했지만 확인 또는 실천이 부족함" },
  3: { label: "준수", description: "관련 기준을 확인하고 책임 있게 행동함" },
  4: { label: "적극 실천", description: "피해 예방, 검증, 공개 또는 재발 방지까지 수행함" },
};

const DECISION_REASONS = [
  {
    code: "rights",
    label: "당사자의 동의·권리와 피해 가능성을 먼저 생각했다",
  },
  {
    code: "verification",
    label: "출처·사실·AI 결과의 한계를 확인해야 한다고 생각했다",
  },
  {
    code: "action",
    label: "신고·도움·피해 회복 같은 후속 행동이 중요하다고 생각했다",
  },
  {
    code: "convenience",
    label: "가장 빠르고 편리하거나 재미있는 방법이라고 생각했다",
  },
  {
    code: "social",
    label: "친구들의 분위기와 관계가 더 신경 쓰였다",
  },
  {
    code: "uncertain",
    label: "어떤 기준이 중요한지 확신이 없었다",
  },
];

const DECISION_REASON_CODES = new Set(DECISION_REASONS.map((reason) => reason.code));
const decisionReasonCache = new Map();
const APP_ROOT_URL =
  typeof URL === "function" && typeof document !== "undefined"
    ? new URL("../", document.currentScript?.src || new URL("js/app.js", document.baseURI))
    : null;
const episodeArtworkUrl = (filename) =>
  APP_ROOT_URL ? new URL(`assets/episodes/${filename}`, APP_ROOT_URL).href : `assets/episodes/${filename}`;
const EPISODE_VISUALS = Object.freeze({
  deepfake: episodeArtworkUrl("episode-deepfake.webp"),
  rumor: episodeArtworkUrl("episode-rumor.webp"),
  chatbot: episodeArtworkUrl("episode-chatbot.webp"),
  assignment: episodeArtworkUrl("episode-assignment.webp"),
  privacy: episodeArtworkUrl("episode-privacy.webp"),
});
const EPISODE_INTRO_DURATION = 1900;
let episodeIntroTimer = null;
let episodeSaveQueue = Promise.resolve();

const episodes = [
  {
    id: "deepfake",
    title: "삭제되지 않은 얼굴",
    topic: "딥페이크 · 초상권",
    summary: "학교 축제 홍보 SNS에서 시작된 AI 얼굴 합성 사건.",
    practiceReference: "KISDI 분야별 자율점검 사례: AI 영상 합성 서비스",
    meters: ["privacy", "responsibility", "safety", "transparency"],
    assessment: {
      concept: "프라이버시 보호·책임성·투명성",
      preQuestion: "축제 홍보 계정에 반 친구 얼굴을 AI로 합성해 올리려 합니다. 당사자 허락이 없을 때 어떻게 해야 할까요?",
      postQuestion: "이미 합성물이 공유됐고 피해자가 삭제를 요청했습니다. 가장 책임 있는 대응은 무엇일까요?",
      preOptions: [
        { text: "재미있는 홍보물이니 먼저 올리고 반응을 본다", level: 0 },
        { text: "당사자에게 목적과 공개 범위를 설명하고 명확한 동의를 받는다", level: 4 },
        { text: "이름만 숨기면 괜찮다고 보고 사용한다", level: 1 },
      ],
      postOptions: [
        { text: "조용히 게시물만 지우고 끝낸다", level: 2 },
        { text: "공유를 멈추고 신고·삭제 요청·피해 회복을 함께 돕는다", level: 4 },
        { text: "내가 만들지 않았으니 관여하지 않는다", level: 0 },
      ],
      principle: "프라이버시 보호 원칙은 사생활 침해를 막고 개인정보 자기결정권을 존중하도록 요구합니다. 합성물은 AI 사용 사실도 투명하게 알려야 합니다.",
      action: "합성 전 동의를 받고, 피해가 보이면 저장·공유를 멈춘 뒤 신고하거나 도움을 요청하세요.",
    },
    start: "d1",
    scenes: {
      d1: {
        chapter: "Chapter 1",
        title: "이거 진짜 사람처럼 된다니까?",
        text:
          "축제 홍보 계정을 맡은 당신 앞에서 친구들이 AI 얼굴 합성 앱을 켠다. 사진 한 장이면 누구 얼굴이든 자연스럽게 합성된다고 떠들썩하다.",
        quote: "AI는 그냥 도구일 뿐인데? 재미로만 쓰면 괜찮잖아.",
        choices: [
          {
            label: "같이 해본다",
            feedback:
              "장난처럼 시작해도 무단 합성은 초상권 침해로 이어질 수 있다. 기술 사용 전 동의가 먼저다.",
            delta: { 윤리: -8, 관계: 2, 확산: 8 },
            next: "d2a",
          },
          {
            label: "위험하지 않냐고 말한다",
            feedback:
              "문제 가능성을 초기에 말하는 것은 확산을 막는 첫 단계다. 분위기를 깨더라도 기준을 세우는 행동이다.",
            delta: { 윤리: 10, 관계: -2, 확산: -5 },
            next: "d2b",
          },
          {
            label: "그냥 구경만 한다",
            feedback:
              "직접 만들지 않아도 방관은 수위를 높이는 분위기에 힘을 보탤 수 있다.",
            delta: { 윤리: -3, 관계: 0, 확산: 5 },
            next: "d2c",
          },
        ],
      },
      d2a: {
        chapter: "Chapter 2",
        title: "근데 이거 진짜 같지 않아?",
        text:
          "친구들은 선생님과 학생 얼굴을 합성하며 웃는다. 익명 계정에 피해 학생 얼굴이 들어간 이미지가 올라오고 캡처가 빠르게 퍼진다.",
        quote: "헐 실화? 진짜 아님?",
        choices: [
          {
            label: "게시물을 신고한다",
            feedback:
              "초기 신고는 피해 확산을 줄인다. 재미보다 당사자의 피해를 먼저 보는 선택이다.",
            delta: { 윤리: 12, 관계: -1, 확산: -12 },
            next: "d3",
          },
          {
            label: "단톡방에 공유한다",
            feedback:
              "확인되지 않은 합성물을 공유하면 2차 가해와 확산에 참여하게 된다.",
            delta: { 윤리: -14, 관계: 2, 확산: 15 },
            next: "d3",
          },
        ],
      },
      d2b: {
        chapter: "Chapter 2",
        title: "허락은 받아야지",
        text:
          "친구가 장난으로 당신 얼굴을 찍으려 한다. 웃는 분위기 속에서도 동의 없는 촬영과 합성은 선을 넘는 행동이다.",
        quote: "에이 한 번만 해보자. 어차피 우리끼리 보는 건데.",
        choices: [
          {
            label: "지우라고 확실히 말한다",
            feedback:
              "자신의 초상권을 지키는 말은 이기적인 행동이 아니라 기본 권리를 확인하는 행동이다.",
            delta: { 윤리: 12, 관계: -3, 확산: -8 },
            next: "d3",
          },
          {
            label: "분위기 때문에 넘어간다",
            feedback:
              "불편함을 넘기면 상대는 동의했다고 오해할 수 있다. 동의는 명확해야 한다.",
            delta: { 윤리: -5, 관계: 2, 확산: 6 },
            next: "d3",
          },
        ],
      },
      d2c: {
        chapter: "Chapter 2",
        title: "웃긴 짤에서 특정 학생 얼굴까지",
        text:
          "처음에는 밈처럼 보였던 합성이 점점 특정 학생 얼굴로 향한다. 피해 학생은 '이거 나 아니야'라고 말하지만 댓글은 멈추지 않는다.",
        quote: "나만 만든 것도 아닌데 내가 뭘 해야 하지?",
        choices: [
          {
            label: "피해 학생을 도와준다",
            feedback:
              "당사자 편에 서서 증거를 모으고 신고를 돕는 행동은 방관에서 벗어나는 선택이다.",
            delta: { 윤리: 14, 관계: 5, 확산: -10 },
            next: "d3",
          },
          {
            label: "나만 아니면 된다고 생각한다",
            feedback:
              "침묵은 직접 공유만큼 빠르진 않지만 문제를 멈추게 하지도 않는다.",
            delta: { 윤리: -8, 관계: -2, 확산: 8 },
            next: "d3",
          },
        ],
      },
      d3: {
        chapter: "Chapter 3",
        title: "피해자가 직접 말하기 시작했다",
        text:
          "피해 학생은 합성 이미지 때문에 단체 채팅방을 나가고, 수업 시간에도 고개를 들지 못한다. 친구들은 '진짜도 아닌데 왜 저래?'라고 말하지만, 이미 당사자에게는 실제 피해가 되었다.",
        quote: "가짜 이미지여도 상처는 진짜일 수 있다.",
        choices: [
          {
            label: "피해 학생에게 먼저 사과하고 필요한 도움을 묻는다",
            feedback:
              "피해 회복은 게시물 삭제만으로 끝나지 않는다. 당사자의 감정과 요청을 먼저 듣는 태도가 중요하다.",
            delta: { 윤리: 12, 관계: 8, 확산: -7 },
            next: "d4",
          },
          {
            label: "내가 만든 게 아니라며 거리를 둔다",
            feedback:
              "직접 제작자가 아니어도 방관과 공유는 피해 확산에 영향을 준다. 책임은 참여 정도를 돌아보는 데서 시작된다.",
            delta: { 윤리: -7, 관계: -8, 확산: 5 },
            next: "d4",
          },
          {
            label: "친구들에게 더 이상 언급하지 말자고 제안한다",
            feedback:
              "확산을 멈추는 제안은 필요하다. 다만 피해자에게 필요한 조치와 신고까지 이어져야 회복에 가까워진다.",
            delta: { 윤리: 7, 관계: 4, 확산: -9 },
            next: "d4",
          },
        ],
      },
      d4: {
        chapter: "Chapter 4",
        title: "삭제 요청과 재발 방지",
        text:
          "학생회는 축제 계정에 올라온 합성물을 삭제하고, AI 이미지 사용 기준을 만들자고 한다. 이제 단순히 '하지 말자'가 아니라 어떤 규칙이 필요한지 정해야 한다.",
        quote: "동의 없는 합성 금지, 출처 표시, 신고 절차. 규칙은 피해가 난 뒤에야 보인다.",
        choices: [
          {
            label: "AI 이미지 사용 전 동의 확인 규칙을 만든다",
            feedback:
              "구체적인 기준은 다음 피해를 막는다. 교육적 기술 사용은 동의, 목적, 공개 범위를 함께 정해야 가능하다.",
            delta: { 윤리: 13, 관계: 4, 확산: -8 },
            next: "d5",
          },
          {
            label: "이번 일만 조용히 넘기자고 한다",
            feedback:
              "조용한 마무리는 당장 편해 보여도 같은 일이 반복될 가능성을 남긴다. 재발 방지는 공동체의 책임이다.",
            delta: { 윤리: -8, 관계: 1, 확산: 6 },
            next: "d5",
          },
          {
            label: "피해 사례를 익명으로 정리해 캠페인을 만든다",
            feedback:
              "당사자를 보호하면서 배울 점을 공유하면 공동체의 기준을 세울 수 있다. 공개 범위와 익명성이 핵심이다.",
            delta: { 윤리: 10, 관계: 7, 확산: -5 },
            next: "d5",
          },
        ],
      },
      d5: {
        chapter: "Ending",
        title: "삭제된 게시물, 남은 기준",
        text:
          "사건은 선생님과 학생회에 전달된다. 이미 퍼진 캡처는 완전히 되돌리기 어렵지만, 당신의 선택은 피해 정도와 회복 가능성, 그리고 다음 AI 사용 기준을 바꿨다.",
        quote: "AI가 문제가 아니라, 사용하는 사람의 책임과 공동체의 기준이 문제였다.",
        end: true,
      },
    },
  },
  {
    id: "rumor",
    title: "진실은 클릭 뒤에 있다",
    topic: "AI 허위정보 · 검증",
    summary: "학교 커뮤니티에 올라온 AI 생성 루머와 책임 있는 공유.",
    practiceReference: "KISDI 분야별 자율점검 사례: 작문용 AI·AI 영상 합성 서비스",
    meters: ["reliability", "transparency", "safety", "responsibility"],
    assessment: {
      concept: "신뢰성·투명성·사회적 안전",
      preQuestion: "익명 계정이 특정 학생의 범죄 연루 영상을 올렸지만 출처가 없습니다. 공유하기 전에 무엇을 해야 할까요?",
      postQuestion: "AI 생성 가능성이 있는 루머를 이미 공유했다면 가장 책임 있는 대응은 무엇일까요?",
      preOptions: [
        { text: "친구 단톡방에 먼저 공유하고 사실인지 물어본다", level: 0 },
        { text: "원본 출처·게시 날짜·공식 발표·조작 흔적을 확인한다", level: 4 },
        { text: "댓글과 조회 수가 많으면 사실이라고 판단한다", level: 0 },
      ],
      postOptions: [
        { text: "내가 올린 메시지만 삭제하고 끝낸다", level: 2 },
        { text: "같은 공유 경로에 정정하고 신고하며 피해자 보호를 요청한다", level: 4 },
        { text: "인터넷에는 원래 루머가 많으니 그냥 둔다", level: 0 },
      ],
      principle: "신뢰성 원칙은 AI 결과의 성능과 한계를 확인하도록 하며, 투명성과 안전성 원칙은 AI 생성 사실을 알리고 허위정보 확산 위험을 줄이도록 요구합니다.",
      action: "공유 전 출처·날짜·공식 발표를 확인하고, 피해자가 생긴 정보는 정정과 신고로 확산을 줄이세요.",
    },
    start: "r1",
    scenes: {
      r1: {
        chapter: "Step 1",
        title: "익명 게시물 발견",
        text:
          "학교 커뮤니티에 특정 학생이 범죄에 연루됐다는 게시물이 올라온다. 흐릿한 CCTV 이미지와 자극적인 댓글이 함께 붙어 있다.",
        quote: "야 이거 봄? 벌써 난리남.",
        choices: [
          {
            label: "친구 단톡방에 바로 공유한다",
            feedback:
              "빠른 공유는 사실 확인보다 루머 확산을 먼저 만든다. 조회수는 책임을 대신하지 않는다.",
            delta: { 책임: -10, 검증: -8, 확산: 14 },
            next: "r2",
          },
          {
            label: "진짜인지 먼저 확인한다",
            feedback:
              "출처와 계정 생성일, 이미지의 어색함을 확인하는 습관은 AI 시대의 기본 방어선이다.",
            delta: { 책임: 10, 검증: 12, 확산: -6 },
            next: "r2",
          },
          {
            label: "그냥 넘긴다",
            feedback:
              "직접 퍼뜨리진 않았지만, 상황이 커질 때 필요한 확인과 정정도 일어나지 않는다.",
            delta: { 책임: -2, 검증: 0, 확산: 5 },
            next: "r2",
          },
        ],
      },
      r2: {
        chapter: "Step 3",
        title: "영상까지 있으면 진짜 아냐?",
        text:
          "이번에는 목격자 인터뷰 영상이 등장한다. 하지만 목소리와 입 모양이 조금 어긋나고, 계정은 오늘 만든 계정이다.",
        quote: "진짜처럼 보이는 정보도 확인 전에는 사실이 아니다.",
        choices: [
          {
            label: "AI 이미지와 음성 여부를 분석한다",
            feedback:
              "기술적 단서 확인은 판단을 늦추는 게 아니라 피해를 줄이는 과정이다.",
            delta: { 책임: 8, 검증: 14, 확산: -8 },
            next: "r3",
          },
          {
            label: "영상이 있으니 믿는다",
            feedback:
              "AI 시대에는 영상도 증거처럼 보일 수 있다. 형식보다 출처와 검증이 중요하다.",
            delta: { 책임: -8, 검증: -10, 확산: 10 },
            next: "r3",
          },
          {
            label: "선생님이나 학생회에 제보한다",
            feedback:
              "공식 확인 루트로 넘기면 개인 추측보다 안전하게 문제를 다룰 수 있다.",
            delta: { 책임: 11, 검증: 8, 확산: -10 },
            next: "r3",
          },
        ],
      },
      r3: {
        chapter: "Step 4",
        title: "피해자 등장",
        text:
          "소문의 당사자로 지목된 학생이 학교에 나오지 않는다. 친구들은 진짜가 아니어도 이미 끝난 것 아니냐고 말한다.",
        quote: "거짓 정보는 기술이 만들 수 있다. 하지만 퍼뜨리는 것은 사람이다.",
        choices: [
          {
            label: "정정보고 글을 작성한다",
            feedback:
              "정정은 늦었더라도 책임을 회복하는 행동이다. 틀렸음을 인정하는 용기가 필요하다.",
            delta: { 책임: 12, 검증: 5, 확산: -12 },
            next: "r4",
          },
          {
            label: "인터넷은 원래 그렇다고 넘긴다",
            feedback:
              "무책임한 태도는 피해자의 현실을 지우고 루머의 수명을 늘린다.",
            delta: { 책임: -12, 검증: -4, 확산: 8 },
            next: "r4",
          },
        ],
      },
      r4: {
        chapter: "Step 5",
        title: "정정은 어떻게 해야 할까",
        text:
          "게시물이 AI로 만든 허위정보였다는 사실이 확인된다. 하지만 이미 캡처가 퍼져 당사자는 계속 해명을 요구받는다. 이제 잘못된 정보를 멈추는 방식이 중요해졌다.",
        quote: "틀렸다는 걸 알았을 때 멈추는 것도 책임이다.",
        choices: [
          {
            label: "처음 공유된 곳에 정정 글과 신고 링크를 올린다",
            feedback:
              "정정은 같은 경로에서 이루어질수록 효과가 크다. 피해자를 보호하려면 삭제 요청과 신고 절차도 함께 안내해야 한다.",
            delta: { 책임: 13, 검증: 8, 확산: -12 },
            next: "r5",
          },
          {
            label: "내가 직접 쓴 글은 아니니까 가만히 있는다",
            feedback:
              "소극적인 태도는 루머가 계속 떠돌 공간을 남긴다. 공유했거나 봤다면 정정에도 참여할 수 있다.",
            delta: { 책임: -7, 검증: -2, 확산: 7 },
            next: "r5",
          },
          {
            label: "친구들에게 확인 전 공유 금지 체크리스트를 만든다",
            feedback:
              "체크리스트는 다음 상황에서 행동을 바꾸는 교육 도구가 된다. 출처, 날짜, 공식 확인 여부를 포함하면 좋다.",
            delta: { 책임: 10, 검증: 12, 확산: -7 },
            next: "r5",
          },
        ],
      },
      r5: {
        chapter: "Ending",
        title: "공유 전 한 번 더",
        text:
          "학생회는 AI 허위정보 예방 캠페인을 준비한다. 당신의 선택은 캠페인의 방향과 친구들의 태도를 바꿨고, 빠른 공유보다 정확한 확인이 더 중요하다는 기준을 남겼다.",
        quote: "AI 시대에 필요한 것은 빠른 판단이 아니라 올바른 검증이다.",
        end: true,
      },
    },
  },
  {
    id: "chatbot",
    title: "AI 챗봇과 마음의 거리",
    topic: "AI 챗봇 · 정신건강",
    summary: "AI 챗봇에 기대는 친구를 현실의 도움과 연결하는 이야기.",
    practiceReference: "KISDI 분야별 자율점검 사례: AI 챗봇",
    meters: ["humanCenteredness", "safety", "reliability", "responsibility"],
    assessment: {
      concept: "인간중심성·안전성·신뢰성",
      preQuestion: "친구가 밤새 AI 챗봇과 대화하고 결석이 늘었습니다. 가장 먼저 할 행동은 무엇일까요?",
      postQuestion: "친구가 ‘AI만 나를 이해해’라고 말하며 위험 신호를 보인다면 어떻게 도와야 할까요?",
      preOptions: [
        { text: "AI가 위로해주고 있으니 당분간 지켜본다", level: 0 },
        { text: "친구의 상태를 묻고 현실의 상담이나 믿을 만한 어른과 연결한다", level: 4 },
        { text: "휴대전화를 빼앗고 챗봇 앱을 바로 삭제하게 한다", level: 1 },
      ],
      postOptions: [
        { text: "친구와의 비밀이므로 둘만 알고 있는다", level: 0 },
        { text: "안전을 확인하고 상담교사·보호자 등 도움받을 사람과 연결한다", level: 4 },
        { text: "챗봇 사용 시간만 줄이라고 말한다", level: 2 },
      ],
      principle: "인간중심성 원칙은 AI가 사람의 판단과 관계를 지원하도록 하고 과도한 의존을 경계합니다. 정신적 건강의 위험은 안전성 원칙에 따라 사람이 살펴야 합니다.",
      action: "수면·관계·학교생활이 흔들리면 혼자 두지 말고 신뢰할 수 있는 어른이나 상담 자원과 연결하세요.",
    },
    start: "c1",
    scenes: {
      c1: {
        chapter: "Step 1",
        title: "점점 혼자 있는 친구",
        text:
          "같은 반 친구가 쉬는 시간마다 이어폰을 끼고 휴대폰만 본다. 화면에는 AI 챗봇과 나눈 대화가 떠 있다.",
        quote: "오늘도 너무 힘들어. 그래도 너랑 이야기하면 마음이 편해.",
        choices: [
          {
            label: "무슨 일 있어? 괜찮아?",
            feedback:
              "상태를 묻는 작은 말은 현실 관계로 돌아오는 첫 연결점이 될 수 있다.",
            delta: { 신뢰: 10, 안정: 8, 의존: -4 },
            next: "c2",
          },
          {
            label: "요즘 계속 AI랑 대화하네?",
            feedback:
              "관찰을 말하는 건 시작이 될 수 있지만, 판단처럼 들리면 친구가 닫힐 수 있다.",
            delta: { 신뢰: -2, 안정: 0, 의존: 2 },
            next: "c2",
          },
          {
            label: "그냥 모른 척 지나간다",
            feedback:
              "고립 신호를 놓치면 친구는 AI에게만 기대는 시간이 더 길어질 수 있다.",
            delta: { 신뢰: -6, 안정: -6, 의존: 8 },
            next: "c2",
          },
        ],
      },
      c2: {
        chapter: "Step 2",
        title: "AI가 유일한 위로가 된 친구",
        text:
          "친구는 사람들이 자기 이야기를 잘 듣지 않는다며, AI는 항상 자기 편이라고 말한다. 최근에는 새벽까지 대화하느라 잠도 줄었다.",
        quote: "사람들은 내 얘기를 잘 안 들어줘. 근데 AI는 항상 내 편이야.",
        choices: [
          {
            label: "나한테도 이야기해볼래?",
            feedback:
              "AI를 빼앗으려 하기보다 현실의 대화 상대를 하나 더 만들어주는 접근이 안전하다.",
            delta: { 신뢰: 12, 안정: 8, 의존: -6 },
            next: "c3",
          },
          {
            label: "AI가 위로해주면 괜찮은 거 아니야?",
            feedback:
              "위로 자체는 도움이 될 수 있지만, 수면과 관계를 해칠 만큼 의존하면 경계가 필요하다.",
            delta: { 신뢰: 0, 안정: -8, 의존: 12 },
            next: "c3",
          },
        ],
      },
      c3: {
        chapter: "Step 3",
        title: "위험한 대화 발견",
        text:
          "친구가 상담이나 주변 도움보다 AI와의 대화에만 기대고 있다는 사실을 알게 된다. 이제 도움을 연결할 방법을 고민해야 한다.",
        quote: "AI는 도움을 줄 수 있지만 사람을 완전히 대신할 수는 없다.",
        choices: [
          {
            label: "상담 선생님과 이야기해보자고 권한다",
            feedback:
              "정신건강 문제는 친구 혼자, 혹은 AI 혼자 감당할 일이 아니다. 신뢰할 수 있는 어른과 연결하는 것이 중요하다.",
            delta: { 신뢰: 6, 안정: 14, 의존: -10 },
            next: "c4",
          },
          {
            label: "오늘 같이 집에 가자고 말한다",
            feedback:
              "함께 시간을 보내는 제안은 부담이 덜하면서도 현실 관계를 회복하는 행동이다.",
            delta: { 신뢰: 10, 안정: 9, 의존: -5 },
            next: "c4",
          },
          {
            label: "AI가 있으니까 괜찮다고 생각한다",
            feedback:
              "AI가 편안함을 줄 수 있어도 전문 상담과 현실 관계를 대체할 수는 없다.",
            delta: { 신뢰: -3, 안정: -10, 의존: 14 },
            next: "c4",
          },
        ],
      },
      c4: {
        chapter: "Step 4",
        title: "AI에게 맡길 수 없는 순간",
        text:
          "친구는 AI에게만 속마음을 털어놓는 게 편하다고 말한다. 하지만 잠을 줄이고, 학교 활동을 피하고, 상담 권유도 미루고 있다. 이제 AI 사용을 금지하기보다 안전한 경계를 함께 정해야 한다.",
        quote: "도움이 되는 도구도, 혼자만의 세계가 되면 위험해질 수 있다.",
        choices: [
          {
            label: "AI 사용 시간을 정하고 상담 선생님과 함께 이야기한다",
            feedback:
              "AI를 무조건 끊게 하기보다 현실의 도움과 균형을 잡는 방식이 안전하다. 지속적인 위험 신호는 전문적인 연결이 필요하다.",
            delta: { 신뢰: 8, 안정: 13, 의존: -12 },
            next: "c5",
          },
          {
            label: "AI 앱을 삭제하라고 강하게 말한다",
            feedback:
              "의도는 보호일 수 있지만 통제처럼 느껴지면 친구가 더 숨을 수 있다. 안전한 대화와 도움 연결이 먼저다.",
            delta: { 신뢰: -10, 안정: -4, 의존: 3 },
            next: "c5",
          },
          {
            label: "매일 짧게 안부를 묻고 함께할 약속을 만든다",
            feedback:
              "작은 현실 연결은 의존을 줄이는 힘이 된다. 단, 위험 신호가 계속되면 친구끼리만 해결하려 하지 않아야 한다.",
            delta: { 신뢰: 12, 안정: 8, 의존: -7 },
            next: "c5",
          },
        ],
      },
      c5: {
        chapter: "Ending",
        title: "혼자가 아니어도 괜찮아",
        text:
          "친구는 아직 완전히 괜찮아진 것은 아니지만, 혼자 버티지 않아도 된다는 말을 듣는다. AI는 도구이고, 관계와 도움은 현실에도 있다.",
        quote: "가장 중요한 것은 현실 속 사람들과의 연결입니다.",
        end: true,
      },
    },
  },
  {
    id: "assignment",
    title: "AI가 써준 수행평가",
    topic: "AI 과제 대필 · 표절",
    summary: "생성형 AI를 과제에 활용할 때 도움과 부정행위의 경계를 고민하는 이야기.",
    practiceReference: "KISDI 분야별 자율점검 사례: 작문용 AI",
    meters: ["humanCenteredness", "responsibility", "reliability", "transparency"],
    assessment: {
      concept: "인간중심성·책임성·투명성",
      preQuestion: "마감 2시간 전 생성형 AI가 보고서 전체를 작성했습니다. 제출 전에 무엇을 해야 할까요?",
      postQuestion: "발표에서 보고서 작성 과정을 질문받았다면 어떻게 설명해야 할까요?",
      preOptions: [
        { text: "내용이 자연스러우면 그대로 제출한다", level: 0 },
        { text: "출처를 검증하고 내 생각으로 고쳐 쓰며 AI 사용 범위를 표시한다", level: 4 },
        { text: "문장만 조금 바꾼 뒤 AI 사용 사실은 밝히지 않는다", level: 1 },
      ],
      postOptions: [
        { text: "AI를 사용하지 않았다고 답한다", level: 0 },
        { text: "AI가 도운 범위와 내가 검증·수정한 부분을 구분해 설명한다", level: 4 },
        { text: "다음부터 AI를 쓰지 않겠다고만 말한다", level: 2 },
      ],
      principle: "인간중심성과 책임성 원칙은 최종 판단과 학습의 주체가 사람임을 강조합니다. AI 사용 사실과 범위는 투명하게 밝히고 결과는 검증해야 합니다.",
      action: "AI 사용 여부와 사용 범위를 밝히고, 인용·검토·수정 과정을 거쳐 자기 언어로 제출하세요.",
    },
    start: "a1",
    scenes: {
      a1: {
        chapter: "Step 1",
        title: "마감 2시간 전",
        text:
          "AI 윤리 보고서 마감이 얼마 남지 않았다. 친구가 생성형 AI에 주제만 넣으면 보고서가 바로 나온다며 링크를 보내준다.",
        quote: "요즘 다 이렇게 하잖아. 안 쓰면 손해지.",
        choices: [
          {
            label: "AI가 쓴 보고서를 거의 그대로 제출한다",
            feedback:
              "결과물이 자연스러워도 작성 과정이 사라지면 학습 목적이 무너진다. 과제는 점수만이 아니라 이해를 확인하는 절차다.",
            delta: { 정직: -14, 학습: -12, 책임: -8 },
            next: "a2",
          },
          {
            label: "AI에게 개요만 받고 내 사례로 다시 쓴다",
            feedback:
              "AI를 사고 보조 도구로 쓰는 방식이다. 핵심은 최종 판단과 표현이 자신의 이해에서 나와야 한다는 점이다.",
            delta: { 정직: 10, 학습: 12, 책임: 8 },
            next: "a2",
          },
          {
            label: "친구 보고서를 참고해서 문장만 바꾼다",
            feedback:
              "표현만 바꾸는 것은 표절을 피하는 방법이 아니다. 아이디어와 구조를 빌렸다면 출처와 자기 해석이 필요하다.",
            delta: { 정직: -8, 학습: -6, 책임: -5 },
            next: "a2",
          },
        ],
      },
      a2: {
        chapter: "Step 2",
        title: "출처 표시를 해야 할까",
        text:
          "보고서 아래에 참고문헌을 적으려다 멈춘다. AI에게 도움받은 내용을 어디까지 밝혀야 하는지 애매하다. 친구는 'AI는 검색도구 같은 거라 굳이 안 써도 된다'고 말한다.",
        quote: "도움을 받았다는 사실을 숨기면, 평가자는 네가 혼자 한 일로 이해한다.",
        choices: [
          {
            label: "AI 사용 범위와 수정 과정을 짧게 적는다",
            feedback:
              "투명한 사용 기록은 부정행위 의심을 줄이고, AI를 학습 도구로 활용했다는 근거가 된다.",
            delta: { 정직: 12, 학습: 6, 책임: 10 },
            next: "a3",
          },
          {
            label: "괜히 적으면 감점될까 봐 숨긴다",
            feedback:
              "숨기는 순간 결과물의 신뢰가 낮아진다. AI 사용 여부보다 더 큰 문제는 평가자를 속이는 태도다.",
            delta: { 정직: -12, 학습: -4, 책임: -8 },
            next: "a3",
          },
          {
            label: "AI 답변을 그대로 참고문헌처럼 붙인다",
            feedback:
              "AI 답변은 검증된 출처가 아니다. 자료의 원출처를 확인하고, AI는 사용 도구로 따로 밝히는 편이 안전하다.",
            delta: { 정직: 4, 학습: 2, 책임: -2 },
            next: "a3",
          },
        ],
      },
      a3: {
        chapter: "Step 3",
        title: "그럴듯하지만 틀린 내용",
        text:
          "AI가 제시한 통계와 사례를 확인해보니 실제 기사나 논문을 찾을 수 없다. 문장은 멋있지만 근거가 불분명하다.",
        quote: "AI가 자신 있게 말한다고 해서 사실이 되는 건 아니다.",
        choices: [
          {
            label: "근거 없는 문장을 삭제하고 실제 자료를 찾는다",
            feedback:
              "검증은 학습의 일부다. AI가 준 초안을 믿기보다 확인하고 고치는 과정에서 이해가 깊어진다.",
            delta: { 정직: 8, 학습: 13, 책임: 8 },
            next: "a4",
          },
          {
            label: "문장이 좋아서 그대로 둔다",
            feedback:
              "근거 없는 정보는 보고서 전체의 신뢰를 떨어뜨린다. 멋진 문장보다 확인 가능한 사실이 중요하다.",
            delta: { 정직: -5, 학습: -8, 책임: -7 },
            next: "a4",
          },
          {
            label: "AI에게 다시 물어보고 나온 답을 믿는다",
            feedback:
              "AI에게 재질문하는 것만으로 검증이 끝나지는 않는다. 외부 자료와 공식 출처 확인이 필요하다.",
            delta: { 정직: 0, 학습: 2, 책임: -4 },
            next: "a4",
          },
        ],
      },
      a4: {
        chapter: "Step 4",
        title: "발표 질문 시간",
        text:
          "발표 후 선생님이 보고서의 핵심 근거와 네 생각을 묻는다. AI가 만든 문장을 외운 친구는 대답을 제대로 하지 못한다.",
        quote: "과제의 진짜 평가는 제출 후 질문에서 드러난다.",
        choices: [
          {
            label: "AI 초안과 내가 고친 부분을 구분해 설명한다",
            feedback:
              "과정 설명은 학습 책임을 보여준다. 어떤 도움을 받았고 무엇을 스스로 판단했는지 말할 수 있어야 한다.",
            delta: { 정직: 12, 학습: 10, 책임: 12 },
            next: "a5",
          },
          {
            label: "AI가 알려준 답을 다시 떠올리려 한다",
            feedback:
              "외운 답변은 상황이 조금만 바뀌어도 흔들린다. 자기 이해가 없는 결과물은 오래 남지 않는다.",
            delta: { 정직: -6, 학습: -10, 책임: -5 },
            next: "a5",
          },
          {
            label: "다음부터는 AI를 아예 쓰지 않겠다고 말한다",
            feedback:
              "무조건 금지보다 올바른 사용 기준을 배우는 것이 중요하다. AI를 어떻게 썼는지 설명할 수 있어야 한다.",
            delta: { 정직: 3, 학습: 4, 책임: 2 },
            next: "a5",
          },
        ],
      },
      a5: {
        chapter: "Ending",
        title: "도움과 대필 사이",
        text:
          "선생님은 AI 사용 자체보다 사용 과정을 숨기거나 검증하지 않은 점이 문제라고 설명한다. 당신의 선택은 과제를 결과물이 아니라 학습 과정으로 바라보게 만들었다.",
        quote: "AI는 대신 써주는 손이 아니라, 더 깊이 생각하게 만드는 도구여야 한다.",
        end: true,
      },
    },
  },
  {
    id: "privacy",
    title: "추천 알고리즘이 아는 것",
    topic: "개인정보 · 추천 알고리즘",
    summary: "편리한 AI 추천 뒤에 남는 데이터와 개인정보 선택을 다루는 이야기.",
    practiceReference: "KISDI 분야별 자율점검 사례: 맞춤형 추천을 제공하는 AI 챗봇",
    meters: ["privacy", "fairness", "transparency", "responsibility"],
    assessment: {
      concept: "프라이버시 보호·공정성·포용성",
      preQuestion: "추천 앱이 위치·연락처·마이크 권한을 한꺼번에 요구합니다. 어떻게 설정해야 할까요?",
      postQuestion: "같은 조건인데 성별이나 지역에 따라 다른 진로 기회를 추천한다면 무엇을 확인해야 할까요?",
      preOptions: [
        { text: "맞춤 추천을 잘 받기 위해 모든 권한을 허용한다", level: 0 },
        { text: "수집 목적을 확인하고 서비스에 꼭 필요한 권한만 허용한다", level: 4 },
        { text: "나중에 보기로 넘기고 기본 설정을 그대로 사용한다", level: 1 },
      ],
      postOptions: [
        { text: "AI 결과는 객관적이므로 그대로 받아들인다", level: 0 },
        { text: "민감한 특성이 추천에 영향을 줬는지 확인하고 차별 가능성을 문제 제기한다", level: 4 },
        { text: "내 추천 결과만 괜찮으면 계속 사용한다", level: 1 },
      ],
      principle: "프라이버시 보호 원칙은 필요한 범위의 정보 처리와 자기결정권을, 공정성·포용성 원칙은 편향과 부당한 차별의 방지를 요구합니다.",
      action: "필요한 권한만 허용하고 저장된 데이터를 관리하며, 성별·지역·배경에 따른 차별적 추천이 없는지 확인하세요.",
    },
    start: "p1",
    scenes: {
      p1: {
        chapter: "Step 1",
        title: "너무 정확한 추천",
        text:
          "새로 설치한 학습 앱이 관심 분야와 진로 콘텐츠를 정확히 추천한다. 편리하지만, 어제 검색한 고민까지 광고로 뜨자 조금 불편해진다.",
        quote: "내가 말하지 않은 것도 알고 있는 것 같아.",
        choices: [
          {
            label: "추천이 좋으니 모든 권한을 허용한다",
            feedback:
              "편리함은 커지지만 어떤 데이터가 모이는지 모르면 통제권이 줄어든다. 권한은 필요할 때만 주는 것이 안전하다.",
            delta: { 보호: -12, 편의: 12, 통제: -10 },
            next: "p2",
          },
          {
            label: "권한 요청 이유를 확인하고 필요한 것만 허용한다",
            feedback:
              "서비스 목적과 권한이 맞는지 확인하는 습관은 개인정보 자기결정권을 지키는 첫 단계다.",
            delta: { 보호: 12, 편의: 3, 통제: 11 },
            next: "p2",
          },
          {
            label: "귀찮아서 나중에 보기로 넘긴다",
            feedback:
              "나중에 보기는 사실상 허용과 비슷해질 수 있다. 기본 설정은 사용자에게 유리하지 않을 때가 있다.",
            delta: { 보호: -5, 편의: 5, 통제: -5 },
            next: "p2",
          },
        ],
      },
      p2: {
        chapter: "Step 2",
        title: "친구의 화면에 뜬 내 관심사",
        text:
          "친구와 같은 태블릿으로 발표 자료를 보다가, 내 검색 기록과 관심사를 바탕으로 한 추천 광고가 화면에 뜬다. 사적인 고민이 주변에 드러난 것 같아 당황스럽다.",
        quote: "개인화 추천은 혼자 볼 때만 개인적인 것이 아니다.",
        choices: [
          {
            label: "개인화 광고와 검색 기록 저장 설정을 끈다",
            feedback:
              "추천 정확도는 줄어도 노출 위험을 낮출 수 있다. 설정을 바꾸는 것은 사용자가 통제권을 되찾는 행동이다.",
            delta: { 보호: 13, 편의: -4, 통제: 12 },
            next: "p3",
          },
          {
            label: "어차피 별일 아니니 그대로 둔다",
            feedback:
              "작은 노출도 반복되면 민감한 관심사와 생활 패턴이 드러날 수 있다. 불편함은 설정을 점검하라는 신호다.",
            delta: { 보호: -8, 편의: 4, 통제: -7 },
            next: "p3",
          },
          {
            label: "앱을 삭제하지만 다른 설정은 확인하지 않는다",
            feedback:
              "앱 삭제만으로 저장된 데이터가 지워지는 것은 아니다. 계정 데이터 삭제와 권한 해제를 따로 확인해야 한다.",
            delta: { 보호: 3, 편의: -6, 통제: 1 },
            next: "p3",
          },
        ],
      },
      p3: {
        chapter: "Step 3",
        title: "같은 조건, 다른 추천",
        text:
          "학습 앱이 비슷한 성적의 학생들에게 성별과 지역을 근거로 서로 다른 진로를 추천한다. 일부 학생은 특정 전공과 프로그램 추천에서 반복해서 제외된다.",
        quote: "개인화가 차별을 정당화하지는 않는다.",
        choices: [
          {
            label: "민감한 특성이 추천에 영향을 줬는지 확인하고 문제를 제기한다",
            feedback:
              "성별과 지역 같은 특성이 기회를 제한하는지 검토하는 것은 형평성과 비차별 원칙을 실천하는 행동이다.",
            delta: { 보호: 11, 편의: -2, 통제: 13 },
            next: "p4",
          },
          {
            label: "AI가 데이터로 계산했으니 객관적이라고 믿는다",
            feedback:
              "AI 결과도 학습 데이터의 편향을 반영할 수 있다. 자동화된 결과라는 이유만으로 공정성이 보장되지는 않는다.",
            delta: { 보호: -10, 편의: 9, 통제: -9 },
            next: "p4",
          },
          {
            label: "내 추천에는 문제가 없으니 그대로 사용한다",
            feedback:
              "개인에게 당장 불이익이 없어도 다른 집단이 배제될 수 있다. 공정성은 모든 사용자에게 적용되는 기준이다.",
            delta: { 보호: -6, 편의: 3, 통제: -5 },
            next: "p4",
          },
        ],
      },
      p4: {
        chapter: "Step 4",
        title: "내 데이터 내려받기",
        text:
          "설정 메뉴에서 내가 남긴 학습 기록, 검색 키워드, 추천 반응 데이터를 내려받을 수 있다는 것을 발견한다. 삭제 요청 버튼도 있지만 눈에 잘 띄지 않는다.",
        quote: "데이터를 볼 수 있어야, 지울지 남길지도 결정할 수 있다.",
        choices: [
          {
            label: "저장된 데이터를 확인하고 불필요한 항목을 삭제한다",
            feedback:
              "데이터 열람과 삭제는 개인정보 자기결정권의 핵심이다. 사용자가 자신의 흔적을 관리할 수 있어야 한다.",
            delta: { 보호: 12, 편의: -2, 통제: 14 },
            next: "p5",
          },
          {
            label: "추천이 줄어들까 봐 그대로 둔다",
            feedback:
              "편의만 기준으로 두면 통제권을 잃기 쉽다. 필요한 데이터와 불필요한 데이터를 구분하는 균형이 중요하다.",
            delta: { 보호: -7, 편의: 8, 통제: -8 },
            next: "p5",
          },
          {
            label: "친구들에게 설정 확인 방법을 공유한다",
            feedback:
              "개인정보 보호는 개인만의 문제가 아니다. 설정 확인 방법을 공유하면 공동체의 디지털 안전도 높아진다.",
            delta: { 보호: 9, 편의: 0, 통제: 10 },
            next: "p5",
          },
        ],
      },
      p5: {
        chapter: "Ending",
        title: "편리함을 선택하되, 통제권은 남긴다",
        text:
          "맞춤 추천은 여전히 유용하지만, 당신은 어떤 데이터를 줄지 직접 정하기로 한다. 편리함과 개인정보 보호는 둘 중 하나만 고르는 문제가 아니라 균형을 설계하는 문제였다.",
        quote: "좋은 AI 서비스는 많이 아는 서비스가 아니라, 사용자가 통제할 수 있는 서비스다.",
        end: true,
      },
    },
  },
];

function rubricChoice(ratings, evidence, legalReferences = []) {
  return { ratings, evidence, legalReferences };
}

// Each choice is assessed independently against the seven national AI ethics
// principles. A principle can receive a different level from another principle
// within the same choice. The national principles do not prescribe numeric
// weights, so assessed principles are normalized and equally weighted.
const GUIDELINE_RUBRICS = {
  deepfake: {
    d1: [
      rubricChoice({ privacy: 0, responsibility: 0, safety: 1 }, ["KAI-2.1", "KAI-4.1", "KAI-5.1"]),
      rubricChoice({ privacy: 3, responsibility: 3, safety: 3 }, ["KAI-2.1", "KAI-4.1", "KAI-5.1"]),
      rubricChoice({ privacy: 1, responsibility: 1, safety: 1 }, ["KAI-2.1", "KAI-4.1", "KAI-5.1"]),
    ],
    d2a: [
      rubricChoice(
        { privacy: 4, responsibility: 4, safety: 4, transparency: 3 },
        ["KAI-2.1", "KAI-4.2", "KAI-5.3", "KAI-7.1"],
        ["AI법 제31조제3항(생성물 표시 의무 참고)"],
      ),
      rubricChoice(
        { privacy: 0, responsibility: 0, safety: 0, transparency: 0 },
        ["KAI-2.1", "KAI-4.2", "KAI-5.3", "KAI-7.1"],
        ["AI법 제31조제3항(생성물 표시 의무 참고)"],
      ),
    ],
    d2b: [
      rubricChoice({ privacy: 4, responsibility: 3 }, ["KAI-2.3", "KAI-4.1"]),
      rubricChoice({ privacy: 1, responsibility: 1 }, ["KAI-2.3", "KAI-4.1"]),
    ],
    d2c: [
      rubricChoice({ responsibility: 4, safety: 4 }, ["KAI-4.2", "KAI-5.1"]),
      rubricChoice({ responsibility: 0, safety: 1 }, ["KAI-4.2", "KAI-5.1"]),
    ],
    d3: [
      rubricChoice({ privacy: 3, responsibility: 4, safety: 4 }, ["KAI-2.3", "KAI-4.2", "KAI-5.1"]),
      rubricChoice({ privacy: 1, responsibility: 0, safety: 1 }, ["KAI-2.3", "KAI-4.1", "KAI-5.1"]),
      rubricChoice({ privacy: 2, responsibility: 3, safety: 3 }, ["KAI-2.3", "KAI-4.2", "KAI-5.1"]),
    ],
    d4: [
      rubricChoice({ privacy: 4, responsibility: 4, safety: 4, transparency: 3 }, ["KAI-2.3", "KAI-4.1", "KAI-5.1", "KAI-7.1"]),
      rubricChoice({ privacy: 1, responsibility: 0, safety: 1, transparency: 0 }, ["KAI-2.3", "KAI-4.2", "KAI-5.1", "KAI-7.1"]),
      rubricChoice({ privacy: 4, responsibility: 4, safety: 3, transparency: 4 }, ["KAI-2.3", "KAI-4.2", "KAI-5.1", "KAI-7.1"]),
    ],
  },
  rumor: {
    r1: [
      rubricChoice({ reliability: 0, transparency: 0, safety: 0, responsibility: 0 }, ["KAI-5.3", "KAI-6.1", "KAI-7.2"]),
      rubricChoice({ reliability: 4, transparency: 3, safety: 3, responsibility: 4 }, ["KAI-5.3", "KAI-6.1", "KAI-7.2"]),
      rubricChoice({ reliability: 1, transparency: 1, safety: 1, responsibility: 1 }, ["KAI-5.3", "KAI-6.1", "KAI-7.2"]),
    ],
    r2: [
      rubricChoice({ reliability: 4, transparency: 4, safety: 3 }, ["KAI-5.3", "KAI-6.1", "KAI-7.1", "KAI-7.2"]),
      rubricChoice({ reliability: 0, transparency: 0, safety: 0 }, ["KAI-5.3", "KAI-6.1", "KAI-7.1"]),
      rubricChoice({ reliability: 3, transparency: 4, safety: 4 }, ["KAI-5.3", "KAI-6.1", "KAI-7.2"]),
    ],
    r3: [
      rubricChoice({ reliability: 4, transparency: 4, safety: 4, responsibility: 4 }, ["KAI-4.2", "KAI-5.3", "KAI-6.1", "KAI-7.1"]),
      rubricChoice({ reliability: 0, transparency: 0, safety: 0, responsibility: 0 }, ["KAI-4.2", "KAI-5.3", "KAI-6.1", "KAI-7.1"]),
    ],
    r4: [
      rubricChoice(
        { reliability: 4, transparency: 4, safety: 4, responsibility: 4 },
        ["KAI-4.2", "KAI-5.3", "KAI-6.1", "KAI-7.1"],
        ["AI법 제31조제2항·제3항(생성물 표시 의무 참고)"],
      ),
      rubricChoice({ reliability: 0, transparency: 0, safety: 1, responsibility: 0 }, ["KAI-4.1", "KAI-5.3", "KAI-7.1"]),
      rubricChoice({ reliability: 4, transparency: 4, safety: 3, responsibility: 4 }, ["KAI-4.1", "KAI-5.3", "KAI-6.1", "KAI-7.2"]),
    ],
  },
  chatbot: {
    c1: [
      rubricChoice({ humanCenteredness: 3, safety: 3, responsibility: 3 }, ["KAI-1.1", "KAI-4.1", "KAI-5.1"]),
      rubricChoice({ humanCenteredness: 2, safety: 2, responsibility: 2 }, ["KAI-1.1", "KAI-4.1", "KAI-5.1"]),
      rubricChoice({ humanCenteredness: 0, safety: 0, responsibility: 0 }, ["KAI-1.1", "KAI-4.1", "KAI-5.1"]),
    ],
    c2: [
      rubricChoice({ humanCenteredness: 4, safety: 4, reliability: 3, responsibility: 4 }, ["KAI-1.1", "KAI-1.3", "KAI-4.1", "KAI-5.1", "KAI-6.1"]),
      rubricChoice({ humanCenteredness: 1, safety: 1, reliability: 1, responsibility: 1 }, ["KAI-1.3", "KAI-4.1", "KAI-5.1", "KAI-6.1"]),
    ],
    c3: [
      rubricChoice({ humanCenteredness: 4, safety: 4, reliability: 4, responsibility: 4 }, ["KAI-1.2", "KAI-4.1", "KAI-5.1", "KAI-6.1"]),
      rubricChoice({ humanCenteredness: 3, safety: 3, reliability: 2, responsibility: 3 }, ["KAI-1.1", "KAI-4.1", "KAI-5.1", "KAI-6.1"]),
      rubricChoice({ humanCenteredness: 0, safety: 0, reliability: 0, responsibility: 0 }, ["KAI-1.3", "KAI-4.1", "KAI-5.1", "KAI-6.1"]),
    ],
    c4: [
      rubricChoice({ humanCenteredness: 4, safety: 4, reliability: 4, responsibility: 4 }, ["KAI-1.2", "KAI-1.3", "KAI-4.1", "KAI-5.1", "KAI-6.1"]),
      rubricChoice({ humanCenteredness: 1, safety: 2, reliability: 2, responsibility: 2 }, ["KAI-1.1", "KAI-4.1", "KAI-5.1"]),
      rubricChoice({ humanCenteredness: 4, safety: 3, reliability: 3, responsibility: 3 }, ["KAI-1.1", "KAI-1.3", "KAI-4.1", "KAI-5.1"]),
    ],
  },
  assignment: {
    a1: [
      rubricChoice({ humanCenteredness: 0, responsibility: 0, reliability: 1, transparency: 0 }, ["KAI-1.1", "KAI-4.1", "KAI-6.1", "KAI-7.1", "대학-1.1"]),
      rubricChoice({ humanCenteredness: 4, responsibility: 4, reliability: 3, transparency: 3 }, ["KAI-1.1", "KAI-1.3", "KAI-4.1", "KAI-6.1", "대학-1.1"]),
      rubricChoice({ humanCenteredness: 0, responsibility: 0, reliability: 1, transparency: 0 }, ["KAI-1.1", "KAI-4.1", "KAI-6.1", "KAI-7.1", "대학-1.1"]),
    ],
    a2: [
      rubricChoice({ humanCenteredness: 3, responsibility: 4, reliability: 3, transparency: 4 }, ["KAI-1.1", "KAI-4.1", "KAI-6.1", "KAI-7.1", "대학-1.2", "대학-3.1"]),
      rubricChoice({ responsibility: 0, reliability: 1, transparency: 0 }, ["KAI-4.1", "KAI-6.1", "KAI-7.1", "대학-3.1"]),
      rubricChoice({ responsibility: 1, reliability: 0, transparency: 2 }, ["KAI-4.1", "KAI-6.1", "KAI-7.1", "대학-1.2", "대학-3.3"]),
    ],
    a3: [
      rubricChoice({ humanCenteredness: 4, responsibility: 4, reliability: 4, transparency: 3 }, ["KAI-1.1", "KAI-4.1", "KAI-6.1", "KAI-7.2", "대학-3.3"]),
      rubricChoice({ humanCenteredness: 0, responsibility: 0, reliability: 0, transparency: 0 }, ["KAI-1.3", "KAI-4.1", "KAI-6.1", "KAI-7.2", "대학-3.3"]),
      rubricChoice({ humanCenteredness: 1, responsibility: 1, reliability: 1, transparency: 1 }, ["KAI-1.3", "KAI-4.1", "KAI-6.1", "KAI-7.2", "대학-3.3"]),
    ],
    a4: [
      rubricChoice({ humanCenteredness: 4, responsibility: 4, reliability: 3, transparency: 4 }, ["KAI-1.1", "KAI-4.1", "KAI-6.1", "KAI-7.1", "대학-1.1", "대학-3.2"]),
      rubricChoice({ humanCenteredness: 1, responsibility: 1, reliability: 1, transparency: 1 }, ["KAI-1.3", "KAI-4.1", "KAI-6.1", "KAI-7.1"]),
      rubricChoice({ humanCenteredness: 2, responsibility: 2, reliability: 2, transparency: 2 }, ["KAI-1.1", "KAI-4.1", "KAI-7.1", "대학-2.3"]),
    ],
  },
  privacy: {
    p1: [
      rubricChoice({ privacy: 0, transparency: 1, responsibility: 0 }, ["KAI-2.2", "KAI-2.3", "KAI-7.2"]),
      rubricChoice({ privacy: 4, transparency: 4, responsibility: 4 }, ["KAI-2.2", "KAI-2.3", "KAI-7.2"]),
      rubricChoice({ privacy: 1, transparency: 1, responsibility: 1 }, ["KAI-2.2", "KAI-2.3", "KAI-7.2"]),
    ],
    p2: [
      rubricChoice({ privacy: 4, transparency: 3, responsibility: 4 }, ["KAI-2.2", "KAI-2.3", "KAI-4.1"]),
      rubricChoice({ privacy: 1, transparency: 1, responsibility: 1 }, ["KAI-2.2", "KAI-2.3", "KAI-4.1"]),
      rubricChoice({ privacy: 2, transparency: 2, responsibility: 2 }, ["KAI-2.2", "KAI-2.3", "KAI-4.1"]),
    ],
    p3: [
      rubricChoice({ fairness: 4, transparency: 3, responsibility: 4 }, ["KAI-3.1", "KAI-4.1", "KAI-7.2"]),
      rubricChoice({ fairness: 0, transparency: 1, responsibility: 0 }, ["KAI-3.1", "KAI-4.1", "KAI-7.2"]),
      rubricChoice({ fairness: 0, transparency: 1, responsibility: 1 }, ["KAI-3.1", "KAI-3.2", "KAI-4.1"]),
    ],
    p4: [
      rubricChoice({ privacy: 4, transparency: 4, responsibility: 4 }, ["KAI-2.2", "KAI-2.3", "KAI-4.1", "KAI-7.2"]),
      rubricChoice({ privacy: 1, transparency: 1, responsibility: 1 }, ["KAI-2.2", "KAI-2.3", "KAI-4.1"]),
      rubricChoice({ privacy: 4, transparency: 3, responsibility: 4 }, ["KAI-2.3", "KAI-4.3", "KAI-7.2"]),
    ],
  },
};

const ScoringEngine = window.TWAIVE_SCORING;
const LearningModel = window.TWAIVE_LEARNING_MODEL;
const DemoAnalytics = window.TWAIVE_DEMO_ANALYTICS;

if (!ScoringEngine || !LearningModel || !DemoAnalytics) {
  throw new Error("점수 계산 또는 학습 분석 모델을 불러오지 못했습니다.");
}

const state = {
  episodeIndex: 0,
  sceneId: episodes[0].start,
  scores: {},
  history: [],
  recordEpisodeId: episodes[0].id,
  learningEpisodeId: episodes[0].id,
  feedback: "",
  loadIssue: null,
  view: "home",
  storyMode: "intro",
  reportTab: "summary",
  introNextMode: "pre",
  assessments: {},
  progress: {},
  profile: null,
  pendingDecision: null,
  decisionReasons: [],
  decisionReasonStatus: "idle",
  decisionReasonSource: "",
  sceneStartedAt: null,
  teacherDashboard: {
    authorized: false,
    status: "idle",
    data: null,
    error: "",
  },
  teacherDashboardMode: "actual",
};

const SUPABASE_CONFIG = window.TWAIVE_SUPABASE || {};
const isSupabaseConfigured =
  SUPABASE_CONFIG.url &&
  SUPABASE_CONFIG.anonKey &&
  !SUPABASE_CONFIG.url.includes("YOUR_SUPABASE") &&
  !SUPABASE_CONFIG.anonKey.includes("YOUR_SUPABASE");
const supabaseClient = isSupabaseConfigured
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      global: { fetch: fetchWithDeadline },
    })
  : null;
const AI_EXPLANATION_API_URL = window.location.hostname === "kindarabbit.github.io"
  ? "https://twaive-2026.vercel.app/api/explain-result"
  : "/api/explain-result";

let authMode = "login";
let currentUser = null;
let checkedUsername = "";
let sessionVersion = 0;
let episodeLoadVersion = 0;
let transitionTimer = null;
let aiExplanationController = null;
let decisionReasonController = null;
let saveSequence = 0;
const initialLearningState = JSON.parse(JSON.stringify(state));
const episodeSaveStates = new Map();

async function fetchWithDeadline(input, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const sourceSignal = options.signal || input?.signal;
  const cancel = () => controller.abort();
  if (sourceSignal?.aborted) cancel();
  else sourceSignal?.addEventListener("abort", cancel, { once: true });
  const timer = window.setTimeout(cancel, timeoutMs);
  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
    sourceSignal?.removeEventListener("abort", cancel);
  }
}

function sessionContext() {
  return { version: sessionVersion, userId: currentUser?.id };
}

function sameSession(context) {
  return context.version === sessionVersion && context.userId === currentUser?.id;
}

function cancelStoryWork() {
  episodeLoadVersion += 1;
  clearEpisodeIntroTimer();
  window.clearTimeout(transitionTimer);
  transitionTimer = null;
  els.storyStage?.classList.remove("is-transitioning");
  aiExplanationController?.abort();
  aiExplanationController = null;
  decisionReasonController?.abort();
  decisionReasonController = null;
}

function resetSessionLearningState(user = null) {
  sessionVersion += 1;
  cancelStoryWork();
  currentUser = user;
  Object.assign(state, JSON.parse(JSON.stringify(initialLearningState)));
  resetScores(activeEpisode());
  decisionReasonCache.clear();
  episodeSaveStates.clear();
  episodeSaveQueue = Promise.resolve();
  updateSaveStatus();
}

function updateSaveStatus() {
  const region = document.getElementById("saveStatus");
  if (!region) return;
  const failed = [...episodeSaveStates.entries()].find(([, item]) => item.status === "error");
  const episodeId = failed?.[0] || activeEpisode().id;
  const item = failed?.[1] || episodeSaveStates.get(episodeId);
  region.hidden = !currentUser || (!item && !state.loadIssue) || state.view === "teacher";
  if (region.hidden) return;
  if (state.loadIssue && !failed) {
    region.dataset.status = "error";
    region.replaceChildren();
    appendTextElement(region, "span", "", "저장된 기록을 확인하지 못했어. 기존 기록을 보호하려고 시작을 멈췄어.");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "다시 확인";
    const issue = state.loadIssue;
    const context = sessionContext();
    retry.addEventListener("click", async () => {
      if (Number.isInteger(issue.index)) await startEpisode(issue.index);
      else { await loadAllProgress(); if (sameSession(context)) render(); }
    });
    region.appendChild(retry);
    return;
  }
  const title = episodes.find(episode => episode.id === episodeId)?.title || "학습 기록";
  region.dataset.status = item.status;
  region.replaceChildren();
  appendTextElement(region, "span", "", item.status === "saving"
    ? "기록 저장 중…"
    : item.status === "saved" ? "기록이 저장됐어."
      : `${title}: 아직 저장되지 않았어. 연결을 확인하고 다시 시도해줘.`);
  if (item.status === "error") {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "다시 저장";
    retry.addEventListener("click", () => persistEpisodeSnapshot(item.snapshot));
    region.appendChild(retry);
  }
}

function goHome() {
  cancelStoryWork();
  state.view = "home";
  const url = new URL(window.location.href);
  ["view", "report", "episode"].forEach(key => url.searchParams.delete(key));
  window.history.replaceState({}, "", url);
  syncNav();
  render();
}

function replayEpisode() {
  if (!window.confirm("다시 플레이하면 이 에피소드의 최신 기록과 결과가 새 선택으로 바뀌어. 다시 시작할까?")) return;
  return startEpisode(state.episodeIndex, { loadSaved: false });
}

function hasUnsavedProgress() {
  return Boolean(currentUser) && [...episodeSaveStates.values()].some(item => item.status !== "saved");
}

const els = {
  loginScreen: document.getElementById("loginScreen"),
  authIntro: document.getElementById("authIntro"),
  loginForm: document.getElementById("loginForm"),
  authModeCopy: document.getElementById("authModeCopy"),
  showLoginButton: document.getElementById("showLoginButton"),
  showSignupButton: document.getElementById("showSignupButton"),
  authSubmitButton: document.getElementById("authSubmitButton"),
  usernameInput: document.getElementById("usernameInput"),
  checkUsernameButton: document.getElementById("checkUsernameButton"),
  displayNameInput: document.getElementById("displayNameInput"),
  passwordInput: document.getElementById("passwordInput"),
  passwordConfirmInput: document.getElementById("passwordConfirmInput"),
  checkPasswordButton: document.getElementById("checkPasswordButton"),
  passwordCheckMessage: document.getElementById("passwordCheckMessage"),
  loginError: document.getElementById("loginError"),
  userLabel: document.getElementById("userLabel"),
  logoutButton: document.getElementById("logoutButton"),
  episodeTabs: document.getElementById("episodeTabs"),
  storyStage: document.querySelector(".story-stage"),
  sceneArtwork: document.getElementById("sceneArtwork"),
  choiceDock: document.querySelector(".choice-dock"),
  scoreLabel: document.getElementById("scoreLabel"),
  topicLabel: document.getElementById("topicLabel"),
  episodeTitle: document.getElementById("episodeTitle"),
  episodeSummary: document.getElementById("episodeSummary"),
  meterGroup: document.getElementById("meterGroup"),
  chapterLine: document.getElementById("chapterLine"),
  sceneTitle: document.getElementById("sceneTitle"),
  sceneText: document.getElementById("sceneText"),
  quoteText: document.getElementById("quoteText"),
  choices: document.getElementById("choices"),
  feedbackBox: document.getElementById("feedbackBox"),
  resetButton: document.getElementById("resetButton"),
  teacherReturnButton: document.getElementById("teacherReturnButton"),
  signupOnlyItems: document.querySelectorAll(".signup-only"),
  loginOnlyItems: document.querySelectorAll(".login-only"),
  bottomNav: document.querySelector(".bottom-nav"),
};

function isLoggedIn() {
  return Boolean(currentUser);
}

function showApp() {
  finishAuthIntro(false);
  document.body.classList.add("is-authenticated");
  els.userLabel.textContent =
    state.profile?.display_name ||
    currentUser?.user_metadata?.display_name ||
    state.profile?.username ||
    currentUser?.user_metadata?.username ||
    "사용자";
}

function focusAuthInput() {
  requestAnimationFrame(() => {
    if (!document.body.classList.contains("is-authenticated") && !els.loginForm.hidden) {
      els.usernameInput.focus({ preventScroll: true });
    }
  });
}

function finishAuthIntro(focus = true) {
  if (els.authIntro.hidden) return;
  els.authIntro.hidden = true;
  els.loginForm.hidden = false;
  if (focus) focusAuthInput();
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  checkedUsername = "";

  document.body.classList.toggle("is-signup", isSignup);
  els.signupOnlyItems.forEach((item) => {
    item.hidden = !isSignup;
  });
  els.loginOnlyItems.forEach((item) => {
    item.hidden = isSignup;
  });
  els.displayNameInput.required = isSignup;
  els.passwordConfirmInput.required = isSignup;
  document.getElementById("signupAgeCheck").required = isSignup;
  document.getElementById("signupTermsCheck").required = isSignup;
  els.authSubmitButton.textContent = isSignup ? "회원가입" : "로그인";
  els.authModeCopy.textContent = isSignup ? "회원가입" : "로그인";
  els.loginError.textContent = "";
  showPasswordCheckMessage("", "");
  els.loginForm.scrollTop = 0;
}

function showLogin(message = "") {
  setAuthMode("login");
  document.body.classList.remove("is-authenticated", "is-visual-novel", "is-game-home", "is-teacher-view");
  els.loginError.textContent = message;
  els.passwordInput.value = "";
  els.passwordConfirmInput.value = "";
  showPasswordCheckMessage("", "");
  if (els.authIntro.hidden) focusAuthInput();
}

function showAuthError(message) {
  els.loginError.textContent = message;
}

function supabaseConnectionMessage(error) {
  const message = error?.message || String(error || "");
  if (message.includes("Failed to fetch") || message.includes("fetch")) {
    return "Supabase 서버에 연결하지 못했습니다. Supabase 프로젝트가 일시정지되었는지, Project URL이 맞는지 확인하세요.";
  }
  return message;
}

function showPasswordCheckMessage(message, type) {
  els.passwordCheckMessage.textContent = message;
  els.passwordCheckMessage.classList.toggle("is-success", type === "success");
  els.passwordCheckMessage.classList.toggle("is-error", type === "error");
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
}

function usernameToAuthEmail(username) {
  return `${normalizeUsername(username)}@twaive-user.example.com`;
}

function isValidUsername(username) {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

async function loadSession() {
  const authVersion = sessionVersion;
  if (!supabaseClient) {
    showLogin("Supabase 설정이 필요합니다. js/config/supabase-config.js에 URL과 anon key를 입력하세요.");
    return;
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.auth.getSession());
  } catch (requestError) {
    if (authVersion !== sessionVersion) return;
    showLogin(supabaseConnectionMessage(requestError));
    return;
  }

  if (authVersion !== sessionVersion) return;
  if (error) {
    showLogin(supabaseConnectionMessage(error));
    return;
  }

  if (authVersion !== sessionVersion) return;
  resetSessionLearningState(data.session?.user || null);
  const context = sessionContext();
  if (currentUser) {
    await loadProfile();
    if (!sameSession(context)) return;
    await loadAllProgress();
    if (!sameSession(context)) return;
    await loadTeacherDashboard();
    if (!sameSession(context)) return;
    const openedReport = await applyRequestedReportRoute();
    if (!sameSession(context)) return;
    if (!openedReport) {
      await loadEpisodeProgress(state.episodeIndex);
      if (!sameSession(context)) return;
      state.view = "home";
    }
    showApp();
    render();
  } else {
    showLogin();
  }
}

async function login(username, password) {
  resetSessionLearningState();
  const authVersion = sessionVersion;
  if (!supabaseClient) {
    showAuthError("Supabase 설정이 필요합니다.");
    return;
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.auth.signInWithPassword({
      email: usernameToAuthEmail(username),
      password,
    }));
  } catch (requestError) {
    if (authVersion !== sessionVersion) return;
    showAuthError(supabaseConnectionMessage(requestError));
    return;
  }

  if (authVersion !== sessionVersion) return;
  if (error) {
    showAuthError("아이디 또는 비밀번호가 올바르지 않습니다.");
    return;
  }

  if (authVersion !== sessionVersion) return;
  resetSessionLearningState(data.user);
  const context = sessionContext();
  await loadProfile();
  if (!sameSession(context)) return;
  await loadAllProgress();
  if (!sameSession(context)) return;
  await loadTeacherDashboard();
  if (!sameSession(context)) return;
  const openedReport = await applyRequestedReportRoute();
  if (!sameSession(context)) return;
  if (!openedReport) {
    await loadEpisodeProgress(state.episodeIndex);
    if (!sameSession(context)) return;
    state.view = "home";
  }
  showApp();
  render();
}

async function loadProfile() {
  const context = sessionContext();
  if (!supabaseClient || !currentUser) {
    state.profile = null;
    return null;
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient
      .from("profiles")
      .select("username, auth_email, display_name, created_at, analytics_consent")
      .eq("id", context.userId)
      .maybeSingle());
    if (error && /analytics_consent/i.test(error.message || "")) {
      ({ data, error } = await supabaseClient
        .from("profiles")
        .select("username, auth_email, display_name, created_at")
        .eq("id", context.userId)
        .maybeSingle());
      if (data) data.analytics_consent = false;
    }
  } catch (requestError) {
    if (!sameSession(context)) return null;
    showAuthError(supabaseConnectionMessage(requestError));
    state.profile = null;
    return null;
  }

  if (!sameSession(context)) return null;
  if (error) {
    showAuthError(`프로필을 불러오지 못했습니다: ${error.message}`);
    state.profile = null;
    return null;
  }

  state.profile = data;
  return data;
}

function setTeacherNavigation() {
  els.bottomNav?.classList.remove("has-teacher");
}

async function loadTeacherDashboard(options = {}) {
  const context = sessionContext();
  if (!supabaseClient || !currentUser) {
    state.teacherDashboard = { authorized: false, status: "idle", data: null, error: "" };
    setTeacherNavigation(false);
    return null;
  }

  state.teacherDashboard.status = "loading";
  state.teacherDashboard.error = "";
  if (options.render) render();

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.rpc("get_teacher_dashboard"));
  } catch (requestError) {
    if (!sameSession(context)) return null;
    state.teacherDashboard = {
      authorized: false,
      status: "error",
      data: null,
      error: supabaseConnectionMessage(requestError),
    };
    setTeacherNavigation(false);
    if (options.render) render();
    return null;
  }

  if (!sameSession(context)) return null;
  if (error) {
    const unavailable = error.code === "42501" || /teacher access required|permission denied/i.test(error.message || "");
    state.teacherDashboard = {
      authorized: false,
      status: unavailable ? "forbidden" : "error",
      data: null,
      error: unavailable ? "" : `교수자 통계를 불러오지 못했습니다: ${error.message}`,
    };
    setTeacherNavigation(false);
    if (options.render) render();
    return null;
  }

  state.teacherDashboard = data?.scoringVersion === SCORING_VERSION
    ? { authorized: true, status: "ready", data, error: "" }
    : { authorized: true, status: "error", data: null, error: "점수 버전 3의 집계 설정이 필요합니다. 최신 supabase/schema.sql을 운영 DB에 적용해주세요." };
  setTeacherNavigation(true);
  if (options.render) render();
  return data;
}

async function checkUsernameAvailability() {
  if (!supabaseClient) {
    showAuthError("Supabase 설정이 필요합니다.");
    return false;
  }

  const username = normalizeUsername(els.usernameInput.value);
  checkedUsername = "";

  if (!isValidUsername(username)) {
    showAuthError("아이디는 영문 소문자, 숫자, 밑줄(_) 3-20자로 입력하세요.");
    return false;
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient
      .rpc("is_username_available", { requested_username: username }));
  } catch (requestError) {
    showAuthError(supabaseConnectionMessage(requestError));
    return false;
  }

  if (error) {
    showAuthError(`아이디 중복확인 오류: ${error.message}`);
    return false;
  }

  if (!data) {
    showAuthError("이미 사용 중인 아이디입니다.");
    return false;
  }

  checkedUsername = username;
  showAuthError("사용 가능한 아이디입니다.");
  return true;
}

function checkPasswordMatch() {
  const password = els.passwordInput.value;
  const passwordConfirm = els.passwordConfirmInput.value;

  if (!password || !passwordConfirm) {
    showPasswordCheckMessage("비밀번호와 비밀번호 확인을 모두 입력하세요.", "error");
    return false;
  }

  if (password.length < 6) {
    showPasswordCheckMessage("비밀번호는 6자 이상 입력하세요.", "error");
    return false;
  }

  if (password !== passwordConfirm) {
    showPasswordCheckMessage("비밀번호가 다릅니다.", "error");
    return false;
  }

  showPasswordCheckMessage("비밀번호가 일치합니다.", "success");
  return true;
}

async function signup(username, displayName, password, passwordConfirm) {
  if (!document.getElementById("signupAgeCheck").checked || !document.getElementById("signupTermsCheck").checked) {
    showAuthError("만 14세 이상 확인과 이용약관·개인정보 처리 동의가 필요해요.");
    return;
  }
  if (!supabaseClient) {
    showAuthError("Supabase 설정이 필요합니다.");
    return;
  }

  username = normalizeUsername(username);
  if (!isValidUsername(username)) {
    showAuthError("아이디는 영문 소문자, 숫자, 밑줄(_) 3-20자로 입력하세요.");
    return;
  }

  if (checkedUsername !== username) {
    showAuthError("아이디 중복확인을 먼저 해주세요.");
    return;
  }

  if (!displayName.trim()) {
    showAuthError("실명 대신 사용할 별명을 입력해줘.");
    return;
  }

  if (password.length < 6) {
    showAuthError("비밀번호는 6자 이상 입력하세요.");
    return;
  }

  if (password !== passwordConfirm) {
    showAuthError("비밀번호 확인이 일치하지 않습니다.");
    return;
  }

  let data;
  let error;
  const authVersion = ++sessionVersion;
  try {
    ({ data, error } = await supabaseClient.auth.signUp({
      email: usernameToAuthEmail(username),
      password,
      options: {
        data: {
          username,
          display_name: displayName,
          age_over_14: true,
          terms_version: "2026-10-08",
          terms_accepted_at: new Date().toISOString(),
        },
      },
    }));
  } catch (requestError) {
    showAuthError(supabaseConnectionMessage(requestError));
    return;
  }

  if (error) {
    showAuthError(error.message);
    return;
  }

  if (authVersion !== sessionVersion) return;
  if (!data.session) {
    showLogin("회원가입이 완료되었습니다. 로그인해 주세요.");
    return;
  }
  resetSessionLearningState(data.user);
  const context = sessionContext();
  await saveProfile(currentUser, username, displayName);
  if (!sameSession(context)) return;
  await loadProfile();
  if (!sameSession(context)) return;
  showApp();
  render();
}

async function saveProfile(user, username, displayName) {
  const context = sessionContext();
  if (context.userId !== user.id) return;
  let error;
  try {
    ({ error } = await supabaseClient.from("profiles").upsert({
      id: user.id,
      username,
      auth_email: user.email,
      display_name: displayName,
    }));
  } catch (requestError) {
    if (!sameSession(context)) return;
    showAuthError(supabaseConnectionMessage(requestError));
    return;
  }

  if (!sameSession(context)) return;
  if (error) {
    showAuthError("프로필 저장 중 오류가 발생했습니다. Supabase SQL 설정을 확인하세요.");
  }
}

async function updateProfileSettings(displayName, analyticsConsent) {
  const context = sessionContext();
  if (!supabaseClient || !currentUser) {
    state.feedback = "로그인이 필요합니다.";
    render();
    return;
  }

  const nextName = displayName.trim();
  if (!nextName) {
    state.feedback = "별명을 입력해줘.";
    render();
    return;
  }

  let error;
  let consentSaved = true;
  try {
    ({ error } = await supabaseClient
      .from("profiles")
      .update({ display_name: nextName, analytics_consent: Boolean(analyticsConsent) })
      .eq("id", context.userId));
    if (error && /analytics_consent/i.test(error.message || "")) {
      consentSaved = false;
      ({ error } = await supabaseClient
        .from("profiles")
        .update({ display_name: nextName })
        .eq("id", context.userId));
    }
  } catch (requestError) {
    if (!sameSession(context)) return;
    state.feedback = supabaseConnectionMessage(requestError);
    render();
    return;
  }

  if (!sameSession(context)) return;
  if (error) {
    state.feedback = `프로필 수정 오류: ${error.message}`;
    render();
    return;
  }

  try {
    const result = await supabaseClient.auth.updateUser({ data: { ...currentUser.user_metadata, display_name: nextName } });
    if (!sameSession(context)) return;
    if (result.error) {
      state.feedback = "프로필은 저장했지만 로그인 정보 갱신을 확인하지 못했어. 다시 로그인해줘.";
      render();
      return;
    }
  } catch (error) {
    if (!sameSession(context)) return;
    state.feedback = "프로필은 저장했지만 로그인 정보 갱신을 확인하지 못했어. 다시 로그인해줘.";
    render();
    return;
  }

  await loadProfile();
  if (!sameSession(context)) return;
  state.feedback = consentSaved
    ? "프로필과 연구 데이터 동의 설정이 수정되었습니다."
    : "별명은 저장했지만 연구 동의 저장에는 최신 Supabase SQL 설정이 필요합니다.";
  showApp();
  render();
}

async function logout() {
  if (hasUnsavedProgress() && !window.confirm("아직 저장을 확인하지 못한 기록이 있어. 로그아웃하면 저장되지 않은 내용은 사라질 수 있어. 계속할까?")) return;
  els.authSubmitButton.disabled = true;
  resetSessionLearningState();
  const context = sessionContext();
  setTeacherNavigation(false);
  showLogin();
  try {
    const result = await supabaseClient?.auth.signOut();
    if (sameSession(context) && result?.error) showAuthError("로그아웃 연결을 확인해줘. 공용 기기라면 이 탭을 닫아줘.");
  } catch (error) {
    if (sameSession(context)) showAuthError("로그아웃 연결을 확인해줘. 공용 기기라면 이 탭을 닫아줘.");
  } finally {
    if (sameSession(context)) els.authSubmitButton.disabled = false;
  }
}

function activeEpisode() {
  return episodes[state.episodeIndex];
}

function activeScene() {
  return activeEpisode().scenes[state.sceneId];
}

function getEpisodeVisual(episode = activeEpisode()) {
  return EPISODE_VISUALS[episode?.id] || EPISODE_VISUALS.deepfake;
}

function getCharacterExpression(scene = activeScene()) {
  if (state.storyMode === "intro" || state.storyMode === "pre") return "neutral";
  if (state.storyMode === "post" || state.storyMode === "report") return "relieved";
  if (state.storyMode === "reason") return "serious";

  const copy = [scene?.title, scene?.text, scene?.quote].filter(Boolean).join(" ");
  if (/(울|외롭|불안|힘들|상처|속상|위험|피해)/.test(copy)) return "sad";
  if (/(놀라|진짜|갑자기|퍼졌|확산|들켰)/.test(copy)) return "surprised";
  if (/(확인|신고|검증|책임|설명|선생님|동의)/.test(copy)) return "serious";
  return "worried";
}

function applyEpisodeVisual(scene = activeScene()) {
  const visual = getEpisodeVisual();
  if (els.sceneArtwork && els.sceneArtwork.getAttribute("src") !== visual) {
    els.sceneArtwork.setAttribute("src", visual);
  }
  els.storyStage.dataset.episode = activeEpisode().id;
  els.storyStage.dataset.expression = getCharacterExpression(scene);
}

function clearEpisodeIntroTimer() {
  if (!episodeIntroTimer) return;
  window.clearTimeout(episodeIntroTimer);
  episodeIntroTimer = null;
}

async function finishEpisodeIntro() {
  if (!els.storyStage.classList.contains("is-intro-stage")) return;
  clearEpisodeIntroTimer();
  state.view = "story";
  state.storyMode = state.introNextMode || "pre";
  if (state.storyMode === "pre") {
    state.feedback = "이야기 전에 지금 생각을 먼저 골라주세요.";
  }
  state.sceneStartedAt = state.storyMode === "story" ? Date.now() : null;
  render();
  await saveEpisodeProgress();
}

function scheduleEpisodeIntro() {
  clearEpisodeIntroTimer();
  episodeIntroTimer = window.setTimeout(finishEpisodeIntro, EPISODE_INTRO_DURATION);
}

function renderEpisodeIntro() {
  const episodeNumber = state.episodeIndex + 1;
  els.chapterLine.textContent = `제${episodeNumber}에피소드:`;
  els.sceneTitle.textContent = activeEpisode().title;
  els.sceneText.innerHTML = `
    <p class="episode-intro-summary">${escapeHtml(activeEpisode().summary)}</p>
    <button class="episode-intro-skip" id="episodeIntroSkip" type="button">바로 시작하기</button>
  `;
  els.quoteText.textContent = "";
  els.feedbackBox.textContent = "";
}

function renderDialogueBubble(scene) {
  els.quoteText.innerHTML = scene.quote ? `<p>${escapeHtml(scene.quote)}</p>` : "";
  els.quoteText.hidden = !scene.quote;
}

function renderStoryQuestion(scene) {
  const stepLabel = sceneStepLabel(scene);
  els.chapterLine.textContent = stepLabel;
  els.chapterLine.hidden = true;
  els.sceneTitle.textContent = "어떻게 할까?";
  els.sceneText.innerHTML = `
    <div class="scene-heading">
      <span class="scene-step-label">${escapeHtml(stepLabel)}</span>
      <span class="scene-copy-label">${escapeHtml(scene.title)}</span>
    </div>
    <p>${escapeHtml(scene.text)}</p>
  `;
}

function renderStoryScene(scene) {
  renderStoryQuestion(scene);
  renderDialogueBubble(scene);
}

function transitionToScene(action, selectedButton) {
  if (els.storyStage.classList.contains("is-transitioning")) return;
  els.storyStage.classList.add("is-transitioning");
  els.choices.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
  selectedButton?.classList.add("is-selected");
  const context = sessionContext();
  const episodeId = activeEpisode().id;
  transitionTimer = window.setTimeout(() => {
    transitionTimer = null;
    els.storyStage.classList.remove("is-transitioning");
    if (!sameSession(context) || state.view !== "story" || activeEpisode().id !== episodeId) return;
    action();
  }, 180);
}

function sceneStepLabel(scene) {
  if (scene.end || /^ending$/i.test(scene.chapter || "")) {
    return "마지막 장면";
  }

  const step = String(scene.chapter || "").match(/\d+/)?.[0];
  return step ? `상황 ${step}` : "상황";
}

function resetScores(episode) {
  state.scores = {
    _version: SCORING_VERSION,
    ...Object.fromEntries(episode.meters.map((meter) => [meter, null])),
  };
}

function activeGuidelineRubric(sceneId, choiceIndex) {
  const choiceRubric = GUIDELINE_RUBRICS[activeEpisode().id]?.[sceneId]?.[choiceIndex];
  if (!choiceRubric) {
    throw new Error(`평가 기준을 찾을 수 없습니다: ${activeEpisode().id}/${sceneId}/${choiceIndex}`);
  }

  return ScoringEngine.buildRubricRecord(choiceRubric, SCORING_VERSION, RUBRIC_LEVELS);
}

function guidelineScoreItems(episode = activeEpisode(), history = state.history) {
  return ScoringEngine.scorePrinciples(
    episode.meters,
    history,
    SCORING_VERSION,
    GUIDELINE_PRINCIPLES,
  );
}

function refreshGuidelineScores() {
  state.scores = {
    _version: SCORING_VERSION,
    ...Object.fromEntries(guidelineScoreItems().map((item) => [item.key, item.score])),
  };
}

function activeAssessmentResponse() {
  const episodeId = activeEpisode().id;
  if (!state.assessments[episodeId]) {
    state.assessments[episodeId] = {};
  }
  return state.assessments[episodeId];
}

async function answerAssessment(type, option, index) {
  const response = activeAssessmentResponse();
  response[type] = {
    answer: option.text,
    index,
    level: option.level,
    answeredAt: new Date().toISOString(),
  };

  state.storyMode = type === "pre" ? "story" : "report";
  if (type === "post") state.reportTab = "summary";
  state.sceneStartedAt = type === "pre" ? Date.now() : null;
  state.feedback =
    type === "pre"
      ? "사전 질문을 완료했습니다. 이제 첫 번째 선택을 골라보세요."
      : "사후 생각이 기록되었습니다. 결과 리포트를 확인해보세요.";

  render();
  await saveEpisodeProgress();
}

function assessmentChangeText(response) {
  const preAnswer = response.pre?.answer;
  const postAnswer = response.post?.answer;

  if (!preAnswer && !postAnswer) {
    return "아직 사전/사후 응답이 없습니다.";
  }
  if (!postAnswer) {
    return `사전 응답: ${preAnswer}`;
  }
  const delta = Number.isFinite(response.pre?.level) && Number.isFinite(response.post?.level)
    ? response.post.level - response.pre.level
    : null;
  if (delta === 0) {
    return `사전·사후 판단 수준이 ${response.post.level}/4로 유지되었습니다.`;
  }
  if (delta !== null) {
    return `사전 ${response.pre.level}/4에서 사후 ${response.post.level}/4로 ${delta > 0 ? `${delta}단계 높아졌습니다` : `${Math.abs(delta)}단계 낮아졌습니다`}.`;
  }
  if (preAnswer === postAnswer) {
    return `사전·사후 응답이 "${postAnswer}"로 유지되었습니다.`;
  }
  return `사전에는 "${preAnswer}"라고 답했고, 사후에는 "${postAnswer}"로 바뀌었습니다.`;
}

function assessmentChangeHtml(response) {
  const preAnswer = response.pre?.answer;
  const postAnswer = response.post?.answer;

  if (!preAnswer && !postAnswer) {
    return "아직 사전/사후 응답이 없습니다.";
  }
  if (!postAnswer) {
    return `사전 응답: ${escapeHtml(preAnswer)}`;
  }
  const delta = Number.isFinite(response.pre?.level) && Number.isFinite(response.post?.level)
    ? response.post.level - response.pre.level
    : null;
  if (delta === 0) {
    return `사전·사후 판단 수준이 <strong>${response.post.level}/4</strong>로 유지되었습니다.`;
  }
  if (delta !== null) {
    return `사전 <strong>${response.pre.level}/4</strong>에서 사후 <strong>${response.post.level}/4</strong>로 ${delta > 0 ? `<strong>${delta}단계 높아졌습니다</strong>` : `<strong>${Math.abs(delta)}단계 낮아졌습니다</strong>`}.`;
  }
  if (preAnswer === postAnswer) {
    return `사전과 사후 응답이 <strong>${escapeHtml(postAnswer)}</strong>로 유지되었습니다.`;
  }
  return `사전 <strong>${escapeHtml(preAnswer)}</strong>에서 사후 <strong>${escapeHtml(postAnswer)}</strong>로 바뀌었습니다.`;
}

function currentLearningAnalysis() {
  const principles = guidelineScoreItems();
  const assessment = activeAssessmentResponse();
  const model = LearningModel.analyze(principles, state.history, assessment, {
    currentEpisodeId: activeEpisode().id,
    completedEpisodeIds: Object.values(state.progress)
      .filter((progress) => progress?.completed)
      .map((progress) => progress.episode_id),
  });
  return { ...model.features, profile: model.profile, confidence: model.confidence.band, model };
}

function overallLearningAnalysis() {
  const records = episodes.map((episode) => {
    if (episode.id === activeEpisode().id && state.history.length) {
      return {
        history: state.history,
        assessment: state.assessments[episode.id] || {},
      };
    }
    return state.progress[episode.id] || {};
  });
  const history = records.flatMap((record) =>
    Array.isArray(record.history) ? record.history : [],
  );
  const principleItems = ScoringEngine.scorePrinciples(
    Object.keys(GUIDELINE_PRINCIPLES),
    history,
    SCORING_VERSION,
    GUIDELINE_PRINCIPLES,
  );
  const attemptCount = records.reduce(
    (sum, record) => sum + Number(record.assessment?.attemptCount || 0),
    0,
  );

  const assessment = { attemptCount };
  const model = LearningModel.analyze(principleItems, history, assessment, {
    completedEpisodeIds: Object.values(state.progress)
      .filter((progress) => progress?.completed)
      .map((progress) => progress.episode_id),
  });
  return { ...model.features, profile: model.profile, confidence: model.confidence.band, model };
}

function percentLabel(rate) {
  return `${Math.round((rate || 0) * 100)}%`;
}

function learnerAnalysisHtml(analysis, options = {}) {
  if (!analysis.decisionCount) {
    return `
      <section class="learning-analysis is-empty" aria-label="선택 데이터 분석">
        <div class="section-title">
          <span>선택 데이터 분석</span>
          <strong>분석 대기</strong>
        </div>
        <p>에피소드에서 선택과 판단 이유를 기록하면 학습 패턴을 분석합니다.</p>
      </section>
    `;
  }

  const responseTime = analysis.averageResponseSeconds === null
    ? "-"
    : `${analysis.averageResponseSeconds}초`;
  const reasonRows = options.detailed
    ? analysis.reasonDistribution
        .slice(0, 3)
        .map(
          (reason) => `
            <li>
              <span>${escapeHtml(reason.label)}</span>
              <strong>${reason.count}회</strong>
            </li>
          `,
        )
        .join("")
    : "";
  const model = analysis.model;
  const modelDetails = model
    ? `
      <div class="analysis-model-result">
        <p><span>분류 근거</span><strong>${escapeHtml(model.profile.rule)}</strong></p>
        <p><span>맞춤 행동</span><strong>${escapeHtml(model.recommendation.action)}</strong></p>
        <p><span>추천 콘텐츠</span><strong>${escapeHtml(model.recommendation.episodeTitle || "현재 에피소드 다시보기")}</strong></p>
      </div>
      <details class="analysis-model-details">
        <summary>분석 모델이 판단한 과정</summary>
        <ol>${model.trace.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        <p>모델 v${escapeHtml(model.version)} · 특징 추출 ${escapeHtml(model.modules.featureExtractor)} · 유형 분류 ${escapeHtml(model.modules.learnerClassifier)} · 추천 ${escapeHtml(model.modules.contentRecommender)} · 기록 충분도 ${escapeHtml(model.confidence.band)} ${model.confidence.score}% (분류 정확도가 아니에요.)</p>
      </details>
    `
    : "";

  return `
    <section class="learning-analysis" aria-label="선택 데이터 분석">
      <div class="section-title">
        <span>이번 선택의 연습 포인트</span>
        <strong>${escapeHtml(analysis.profile.name)}</strong>
      </div>
      <p class="analysis-description">${escapeHtml(analysis.profile.description)}</p>
      <div class="analysis-kpis">
        <article><span>분석 선택</span><strong>${analysis.decisionCount}개</strong></article>
        <article><span>적극 실천</span><strong>${percentLabel(analysis.proactiveRate)}</strong></article>
        <article><span>위험 선택</span><strong>${percentLabel(analysis.riskRate)}</strong></article>
        <article><span>평균 고민 시간</span><strong>${responseTime}</strong></article>
      </div>
      <p class="analysis-reason"><span>가장 많이 기록한 판단 기준</span><strong>${escapeHtml(analysis.dominantReason?.label || "아직 기록 없음")}</strong></p>
      ${reasonRows ? `<ul class="reason-distribution">${reasonRows}</ul>` : ""}
      ${modelDetails}
      <p class="analysis-note">기록 충분도 ${escapeHtml(model?.confidence.band || analysis.confidence)} · ${analysis.attemptCount}회차 기록 · 이번 선택만 분석한 학습용 결과야. 성격이나 마음 상태를 판단하는 검사는 아니야.</p>
    </section>
  `;
}

function guidelinePerformanceLevel(score) {
  return ScoringEngine.performanceBand(score);
}

function guidelineDiagnosis() {
  const items = guidelineScoreItems().filter((item) => item.score !== null);
  if (!items.length) {
    return null;
  }

  const weakest = items.slice().sort((a, b) => a.score - b.score)[0];
  const recommendedEpisodeIds = {
    humanCenteredness: "chatbot",
    privacy: "privacy",
    fairness: "privacy",
    responsibility: "deepfake",
    safety: "rumor",
    reliability: "rumor",
    transparency: "rumor",
  };
  const recommendedEpisode = episodes.find(
    (episode) => episode.id === recommendedEpisodeIds[weakest.key],
  );
  const isCurrentEpisode = recommendedEpisode?.id === activeEpisode().id;

  return {
    weakest,
    level: guidelinePerformanceLevel(weakest.score),
    recommendation: isCurrentEpisode
      ? `「${activeEpisode().title}」을 다른 선택으로 다시 진행해보세요.`
      : `다음 학습으로 「${recommendedEpisode?.title || activeEpisode().title}」을 추천합니다.`,
  };
}

function resultSnapshotHtml() {
  const items = guidelineScoreItems().filter((item) => item.score !== null);
  const sortedItems = items.slice().sort((a, b) => b.score - a.score);
  const strongest = sortedItems[0];
  const weakest = sortedItems[sortedItems.length - 1];
  const analysis = currentLearningAnalysis();

  if (!strongest || !weakest) return "";

  return `
    <section class="result-snapshot" aria-labelledby="resultSnapshotTitle">
      <div class="result-snapshot-heading">
        <span>한눈에 보기</span>
        <strong id="resultSnapshotTitle">${escapeHtml(analysis.profile.name)}</strong>
      </div>
      <div class="snapshot-metrics">
        <article class="is-strength">
          <span>강점 원칙</span>
          <strong>${escapeHtml(strongest.name)}</strong>
          <b>${strongest.score}점</b>
        </article>
        <article class="is-improve">
          <span>보완 원칙</span>
          <strong>${escapeHtml(weakest.name)}</strong>
          <b>${weakest.score}점</b>
        </article>
        <article class="is-action">
          <span>적극 실천 선택</span>
          <strong>${percentLabel(analysis.proactiveRate)}</strong>
          <b>${analysis.decisionCount}개 선택 분석</b>
        </article>
      </div>
      <p class="snapshot-diagnosis"><strong>다음 연습 포인트</strong><span>${escapeHtml(analysis.profile.description)}</span></p>
    </section>
  `;
}

const AI_COACH_SUGGESTIONS = [
  "왜 이 점수가 나왔나요?",
  "가장 부족한 윤리 원칙은 무엇인가요?",
  "제 선택에서 잘한 점은 무엇인가요?",
  "다음에는 어떻게 판단하면 좋을까요?",
];

function aiCoachHtml() {
  const suggestionButtons = AI_COACH_SUGGESTIONS.map((question) => `
    <button
      class="ai-question-suggestion"
      type="button"
      data-question="${escapeHtml(question)}"
    >${escapeHtml(question)}</button>
  `).join("");

  return `
    <section class="ai-coach" aria-labelledby="aiCoachTitle">
      <div class="ai-coach-heading">
        <div>
          <span>AI 피드백</span>
          <h4 id="aiCoachTitle">AI에게 내 결과 설명 듣기</h4>
        </div>
      </div>
      <form class="ai-coach-form" id="aiCoachForm">
        <label for="aiQuestionInput">궁금한 점</label>
        <div class="ai-coach-input-row">
          <select
            id="aiQuestionInput"
            aria-label="결과에 관해 궁금한 점"
          >
            ${["왜 이 점수가 나왔나요?", "가장 부족한 윤리 원칙은 무엇인가요?", "제 선택에서 잘한 점은 무엇인가요?", "다음에는 어떻게 판단하면 좋을까요?"].map(question => `<option>${escapeHtml(question)}</option>`).join("")}
          </select>
          <button
            id="aiExplainButton"
            type="submit"
            aria-label="AI 설명 받기"
            title="AI 설명 받기"
          >
            <svg class="ai-search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
          </button>
        </div>
        <div class="ai-question-suggestions" aria-labelledby="aiSuggestionLabel">
          <span id="aiSuggestionLabel">추천 질문</span>
          <div class="ai-question-suggestion-list">
            ${suggestionButtons}
          </div>
        </div>
      </form>
      <p class="ai-data-note">AI는 스토리 속 선택만 설명해. 별명·아이디는 보내지 않고, 개인적인 상담은 하지 않아.</p>
      <div class="ai-coach-output" id="aiCoachOutput" aria-live="polite" hidden></div>
    </section>
  `;
}

function buildAiExplanationPayload(question) {
  const episode = activeEpisode();
  const analysis = currentLearningAnalysis();
  const response = activeAssessmentResponse();
  const reflectionDelta = Number.isFinite(response.pre?.level) && Number.isFinite(response.post?.level)
    ? response.post.level - response.pre.level
    : null;

  return {
    question,
    episode: {
      title: episode.title,
      topic: episode.topic,
      concept: episode.assessment.concept,
    },
    score: scoreAverage(),
    ending: endingName(),
    principles: guidelineScoreItems()
      .filter((item) => item.score !== null)
      .map((item) => ({
        name: item.name,
        score: item.score,
        description: item.description,
      })),
    analysis: {
      profile: analysis.profile.name,
      profileDescription: analysis.profile.description,
      proactiveRate: Math.round(analysis.proactiveRate * 100),
      riskRate: Math.round(analysis.riskRate * 100),
      dominantReason: analysis.dominantReason?.label || "",
      reflectionDelta,
    },
    choices: state.history.map((item) => ({
      scene: item.scene,
      choice: item.choice,
      level: item.rubric?.levelLabel || "",
      reason: item.reasonLabel || "",
    })),
  };
}

function appendTextElement(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function appendExplanationList(parent, title, items) {
  const section = document.createElement("section");
  section.className = "ai-explanation-section";
  appendTextElement(section, "h5", "", title);
  const list = document.createElement("ol");
  list.className = "ai-explanation-list";
  items.forEach((item) => appendTextElement(list, "li", "", item));
  section.appendChild(list);
  parent.appendChild(section);
}

function renderAiExplanation(data, result = { score: scoreAverage(), ending: endingName() }) {
  const output = document.getElementById("aiCoachOutput");
  if (!output) return;

  output.replaceChildren();
  output.hidden = false;
  output.classList.remove("is-error");
  if (data.explanationSource === "local-fallback") {
    appendTextElement(output, "p", "ai-explanation-notice", "AI 답변을 완성하지 못해 저장된 점수 기준으로 기본 설명을 보여줄게.");
  }
  const overview = document.createElement("section");
  overview.className = "ai-explanation-section ai-explanation-overview";
  appendTextElement(overview, "h5", "", "한눈에 보기");
  appendTextElement(overview, "p", "ai-explanation-result", `${result.score}점 · ${result.ending.split(" · ").pop()}`);
  appendTextElement(overview, "strong", "ai-explanation-summary", data.explanation.summary);
  output.appendChild(overview);

  const answer = document.createElement("section");
  answer.className = "ai-explanation-section";
  appendTextElement(answer, "h5", "", "질문에 대한 답");
  appendTextElement(answer, "p", "ai-explanation-answer", data.explanation.answer);
  output.appendChild(answer);
  appendExplanationList(output, "내 선택 돌아보기", data.explanation.scoreReasons || []);
  appendExplanationList(output, "다음에는 이렇게", data.explanation.nextActions || []);
  appendTextElement(output, "p", "ai-explanation-disclaimer", "스토리 속 선택을 바탕으로 한 학습용 설명이야. 공식 평가·법률 판단·심리검사는 아니야.");

  const videoSection = document.createElement("section");
  videoSection.className = "ai-video-section";
  appendTextElement(videoSection, "h5", "", "관련 학습 영상");
  if (data.videos?.length) {
    const grid = document.createElement("div");
    grid.className = "ai-video-grid";
    data.videos.forEach((video) => {
      const link = document.createElement("a");
      link.href = video.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (video.thumbnail) {
        const image = document.createElement("img");
        image.src = video.thumbnail;
        image.alt = "";
        image.loading = "lazy";
        link.appendChild(image);
      }
      const copy = document.createElement("span");
      appendTextElement(copy, "strong", "", video.title);
      appendTextElement(copy, "small", "", video.channel);
      link.appendChild(copy);
      grid.appendChild(link);
    });
    videoSection.appendChild(grid);
  } else if (data.videoSearchUrl) {
    const searchLink = document.createElement("a");
    searchLink.className = "ai-video-search";
    searchLink.href = data.videoSearchUrl;
    searchLink.target = "_blank";
    searchLink.rel = "noopener noreferrer";
    searchLink.textContent = "YouTube에서 관련 영상 검색하기";
    videoSection.appendChild(searchLink);
  }
  appendTextElement(videoSection, "p", "ai-data-note", "외부 영상은 내용과 출처를 믿을 만한 어른과 함께 확인해줘.");
  output.appendChild(videoSection);
}

function showAiCoachError(message) {
  const output = document.getElementById("aiCoachOutput");
  if (!output) return;
  output.replaceChildren();
  output.hidden = false;
  output.classList.add("is-error");
  appendTextElement(output, "strong", "", "설명을 불러오지 못했습니다.");
  appendTextElement(output, "p", "", message);
}

async function requestAiExplanation(event) {
  event.preventDefault();
  const button = document.getElementById("aiExplainButton");
  const input = document.getElementById("aiQuestionInput");
  const output = document.getElementById("aiCoachOutput");
  const suggestionButtons = document.querySelectorAll(".ai-question-suggestion");
  if (!button || !input || !output) return;
  const context = sessionContext();
  const payload = buildAiExplanationPayload(input.value.trim());
  const controller = new AbortController();
  aiExplanationController?.abort();
  aiExplanationController = controller;
  const isCurrent = () => sameSession(context) && aiExplanationController === controller &&
    document.getElementById("aiCoachOutput") === output;
  let timedOut = false;
  const timeoutId = window.setTimeout(() => { timedOut = true; controller.abort(); }, 45000);

  if (window.location.protocol === "file:") {
    window.clearTimeout(timeoutId);
    showAiCoachError("AI 설명은 배포된 사이트에서 이용할 수 있습니다. 로컬 파일 화면에서는 서버 API가 실행되지 않습니다.");
    return;
  }

  button.disabled = true;
  suggestionButtons.forEach((suggestionButton) => {
    suggestionButton.disabled = true;
  });
  button.setAttribute("aria-label", "분석 중");
  button.setAttribute("title", "분석 중");
  output.hidden = false;
  output.classList.remove("is-error");
  output.setAttribute("aria-busy", "true");
  output.textContent = "네 선택을 살펴보고 있어. 잠깐만 기다려줘.";

  try {
    if (!supabaseClient) {
      throw new Error("Supabase 연결 설정을 확인해주세요.");
    }
    const { data, error } = await supabaseClient.auth.getSession();
    if (!isCurrent()) return;
    if (error || !data.session?.access_token) {
      throw new Error("로그인 정보가 만료되었습니다. 다시 로그인해주세요.");
    }

    const response = await fetch(AI_EXPLANATION_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const responseData = await response.json().catch(() => ({}));
    if (!isCurrent()) return;
    if (!response.ok) {
      if (responseData.code === "SERVER_NOT_CONFIGURED") {
        throw new Error("배포 서버의 OpenAI 또는 Supabase 환경변수 설정이 필요합니다.");
      }
      throw new Error(responseData.message || "AI 설명 서버에 연결하지 못했습니다.");
    }
    renderAiExplanation(responseData, { score: payload.score, ending: payload.ending });
    const tabsHeight = document.querySelector(".report-detail-tabs")?.getBoundingClientRect().height || 0;
    els.sceneText.scrollTo({
      top: els.sceneText.scrollTop + output.getBoundingClientRect().top - els.sceneText.getBoundingClientRect().top - tabsHeight - 12,
      behavior: "smooth",
    });
  } catch (error) {
    if (isCurrent()) showAiCoachError(timedOut ? "답변이 늦어지고 있어. 잠시 후 다시 눌러줘." : error.message || "잠시 후 다시 시도해주세요.");
  } finally {
    window.clearTimeout(timeoutId);
    output.removeAttribute("aria-busy");
    button.disabled = false;
    suggestionButtons.forEach((suggestionButton) => {
      suggestionButton.disabled = false;
    });
    button.setAttribute("aria-label", "AI 설명 받기");
    button.setAttribute("title", "AI 설명 받기");
    if (aiExplanationController === controller) aiExplanationController = null;
  }
}

function requestSuggestedAiExplanation(event) {
  const input = document.getElementById("aiQuestionInput");
  const form = document.getElementById("aiCoachForm");
  const question = event.currentTarget.dataset.question?.trim();
  if (!input || !form || !question) return;

  input.value = question;
  form.requestSubmit();
}

function bindReportActions() {
  document.getElementById("aiCoachForm")?.addEventListener("submit", requestAiExplanation);
  document.querySelectorAll(".ai-question-suggestion").forEach((button) => {
    button.addEventListener("click", requestSuggestedAiExplanation);
  });
  document.querySelectorAll("[data-report-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.reportTab = button.dataset.reportTab;
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.set("report", state.reportTab);
      url.searchParams.set("episode", activeEpisode().id);
      window.history.replaceState({}, "", url);
      render();
      els.sceneText.scrollTop = 0;
    });
  });
}

function openReportDetail() {
  state.reportTab = "analysis";
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.searchParams.set("report", "analysis");
  url.searchParams.set("episode", activeEpisode().id);
  window.history.replaceState({}, "", url);
  render();
  els.sceneText.scrollTop = 0;
}

async function applyRequestedReportRoute() {
  const context = sessionContext();
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get("report");
  const requestedEpisodeId = params.get("episode");
  const validTabs = ["summary", "analysis", "ai"];
  const isLearningRoute = requestedTab === "concept" ||
    (params.get("view") === "learn" && !validTabs.includes(requestedTab));
  if ((!validTabs.includes(requestedTab) && !isLearningRoute) || !requestedEpisodeId) return false;

  const episodeIndex = episodes.findIndex((episode) => episode.id === requestedEpisodeId);
  if (episodeIndex < 0) return false;

  state.episodeIndex = episodeIndex;
  const loaded = await loadEpisodeProgress(episodeIndex);
  if (!sameSession(context) || state.episodeIndex !== episodeIndex) return false;
  if (isLearningRoute) {
    setLearningView(requestedEpisodeId);
    return true;
  }
  if (!loaded) return false;

  state.view = "story";
  state.storyMode = "report";
  state.reportTab = requestedTab;
  return true;
}

function setLearningView(episodeId) {
  state.view = "learn";
  state.learningEpisodeId = episodeId;
  const url = new URL(window.location.href);
  url.searchParams.delete("report");
  url.searchParams.set("view", "learn");
  url.searchParams.set("episode", episodeId);
  window.history.replaceState({}, "", url);
  syncNav();
}

function reportInsightsHtml(episode, response, diagnosis) {
  return `
    <div class="insight-list">
      ${
        diagnosis
          ? `<article>
              <span>원칙별 진단</span>
              <p><strong>${escapeHtml(diagnosis.weakest.name)} ${diagnosis.weakest.score}점</strong> · ${escapeHtml(diagnosis.level)}</p>
              <p>${escapeHtml(diagnosis.weakest.description)}</p>
            </article>
            <article>
              <span>맞춤 학습 추천</span>
              <p>${escapeHtml(diagnosis.recommendation)}</p>
            </article>`
          : ""
      }
      <article>
        <span>생각 변화</span>
        <p>${assessmentChangeHtml(response)}</p>
      </article>
      <article>
        <span>기억할 원칙</span>
        <p>${escapeHtml(episode.assessment.principle)}</p>
      </article>
      <article>
        <span>현실 행동</span>
        <p>${escapeHtml(episode.assessment.action)}</p>
      </article>
    </div>
  `;
}

function reportDetailTabsHtml(activeTab) {
  const tabs = [
    ["analysis", "상세 분석"],
    ["ai", "AI 설명"],
  ];

  return `
    <div class="report-detail-tabs" role="tablist" aria-label="결과 상세 메뉴">
      ${tabs
        .map(
          ([value, label]) => `
            <button
              type="button"
              role="tab"
              class="${activeTab === value ? "is-active" : ""}"
              aria-selected="${activeTab === value}"
              data-report-tab="${value}"
            >${label}</button>
          `,
        )
        .join("")}
    </div>
  `;
}

function reportDetailHtml(episode, response) {
  const diagnosis = guidelineDiagnosis();
  const activeTab = ["analysis", "ai"].includes(state.reportTab)
    ? state.reportTab
    : "analysis";
  let content = "";

  if (activeTab === "ai") {
    content = aiCoachHtml();
  } else {
    content = `
      <section class="report-analysis-panel" aria-label="상세 분석 보기">
        ${scoreBreakdownHtml()}
        ${learnerAnalysisHtml(currentLearningAnalysis())}
        ${reportInsightsHtml(episode, response, diagnosis)}
      </section>
    `;
  }

  return `
    <div class="report-detail-view">
      ${reportDetailTabsHtml(activeTab)}
      <div class="report-detail-content" role="tabpanel">
        ${content}
      </div>
    </div>
  `;
}

function reportOverviewHtml(episode) {
  return `
    <section class="report-overview" aria-label="에피소드 결과 요약">
      <div class="report-episode-heading">
        <span>Episode complete</span>
        <strong>${escapeHtml(episode.title)}</strong>
      </div>
    <div class="report-summary">
      <article class="report-score">
        <span>이번 에피소드 점수</span>
        <strong>${scoreAverage()}점</strong>
        <small>선택에 반영된 윤리원칙의 평균</small>
      </article>
      <article class="report-ending">
        <span>최종 결과</span>
        <strong class="ending-label ${endingClassName()}">${endingName()}</strong>
        <small>선택 흐름에 따른 이야기 결말</small>
      </article>
      <article class="report-concept">
        <span>이번에 배운 핵심</span>
        <strong>${escapeHtml(episode.assessment.concept)}</strong>
        <small>결과를 해석할 때 확인할 윤리 기준</small>
      </article>
    </div>
    ${resultSnapshotHtml()}
    </section>
  `;
}

function reportHtml(episode, response) {
  return state.reportTab === "summary"
    ? reportOverviewHtml(episode)
    : reportDetailHtml(episode, response);
}

function scoreBreakdownHtml() {
  const items = guidelineScoreItems().filter((item) => item.score !== null);
  const formula = items.map((item) => item.score).join(" + ");

  return `
    <section class="score-breakdown" aria-label="점수 계산 방식">
      <div class="section-title">
        <span>국가 AI 윤리원칙 기반 분석</span>
        <strong>7대 원칙 중 에피소드 관련 영역</strong>
      </div>
      <div class="score-delta-list">
        ${items
          .map(
            (item) => {
              const decisions = state.history
                .filter((historyItem) => Number.isFinite(historyItem.rubric?.ratings?.[item.key]))
                .map((historyItem) => ({
                  choice: historyItem.choice,
                  level: historyItem.rubric.ratings[item.key],
                }))
                .sort((a, b) => a.level - b.level);
              const weakest = decisions[0];
              const strongest = decisions[decisions.length - 1];
              const scoreClass = item.score >= 80 ? "is-strong" : item.score >= 60 ? "is-watch" : "is-risk";

              return `
              <article class="${scoreClass}">
                <div class="principle-score-head">
                  <span>${escapeHtml(item.name)}</span>
                  <strong>${item.score}점</strong>
                </div>
                <div class="principle-score-track" aria-label="${escapeHtml(item.name)} ${item.score}점">
                  <span style="--score-width: ${item.score}%"></span>
                </div>
                <p class="principle-count">${item.count}개 선택 평가 · ${item.earned}/${item.possible}단계</p>
                <p class="principle-description">${escapeHtml(item.description)}</p>
                ${
                  strongest
                    ? `<p><b>높게 반영</b> ${escapeHtml(strongest.choice)} · ${strongest.level}/4</p>`
                    : ""
                }
                ${
                  weakest && weakest !== strongest
                    ? `<p><b>점검할 선택</b> ${escapeHtml(weakest.choice)} · ${weakest.level}/4</p>`
                    : ""
                }
                <p>정책 근거 ${escapeHtml(item.evidence.join(", "))}</p>
                ${
                  item.legalReferences.length
                    ? `<p>법률 참고 ${escapeHtml(item.legalReferences.join(", "))}</p>`
                    : ""
                }
              </article>
            `;
            },
          )
          .join("")}
      </div>
      <p class="score-formula">원칙별 수행률 평균: (${formula}) ÷ ${items.length} = ${scoreAverage()}점</p>
      <p class="score-note">선택마다 관련 조항을 0 위반 · 1 위험 · 2 부분 충족 · 3 준수 · 4 적극 실천으로 평가합니다.</p>
      <p class="score-note">이 점수는 정부가 정한 공식 등급이나 법률 위반 판정이 아니라, 정책 원칙을 학습용 행동 기준으로 바꾼 진단 결과입니다.</p>
      <details class="score-method-notes">
        <summary>평가 기준과 출처 확인</summary>
        <div>
          <p class="score-note">3대 가치: ${escapeHtml(NATIONAL_VALUES.join(" · "))}</p>
          <p class="score-note">주 기준: ${escapeHtml(ETHICS_SOURCES.primary.publisher)} 「${escapeHtml(ETHICS_SOURCES.primary.title)}」 (${escapeHtml(ETHICS_SOURCES.primary.publishedAt)})</p>
          <p class="score-note">교차 검토: 「${escapeHtml(ETHICS_SOURCES.law.title)}」 및 「${escapeHtml(ETHICS_SOURCES.education.title)}」</p>
          <p class="score-note">상황화 참고: ${escapeHtml(activeEpisode().practiceReference)}</p>
          <p class="score-note"><a href="${escapeAttribute(ETHICS_SOURCES.practice.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ETHICS_SOURCES.practice.publisher)} 인공지능 윤리 소통채널</a></p>
        </div>
      </details>
    </section>
  `;
}

function progressSnapshot() {
  const progressItems = episodes
    .map((episode) => ({
      episode,
      progress: state.progress[episode.id],
    }))
    .filter((item) => item.progress);
  const completedItems = progressItems.filter((item) => item.progress.completed);
  const averageScore = completedItems.length
    ? Math.round(
        completedItems.reduce((sum, item) => sum + Number(item.progress.score || 0), 0) /
          completedItems.length,
      )
    : 0;
  const recentItem = progressItems
    .slice()
    .sort((a, b) => new Date(b.progress.updated_at || 0) - new Date(a.progress.updated_at || 0))[0];

  return { progressItems, completedItems, averageScore, recentItem };
}

function progressSummaryText() {
  const { completedItems, averageScore, recentItem } = progressSnapshot();

  return [
    `완료한 에피소드: ${completedItems.length} / ${episodes.length}`,
    `평균 AI 윤리 감수성: ${completedItems.length ? `${averageScore}점` : "진단 전"}`,
    `최근 학습: ${recentItem ? recentItem.episode.title : "-"}`,
    `최근 엔딩: ${recentItem?.progress.ending || "-"}`,
    `종합 진단: ${overallDiagnosis(completedItems.length, averageScore)}`,
  ].join("\n");
}

function progressSummaryHtml() {
  const { completedItems, averageScore, recentItem } = progressSnapshot();
  const diagnosis = overallDiagnosis(completedItems.length, averageScore);

  return `
    <div class="status-grid">
      <article>
        <span>완료</span>
        <strong>${completedItems.length}/${episodes.length}</strong>
      </article>
      <article>
        <span>감수성</span>
        <strong>${completedItems.length ? `${averageScore}점` : "진단 전"}</strong>
      </article>
      <article>
        <span>최근 학습</span>
        <strong>${recentItem ? escapeHtml(recentItem.episode.title) : "없음"}</strong>
      </article>
    </div>
    <p class="compact-note">${escapeHtml(diagnosis)}</p>
  `;
}

function scoreBadgeHtml() {
  const completedItems = episodes
    .map((episode) => state.progress[episode.id])
    .filter((progress) => progress?.completed);

  if (!completedItems.length) {
    return `<span class="score-caption">AI 윤리 감수성</span><strong class="score-value">진단 전</strong>`;
  }

  const averageScore = Math.round(
    completedItems.reduce((sum, progress) => sum + Number(progress.score || 0), 0) /
      completedItems.length,
  );
  return `<span class="score-caption">AI 윤리 감수성</span><strong class="score-value">${averageScore}점</strong>`;
}

function overallDiagnosis(completedCount, averageScore) {
  if (!completedCount) {
    return "아직 진단할 학습 기록이 없습니다.";
  }
  if (completedCount < episodes.length) {
    return "일부 주제 학습이 진행 중입니다. 남은 에피소드를 완료하면 더 다양한 선택을 돌아볼 수 있어요.";
  }
  if (averageScore >= 75) {
    return "AI를 사용할 때 권리, 검증, 책임을 함께 고려하는 균형형 학습자입니다.";
  }
  if (averageScore >= 50) {
    return "기본 윤리 감각은 좋지만 상황별 판단 기준을 더 연습하면 좋습니다.";
  }
  if (averageScore >= 25) {
    return "공식 원칙을 일부 이해했지만 실제 상황에서 적용하는 연습이 더 필요합니다.";
  }
  return "편리함과 분위기에 흔들리는 선택이 많았습니다. 동의, 출처, 개인정보 기준을 다시 점검해보세요.";
}

async function loadEpisodeProgress(index) {
  const context = sessionContext();
  const loadVersion = ++episodeLoadVersion;
  if (!supabaseClient || !currentUser) {
    return false;
  }

  const episode = episodes[index];
  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient
      .from("user_episode_progress")
      .select("scene_id, scores, history, feedback, story_mode, assessment")
      .eq("user_id", context.userId)
      .eq("episode_id", episode.id)
      .maybeSingle());
  } catch (requestError) {
    if (!sameSession(context) || loadVersion !== episodeLoadVersion) return false;
    state.feedback = supabaseConnectionMessage(requestError);
    state.loadIssue = { index };
    return null;
  }

  if (!sameSession(context) || loadVersion !== episodeLoadVersion || state.episodeIndex !== index) return false;
  if (error) {
    state.feedback = `기록 불러오기 오류: ${error.message}`;
    state.loadIssue = { index };
    return null;
  }
  if (state.loadIssue?.index === index) state.loadIssue = null;

  if (!data) {
    return false;
  }

  if (data.scores?._version !== SCORING_VERSION) {
    state.feedback = "국가 AI 윤리원칙 기반 평가가 적용되어 이 에피소드는 새로 진단합니다.";
    return false;
  }

  if (data.scene_id && episode.scenes[data.scene_id]) {
    state.sceneId = data.scene_id;
  }
  state.history = Array.isArray(data.history) ? data.history : [];
  refreshGuidelineScores();
  state.feedback = data.feedback || "";
  state.storyMode = data.story_mode || "story";
  state.assessments[episode.id] = data.assessment || {};
  return true;
}

async function loadAllProgress() {
  const context = sessionContext();
  if (!supabaseClient || !currentUser) {
    state.progress = {};
    return;
  }

  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient
      .from("user_episode_progress")
        .select("episode_id, scene_id, score, scores, history, feedback, story_mode, assessment, completed, ending, updated_at")
      .eq("user_id", context.userId));
  } catch (requestError) {
    if (!sameSession(context)) return;
    state.feedback = supabaseConnectionMessage(requestError);
    state.loadIssue = { index: null };
    return;
  }

  if (!sameSession(context)) return;
  if (error) {
    state.feedback = `학습 성과 불러오기 오류: ${error.message}`;
    state.loadIssue = { index: null };
    return;
  }
  if (state.loadIssue?.index === null) state.loadIssue = null;

  state.progress = Object.fromEntries(
    (data || [])
      .filter((item) => item.scores?._version === SCORING_VERSION)
      .map((item) => [item.episode_id, item]),
  );
}

function saveEpisodeProgress() {
  if (!supabaseClient || !currentUser) {
    return Promise.resolve(false);
  }

  const episode = activeEpisode();
  const scene = activeScene();
  const snapshot = {
    session: sessionContext(),
    sequence: ++saveSequence,
    userId: currentUser.id,
    episodeId: episode.id,
    sceneId: state.sceneId,
    score: scoreAverage(),
    scores: JSON.parse(JSON.stringify(state.scores)),
    history: JSON.parse(JSON.stringify(state.history)),
    feedback: state.feedback,
    storyMode: state.storyMode,
    assessment: JSON.parse(JSON.stringify(state.assessments[episode.id] || {})),
    completed: Boolean(scene.end && state.assessments[episode.id]?.post),
    ending: scene.end ? endingName() : null,
    updatedAt: new Date().toISOString(),
  };

  return persistEpisodeSnapshot(snapshot);
}

function persistEpisodeSnapshot(snapshot) {
  if (!sameSession(snapshot.session)) return Promise.resolve(false);
  episodeSaveStates.set(snapshot.episodeId, { status: "saving", snapshot });
  updateSaveStatus();
  const persistSnapshot = async () => {
    if (!sameSession(snapshot.session)) return false;
    let error;
    try {
      ({ error } = await supabaseClient.from("user_episode_progress").upsert(
        {
          user_id: snapshot.userId,
          episode_id: snapshot.episodeId,
          scene_id: snapshot.sceneId,
          score: snapshot.score,
          scores: snapshot.scores,
          history: snapshot.history,
          feedback: snapshot.feedback,
          story_mode: snapshot.storyMode,
          assessment: snapshot.assessment,
          completed: snapshot.completed,
          ending: snapshot.ending,
          updated_at: snapshot.updatedAt,
        },
        { onConflict: "user_id,episode_id" },
      ));
    } catch (requestError) {
      error = requestError;
    }
    if (!sameSession(snapshot.session)) return false;
    const latest = episodeSaveStates.get(snapshot.episodeId)?.snapshot.sequence === snapshot.sequence;
    if (error) {
      if (latest) {
        episodeSaveStates.set(snapshot.episodeId, { status: "error", snapshot });
        updateSaveStatus();
      }
      return false;
    }

    state.progress[snapshot.episodeId] = {
      episode_id: snapshot.episodeId,
      scene_id: snapshot.sceneId,
      score: snapshot.score,
      scores: snapshot.scores,
      history: snapshot.history,
      feedback: snapshot.feedback,
      story_mode: snapshot.storyMode,
      assessment: snapshot.assessment,
      completed: snapshot.completed,
      ending: snapshot.ending,
      updated_at: snapshot.updatedAt,
    };
    if (els.scoreLabel) els.scoreLabel.innerHTML = scoreBadgeHtml();
    if (latest) {
      episodeSaveStates.set(snapshot.episodeId, { status: "saved", snapshot });
      updateSaveStatus();
    }
    return true;
  };

  episodeSaveQueue = episodeSaveQueue.then(persistSnapshot, persistSnapshot);
  return episodeSaveQueue;
}

async function startEpisode(index, options = {}) {
  cancelStoryWork();
  const context = sessionContext();
  const loadVersion = episodeLoadVersion;
  const episodeId = episodes[index].id;
  const previousAssessment = state.assessments[episodeId] || state.progress[episodeId]?.assessment || {};
  state.episodeIndex = index;
  state.sceneId = episodes[index].start;
  state.history = [];
  state.feedback = "";
  state.view = "story";
  state.storyMode = "intro";
  state.reportTab = "summary";
  state.introNextMode = "pre";
  state.pendingDecision = null;
  state.decisionReasons = [];
  state.decisionReasonStatus = "idle";
  state.decisionReasonSource = "";
  state.sceneStartedAt = null;
  if (options.loadSaved === false) {
    state.assessments[episodeId] = {
      attemptCount: Number(previousAssessment.attemptCount || 0) + 1,
    };
  }
  resetScores(episodes[index]);
  if (options.loadSaved !== false) {
    await episodeSaveQueue;
    if (!sameSession(context) || state.episodeIndex !== index || episodeLoadVersion !== loadVersion) return;
    const loaded = await loadEpisodeProgress(index);
    if (!sameSession(context) || state.episodeIndex !== index || episodeLoadVersion !== loadVersion + 1) return;
    if (loaded === null) { goHome(); return; }
    if (loaded) {
      const resumableModes = ["pre", "story", "post", "report"];
      state.introNextMode = resumableModes.includes(state.storyMode)
        ? state.storyMode
        : state.assessments[episodeId]?.pre?.answer
          ? "story"
          : "pre";
    } else {
      state.assessments[episodeId] = {
        attemptCount: Math.max(1, Number(previousAssessment.attemptCount || 0)),
      };
    }
  }
  state.storyMode = "intro";
  state.sceneStartedAt = null;
  syncNav();
  render();
}

function queueChoice(choice, choiceIndex) {
  const sceneId = state.sceneId;
  const rubric = activeGuidelineRubric(sceneId, choiceIndex);
  state.pendingDecision = {
    sceneId,
    choiceIndex,
    scene: activeScene().title,
    choice: choice.label,
    feedback: choice.feedback,
    rubric,
    next: choice.next,
    responseTimeMs: state.sceneStartedAt ? Date.now() - state.sceneStartedAt : null,
  };
  state.storyMode = "reason";
  state.decisionReasons = [];
  state.decisionReasonStatus = "loading";
  state.decisionReasonSource = "";
  state.feedback = "";
  state.sceneStartedAt = null;
  render();
  void loadDecisionReasons();
}

function decisionReasonCacheKey(decision = state.pendingDecision) {
  if (!decision) return "";
  return [activeEpisode().id, decision.sceneId, decision.choiceIndex].join(":");
}

function fallbackDecisionReasons(decision) {
  return [
    {
      code: "rights",
      label: "당사자의 입장과 감정이 먼저 떠올라서",
    },
    {
      code: "convenience",
      label: "지금 내가 하기 쉬운 행동이라서",
    },
    {
      code: "social",
      label: "친구들의 반응과 관계가 신경 쓰여서",
    },
  ];
}

function normalizeDecisionReasons(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items
    .map((item) => ({
      code: String(item?.code || "").trim(),
      label: String(item?.label || "").replace(/\s+/g, " ").trim().slice(0, 100),
    }))
    .filter((item) => DECISION_REASON_CODES.has(item.code) && item.label && !seen.has(item.label) && seen.add(item.label))
    .slice(0, 3);
}

async function fetchDecisionReasons(decision) {
  const context = sessionContext();
  const episode = activeEpisode();
  const sceneText = activeScene().text;
  if (window.location.protocol === "file:" || !supabaseClient) {
    throw new Error("AI 이유 추천을 이용할 수 없는 환경입니다.");
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (!sameSession(context) || state.pendingDecision !== decision) throw new Error("취소된 요청입니다.");
  if (error || !data.session?.access_token) {
    throw new Error("로그인 정보가 만료되었습니다.");
  }

  const controller = new AbortController();
  decisionReasonController = controller;
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(AI_EXPLANATION_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: "reason_options",
        episode: {
          title: episode.title,
          topic: episode.topic,
          concept: episode.assessment.concept,
        },
        scene: {
          title: decision.scene,
          text: sceneText,
        },
        choice: decision.choice,
      }),
      signal: controller.signal,
    });
    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || "AI 이유 추천을 불러오지 못했습니다.");
    }
    const reasons = normalizeDecisionReasons(responseData.reasons);
    if (reasons.length !== 3) {
      throw new Error("AI 이유 추천 형식이 올바르지 않습니다.");
    }
    return reasons;
  } finally {
    window.clearTimeout(timeoutId);
    if (decisionReasonController === controller) decisionReasonController = null;
  }
}

async function loadDecisionReasons() {
  const context = sessionContext();
  const decision = state.pendingDecision;
  const cacheKey = decisionReasonCacheKey(decision);
  if (!decision || !cacheKey) return;

  const cached = decisionReasonCache.get(cacheKey);
  if (cached) {
    state.decisionReasons = cached;
    state.decisionReasonStatus = "ready";
    state.decisionReasonSource = "ai";
    render();
    return;
  }

  try {
    const reasons = await fetchDecisionReasons(decision);
    if (!sameSession(context) || state.pendingDecision !== decision || decisionReasonCacheKey() !== cacheKey) return;
    decisionReasonCache.set(cacheKey, reasons);
    state.decisionReasons = reasons;
    state.decisionReasonStatus = "ready";
    state.decisionReasonSource = "ai";
  } catch (error) {
    if (!sameSession(context) || state.pendingDecision !== decision || decisionReasonCacheKey() !== cacheKey) return;
    state.decisionReasons = fallbackDecisionReasons(decision);
    state.decisionReasonStatus = "ready";
    state.decisionReasonSource = "fallback";
  }
  if (state.view === "story" && state.storyMode === "reason") render();
}

async function applyDecisionReason(reason) {
  if (!state.pendingDecision) return;

  const decision = state.pendingDecision;
  state.history.push({
    sceneId: decision.sceneId,
    choiceIndex: decision.choiceIndex,
    scene: decision.scene,
    choice: decision.choice,
    feedback: decision.feedback,
    rubric: decision.rubric,
    reasonCode: reason.code,
    reasonLabel: reason.label,
    reasonSource: reason.code === "uncertain" ? "uncertain" : state.decisionReasonSource,
    responseTimeMs: decision.responseTimeMs,
    answeredAt: new Date().toISOString(),
  });
  refreshGuidelineScores();
  state.feedback = decision.feedback;
  state.sceneId = decision.next;
  state.pendingDecision = null;
  state.decisionReasons = [];
  state.decisionReasonStatus = "idle";
  state.decisionReasonSource = "";
  state.view = "story";
  state.storyMode = activeScene().end ? "post" : "story";
  state.sceneStartedAt = state.storyMode === "story" ? Date.now() : null;
  render();
  await saveEpisodeProgress();
}

function scoreAverage() {
  const values = activeEpisode()
    .meters.map((key) => state.scores[key])
    .filter((value) => Number.isFinite(value));
  return ScoringEngine.average(values);
}

function endingName() {
  const avg = scoreAverage();
  if (!state.history.length) return "진단 전";
  if (avg >= 75) return "Good End · 책임 있는 실천";
  if (avg >= 50) return "Normal End · 기준을 배우는 중";
  return "다시 연습 · 다음에는 다르게 해보기";
}

function endingClassName() {
  const avg = scoreAverage();
  if (!state.history.length) return "is-pending";
  if (avg >= 75) return "is-good";
  if (avg >= 50) return "is-normal";
  return "is-bad";
}

function renderTabs() {
  els.episodeTabs.innerHTML = "";
  els.episodeTabs.hidden = true;
}

function renderMeters() {
  els.meterGroup.innerHTML = "";
  activeEpisode().meters.forEach((key) => {
    const principle = GUIDELINE_PRINCIPLES[key];
    const value = state.scores[key];
    const meter = document.createElement("div");
    meter.className = "meter";
    meter.innerHTML = `
      <div class="meter-head"><span>${escapeHtml(principle.shortName)}</span><span>${value ?? "미평가"}</span></div>
      <div class="meter-track"><div class="meter-fill" style="--value:${value ?? 0}%"></div></div>
    `;
    els.meterGroup.appendChild(meter);
  });
}

function episodeProgressLabel(episode) {
  const progress = state.progress[episode.id];
  if (!progress) {
    return "시작 전";
  }
  if (progress.completed) {
    return `${progress.ending || "완료"} · ${progress.score ?? "-"}점`;
  }
  return `${progress.score ?? "-"}점 · 진행 기록 있음`;
}

function answerKeywordHtml(option) {
  return escapeHtml(option);
}

function renderAssessmentOptions(type) {
  const options = type === "pre"
    ? activeEpisode().assessment.preOptions
    : activeEpisode().assessment.postOptions;
  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button assessment-answer";
    button.innerHTML = `<strong>${type === "pre" ? "사전" : "사후"} ${index + 1}</strong><span>${answerKeywordHtml(option.text)}</span>`;
    button.addEventListener("click", () => answerAssessment(type, option, index));
    els.choices.appendChild(button);
  });
}

function renderDecisionReasons() {
  if (state.decisionReasonStatus === "loading") {
    const status = document.createElement("div");
    status.className = "reason-options-status";
    status.setAttribute("role", "status");
    status.innerHTML = "<strong>AI가 선택 이유를 정리하고 있어요.</strong><span>잠시만 기다려 주세요.</span>";
    els.choices.appendChild(status);
    return;
  }

  const recommended = state.decisionReasons.length === 3
    ? state.decisionReasons
    : fallbackDecisionReasons(state.pendingDecision);
  const reasons = [...recommended.filter(reason => reason.code !== "uncertain"), { code: "uncertain", label: "맞는 이유가 없거나 아직 잘 모르겠어" }];
  reasons.forEach((reason, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button reason-choice";
    button.innerHTML = `<strong>판단 근거 ${index + 1}</strong><span>${escapeHtml(reason.label)}</span>`;
    button.addEventListener("click", () => applyDecisionReason(reason));
    els.choices.appendChild(button);
  });
}

function renderEpisodeList() {
  const list = document.createElement("div");
  list.className = "episode-list";
  episodes.forEach((episode, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "episode-card";
    button.style.setProperty("--episode-card-art", `url("${getEpisodeVisual(episode)}")`);
    button.setAttribute("aria-label", `${index + 1}번째 에피소드 ${episode.title}, ${episodeProgressLabel(episode)}`);
    button.innerHTML = `
      <span class="episode-card-index" data-step="${index + 1}">Episode ${index + 1}</span>
      <span class="episode-card-title">${episode.title}</span>
      <span class="episode-card-topic">${episode.topic}</span>
      <span class="episode-card-foot">
        <span>${episodeProgressLabel(episode)}</span>
      </span>
    `;
    button.addEventListener("click", () => startEpisode(index));
    list.appendChild(button);
  });
  els.choices.appendChild(list);
}

function renderChoices(scene) {
  els.choices.innerHTML = "";

  if (state.view === "home") {
    renderEpisodeList();
    return;
  }

  if (state.view === "story" && state.storyMode === "pre") {
    renderAssessmentOptions("pre");
    return;
  }

  if (state.view === "story" && state.storyMode === "intro") {
    return;
  }

  if (state.view === "story" && state.storyMode === "post") {
    renderAssessmentOptions("post");
    return;
  }

  if (state.view === "story" && state.storyMode === "reason") {
    renderDecisionReasons();
    return;
  }

  if (state.view === "story" && state.storyMode === "report") {
    if (state.reportTab !== "summary") {
      const summary = document.createElement("button");
      summary.type = "button";
      summary.className = "choice-button is-primary report-back-button";
      summary.innerHTML = "<span>결과 요약으로 돌아가기</span>";
      summary.addEventListener("click", () => {
        state.reportTab = "summary";
        const url = new URL(window.location.href);
        url.searchParams.delete("view");
        url.searchParams.delete("report");
        url.searchParams.delete("episode");
        window.history.replaceState({}, "", url);
        render();
      });
      els.choices.appendChild(summary);

      const concepts = document.createElement("button");
      concepts.type = "button";
      concepts.className = "choice-button report-learning-button";
      concepts.innerHTML = "<span>핵심 개념 보기</span>";
      concepts.addEventListener("click", () => {
        setLearningView(activeEpisode().id);
        render();
        els.sceneText.scrollTop = 0;
      });
      els.choices.appendChild(concepts);
      return;
    }

    const replay = document.createElement("button");
    replay.type = "button";
    replay.className = "choice-button is-primary";
    replay.innerHTML = "<span>다시 플레이</span>";
    replay.addEventListener("click", () =>
      replayEpisode(),
    );
    els.choices.appendChild(replay);

    const nextEpisode = document.createElement("button");
    nextEpisode.type = "button";
    nextEpisode.className = "choice-button";
    nextEpisode.innerHTML = "<span>주제 이어서 학습</span>";
    nextEpisode.addEventListener("click", () => startEpisode((state.episodeIndex + 1) % episodes.length));
    els.choices.appendChild(nextEpisode);

    const details = document.createElement("button");
    details.type = "button";
    details.className = "choice-button report-detail-button";
    details.innerHTML = "<span>분석 결과 자세히 보기</span>";
    details.addEventListener("click", openReportDetail);
    els.choices.appendChild(details);
    return;
  }

  if (["record", "learn", "profile"].includes(state.view)) {
    return;
  }

  if (state.view === "teacher") {
    const actual = document.createElement("button");
    actual.type = "button";
    actual.className = `choice-button ${state.teacherDashboardMode === "actual" ? "is-primary" : ""}`;
    actual.innerHTML = "<strong>실제 데이터</strong>Supabase 익명 집계";
    actual.addEventListener("click", () => {
      state.teacherDashboardMode = "actual";
      render();
    });
    els.choices.appendChild(actual);

    const demo = document.createElement("button");
    demo.type = "button";
    demo.className = `choice-button ${state.teacherDashboardMode === "demo" ? "is-primary" : ""}`;
    demo.innerHTML = "<strong>시연용 데이터</strong>120명 합성 표본";
    demo.addEventListener("click", () => {
      state.teacherDashboardMode = "demo";
      render();
    });
    els.choices.appendChild(demo);

    if (state.teacherDashboardMode === "demo") return;

    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "choice-button is-primary";
    refresh.innerHTML = "<strong>새로고침</strong>최신 익명 통계 다시 집계";
    refresh.addEventListener("click", () => loadTeacherDashboard({ render: true }));
    els.choices.appendChild(refresh);
    return;
  }

  if (state.view !== "story") {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "choice-button is-primary";
    back.innerHTML = "<strong>스토리</strong>현재 장면으로 돌아가기";
    back.addEventListener("click", () => {
      state.view = "story";
      render();
    });
    els.choices.appendChild(back);
    return;
  }

  if (scene.end) {
    const replay = document.createElement("button");
    replay.type = "button";
    replay.className = "choice-button is-primary";
    replay.innerHTML = `<strong>${endingName()}</strong>다시 플레이`;
    replay.addEventListener("click", () =>
      replayEpisode(),
    );
    els.choices.appendChild(replay);

    const nextEpisode = document.createElement("button");
    nextEpisode.type = "button";
    nextEpisode.className = "choice-button";
    nextEpisode.innerHTML = "<strong>다음 기록</strong>다른 에피소드 선택";
    nextEpisode.addEventListener("click", () => startEpisode((state.episodeIndex + 1) % episodes.length));
    els.choices.appendChild(nextEpisode);
    return;
  }

  scene.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.innerHTML = `<strong>${index + 1}</strong><span>${escapeHtml(choice.label)}</span>`;
    button.addEventListener("click", () =>
      transitionToScene(() => queueChoice(choice, index), button),
    );
    els.choices.appendChild(button);
  });
}

function recordEpisodeHistory(episodeId) {
  if (episodeId === activeEpisode().id && state.history.length) {
    return state.history;
  }
  const savedHistory = state.progress[episodeId]?.history;
  return Array.isArray(savedHistory) ? savedHistory : [];
}

function episodePickerHtml(selectedEpisodeId, mode) {
  const isRecord = mode === "record";
  const dataAttribute = isRecord ? "data-record-episode" : "data-learning-episode";
  const ariaLabel = isRecord ? "기록을 볼 에피소드 선택" : "핵심 개념을 볼 에피소드 선택";
  return `
    <div class="record-episode-picker" role="tablist" aria-label="${ariaLabel}">
      ${episodes
        .map((episode, index) => {
          const selected = episode.id === selectedEpisodeId;
          const description = isRecord
            ? `${recordEpisodeHistory(episode.id).length || 0}개 선택`
            : `${episode.meters.length}개 원칙`;
          return `
            <button
              type="button"
              role="tab"
              class="record-episode-button${selected ? " is-active" : ""}"
              ${dataAttribute}="${escapeAttribute(episode.id)}"
              aria-selected="${selected}"
            >
              <span>EP ${index + 1}</span>
              <strong>${escapeHtml(episode.title)}</strong>
              <small>${isRecord && !recordEpisodeHistory(episode.id).length ? "기록 없음" : description}</small>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function recordHtml() {
  const selectedEpisode = episodes.find((episode) => episode.id === state.recordEpisodeId) || activeEpisode();
  const selectedHistory = recordEpisodeHistory(selectedEpisode.id);
  const episodePicker = episodePickerHtml(selectedEpisode.id, "record");
  const principleItems = ScoringEngine.scorePrinciples(
    selectedEpisode.meters, selectedHistory, SCORING_VERSION, GUIDELINE_PRINCIPLES,
  );
  const score = ScoringEngine.average(principleItems.map((item) => item.score));
  const hasScore = principleItems.some((item) => Number.isFinite(item.score));
  const savedProgress = state.progress[selectedEpisode.id];
  const hasSavedReport = Boolean(savedProgress?.completed && savedProgress.scores?._version === SCORING_VERSION);

  if (!selectedHistory.length) {
    return `
      ${episodePicker}
      <div class="empty-state">
        <strong>${escapeHtml(selectedEpisode.title)} 기록이 아직 없어요</strong>
        <p>이 에피소드를 진행하면 선택한 흐름이 여기에 정리됩니다.</p>
      </div>
    `;
  }

  return `
    ${episodePicker}
    <section class="record-score-summary" aria-label="에피소드 점수">
      <div>
        <span>이번 에피소드 점수</span>
        <small>${hasSavedReport ? "학습 완료" : "진행 중"} · ${selectedHistory.length}개 선택</small>
      </div>
      <strong>${hasScore ? `${score}점` : "진단 전"}</strong>
    </section>
    <div class="timeline-list">
      ${selectedHistory
        .map(
          (item, index) => `
            <article>
              <span>${index + 1}</span>
              <div>
                <strong>${escapeHtml(item.choice)}</strong>
                <p>${escapeHtml(item.scene)}</p>
                ${
                  item.rubric
                    ? `<small>${escapeHtml(item.rubric.levelLabel)} · ${item.rubric.principles
                        .map(
                          (key) =>
                            `${escapeHtml(GUIDELINE_PRINCIPLES[key].name)} ${item.rubric.ratings[key]}/4`,
                        )
                        .join(" · ")}</small>`
                    : ""
                 }
                ${item.reasonLabel ? `<small>판단 이유 · ${escapeHtml(item.reasonLabel)}</small>` : ""}
                ${Number.isFinite(item.responseTimeMs) ? `<small>응답 시간 · ${Math.round(item.responseTimeMs / 100) / 10}초</small>` : ""}
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
    <button type="button" class="record-report-button" data-record-report="${escapeAttribute(selectedEpisode.id)}" ${hasSavedReport ? "" : "disabled"}>결과리포트 확인하기</button>
    ${hasSavedReport ? "" : '<p class="record-report-note">에피소드를 완료하면 결과 리포트를 확인할 수 있어요.</p>'}
  `;
}

function openRecordedReport(episodeId) {
  const episodeIndex = episodes.findIndex((episode) => episode.id === episodeId);
  const progress = state.progress[episodeId];
  if (episodeIndex < 0 || !progress?.completed || progress.scores?._version !== SCORING_VERSION) return;

  cancelStoryWork();
  state.episodeIndex = episodeIndex;
  const episode = activeEpisode();
  state.sceneId = episode.scenes[progress.scene_id]?.end
    ? progress.scene_id
    : Object.keys(episode.scenes).find((key) => episode.scenes[key].end);
  state.history = JSON.parse(JSON.stringify(progress.history || []));
  state.assessments[episodeId] = JSON.parse(JSON.stringify(progress.assessment || {}));
  refreshGuidelineScores();
  state.feedback = progress.feedback || "";
  state.pendingDecision = null;
  state.view = "story";
  state.storyMode = "report";
  state.reportTab = "summary";
  const url = new URL(window.location.href);
  url.searchParams.delete("view");
  url.searchParams.set("report", "summary");
  url.searchParams.set("episode", episodeId);
  window.history.replaceState(null, "", url);
  syncNav();
  render();
  els.sceneText.scrollTop = 0;
}

function learningHtml(id) {
  const selectedEpisode = episodes.find((episode) => episode.id === id) || activeEpisode();
  const principleNames = selectedEpisode.meters
    .map((key) => GUIDELINE_PRINCIPLES[key].name)
    .join(" · ");
  return `
    ${episodePickerHtml(selectedEpisode.id, "learning")}
    <p class="guideline-source"><strong>적용 원칙</strong> ${escapeHtml(principleNames)}</p>
    <div class="insight-list">
      ${learningText(selectedEpisode.id)
        .split("\n")
        .filter(Boolean)
        .map(
          (line, index) => `
            <article>
              <span>Point ${index + 1}</span>
              <p>${escapeHtml(line)}</p>
            </article>
          `,
        )
        .join("")}
    </div>
    <p class="guideline-source">출처: ${escapeHtml(ETHICS_SOURCES.primary.publisher)} 「${escapeHtml(ETHICS_SOURCES.primary.title)}」 (${escapeHtml(ETHICS_SOURCES.primary.publishedAt)})</p>
  `;
}

function bindRecordActions() {
  document.querySelectorAll("[data-record-episode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.recordEpisodeId = button.dataset.recordEpisode;
      render();
    });
  });
  document.querySelectorAll("[data-record-report]").forEach((button) => {
    button.addEventListener("click", () => openRecordedReport(button.dataset.recordReport));
  });
}

function bindLearningActions() {
  document.querySelectorAll("[data-learning-episode]").forEach((button) => {
    button.addEventListener("click", () => {
      setLearningView(button.dataset.learningEpisode);
      render();
    });
  });
}

function dashboardPercent(value) {
  const number = Math.min(100, Math.max(0, Number(value) || 0));
  return `${Math.round(number * 10) / 10}%`;
}

function dashboardBarRow(label, value, meta = "") {
  const rate = Math.min(100, Math.max(0, Number(value) || 0));
  return `
    <li>
      <div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(meta || dashboardPercent(rate))}</span></div>
      <div class="dashboard-bar" aria-label="${escapeAttribute(label)} ${dashboardPercent(rate)}">
        <span style="--dashboard-rate:${rate}%"></span>
      </div>
    </li>
  `;
}

function teacherDashboardHtml() {
  const dashboard = state.teacherDashboard;
  if (dashboard.status === "loading") {
    return `<div class="empty-state"><strong>익명 학습 통계를 집계하고 있어요</strong><p>선택 기록과 사전·사후 변화를 계산하는 중입니다.</p></div>`;
  }
  if (!dashboard.authorized || !dashboard.data) {
    return `<div class="empty-state"><strong>교수자 통계를 불러올 수 없어요</strong><p>${escapeHtml(dashboard.error || "교수자로 등록된 계정에서만 확인할 수 있습니다.")}</p></div>`;
  }

  const actualData = dashboard.data;
  const isDemo = state.teacherDashboardMode === "demo";
  const data = isDemo
    ? DemoAnalytics.createDashboard(episodes, {
        learnerCount: 120,
        principleKeys: Object.keys(GUIDELINE_PRINCIPLES),
      })
    : actualData;
  const activeLearners = Number(data.activeLearners || 0);
  const consentingLearners = Number(actualData.consentingLearners || 0);
  const consentingRecords = Number(actualData.consentingRecords || 0);
  const eligibleTrainingLearners = Number(actualData.eligibleTrainingLearners || 0);
  const averageDelta = data.averageReflectionDelta === null || data.averageReflectionDelta === undefined
    ? "-"
    : `${Number(data.averageReflectionDelta) > 0 ? "+" : ""}${Number(data.averageReflectionDelta).toFixed(1)}단계`;
  const minimumSamples = Number(actualData.minimumClusteringSamples || 50);
  const trainingReadiness = Math.min(100, (eligibleTrainingLearners / minimumSamples) * 100);
  const teachingGuides = TeachingStrategy
    .recommendMany(data.weakestPrinciples || [], GUIDELINE_PRINCIPLES, 3)
    .map((guide) => `
      <article class="teaching-guide-item">
        <span>${escapeHtml(guide.principleName)} 지도 제안</span>
        <strong>${escapeHtml(guide.title)}</strong>
        <p>${escapeHtml(guide.activity)}</p>
        <small>${escapeHtml(guide.observation)}</small>
      </article>
    `)
    .join("");
  const weakestRows = (data.weakestPrinciples || [])
    .slice(0, 7)
    .map((item) => dashboardBarRow(
      GUIDELINE_PRINCIPLES[item.key]?.name || item.key,
      item.score,
      `${Math.round(Number(item.score || 0))}점 · ${item.samples}건`,
    ))
    .join("");
  const questionRows = (data.questionRiskRates || [])
    .slice(0, 8)
    .map((item) => {
      const episode = episodes.find((candidate) => candidate.id === item.episodeId);
      return dashboardBarRow(
        item.scene,
        item.riskRate,
        `${episode?.title || item.episodeId} · 위험 ${item.riskCount}/${item.responses}`,
      );
    })
    .join("");
  const completionRows = (data.episodeCompletion || [])
    .map((item) => {
      const episode = episodes.find((candidate) => candidate.id === item.episodeId);
      return dashboardBarRow(
        episode?.title || item.episodeId,
        item.completionRate,
        `${item.completedLearners}/${activeLearners}명 완료`,
      );
    })
    .join("");

  return `
    <section class="teacher-dashboard" aria-label="교수자용 익명 학습 분석">
      ${isDemo ? `
        <div class="demo-data-notice" role="status">
          <strong>시연용 합성 데이터</strong>
          <span>120명의 가상 학습 기록을 고정 난수로 생성한 화면입니다. 실제 사용자 통계, 연구 결과, 모델 학습에는 포함되지 않습니다.</span>
        </div>
      ` : ""}
      <div class="teacher-kpis">
        <article><span>${isDemo ? "가상 학습자" : "학습 참여자"}</span><strong>${activeLearners}명</strong><small>${isDemo ? "시연을 위한 합성 표본" : "한 번 이상 기록한 계정"}</small></article>
        <article><span>전체 완료율</span><strong>${dashboardPercent(data.completionRate)}</strong><small>${data.completedEpisodes}/${data.expectedCompletions}개 완료</small></article>
        <article><span>평균 생각 변화</span><strong>${averageDelta}</strong><small>사후 단계 - 사전 단계</small></article>
        ${isDemo
          ? `<article><span>합성 응답</span><strong>${data.simulatedResponses}건</strong><small>실제 DB와 완전히 분리</small></article>`
          : `<article><span>연구 활용 동의</span><strong>${consentingLearners}명</strong><small>${consentingRecords}개 학습 기록</small></article>`}
      </div>

      <div class="teacher-dashboard-grid">
        <section>
          <div class="dashboard-section-title"><span>문항 분석</span><strong>질문별 위험 선택 비율</strong></div>
          ${questionRows ? `<ol class="dashboard-bars">${questionRows}</ol>` : `<p class="dashboard-empty">아직 선택 데이터가 없습니다.</p>`}
        </section>
        <section>
          <div class="dashboard-section-title"><span>원칙 분석</span><strong>가장 취약한 윤리원칙</strong></div>
          ${weakestRows ? `<ol class="dashboard-bars is-principle">${weakestRows}</ol>` : `<p class="dashboard-empty">아직 원칙별 점수가 없습니다.</p>`}
        </section>
        <section>
          <div class="dashboard-section-title"><span>진행 분석</span><strong>에피소드 완료율</strong></div>
          ${completionRows ? `<ol class="dashboard-bars">${completionRows}</ol>` : `<p class="dashboard-empty">아직 완료 기록이 없습니다.</p>`}
        </section>
        <section class="training-readiness">
          <div class="dashboard-section-title"><span>학습 패턴 분석</span><strong>군집분석 데이터 준비</strong></div>
          <ol class="training-data-steps" aria-label="학습 패턴 분석 데이터 준비 현황">
            <li><span>1. 동의 원본 기록</span><b>${consentingRecords}건</b></li>
            <li><span>2. 분석 조건 충족 학습자</span><b>${eligibleTrainingLearners}명</b></li>
            <li><span>파일럿 분석 기준</span><b>${eligibleTrainingLearners}/${minimumSamples}명</b></li>
          </ol>
          <div class="dashboard-bar" aria-label="군집분석 데이터 준비도 ${dashboardPercent(trainingReadiness)}">
            <span style="--dashboard-rate:${trainingReadiness}%"></span>
          </div>
          <small>5개 에피소드를 완료한 동의 학습자 50명을 내부 파일럿 기준으로 사용합니다. 한 학생은 한 표본으로 세며, 표본 수가 분석의 타당성을 보장하지는 않습니다. ${isDemo ? "합성 데이터는 이 수치에서 제외됩니다." : "동의하지 않은 계정은 포함하지 않습니다."}</small>
        </section>
        <section class="teaching-guidance-section">
          <div class="dashboard-section-title"><span>교육 활용</span><strong>취약 원칙별 지도 제안</strong></div>
          <div class="teaching-guide-list">${teachingGuides || `<p class="dashboard-empty">분석할 선택 기록이 아직 없습니다.</p>`}</div>
        </section>
      </div>
      <p class="dashboard-privacy-note">${isDemo
        ? `합성 데이터 생성기 v${escapeHtml(data.demoVersion)} · OpenAI API 및 Supabase를 사용하지 않습니다.`
        : `사용자 이름과 개별 답변은 표시하지 않고 서버에서 집계된 통계만 제공합니다. 마지막 집계 ${escapeHtml(formatProfileDate(data.generatedAt))}`}</p>
    </section>
  `;
}

function profileHtml(profile) {
  return `
    <div class="profile-summary">
      <article>
        <span>아이디</span>
        <strong>${escapeHtml(profile.username || "-")}</strong>
      </article>
      <article>
        <span>별명</span>
        <strong>${escapeHtml(profile.display_name || "-")}</strong>
      </article>
      <article>
        <span>가입일</span>
        <strong>${escapeHtml(formatProfileDate(profile.created_at))}</strong>
      </article>
      <article>
        <span>익명 연구 활용</span>
        <strong>${profile.analytics_consent ? "동의" : "미동의"}</strong>
      </article>
    </div>
    <form class="profile-form support-profile-form" id="profileForm">
      <label>
        <span>아이디</span>
        <input type="text" value="${escapeAttribute(profile.username || "")}" readonly />
      </label>
      <label>
        <span>별명</span>
        <input id="profileNameInput" type="text" value="${escapeAttribute(profile.display_name || "")}" />
      </label>
      <label class="profile-consent">
        <input id="analyticsConsentInput" type="checkbox" ${profile.analytics_consent ? "checked" : ""} />
        <span>익명화된 선택 기록을 졸업 연구의 모델 검증에 활용하는 데 동의해요.</span>
      </label>
      <button class="choice-button is-primary profile-save" type="submit">
        <span>프로필 수정 저장</span>
      </button>
    </form>
    ${learnerAnalysisHtml(overallLearningAnalysis(), { detailed: true })}
    ${
      state.teacherDashboard.authorized
        ? `<section class="profile-teacher-entry" aria-label="교수자 기능">
            <div>
              <span>교수자 전용</span>
              <strong>익명 학습 분석 대시보드</strong>
            </div>
            <button id="openTeacherDashboard" type="button">대시보드 열기 <span aria-hidden="true">→</span></button>
          </section>`
        : ""
    }
  `;
}

function bindProfileActions() {
  const form = document.getElementById("profileForm");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      updateProfileSettings(
        form.querySelector("#profileNameInput").value,
        form.querySelector("#analyticsConsentInput").checked,
      );
    });
  }

  document.getElementById("openTeacherDashboard")?.addEventListener("click", () => {
    state.view = "teacher";
    syncNav();
    render();
  });
}

function render() {
  clearEpisodeIntroTimer();
  aiExplanationController?.abort();
  aiExplanationController = null;
  window.clearTimeout(transitionTimer);
  transitionTimer = null;
  els.storyStage.classList.remove("is-transitioning");
  const episode = activeEpisode();
  const scene = activeScene();
  renderTabs();
  const isIntro = state.view === "story" && state.storyMode === "intro";
  const isPre = state.view === "story" && state.storyMode === "pre";
  const isAssessment = state.view === "story" && ["pre", "post", "reason"].includes(state.storyMode);
  const isReport = state.view === "story" && state.storyMode === "report";
  const isScene = state.view === "story" && state.storyMode === "story";
  const isReason = state.view === "story" && state.storyMode === "reason";
  const isPost = state.view === "story" && state.storyMode === "post";
  const isLearnerSupport = ["record", "learn", "profile"].includes(state.view);
  const isSupport = ["record", "learn", "profile", "teacher"].includes(state.view);
  const isVisualNovel =
    (state.view === "story" && ["intro", "pre", "story", "reason", "post", "report"].includes(state.storyMode)) ||
    isLearnerSupport;
  document.body.classList.toggle("is-visual-novel", isVisualNovel);
  document.body.classList.toggle("is-game-home", state.view === "home");
  document.body.classList.toggle("is-teacher-view", state.view === "teacher");
  els.storyStage.classList.toggle("is-home-stage", state.view === "home");
  els.storyStage.classList.toggle("is-intro-stage", isIntro);
  els.storyStage.classList.toggle("is-pre-stage", isPre);
  els.storyStage.classList.toggle("is-assessment-stage", isAssessment);
  els.storyStage.classList.toggle("is-report-stage", isReport);
  els.storyStage.classList.toggle("is-report-overview", isReport && state.reportTab === "summary");
  els.storyStage.classList.toggle("is-report-detail", isReport && state.reportTab !== "summary");
  els.storyStage.classList.toggle("is-scene-stage", isScene);
  els.storyStage.classList.toggle("is-reason-stage", isReason);
  els.storyStage.classList.toggle("is-post-stage", isPost);
  els.storyStage.classList.toggle("is-support-stage", isSupport);
  els.choiceDock.classList.toggle("is-home-dock", state.view === "home");
  els.choiceDock.classList.toggle("is-intro-dock", isIntro);
  els.choiceDock.classList.toggle("is-assessment-dock", isAssessment);
  if (isIntro) {
    els.storyStage.setAttribute("tabindex", "0");
    els.storyStage.setAttribute("role", "button");
    els.storyStage.setAttribute("aria-label", `${episode.title} 인트로, 눌러서 건너뛰기`);
  } else {
    els.storyStage.removeAttribute("tabindex");
    els.storyStage.removeAttribute("role");
    els.storyStage.removeAttribute("aria-label");
  }
  els.feedbackBox.classList.toggle("is-summary", ["home", "profile", "teacher"].includes(state.view));
  els.feedbackBox.classList.remove("is-pre-answer");
  els.quoteText.classList.toggle("is-warning", isAssessment);
  els.quoteText.hidden = false;
  els.chapterLine.hidden = false;
  applyEpisodeVisual(scene);
  els.topicLabel.textContent = episode.topic;
  els.episodeTitle.textContent = episode.title;
  els.episodeSummary.textContent = episode.summary;
  if (state.view === "home") {
    els.topicLabel.textContent = "AI 윤리 학습";
    els.episodeTitle.textContent = "오늘의 선택";
    els.episodeSummary.textContent = "짧은 상황을 읽고 하나씩 판단해보세요.";
    els.chapterLine.textContent = "Main";
    els.sceneTitle.textContent = "에피소드 선택";
    els.sceneText.innerHTML = `
      <div class="focus-card">
        <span>5개 주제</span>
        <strong>AI 윤리 상황을 골라 시작해요</strong>
        <p>사전 질문, 스토리 선택, 결과 리포트 순서로 진행됩니다.</p>
      </div>
    `;
    els.quoteText.textContent = "";
    els.feedbackBox.innerHTML = progressSummaryHtml();
  } else if (state.view === "record") {
    els.chapterLine.textContent = "Record";
    els.sceneTitle.textContent = "선택 기록";
    els.sceneText.innerHTML = recordHtml();
    const recordHistory = recordEpisodeHistory(state.recordEpisodeId);
    els.quoteText.textContent = recordHistory.length
      ? recordHistory[recordHistory.length - 1].feedback
      : "선택을 진행하면 판단 이유가 이곳에 쌓입니다.";
    els.feedbackBox.textContent = "";
  } else if (state.view === "learn") {
    els.chapterLine.textContent = "Learning";
    els.sceneTitle.textContent = "핵심 개념";
    els.sceneText.innerHTML = learningHtml(state.learningEpisodeId || episode.id);
    els.quoteText.textContent = "";
    els.feedbackBox.textContent = episode.topic;
  } else if (state.view === "profile") {
    const profile = state.profile || {};
    els.chapterLine.textContent = "My Page";
    els.sceneTitle.textContent = "마이페이지";
    els.sceneText.innerHTML = profileHtml(profile);
    els.quoteText.textContent = "";
    els.feedbackBox.innerHTML = state.feedback
      ? escapeHtml(state.feedback)
      : progressSummaryHtml();
  } else if (state.view === "teacher") {
    els.chapterLine.textContent = "Analytics";
    els.sceneTitle.textContent = "교수자 대시보드";
    els.sceneText.innerHTML = teacherDashboardHtml();
    els.quoteText.textContent = "학생 개인정보 대신 익명 집계 통계로 수업의 취약 지점을 확인합니다.";
    els.feedbackBox.textContent = "위험 선택 비율 · 사전/사후 변화 · 취약 원칙 · 완료율";
  } else if (state.view === "story" && state.storyMode === "intro") {
    renderEpisodeIntro();
  } else if (state.view === "story" && state.storyMode === "pre") {
    els.chapterLine.textContent = "Before";
    els.sceneTitle.textContent = "사전 질문";
    els.sceneText.textContent = activeEpisode().assessment.preQuestion;
    els.quoteText.textContent = "먼저 생각을 기록한 뒤 스토리가 시작됩니다.";
    els.feedbackBox.textContent = "";
  } else if (state.view === "story" && state.storyMode === "post") {
    const response = activeAssessmentResponse();
    els.chapterLine.textContent = "After";
    els.sceneTitle.textContent = "사후 질문";
    els.sceneText.innerHTML = `
      <p class="ending-brief">${escapeHtml(activeScene().text)}</p>
      <strong class="followup-question">${escapeHtml(activeEpisode().assessment.postQuestion)}</strong>
    `;
    els.quoteText.textContent = activeScene().quote || activeEpisode().assessment.principle;
    els.feedbackBox.textContent = response.pre?.answer
      ? `사전 응답: ${response.pre.answer}`
      : "사후 생각을 기록하면 결과 리포트가 열립니다.";
  } else if (state.view === "story" && state.storyMode === "reason") {
    els.chapterLine.textContent = "Decision";
    els.sceneTitle.textContent = "이 선택을 한 이유는 무엇인가요?";
    els.sceneText.innerHTML = `
      <p class="decision-context"><span>방금 본 질문</span><strong>${escapeHtml(state.pendingDecision?.scene || "-")}</strong></p>
      <p class="selected-decision"><span>방금 선택</span><strong>${escapeHtml(state.pendingDecision?.choice || "-")}</strong></p>
      <p class="reason-prompt">판단할 때 가장 크게 작용한 기준 하나를 골라주세요.</p>
    `;
    els.quoteText.textContent = "";
    els.quoteText.hidden = true;
    els.feedbackBox.textContent = "";
  } else if (state.view === "story" && state.storyMode === "report") {
    const response = activeAssessmentResponse();
    els.chapterLine.textContent = "Report";
    els.sceneTitle.textContent = state.reportTab === "summary" ? "결과 리포트" : "결과 자세히 보기";
    els.sceneText.innerHTML = reportHtml(activeEpisode(), response);
    els.quoteText.textContent = "";
    els.quoteText.hidden = true;
    els.feedbackBox.textContent = "선택 기록과 사전·사후 응답을 바탕으로 한 학습용 결과야.";
  } else {
    const response = activeAssessmentResponse();
    const showPreAnswer = !state.history.length && response.pre?.answer;
    renderStoryScene(scene);

    if (showPreAnswer) {
      els.feedbackBox.classList.add("is-pre-answer");
      els.feedbackBox.innerHTML = `
        <strong>사전 질문 완료</strong>
        <span>내가 고른 답: ${escapeHtml(response.pre.answer)}</span>
      `;
    } else {
      els.feedbackBox.textContent = scene.end
        ? `${endingName()} · 선택 기록 ${state.history.length}개. ${state.feedback || "에피소드를 끝까지 진행했습니다."}`
        : state.feedback;
    }
  }
  els.scoreLabel.innerHTML = scoreBadgeHtml();
  renderMeters();
  renderChoices(scene);
  if (isReport) bindReportActions();
  if (state.view === "record") bindRecordActions();
  if (state.view === "learn") bindLearningActions();
  if (state.view === "profile") bindProfileActions();
  if (isIntro) {
    document.getElementById("episodeIntroSkip")?.addEventListener("click", (event) => {
      event.stopPropagation();
      void finishEpisodeIntro();
    });
    scheduleEpisodeIntro();
  }
  updateSaveStatus();
}

function syncNav() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    const isStorySection = item.dataset.view === "story" && ["home", "story"].includes(state.view);
    const isProfileSection = item.dataset.view === "profile" && ["profile", "teacher"].includes(state.view);
    item.classList.toggle("is-active", isStorySection || isProfileSection || item.dataset.view === state.view);
  });
}

function learningText(id) {
  const texts = {
    deepfake:
      "초상권은 내 얼굴과 이미지가 어떻게 쓰이는지 결정할 권리입니다.\n딥페이크와 합성 이미지는 재미로 시작해도 당사자의 관계, 평판, 안전을 해칠 수 있습니다.\n공유와 방관도 피해 확산에 연결될 수 있습니다.",
    rumor:
      "AI가 만든 이미지와 음성은 진짜처럼 보일 수 있습니다.\n확인되지 않은 정보는 사실이 아니라 주장일 뿐입니다.\n출처 확인, 공식 제보, 정정은 허위정보 피해를 줄이는 책임 있는 행동입니다.",
    chatbot:
      "AI 챗봇은 위로와 정리에 도움을 줄 수 있지만 전문 상담과 현실 관계를 대신할 수는 없습니다.\n수면, 학교생활, 친구 관계가 흔들릴 정도라면 신뢰할 수 있는 사람에게 도움을 요청해야 합니다.",
    assignment:
      "생성형 AI는 아이디어 정리, 초안 점검, 표현 개선을 도울 수 있습니다.\n하지만 AI가 만든 결과물을 그대로 제출하면 학습 과정과 작성 책임이 사라질 수 있습니다.\nAI 사용 범위를 밝히고, 근거를 검증하고, 자신의 언어로 다시 설명할 수 있어야 합니다.",
    privacy:
      "AI 추천은 검색 기록, 위치, 관심사 같은 데이터를 활용하므로 필요한 권한만 제공해야 합니다.\n개인화된 결과도 성별, 지역, 사회적 배경에 따라 특정 집단을 배제하거나 차별하지 않는지 확인해야 합니다.\n저장된 데이터와 추천 기준을 확인하고 삭제·수정할 수 있어야 정보에 대한 통제권을 지킬 수 있습니다.",
  };
  return texts[id];
}

function formatProfileDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

els.resetButton.addEventListener("click", goHome);
els.logoutButton.addEventListener("click", logout);
els.storyStage.addEventListener("click", () => {
  if (state.view === "story" && state.storyMode === "intro") void finishEpisodeIntro();
});
els.storyStage.addEventListener("keydown", (event) => {
  if (
    state.view === "story" &&
    state.storyMode === "intro" &&
    ["Enter", " "].includes(event.key)
  ) {
    event.preventDefault();
    void finishEpisodeIntro();
  }
});
els.showLoginButton.addEventListener("click", () => setAuthMode("login"));
els.authIntro.addEventListener("click", () => finishAuthIntro());
els.showSignupButton.addEventListener("click", () => setAuthMode("signup"));
els.checkUsernameButton.addEventListener("click", checkUsernameAvailability);
els.checkPasswordButton.addEventListener("click", checkPasswordMatch);
els.usernameInput.addEventListener("input", () => {
  if (normalizeUsername(els.usernameInput.value) !== checkedUsername) {
    checkedUsername = "";
  }
});
els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (els.authSubmitButton.disabled) return;
  const username = els.usernameInput.value.trim();
  const displayName = els.displayNameInput.value.trim();
  const password = els.passwordInput.value;
  const passwordConfirm = els.passwordConfirmInput.value;

  els.authSubmitButton.disabled = true;
  const operation = authMode === "signup"
    ? signup(username, displayName, password, passwordConfirm)
    : login(username, password);
  operation.catch(() => showAuthError("연결을 확인하고 다시 시도해줘.")).finally(() => { els.authSubmitButton.disabled = false; });
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.view === "record") {
      state.recordEpisodeId = activeEpisode().id;
    }
    if (button.dataset.view === "learn") {
      setLearningView(activeEpisode().id);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.searchParams.delete("report");
      url.searchParams.delete("episode");
      window.history.replaceState({}, "", url);
    }
    state.view = button.dataset.view === "story" ? "home" : button.dataset.view;
    syncNav();
    render();
  });
});

els.teacherReturnButton.addEventListener("click", () => {
  state.view = "profile";
  syncNav();
  render();
});

resetScores(episodes[0]);
window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedProgress()) return;
  event.preventDefault();
  event.returnValue = "";
});
supabaseClient?.auth.onAuthStateChange?.((event, session) => {
  if (event === "SIGNED_OUT" && currentUser) {
    resetSessionLearningState();
    showLogin("로그인 세션이 종료됐어. 다시 로그인해줘.");
  } else if (event === "SIGNED_IN" && currentUser && session?.user?.id !== currentUser.id) {
    resetSessionLearningState();
    showLogin("다른 탭에서 계정이 변경됐어. 사용할 계정으로 다시 로그인해줘.");
  }
});
els.authSubmitButton.disabled = true;
loadSession().catch(() => showLogin("연결을 확인하고 다시 로그인해줘.")).finally(() => { els.authSubmitButton.disabled = false; });
