import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "blog",
    description: "배우고 만들며 알게 된 것을 기록하는 학습 블로그",
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
