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
  jeongcheogi: "정처기",
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
  jeongcheogi: "정보처리기사 준비 정리",
  boangisa: "정보보안기사 필기 5과목 정리",
  algo: "코딩테스트를 위한 알고리즘·자료구조 정리",
  security: "웹·시스템 보안과 취약점 파고들기",
};

export const blurbOf = (id: string): string => SECTION_BLURB[id] ?? "";

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
