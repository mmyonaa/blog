import type { CollectionEntry } from "astro:content";
import { sectionOf } from "./sections.ts";

export type Post = CollectionEntry<"blog">;

export interface Related {
  post: Post;
  score: number;
  /** 대상 글과 겹친 태그(가중치 높은 순). UI에서 "왜 관련됐나"를 보여주는 데 쓴다. */
  sharedTags: string[];
}

/**
 * 같은 섹션 글에 주는 가산(곱). 태그 겹침이 있는 후보끼리 동점일 때 같은 섹션을
 * 살짝 끌어올린다. 태그 겹침이 0인 글은 아래 임계값에서 걸러지므로, 이 보너스만으로
 * 무관한 글이 올라오지는 않는다.
 */
const SECTION_BONUS = 1.15;

/**
 * 태그 겹침으로 관련 글을 고른다 — 빌드 타임, LLM 없음(무료 원칙).
 *
 * 핵심은 태그마다 IDF 가중을 주는 것. 흔한 태그(예: 대부분의 정처기 글이 가진 `정처기`)는
 * 변별력이 낮으니 가중치를 낮추고, 드문 구체 태그(예: `ssr`, `island`)의 겹침을 크게 친다.
 * 모든 글이 가진 태그는 IDF=0이라 점수에 기여하지 않는다.
 *
 * 겹치는 태그가 하나도 없으면(점수 0) 후보에서 제외한다 — 억지로 채우지 않는다.
 * 결과가 비면 호출부에서 "관련 글" 영역 자체를 감춘다.
 */
export function relatedPosts(target: Post, all: Post[], n = 3): Related[] {
  const total = all.length;

  // df: 각 태그를 가진 글 수(전체 기준). IDF = ln(N / df).
  const df = new Map<string, number>();
  for (const p of all) {
    for (const t of new Set(p.data.tags)) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const idf = (t: string) => Math.log(total / (df.get(t) ?? total));

  const targetTags = new Set(target.data.tags);
  const targetSection = sectionOf(target);

  return all
    .filter((p) => p.id !== target.id)
    .map((p): Related => {
      const shared = [...new Set(p.data.tags)]
        .filter((t) => targetTags.has(t))
        .sort((a, b) => idf(b) - idf(a));
      const tagScore = shared.reduce((s, t) => s + idf(t), 0);
      const bonus = sectionOf(p) === targetSection ? SECTION_BONUS : 1;
      return { post: p, score: tagScore * bonus, sharedTags: shared };
    })
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf(),
    )
    .slice(0, n);
}
