import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "daily.mcp",
    description: "MCP 서버로 글을 발행하며 배운 것을 기록하는 블로그",
    site: context.site ?? "https://mmyonaa.github.io",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `${base}/blog/${post.id}/`,
    })),
    customData: "<language>ko-kr</language>",
  });
}
