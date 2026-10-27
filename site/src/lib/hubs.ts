import type { CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

export interface Hub {
  post: Post;
  /** 이 글을 선행·관련으로 지목한 다른 글의 수. */
  refs: number;
}

/**
 * 피인용 허브 — 다른 글이 선행(follows)·관련(related)으로 지목한 횟수가 많은 글.
 *
 * 간선은 publish_post가 대상 글의 실존을 확인하고 저장한 메타데이터라, 표본이 아니라
 * 전수다(조회수와 달리 집계에 우연이 끼지 않는다). 여러 글이 되짚은 글은 대체로
 * 나머지를 읽기 전에 읽어야 하는 글이므로, 처음 온 사람의 출발점으로 쓴다.
 *
 * 본문 마크다운 링크는 세지 않는다 — 전체 간선의 1할 남짓이라 순위를 바꾸지 않는다.
 * 동점은 최신 글 우선(relatedPosts와 같은 규칙).
 */
export function hubPosts(all: Post[], n = 5): Hub[] {
  const indeg = new Map<string, number>();
  const bump = (slug: string) => indeg.set(slug, (indeg.get(slug) ?? 0) + 1);
  for (const p of all) {
    if (p.data.follows) bump(p.data.follows);
    for (const r of p.data.related) bump(r);
  }
  return all
    .map((post): Hub => ({ post, refs: indeg.get(post.id) ?? 0 }))
    .filter((h) => h.refs > 0)
    .sort(
      (a, b) =>
        b.refs - a.refs ||
        b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf(),
    )
    .slice(0, n);
}
