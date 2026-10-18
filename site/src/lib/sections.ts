import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/**
 * 섹션 id → 한국어 라벨.
 * 서버(server/src/topics.ts)의 SECTIONS와 맞춘다 — 사이트는 서버 패키지를 import하지 않으므로
 * 라벨을 여기 둔다. 목록에 없는 섹션은 id를 그대로 라벨로 쓴다(확장에 안전).
 */
export const SECTION_LABELS: Record<string, string> = {
  mcp: "MCP·에이전트 만들기",
  web: "블로그·웹 만들기",
  jeongcheogi: "정보처리기사",
  boangisa: "정보보안기사",
  algo: "알고리즘",
  security: "보안",
};

/** 노출 순서. 여기 없는 섹션은 뒤에 이름순으로 붙는다. */
const SECTION_ORDER = ["mcp", "web", "jeongcheogi", "boangisa", "algo", "security"];

/**
 * area id → 한국어 라벨. 서버(server/src/topics.ts)의 AREAS와 맞춘다(사이트는 서버를
 * import하지 않으므로 라벨을 여기 둔다). 글 프론트매터의 area는 이 세부 영역 코드다.
 * 목록에 없는 area는 코드를 그대로 라벨로 쓴다.
 */
export const AREA_LABELS: Record<string, string> = {
  A: "프로젝트 개발기",
  C: "MCP·LLM 해설",
  B: "TS·구현 기법",
  W: "사이트 구축",
  OPS: "인프라·배포",
  DB: "데이터베이스",
  NET: "네트워크",
  OS: "운영체제",
  SE: "소프트웨어공학",
  SEC: "정보보안",
  PRAC: "실기 문제",
  SYS: "시스템 보안",
  NSEC: "네트워크 보안",
  APPSEC: "애플리케이션 보안",
  ISEC: "정보보안 일반",
  LAW: "관리·법규",
  SPRAC: "실기 문제",
  DS: "자료구조",
  SRT: "정렬·탐색",
  GRP: "그래프",
  DP: "동적계획법",
  IMP: "그리디·구현",
};

export const areaLabel = (id: string | undefined): string =>
  id ? (AREA_LABELS[id] ?? id) : "";

/**
 * 섹션별 액센트 hue. 랜딩의 섹션 pill·카드 배지·분류 카드 좌측 보더가 같은 색을
 * 쓰도록 여기 한 곳에 둔다. 목록에 없는 섹션은 기본 액센트로 폴백.
 *
 * Maktub 참고: 카테고리마다 뚜렷이 다른 비비드 색(블루·틸·퍼플·앰버)으로 구분한다.
 * 다크 모드에선 각 컴포넌트가 white와 58% 섞어 밝게 보정하므로 여기선 라이트 기준값만.
 */
export const SECTION_HUE: Record<string, string> = {
  mcp: "#4c93e6", // 블루
  web: "#22beb0", // 틸
  jeongcheogi: "#7b6fe6", // 퍼플
  boangisa: "#2fa36b", // 그린
  algo: "#e05f86", // 로즈
  security: "#f2994a", // 앰버
};

export const hueOf = (id: string): string => SECTION_HUE[id] ?? "var(--c-accent)";

/**
 * 섹션 id → 한 줄 소개. 홈의 카테고리 소개 블록(SectionNav)에서 "여기 뭘 다루는 곳인지"를
 * 즉시 전달하는 데 쓴다. 목록에 없는 섹션은 빈 문자열(카드가 라벨·편수만 보여준다).
 */
export const SECTION_BLURB: Record<string, string> = {
  mcp: "MCP 서버와 에이전트를 직접 만들며 배운 것",
  web: "이 블로그를 포함한 웹·프론트엔드 만들기",
  jeongcheogi: "정보처리기사 필기 개념과 실기 문제 정리",
  boangisa: "정보보안기사 필기 개념과 실기 문제 정리",
  algo: "코딩테스트를 위한 알고리즘·자료구조 정리",
  security: "웹·시스템 보안과 취약점 파고들기",
};

export const blurbOf = (id: string): string => SECTION_BLURB[id] ?? "";

/**
 * 섹션 id → 카테고리 페이지 머리말. blurb가 카드용 한 줄이라면 이건 "이 카테고리에
 * 뭐가 어떻게 들어있는지"를 두세 문장으로 풀어 쓴 산문이다.
 *
 * 목록 페이지는 제목 + 링크 나열뿐이라 페이지마다 고유한 본문이 없다 — 검색엔진이
 * 보기엔 서로 구분이 안 되는 얇은 페이지다. 이 문단이 그 고유 본문 역할을 한다.
 * 그래서 라벨을 되풀이하는 빈 문장("~ 카테고리의 글 목록") 대신 실제로 다루는
 * 소재를 적는다. 목록에 없는 섹션은 빈 문자열(머리말 없이 목록만 나온다).
 */
