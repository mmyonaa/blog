import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getContentDir } from "./config.js";
import { listPosts } from "./posts.js";
import { SEED_TOPICS } from "./topics.js";
import { nowIso, slugify, yamlString } from "./util.js";

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
          .describe("발행일 YYYY-MM-DD (기본: 현재). 시각은 자동으로 현재 시:분:초가 기록됨"),
        slug: z.string().optional().describe("URL 슬러그 (기본: 제목에서 생성)"),
        description: z.string().optional().describe("요약(메타 설명)"),
      },
    },
    async ({ title, body, tags, date, slug, description }) => {
      // pubDate는 초까지 기록. date 지정 시 그 날짜 + 현재 시각, 미지정 시 현재 시각.
      const iso = nowIso();
      const pubDate = date ? `${date}T${iso.slice(11)}` : iso;
      const datePart = pubDate.slice(0, 10);
      const fileName = `${datePart}-${slugify(slug ?? title)}.md`;
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

/**
 * `suggest_topic` 도구를 서버에 등록한다.
 *
 * ⚠️ LLM을 호출하지 않는다(무료 원칙). 시드 주제 풀(SEED_TOPICS)에서 이미 발행한
 * 주제를 결정론적으로 걸러 후보를 제안할 뿐, 최종 선택·본문 작성은 오케스트레이터의 몫.
 */
export function registerSuggestTopic(server: McpServer): void {
  server.registerTool(
    "suggest_topic",
    {
      title: "다음 글 주제 제안",
      description:
        "시드 주제 풀에서 아직 발행하지 않은 후보를, 발행된 지난 글 맥락과 함께 제안한다. LLM을 쓰지 않는 결정론적 필터링. 최종 선택은 호출자(LLM)가 한다.",
      inputSchema: {
        count: z
          .number()
          .int()
          .min(1)
          .max(10)
          .default(3)
          .describe("제안할 후보 개수 (기본 3)"),
      },
    },
    async ({ count }) => {
      const posts = await listPosts();
      const usedSlugs = new Set(posts.map((p) => p.topicSlug));
      const available = SEED_TOPICS.filter((t) => !usedSlugs.has(slugify(t.title)));

      const recent = posts.slice(0, 5);
      const recentText = recent.length
        ? recent.map((p) => `- ${p.title} (${p.pubDate}) [${p.tags.join(", ")}]`).join("\n")
        : "(아직 발행된 글 없음)";

      if (available.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `시드 풀의 모든 주제(${SEED_TOPICS.length}개)가 이미 발행되었습니다. topics.ts에 새 주제를 추가하세요.\n\n최근 발행:\n${recentText}`,
            },
          ],
        };
      }

      const suggestions = available
        .slice(0, count)
        .map((t, i) => `${i + 1}. ${t.title}  [${t.tags.join(", ")}]`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `안 겹치는 후보 주제 (${available.length}개 중 ${Math.min(count, available.length)}개):\n${suggestions}\n\n최근 발행 글(중복 회피 참고):\n${recentText}`,
          },
        ],
      };
    },
  );
}
