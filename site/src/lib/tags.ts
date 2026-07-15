import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

/** 태그 → 해당 글 목록(최신순) 맵. */
export async function getTagMap(): Promise<Map<string, Post[]>> {
  const posts = await getCollection("blog");
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const list = map.get(tag) ?? [];
      list.push(post);
      map.set(tag, list);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  }
  return map;
}

/** 태그 목록을 글 수 내림차순으로. */
export async function getTagCounts(): Promise<{ tag: string; count: number }[]> {
  const map = await getTagMap();
  return [...map.entries()]
    .map(([tag, posts]) => ({ tag, count: posts.length }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** 태그 페이지 URL. base 접두어 포함. */
export function tagHref(base: string, tag: string): string {
  return `${base}/tags/${encodeURIComponent(tag)}/`;
}