export const SECTION_INTRO: Record<string, string> = {
  mcp: "MCP(Model Context Protocol) 서버를 TypeScript로 직접 만들며 부딪힌 것들을 기록합니다. Tools·Resources·Prompts라는 프로토콜의 구성 요소부터, stdio 트랜스포트에서 stdout에 로그를 찍으면 왜 서버가 죽는지처럼 한 번 깨져봐야 아는 것까지, 그리고 Claude Code를 비롯한 에이전트·스킬 생태계까지 다룹니다. 이 블로그 자체가 그렇게 만든 MCP 서버로 발행됩니다.",
  web: "이 블로그를 Astro로 만들며 배운 웹 기술을 정리합니다. SSG·SSR·CSR이 각각 언제 HTML을 만드는가 하는 렌더링 개념, Content Collection·아일랜드 아키텍처·RSS 같은 Astro 실무, 그리고 nginx·pm2로 실제 서버에 올리는 배포까지 이어집니다.",
  jeongcheogi: "정보처리기사 필기 개념과 실기 문제를 시험에 나오는 형태로 정리합니다. 데이터베이스 정규화, OSI 7계층, 프로세스와 스레드, 결합도와 응집도처럼 과목별 핵심 개념을 정의와 원리부터 짚습니다. 실기는 C·Java·Python 코딩 문제를 출력 추적 중심으로 풉니다.",
  boangisa: "정보보안기사 필기 5과목 개념을 과목 순서대로 정리합니다. 시스템 보안의 리눅스 권한과 SetUID, 네트워크 보안의 ARP 스푸핑과 DDoS, 애플리케이션 보안의 SQL 인젝션과 XSS·CSRF, 정보보안 일반의 블록 암호 운영 모드와 RSA·PKI, 그리고 관리·법규의 위험 관리를 다룹니다.",
  algo: "코딩테스트에서 쓰는 알고리즘과 자료구조를 구현 중심으로 정리합니다. Big-O로 비용을 따지는 법에서 시작해 이진 탐색·BFS와 DFS·동적 계획법까지, 개념을 말로만 설명하지 않고 코드로 남깁니다.",
  security: "실제로 터진 보안 사고와 새로 공개된 취약점을 찾아 읽고, 개발자 입장에서 무엇을 해야 하는지로 정리합니다. CVE 하나를 놓고 원리·영향 범위·대응을 따지는 글이 많습니다. MCP 서버에 생기는 커맨드 인젝션·SSRF처럼 직접 만드는 것과 맞닿은 주제도 함께 다룹니다.",
};

export const introOf = (id: string): string => SECTION_INTRO[id] ?? "";

/**
 * 섹션 id → 카드 배지에 넣을 대문자 이니셜 한 글자.
 * 한국어 라벨 대신 영문 id의 머리글자를 써서 M/W/J/S로 축약한다(중복 없음).
 * 목록에 없는 섹션은 id 첫 글자를 대문자로 폴백.
 */
export const SECTION_INITIAL: Record<string, string> = {
  mcp: "M",
  web: "W",
  jeongcheogi: "J",
  boangisa: "B",
  algo: "A",
  security: "S",
};

export const initialOf = (id: string): string =>
  SECTION_INITIAL[id] ?? (id.trim()[0]?.toUpperCase() ?? "?");

export function sectionLabel(id: string): string {
  return SECTION_LABELS[id] ?? id;
}

// 내부 데이터 축은 'section'이지만, 화면·URL 표기는 '카테고리(categories)'로 노출한다.
export function sectionHref(base: string, id: string): string {
  return `${base}/categories/${encodeURIComponent(id)}/`;
}

/** 글의 섹션(없으면 mcp — 구버전 글 호환). */
export const sectionOf = (post: Post): string =>
  typeof post.data.section === "string" && post.data.section.trim() !== ""
    ? post.data.section
    : "mcp";

/** 섹션 id → 해당 글 목록(최신순) 맵. */
export async function getSectionMap(): Promise<Map<string, Post[]>> {
  const posts = await getCollection("blog");
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    const s = sectionOf(post);
    const list = map.get(s) ?? [];
    list.push(post);
    map.set(s, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  }
  return map;
}

/** 섹션 목록(정의된 순서 우선, 그 외 이름순). */
export async function getSectionCounts(): Promise<
  { id: string; label: string; count: number }[]
> {
  const map = await getSectionMap();
  const rank = (id: string) => {
    const i = SECTION_ORDER.indexOf(id);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...map.entries()]
    .map(([id, posts]) => ({ id, label: sectionLabel(id), count: posts.length }))
    .sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}
