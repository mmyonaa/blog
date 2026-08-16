/**
 * 블로그 주제 시드 풀.
 *
 * MCP 서버는 LLM을 호출하지 않으므로(무료 원칙), suggest_topic은 이 고정 풀에서
 * 아직 발행하지 않은 후보를 결정론적으로 골라 제안한다. 최종 선택·본문 작성은
 * 오케스트레이터(또는 Claude Code)가 한다.
 *
 * 이 프로젝트를 만들며 배운 것을 그대로 글감으로 삼는 "메타 블로그" 컨셉.
 */
/**
 * 섹션(section) — "무슨 주제의 블로그인가"의 최상위 축(subject).
 * 서로 다른 주제 영역(예: MCP 만들기 vs 정처기)을 나눈다. area보다 한 단계 위.
 *
 * ⚠️ 확장 원칙: 이 레지스트리가 섹션의 단일 출처다. 새 섹션은 여기에 한 줄 추가하고,
 * 그 섹션의 area(아래)와 시드만 얹으면 된다. section 값을 enum으로 하드코딩하지 말 것.
 */
export interface SectionDef {
  label: string;
  desc: string;
  /** Mode R(write_research_post) 소재 발굴 방향. 있으면 리서치 프롬프트가 검색을 이쪽으로 조준한다. */
  researchHint?: string;
  /** Mode R 글이 달 area. 시사 글은 시드 밖(topicId 없음)이라 분류를 area로 잇는다. */
  researchArea?: AreaId;
}

export const SECTIONS = {
  mcp: {
    label: "MCP·에이전트 만들기",
    desc: "MCP 서버·에이전트를 만들며 배운 개념과 자동화 여정을 기록하는 메타 블로그",
    researchHint:
      "요즘 뜨는 MCP 서버·에이전트 프레임워크·Claude Code 스킬 등 생태계 화제작과 새 릴리스. GitHub 릴리스 노트·공식 블로그 같은 1차 출처가 뉴스 기사보다 신호가 강하다",
    researchArea: "T",
  },
  web: { label: "블로그·웹 만들기", desc: "Astro·TypeScript 등 블로그 사이트를 만들며 배운 웹 기술" },
  jeongcheogi: { label: "정처기", desc: "정보처리기사 시험 개념 정리" },
  algo: { label: "알고리즘", desc: "코딩테스트를 위한 알고리즘·자료구조를 구현 중심으로 정리" },
  security: {
    label: "보안",
    desc: "최근 보안 사고·취약점을 웹 리서치로 종합(Mode R). 시드 없이 자유 주제로 쓴다",
    researchHint: "최근 보안 사고·신규 취약점·패치 공지 중 개발자에게 실제 영향이 있는 사건",
  },
} as const satisfies Record<string, SectionDef>;

export type SectionId = keyof typeof SECTIONS;

/**
 * 주제 영역(area) — 섹션 "안에서"의 갈래(facet).
 * 각 area는 어느 section 소속인지 태그를 달고, section은 area에서 파생된다(단일 출처).
 * suggest_topic이 이 축으로 후보를 다각화한다.
 */
