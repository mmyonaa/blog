import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/**
 * 섹션 id → 한국어 라벨.
 * 서버(server/src/topics.ts)의 SECTIONS와 맞춘다 — 사이트는 서버 패키지를 import하지 않으므로
 * 라벨을 여기 둔다. 목록에 없는 섹션은 id를 그대로 라벨로 쓴다(확장에 안전).
 */
export const SECTION_LABELS: Record<string, string> = {
  mcp: "MCP·에이전트 만들기",
  jeongcheogi: "정처기",
  security: "보안",
};

/** 노출 순서. 여기 없는 섹션은 뒤에 이름순으로 붙는다. */
const SECTION_ORDER = ["mcp", "jeongcheogi", "security"];

/**
 * 섹션별 액센트 hue. 랜딩의 섹션 pill과 카드뷰의 색 띠가 같은 색을 쓰도록
 * 여기 한 곳에 둔다. 목록에 없는 섹션은 기본 액센트로 폴백.
 */
export const SECTION_HUE: Record<string, string> = {
  mcp: "#33415c",
  jeongcheogi: "#4e618d",
  security: "#6a7ca0",
};

export const hueOf = (id: string): string => SECTION_HUE[id] ?? "var(--c-accent)";

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
