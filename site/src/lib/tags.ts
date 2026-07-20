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

// 국어의 로마자 표기(개정 로마자, 음절 단위). 슬러그용이라 음운 동화 규칙은 생략한다.
// 예: 정처기 → jeongcheogi, 자료구조 → jaryogujo. 하드코딩한 태그별 맵이 아니라
// 한글 음절을 규칙으로 풀어, 앞으로 생길 어떤 한글 태그든 자동으로 처리된다.
const CHO = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const JUNG = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const JONG = ["","k","kk","ks","n","nj","nh","t","l","lg","lm","lb","ls","lt","lp","lh","m","b","bs","s","ss","ng","j","ch","k","t","p","h"];

function romanizeHangul(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0xac00 && code <= 0xd7a3) {
      const s = code - 0xac00;
      const jong = s % 28;
      const jung = Math.floor(s / 28) % 21;
      const cho = Math.floor(s / 28 / 21);
      out += CHO[cho] + JUNG[jung] + JONG[jong];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * 태그 → URL 슬러그(영문 kebab-case). 한글은 로마자로 풀고, 그 외 비영숫자는 하이픈으로.
 * 퍼센트 인코딩된 한글 URL(`/tags/%EC%...`)을 없애 공유·가독성을 살린다.
 */
export function tagSlug(tag: string): string {
  return romanizeHangul(tag)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 태그 페이지 URL. base 접두어 포함. */
export function tagHref(base: string, tag: string): string {
  return `${base}/tags/${tagSlug(tag)}/`;
}