export const AREAS = {
  // ── mcp 섹션 ──
  A: { section: "mcp", label: "프로젝트 개발기", desc: "MCP 자동화 여정 — 에이전트·CI·비용 등 프로젝트 기록" },
  C: { section: "mcp", label: "MCP·LLM 해설", desc: "MCP·LLM 생태계 개념 설명" },
  T: { section: "mcp", label: "생태계 동향", desc: "요즘 뜨는 MCP 서버·에이전트·스킬 등 생태계 이슈 리서치 (Mode R, 시드 없음)" },
  // ── web 섹션 ──
  B: { section: "web", label: "TS·구현 기법", desc: "TypeScript/Node 기술 팁 (풀이 무한)" },
  W: { section: "web", label: "사이트 구축", desc: "Astro·배포 등 블로그 사이트 만들기" },
  OPS: { section: "web", label: "인프라·배포", desc: "nginx·pm2 등 서버 운영·무중단 배포" },
  // ── jeongcheogi 섹션 ──
  DB: { section: "jeongcheogi", label: "데이터베이스", desc: "정규화·트랜잭션·인덱스 등" },
  NET: { section: "jeongcheogi", label: "네트워크", desc: "OSI·TCP/UDP·IP 등" },
  OS: { section: "jeongcheogi", label: "운영체제", desc: "프로세스·메모리·스케줄링 등" },
  SE: { section: "jeongcheogi", label: "소프트웨어공학", desc: "설계·테스트·방법론 등" },
  SEC: { section: "jeongcheogi", label: "정보보안", desc: "암호화·접근통제·보안 3요소 등" },
  PRAC: { section: "jeongcheogi", label: "실기 문제", desc: "C·Java·Python 실기 코딩 문제 풀이" },
  // ── algo 섹션 ──
  DS: { section: "algo", label: "자료구조", desc: "배열·스택·큐·해시·트리·힙" },
  SRT: { section: "algo", label: "정렬·탐색", desc: "이진탐색·정렬 비교·투 포인터" },
  GRP: { section: "algo", label: "그래프", desc: "BFS/DFS·최단경로·유니온 파인드" },
  DP: { section: "algo", label: "동적계획법", desc: "메모이제이션·점화식·배낭 문제" },
  IMP: { section: "algo", label: "그리디·구현", desc: "그리디·완전탐색·시뮬레이션" },
} as const;

export type AreaId = keyof typeof AREAS;

/** area가 속한 section을 돌려준다. section은 area에서 파생(단일 출처). */
export function sectionOfArea(area: AreaId): SectionId {
  return AREAS[area].section;
}

/** 문자열이 유효한 area인지 좁힌다. */
export function isAreaId(value: string): value is AreaId {
  return Object.prototype.hasOwnProperty.call(AREAS, value);
}

export interface Topic {
  /**
   * 안 바뀌는 안정적 식별자(kebab-case). 발행 시 글 프론트매터에 `topicId`로 기록되어,
   * 제목·슬러그가 리워딩돼도 "이 주제는 이미 썼다"를 확실히 판정하는 키가 된다.
   */
  id: string;
  /** 주제 영역(대분류). suggest_topic 다각화의 축. */
  area: AreaId;
  title: string;
  tags: string[];
}

