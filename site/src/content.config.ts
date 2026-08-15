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
    section: z.string().default("mcp"),
    tags: z.array(z.string()).default([]),
    topicId: z.string().optional(),
    // 세부 영역(server의 AreaId). topicId에서 도출되거나 발행 시 지정. 그래프 세부 분기축.
    area: z.string().optional(),
    // 관계 간선: follows=직계 선행 글 slug, related=엮인 글 slug들. publish_post가 실존 검증·정규화.
    follows: z.string().optional(),
    related: z.array(z.string()).default([]),
    description: z.string().optional(),
    // 리서치 글 메타(#18): 근거 출처(하단 '참고 자료'로 렌더)와 생성 모드 표시.
    sources: z.array(z.object({ url: z.string(), title: z.string().optional() })).default([]),
    generated: z.string().optional(),
  }),
});

export const collections = { blog };
