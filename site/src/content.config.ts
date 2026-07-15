import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * blog 컬렉션: site/src/content/blog 의 마크다운을 읽는다.
 * schema는 MCP 서버의 publish_post가 쓰는 프론트매터와 동일하게 맞춘다.
 */
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
  }),
});

export const collections = { blog };