export const SEED_TOPICS: Topic[] = [
  { id: "what-is-mcp", area: "C", title: "MCP란 무엇인가 — LLM에게 도구를 쥐여주는 프로토콜", tags: ["mcp", "개념"] },
  { id: "three-primitives", area: "C", title: "MCP의 3대 primitive: Tools vs Resources vs Prompts", tags: ["mcp", "개념"] },
  { id: "transport-stdio-vs-http", area: "C", title: "stdio vs HTTP: MCP transport 고르기", tags: ["mcp", "transport"] },
  { id: "resources-context", area: "C", title: "MCP Resource로 LLM에게 컨텍스트 읽히기", tags: ["mcp", "resources"] },
  { id: "prompts-workflow", area: "C", title: "MCP Prompt로 반복 워크플로 패키징하기", tags: ["mcp", "prompts"] },
  { id: "mcp-vs-function-calling", area: "C", title: "MCP와 function calling은 뭐가 다른가", tags: ["mcp", "개념", "llm"] },
  { id: "mcp-vs-a2a", area: "C", title: "MCP vs A2A — 도구 연결과 에이전트 통신의 차이", tags: ["mcp", "a2a", "개념"] },
  { id: "tool-description-design", area: "C", title: "LLM이 도구를 잘 고르게 하는 description 쓰기", tags: ["mcp", "tools", "llm"] },
  { id: "mcp-error-handling", area: "C", title: "MCP 도구 에러를 LLM에게 잘 전달하기 (isError)", tags: ["mcp", "tools", "에러처리"] },
  { id: "first-stdio-server-ts", area: "B", title: "TypeScript로 첫 stdio MCP 서버 만들기", tags: ["mcp", "typescript"] },
  { id: "zod-input-schema", area: "B", title: "zod로 MCP 도구 입력 스키마 정의하기", tags: ["mcp", "zod"] },
  { id: "esm-vs-cjs", area: "B", title: "ESM vs CommonJS — import가 안 될 때 무슨 일이 일어나나", tags: ["node", "esm", "typescript"] },
  { id: "nodenext-js-ext", area: "B", title: "TypeScript에서 import 경로에 왜 .js를 붙이나 (NodeNext)", tags: ["typescript", "esm", "tsconfig"] },
  { id: "unicode-slug", area: "B", title: "한글도 되는 슬러그 만들기 — 유니코드 정규식 \\p{L}", tags: ["typescript", "정규식"] },
  { id: "parse-vs-safeparse", area: "B", title: "zod parse vs safeParse — 언제 무엇을 쓰나", tags: ["zod", "typescript", "검증"] },
  { id: "files-git-vs-db", area: "W", title: "왜 블로그에 DB 대신 파일 + git을 쓰나", tags: ["아키텍처", "ssg"] },
  { id: "astro-content-collection", area: "W", title: "Astro Content Collection으로 마크다운 블로그 만들기", tags: ["astro", "ssg"] },
  { id: "github-actions-cron", area: "A", title: "GitHub Actions cron으로 매일 도는 자동화 짜기", tags: ["ci", "cron"] },
  { id: "agent-sdk-orchestrator", area: "A", title: "Claude Agent SDK로 MCP 서버에 오케스트레이터 붙이기", tags: ["agent-sdk", "mcp"] },
  { id: "subscription-vs-api-cost", area: "A", title: "구독 vs API 키: 자동화 비용의 진실", tags: ["비용", "인증"] },
  { id: "claude-code-testing", area: "A", title: "Claude Code에 내 MCP 서버 붙여 테스트하기", tags: ["mcp", "claude-code"] },
  { id: "github-pages-deploy", area: "W", title: "GitHub Pages로 정적 블로그 무료 배포하기", tags: ["pages", "배포"] },

  // ── 정처기 섹션 (jeongcheogi) ──
  // DB
  { id: "db-normalization", area: "DB", title: "데이터베이스 정규화 — 1NF부터 BCNF까지", tags: ["정처기", "데이터베이스", "정규화"] },
  { id: "transaction-acid", area: "DB", title: "트랜잭션과 ACID 원칙", tags: ["정처기", "데이터베이스", "트랜잭션"] },
  { id: "db-index", area: "DB", title: "인덱스는 어떻게 조회를 빠르게 하나", tags: ["정처기", "데이터베이스", "인덱스"] },
  { id: "db-keys", area: "DB", title: "키의 종류 — 기본키·외래키·후보키·슈퍼키", tags: ["정처기", "데이터베이스", "키"] },
  // NET
  { id: "osi-7-layers", area: "NET", title: "OSI 7계층 한눈에 정리", tags: ["정처기", "네트워크", "osi"] },
  { id: "tcp-vs-udp", area: "NET", title: "TCP vs UDP — 무엇이 다른가", tags: ["정처기", "네트워크", "전송계층"] },
  { id: "ip-subnetting", area: "NET", title: "IP 주소와 서브넷팅 기초", tags: ["정처기", "네트워크", "ip"] },
  { id: "http-status-codes", area: "NET", title: "HTTP 상태 코드 정리 (2xx~5xx)", tags: ["정처기", "네트워크", "http"] },
  // OS
  { id: "process-vs-thread", area: "OS", title: "프로세스 vs 스레드", tags: ["정처기", "운영체제", "프로세스"] },
  { id: "deadlock-conditions", area: "OS", title: "교착상태(데드락)의 4가지 조건", tags: ["정처기", "운영체제", "데드락"] },
  { id: "page-replacement", area: "OS", title: "페이지 교체 알고리즘 — FIFO와 LRU", tags: ["정처기", "운영체제", "메모리"] },
  { id: "cpu-scheduling", area: "OS", title: "CPU 스케줄링 — 선점 vs 비선점", tags: ["정처기", "운영체제", "스케줄링"] },
  // SE
  { id: "coupling-cohesion", area: "SE", title: "결합도와 응집도", tags: ["정처기", "소프트웨어공학", "설계"] },
  { id: "blackbox-whitebox", area: "SE", title: "블랙박스 테스트 vs 화이트박스 테스트", tags: ["정처기", "소프트웨어공학", "테스트"] },
  { id: "dev-methodology", area: "SE", title: "개발 방법론 — 폭포수와 애자일", tags: ["정처기", "소프트웨어공학", "방법론"] },
  { id: "design-patterns-overview", area: "SE", title: "디자인 패턴 개요 — 생성·구조·행위", tags: ["정처기", "소프트웨어공학", "디자인패턴"] },
  // SEC
  { id: "security-cia", area: "SEC", title: "정보보안 3요소 — 기밀성·무결성·가용성", tags: ["정처기", "정보보안", "cia"] },
  { id: "symmetric-asymmetric", area: "SEC", title: "대칭키 vs 비대칭키 암호화", tags: ["정처기", "정보보안", "암호화"] },
  { id: "hash-digital-signature", area: "SEC", title: "해시 함수와 전자서명", tags: ["정처기", "정보보안", "해시"] },
  { id: "access-control", area: "SEC", title: "접근통제 모델 — DAC·MAC·RBAC", tags: ["정처기", "정보보안", "접근통제"] },

  // ── 알고리즘 섹션 (algo) ──
  // DS — 자료구조
  { id: "big-o-notation", area: "DS", title: "시간복잡도와 Big-O 표기법", tags: ["알고리즘", "시간복잡도", "Big-O"] },
  { id: "array-vs-linked-list", area: "DS", title: "배열 vs 연결 리스트", tags: ["알고리즘", "자료구조", "배열"] },
  { id: "stack-queue", area: "DS", title: "스택과 큐 — LIFO와 FIFO", tags: ["알고리즘", "자료구조", "스택"] },
  { id: "hash-table", area: "DS", title: "해시 테이블은 어떻게 O(1)로 찾나", tags: ["알고리즘", "자료구조", "해시"] },
  { id: "heap-priority-queue", area: "DS", title: "힙과 우선순위 큐", tags: ["알고리즘", "자료구조", "힙"] },
  { id: "binary-tree-traversal", area: "DS", title: "이진 트리 순회 — 전위·중위·후위", tags: ["알고리즘", "자료구조", "트리"] },
  // SRT — 정렬·탐색
  { id: "binary-search", area: "SRT", title: "이진 탐색 — 정렬된 배열에서 O(log n)", tags: ["알고리즘", "이진탐색", "탐색"] },
  { id: "sorting-algorithms", area: "SRT", title: "정렬 알고리즘 비교 — 버블·병합·퀵", tags: ["알고리즘", "정렬"] },
  { id: "two-pointers", area: "SRT", title: "투 포인터로 O(n)에 훑기", tags: ["알고리즘", "투포인터", "탐색"] },
  // GRP — 그래프
  { id: "bfs-dfs", area: "GRP", title: "BFS와 DFS — 그래프 탐색의 두 축", tags: ["알고리즘", "그래프", "완전탐색"] },
  { id: "dijkstra", area: "GRP", title: "다익스트라 최단 경로", tags: ["알고리즘", "그래프", "최단경로"] },
  { id: "union-find", area: "GRP", title: "유니온 파인드 — 서로소 집합", tags: ["알고리즘", "그래프", "유니온파인드"] },
  // DP — 동적계획법
  { id: "dp-intro", area: "DP", title: "동적 계획법 입문 — 메모이제이션과 점화식", tags: ["알고리즘", "dp", "메모이제이션"] },
  { id: "knapsack", area: "DP", title: "배낭 문제 — 0/1 knapsack", tags: ["알고리즘", "dp", "배낭문제"] },
  // IMP — 그리디·구현
  { id: "greedy-intro", area: "IMP", title: "그리디 알고리즘 — 언제 최적이 보장되나", tags: ["알고리즘", "그리디"] },
  { id: "brute-force", area: "IMP", title: "완전 탐색 — 모든 경우를 다 해보기", tags: ["알고리즘", "완전탐색"] },
  { id: "simulation", area: "IMP", title: "구현·시뮬레이션 문제 접근법", tags: ["알고리즘", "구현", "시뮬레이션"] },
];

/** topicId(시드 id) → area. 시드 밖 id면 undefined. publish_post가 area를 자동 도출할 때 쓴다. */
const TOPIC_AREA = new Map(SEED_TOPICS.map((t) => [t.id, t.area] as const));
export function areaOfTopicId(id: string): AreaId | undefined {
  return TOPIC_AREA.get(id);
}
