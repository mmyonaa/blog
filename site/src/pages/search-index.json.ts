import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { fmtDateTime } from "../lib/date.ts";

// 클라이언트 검색용 인덱스(정적 파일로 프리렌더). 헤더 검색 모달이 fetch 한다.
export const GET: APIRoute = async () => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const posts = (await getCollection("blog")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const index = posts.map((p) => ({
    title: p.data.title,
    description: p.data.description ?? "",
    tags: p.data.tags ?? [],
    date: fmtDateTime(p.data.pubDate),
    url: `${base}/blog/${p.id}/`,
    // 마크다운 기호를 대충 제거한 본문(검색 매칭용, 과도한 크기 방지로 컷)
    text: (p.body ?? "")
      .replace(/[`#>*_~\[\]()|-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000),
  }));

  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
