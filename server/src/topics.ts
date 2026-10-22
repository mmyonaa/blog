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
 * 서로 다른 주제 영역(예: MCP 만들기 vs 정보처리기사)을 나눈다. area보다 한 단계 위.
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
  /**
   * 자격증 시험 섹션이면 그 시험의 정식 명칭. 있으면 write_daily_post가 튜토리얼형 대신
   * 개념 정리형(정의→원리→예시→시험 포인트)으로 쓰고 대상 독자를 수험생으로 잡는다.
   */
  exam?: string;
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
  jeongcheogi: { label: "정보처리기사", desc: "정보처리기사 필기 개념과 실기 문제 정리", exam: "정보처리기사" },
  boangisa: { label: "정보보안기사", desc: "정보보안기사 필기 개념과 실기 문제 정리", exam: "정보보안기사" },
  bigdata: { label: "빅데이터분석기사", desc: "빅데이터분석기사 필기 개념과 실기 작업형 정리", exam: "빅데이터분석기사" },
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
  // ── boangisa 섹션 (정보보안기사 필기 5과목 + 실기) ──
  SYS: { section: "boangisa", label: "시스템 보안", desc: "리눅스·윈도우 권한, 악성코드, 로그 등" },
  NSEC: { section: "boangisa", label: "네트워크 보안", desc: "스푸핑·DDoS·방화벽·VPN 등" },
  APPSEC: { section: "boangisa", label: "애플리케이션 보안", desc: "웹 취약점·세션·전자우편 보안 등" },
  ISEC: { section: "boangisa", label: "정보보안 일반", desc: "암호 알고리즘·인증·PKI 등" },
  LAW: { section: "boangisa", label: "관리·법규", desc: "위험관리·ISMS-P·개인정보보호법 등" },
  SPRAC: { section: "boangisa", label: "실기 문제", desc: "로그 분석·설정 점검 등 서술형 실기 문제 풀이" },
  // ── bigdata 섹션 (빅데이터분석기사 필기 4과목 + 실기 작업형) ──
  BDPLAN: { section: "bigdata", label: "분석 기획", desc: "빅데이터 이해·분석 과제 도출·수집과 저장 계획" },
  BDEXP: { section: "bigdata", label: "데이터 탐색", desc: "전처리·EDA·기초 통계와 가설검정" },
  BDMODEL: { section: "bigdata", label: "모델링", desc: "회귀·분류·군집·앙상블 등 분석 기법" },
  BDEVAL: { section: "bigdata", label: "결과 해석", desc: "평가지표·교차검증·시각화와 활용" },
  BDPRAC: { section: "bigdata", label: "실기 작업형", desc: "pandas·scikit-learn·scipy로 푸는 작업형 3유형" },
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

  // ── 정보처리기사 섹션 (jeongcheogi) ──
  // DB
  { id: "db-normalization", area: "DB", title: "데이터베이스 정규화 — 1NF부터 BCNF까지", tags: ["정보처리기사", "데이터베이스", "정규화"] },
  { id: "transaction-acid", area: "DB", title: "트랜잭션과 ACID 원칙", tags: ["정보처리기사", "데이터베이스", "트랜잭션"] },
  { id: "db-index", area: "DB", title: "인덱스는 어떻게 조회를 빠르게 하나", tags: ["정보처리기사", "데이터베이스", "인덱스"] },
  { id: "db-keys", area: "DB", title: "키의 종류 — 기본키·외래키·후보키·슈퍼키", tags: ["정보처리기사", "데이터베이스", "키"] },
  // NET
  { id: "osi-7-layers", area: "NET", title: "OSI 7계층 한눈에 정리", tags: ["정보처리기사", "네트워크", "osi"] },
  { id: "tcp-vs-udp", area: "NET", title: "TCP vs UDP — 무엇이 다른가", tags: ["정보처리기사", "네트워크", "전송계층"] },
  { id: "ip-subnetting", area: "NET", title: "IP 주소와 서브넷팅 기초", tags: ["정보처리기사", "네트워크", "ip"] },
  { id: "http-status-codes", area: "NET", title: "HTTP 상태 코드 정리 (2xx~5xx)", tags: ["정보처리기사", "네트워크", "http"] },
  // OS
  { id: "process-vs-thread", area: "OS", title: "프로세스 vs 스레드", tags: ["정보처리기사", "운영체제", "프로세스"] },
  { id: "deadlock-conditions", area: "OS", title: "교착상태(데드락)의 4가지 조건", tags: ["정보처리기사", "운영체제", "데드락"] },
  { id: "page-replacement", area: "OS", title: "페이지 교체 알고리즘 — FIFO와 LRU", tags: ["정보처리기사", "운영체제", "메모리"] },
  { id: "cpu-scheduling", area: "OS", title: "CPU 스케줄링 — 선점 vs 비선점", tags: ["정보처리기사", "운영체제", "스케줄링"] },
  // SE
  { id: "coupling-cohesion", area: "SE", title: "결합도와 응집도", tags: ["정보처리기사", "소프트웨어공학", "설계"] },
  { id: "blackbox-whitebox", area: "SE", title: "블랙박스 테스트 vs 화이트박스 테스트", tags: ["정보처리기사", "소프트웨어공학", "테스트"] },
  { id: "dev-methodology", area: "SE", title: "개발 방법론 — 폭포수와 애자일", tags: ["정보처리기사", "소프트웨어공학", "방법론"] },
  { id: "design-patterns-overview", area: "SE", title: "디자인 패턴 개요 — 생성·구조·행위", tags: ["정보처리기사", "소프트웨어공학", "디자인패턴"] },
  // SEC
  { id: "security-cia", area: "SEC", title: "정보보안 3요소 — 기밀성·무결성·가용성", tags: ["정보처리기사", "정보보안", "cia"] },
  { id: "symmetric-asymmetric", area: "SEC", title: "대칭키 vs 비대칭키 암호화", tags: ["정보처리기사", "정보보안", "암호화"] },
  { id: "hash-digital-signature", area: "SEC", title: "해시 함수와 전자서명", tags: ["정보처리기사", "정보보안", "해시"] },
  { id: "access-control", area: "SEC", title: "접근통제 모델 — DAC·MAC·RBAC", tags: ["정보처리기사", "정보보안", "접근통제"] },

  // ── 정보보안기사 섹션 (boangisa) ──
  // SYS — 시스템 보안
  { id: "linux-permission-setuid", area: "SYS", title: "리눅스 파일 권한과 SetUID·SetGID·스티키 비트", tags: ["정보보안기사", "시스템보안", "리눅스", "권한"] },
  { id: "windows-auth-sam-lsa", area: "SYS", title: "윈도우 인증 구조 — SAM·LSA·NTLM", tags: ["정보보안기사", "시스템보안", "윈도우", "인증"] },
  { id: "buffer-overflow", area: "SYS", title: "버퍼 오버플로우 — 스택이 무너지는 원리와 방어", tags: ["정보보안기사", "시스템보안", "버퍼오버플로우"] },
  { id: "malware-types", area: "SYS", title: "악성코드 분류 — 바이러스·웜·트로이목마·루트킷", tags: ["정보보안기사", "시스템보안", "악성코드"] },
  { id: "system-log-audit", area: "SYS", title: "시스템 로그와 감사 — syslog·utmp·wtmp", tags: ["정보보안기사", "시스템보안", "로그"] },
  // NSEC — 네트워크 보안
  { id: "arp-spoofing", area: "NSEC", title: "ARP 스푸핑 — 스위치 환경에서 어떻게 스니핑하나", tags: ["정보보안기사", "네트워크보안", "스푸핑"] },
  { id: "ddos-attack-types", area: "NSEC", title: "DoS·DDoS 공격 유형 — SYN 플러딩·스머프·슬로로리스", tags: ["정보보안기사", "네트워크보안", "ddos"] },
  { id: "firewall-ids-ips-waf", area: "NSEC", title: "방화벽·IDS·IPS·WAF는 무엇이 다른가", tags: ["정보보안기사", "네트워크보안", "방화벽", "ids"] },
  { id: "vpn-ipsec-ssl", area: "NSEC", title: "VPN — IPSec VPN과 SSL VPN", tags: ["정보보안기사", "네트워크보안", "vpn", "ipsec"] },
  { id: "port-scan-techniques", area: "NSEC", title: "포트 스캔 기법 — TCP 연결·SYN·스텔스 스캔", tags: ["정보보안기사", "네트워크보안", "포트스캔"] },
  // APPSEC — 애플리케이션 보안
  { id: "sql-injection", area: "APPSEC", title: "SQL 인젝션 — 원리와 근본 방어", tags: ["정보보안기사", "애플리케이션보안", "sql인젝션"] },
  { id: "xss-vs-csrf", area: "APPSEC", title: "XSS와 CSRF — 헷갈리는 두 공격 구분하기", tags: ["정보보안기사", "애플리케이션보안", "xss", "csrf"] },
  { id: "file-upload-vuln", area: "APPSEC", title: "파일 업로드·다운로드 취약점", tags: ["정보보안기사", "애플리케이션보안", "파일업로드"] },
  { id: "session-hijacking", area: "APPSEC", title: "세션·쿠키 보안과 세션 하이재킹", tags: ["정보보안기사", "애플리케이션보안", "세션"] },
  { id: "email-security-pgp-smime", area: "APPSEC", title: "전자우편 보안 — PGP와 S/MIME", tags: ["정보보안기사", "애플리케이션보안", "pgp", "이메일"] },
  // ISEC — 정보보안 일반
  { id: "block-cipher-modes", area: "ISEC", title: "블록 암호 운영 모드 — ECB·CBC·CTR", tags: ["정보보안기사", "암호화", "블록암호"] },
  { id: "rsa-diffie-hellman", area: "ISEC", title: "공개키 암호의 뼈대 — RSA와 디피-헬만", tags: ["정보보안기사", "암호화", "rsa"] },
  { id: "pki-certificate", area: "ISEC", title: "PKI와 인증서 — CA·CRL·OCSP", tags: ["정보보안기사", "암호화", "pki", "인증서"] },
  { id: "user-auth-otp", area: "ISEC", title: "사용자 인증 3요소와 OTP·생체인증", tags: ["정보보안기사", "인증", "otp"] },
  { id: "hmac-message-auth", area: "ISEC", title: "메시지 인증 코드 — MAC과 HMAC", tags: ["정보보안기사", "암호화", "hmac"] },
  // LAW — 관리·법규
  { id: "risk-management", area: "LAW", title: "위험 관리 — 자산·위협·취약점과 위험 분석 기법", tags: ["정보보안기사", "보안관리", "위험분석"] },
  { id: "isms-p", area: "LAW", title: "ISMS-P 인증 — 무엇을 어떻게 심사하나", tags: ["정보보안기사", "보안관리", "isms-p"] },
  { id: "iso-27001", area: "LAW", title: "ISO/IEC 27001과 정보보호 관리체계", tags: ["정보보안기사", "보안관리", "iso27001"] },
  { id: "personal-info-act", area: "LAW", title: "개인정보보호법 핵심 — 수집·이용·제공·파기", tags: ["정보보안기사", "법규", "개인정보보호법"] },
  { id: "bcp-drp", area: "LAW", title: "업무연속성 — BCP·DRP와 RTO·RPO", tags: ["정보보안기사", "보안관리", "bcp"] },

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
  // ── 2026-10-16 보충 — mcp·jeongcheogi 시드 소진으로 추가 ──
  // mcp (C: 해설)
  { id: "mcp-tasks-extension", area: "C", title: "MCP Tasks 확장 — 오래 걸리는 작업을 작업 객체로 다루기", tags: ["mcp", "tasks", "확장"] },
  { id: "mcp-meta-field", area: "C", title: "MCP _meta 필드 — 스펙 밖 메타데이터를 충돌 없이 싣는 법", tags: ["mcp", "meta", "스펙"] },
  { id: "mcp-extensions-negotiation", area: "C", title: "MCP 확장 협상 — capabilities.extensions로 기능 더하기", tags: ["mcp", "extensions", "capability"] },
  { id: "mcp-server-icons", area: "C", title: "MCP 아이콘 — 서버·도구에 시각 식별자 달기", tags: ["mcp", "icons", "ux"] },
  { id: "streamable-http-resumability", area: "C", title: "Streamable HTTP — 끊긴 연결을 이벤트 ID로 이어 붙이기", tags: ["mcp", "streamable-http", "sse"] },
  { id: "mcp-registry-publish", area: "C", title: "MCP Registry에 서버 등록하기 — server.json 쓰기", tags: ["mcp", "registry", "server.json"] },
  // mcp (A: 프로젝트 개발기)
  { id: "mcp-inspector-debugging", area: "A", title: "MCP Inspector로 내 서버 들여다보기", tags: ["mcp", "inspector", "디버깅"] },
  { id: "mcp-server-unit-testing", area: "A", title: "MCP 서버 핸들러를 테스트로 묶어 두기", tags: ["mcp", "테스트", "typescript"] },
  { id: "remote-mcp-deploy", area: "A", title: "stdio 서버를 원격 HTTP 서버로 올리기", tags: ["mcp", "배포", "http"] },
  // jeongcheogi (DB)
  { id: "sql-join-types", area: "DB", title: "SQL 조인 — 내부·외부·교차 조인 구분하기", tags: ["정보처리기사", "데이터베이스", "sql", "조인"] },
  { id: "db-recovery", area: "DB", title: "데이터베이스 회복 기법 — REDO·UNDO·체크포인트", tags: ["정보처리기사", "데이터베이스", "회복"] },
  // jeongcheogi (NET)
  { id: "network-devices", area: "NET", title: "네트워크 장비 — 리피터·브리지·라우터·게이트웨이", tags: ["정보처리기사", "네트워크", "장비"] },
  { id: "routing-protocols", area: "NET", title: "라우팅 프로토콜 — RIP·OSPF·BGP", tags: ["정보처리기사", "네트워크", "라우팅"] },
  // jeongcheogi (OS)
  { id: "memory-allocation-fragmentation", area: "OS", title: "메모리 배치 전략과 단편화 — 최초·최적·최악 적합", tags: ["정보처리기사", "운영체제", "메모리"] },
  { id: "file-system-structure", area: "OS", title: "파일 시스템 구조 — i-node와 FAT", tags: ["정보처리기사", "운영체제", "파일시스템"] },
  // jeongcheogi (SE)
  { id: "requirements-engineering", area: "SE", title: "요구사항 공학 — 도출·분석·명세·확인", tags: ["정보처리기사", "소프트웨어공학", "요구사항"] },
  { id: "architecture-patterns", area: "SE", title: "소프트웨어 아키텍처 패턴 — 레이어·MVC·파이프필터", tags: ["정보처리기사", "소프트웨어공학", "아키텍처"] },
  { id: "configuration-management", area: "SE", title: "형상 관리 — 베이스라인과 변경 통제", tags: ["정보처리기사", "소프트웨어공학", "형상관리"] },
  // jeongcheogi (SEC)
  { id: "secure-coding-guide", area: "SEC", title: "시큐어 코딩 — 입력 검증부터 에러 처리까지", tags: ["정보처리기사", "정보보안", "시큐어코딩"] },

  // ── 빅데이터분석기사 섹션 (bigdata) ──
  // BDPLAN — 빅데이터 분석 기획
  { id: "bigdata-3v-data-types", area: "BDPLAN", title: "빅데이터란 무엇인가 — 3V와 정형·반정형·비정형 데이터", tags: ["빅데이터분석기사", "분석기획", "빅데이터"] },
  { id: "analysis-task-topdown-bottomup", area: "BDPLAN", title: "분석 과제 도출 — 하향식 접근과 상향식 접근", tags: ["빅데이터분석기사", "분석기획", "분석과제"] },
  { id: "analysis-masterplan-maturity", area: "BDPLAN", title: "분석 마스터플랜과 분석 성숙도 모델", tags: ["빅데이터분석기사", "분석기획", "분석성숙도"] },
  { id: "hdfs-mapreduce", area: "BDPLAN", title: "분산 저장과 처리 — HDFS와 맵리듀스", tags: ["빅데이터분석기사", "분석기획", "hdfs", "맵리듀스"] },
  { id: "data-de-identification", area: "BDPLAN", title: "개인정보 비식별 조치 — 가명처리·총계처리·범주화·마스킹", tags: ["빅데이터분석기사", "분석기획", "비식별조치"] },
  { id: "rdb-nosql-datawarehouse", area: "BDPLAN", title: "데이터 저장 선택 — RDB·NoSQL·데이터 웨어하우스와 마트", tags: ["빅데이터분석기사", "분석기획", "nosql", "데이터웨어하우스"] },
  // BDEXP — 빅데이터 탐색
  { id: "missing-value-handling", area: "BDEXP", title: "결측값 처리 — 삭제·단순 대치·다중 대치", tags: ["빅데이터분석기사", "데이터전처리", "결측값"] },
  { id: "outlier-detection", area: "BDEXP", title: "이상값 탐지 — IQR·Z-점수·ESD", tags: ["빅데이터분석기사", "데이터전처리", "이상값"] },
  { id: "pca-dimension-reduction", area: "BDEXP", title: "차원 축소 — 주성분분석(PCA)은 무엇을 버리고 무엇을 남기나", tags: ["빅데이터분석기사", "데이터전처리", "차원축소", "pca"] },
  { id: "feature-scaling", area: "BDEXP", title: "스케일링 — 표준화와 정규화는 어디서 갈리나", tags: ["빅데이터분석기사", "데이터전처리", "스케일링"] },
  { id: "imbalanced-data-sampling", area: "BDEXP", title: "불균형 데이터 — 과대표집·과소표집과 SMOTE", tags: ["빅데이터분석기사", "데이터전처리", "불균형데이터", "smote"] },
  { id: "eda-correlation", area: "BDEXP", title: "탐색적 데이터 분석(EDA)과 상관계수 읽기", tags: ["빅데이터분석기사", "데이터탐색", "eda", "상관분석"] },
  { id: "probability-distributions", area: "BDEXP", title: "확률분포 정리 — 정규·이항·포아송·t·카이제곱", tags: ["빅데이터분석기사", "통계", "확률분포"] },
  { id: "hypothesis-testing-basics", area: "BDEXP", title: "가설검정의 뼈대 — 귀무가설·유의수준·p-값·제1종 오류", tags: ["빅데이터분석기사", "통계", "가설검정", "p값"] },
  // BDMODEL — 빅데이터 모델링
  { id: "linear-regression-assumptions", area: "BDMODEL", title: "회귀분석 — 최소제곱법과 네 가지 가정", tags: ["빅데이터분석기사", "모델링", "회귀분석"] },
  { id: "logistic-regression-odds", area: "BDMODEL", title: "로지스틱 회귀 — 오즈비와 시그모이드", tags: ["빅데이터분석기사", "모델링", "로지스틱회귀"] },
  { id: "decision-tree-impurity", area: "BDMODEL", title: "의사결정나무 — 지니 불순도·엔트로피와 가지치기", tags: ["빅데이터분석기사", "모델링", "의사결정나무"] },
  { id: "ensemble-bagging-boosting", area: "BDMODEL", title: "앙상블 — 배깅·부스팅·랜덤 포레스트", tags: ["빅데이터분석기사", "모델링", "앙상블", "랜덤포레스트"] },
  { id: "svm-knn-naive-bayes", area: "BDMODEL", title: "분류기 세 갈래 — SVM·KNN·나이브 베이즈", tags: ["빅데이터분석기사", "모델링", "svm", "knn"] },
  { id: "kmeans-hierarchical-clustering", area: "BDMODEL", title: "군집분석 — K-평균과 계층적 군집", tags: ["빅데이터분석기사", "모델링", "군집분석", "k-means"] },
  { id: "association-rule-mining", area: "BDMODEL", title: "연관성 분석 — 지지도·신뢰도·향상도", tags: ["빅데이터분석기사", "모델링", "연관분석"] },
  { id: "time-series-arima", area: "BDMODEL", title: "시계열 분석 — 정상성과 ARIMA", tags: ["빅데이터분석기사", "모델링", "시계열", "arima"] },
  { id: "text-mining-sna", area: "BDMODEL", title: "비정형 데이터 분석 — 텍스트 마이닝과 사회연결망 분석", tags: ["빅데이터분석기사", "모델링", "텍스트마이닝", "sna"] },
  { id: "neural-network-backpropagation", area: "BDMODEL", title: "인공신경망 — 퍼셉트론에서 역전파까지", tags: ["빅데이터분석기사", "모델링", "인공신경망", "역전파"] },
  // BDEVAL — 빅데이터 결과 해석
  { id: "confusion-matrix-metrics", area: "BDEVAL", title: "혼동행렬 — 정확도·정밀도·재현율·F1", tags: ["빅데이터분석기사", "모형평가", "혼동행렬"] },
  { id: "roc-curve-auc", area: "BDEVAL", title: "ROC 곡선과 AUC — 임계값을 움직이면 무엇이 바뀌나", tags: ["빅데이터분석기사", "모형평가", "roc", "auc"] },
  { id: "regression-eval-metrics", area: "BDEVAL", title: "회귀 모형 평가 — RMSE·MAE·결정계수", tags: ["빅데이터분석기사", "모형평가", "rmse", "결정계수"] },
  { id: "overfitting-cross-validation", area: "BDEVAL", title: "과대적합과 교차검증 — 홀드아웃·k-겹·LOOCV", tags: ["빅데이터분석기사", "모형평가", "과대적합", "교차검증"] },
  { id: "hyperparameter-tuning", area: "BDEVAL", title: "매개변수 최적화 — 초매개변수와 그리드 서치", tags: ["빅데이터분석기사", "모형평가", "초매개변수", "그리드서치"] },
  { id: "visualization-four-types", area: "BDEVAL", title: "분석 결과 시각화 — 시간·공간·관계·비교", tags: ["빅데이터분석기사", "결과해석", "시각화"] },
  // BDPRAC — 실기 작업형
  { id: "bdprac-type1-preprocessing", area: "BDPRAC", title: "실기 제1유형 — pandas로 전처리하고 답만 뽑기", tags: ["빅데이터분석기사", "실기", "pandas"] },
  { id: "bdprac-type2-classification", area: "BDPRAC", title: "실기 제2유형 — scikit-learn으로 예측값 제출하기", tags: ["빅데이터분석기사", "실기", "scikit-learn"] },
  { id: "bdprac-type3-hypothesis", area: "BDPRAC", title: "실기 제3유형 — scipy로 가설검정 수행하기", tags: ["빅데이터분석기사", "실기", "scipy", "가설검정"] },
];

/** topicId(시드 id) → area. 시드 밖 id면 undefined. publish_post가 area를 자동 도출할 때 쓴다. */
const TOPIC_AREA = new Map(SEED_TOPICS.map((t) => [t.id, t.area] as const));
export function areaOfTopicId(id: string): AreaId | undefined {
  return TOPIC_AREA.get(id);
}
