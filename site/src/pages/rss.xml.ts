import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "blog-mcp",
    description: "MCP를 배우며 자동 발행하는 블로그",
    site: context.site ?? "https://mmyonaa.github.io",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/mcp/blog/${post.id}/`,
    })),
    customData: "<language>ko-kr</language>",
  });
}
