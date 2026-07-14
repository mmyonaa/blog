import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getContentDir } from "./config.js";
import { slugify, today, yamlString } from "./util.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Frontmatter {
  title: string;
  pubDate: string;
  tags: string[];
  description?: string | undefined;
}

/** Astro content collection 친화적 YAML 프론트매터 문자열을 만든다. */
function buildFrontmatter(fm: Frontmatter): string {
  const lines = [
    "---",
    `title: ${yamlString(fm.title)}`,
    `pubDate: ${fm.pubDate}`,
    `tags: [${fm.tags.map(yamlString).join(", ")}]`,
  ];
  if (fm.description) lines.push(`description: ${yamlString(fm.description)}`);
  lines.push("---");
  return lines.join("\n");
}

/** `publish_post` 도구를 서버에 등록한다. */
export function registerPublishPost(server: McpServer): void {
  server.registerTool(
    "publish_post",
    {
      title: "블로그 글 발행",
      description:
        "마크다운 블로그 글을 프론트매터와 함께 파일로 생성한다. 파일명은 `YYYY-MM-DD-slug.md`. 같은 이름이 있으면 실패한다.",
      inputSchema: {
        title: z.string().min(1).describe("글 제목"),
        body: z.string().min(1).describe("마크다운 본문 (프론트매터 제외)"),
        tags: z.array(z.string()).default([]).describe("태그 목록"),
        date: z
          .string()
          .regex(DATE_RE, "YYYY-MM-DD 형식")
          .optional()
          .describe("발행일 YYYY-MM-DD (기본: 오늘 UTC)"),
        slug: z.string().optional().describe("URL 슬러그 (기본: 제목에서 생성)"),
        description: z.string().optional().describe("요약(메타 설명)"),
      },
    },
    async ({ title, body, tags, date, slug, description }) => {
      const pubDate = date ?? today();
      const fileName = `${pubDate}-${slugify(slug ?? title)}.md`;
      const dir = getContentDir();
      const filePath = join(dir, fileName);

      await mkdir(dir, { recursive: true });
      const existing = await readdir(dir).catch(() => [] as string[]);
      if (existing.includes(fileName)) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: `이미 존재하는 파일입니다: ${fileName}` },
          ],
        };
      }

      const frontmatter = buildFrontmatter({ title, pubDate, tags, description });
      await writeFile(filePath, `${frontmatter}\n\n${body.trimEnd()}\n`, "utf8");

      return {
        content: [
          { type: "text" as const, text: `발행 완료: ${fileName}\n경로: ${filePath}` },
        ],
      };
    },
  );
}
