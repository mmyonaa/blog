import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getContentDir } from "./config.js";
import { listPosts } from "./posts.js";
import { AREAS, SEED_TOPICS, type AreaId, type Topic } from "./topics.js";
import { nowIso, slugify, yamlString } from "./util.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 본문 최소 분량(공백 제외 문자 수). 너무 짧은 껍데기 글을 막는 가벼운 하한선. */
const MIN_BODY_LEN = 200;

/**
 * 발행 전 본문을 가볍게 검증한다. 문제점 목록을 반환하며, 비어 있으면 통과.
 *
 * 규격을 빡세게 강제하지 않는다(학습 프로젝트 취지). 명백히 깨진 글만 걸러낸다:
 *  - 프론트매터는 publish_post가 따로 붙이므로, 본문이 `---`로 시작하면 이중 생성 위험.
 *  - 최소한의 구조로 `##` 소제목 1개 이상.
 *  - 껍데기 글 방지용 최소 분량.
 *  - (선택) minChars가 주어지면 목표 분량 하한(공백 포함)을 강제 — 심화도 밴드 undershoot 방지.
 */
function validateBody(body: string, minChars?: number): string[] {
  const problems: string[] = [];
  const trimmed = body.trim();

  if (trimmed.startsWith("---")) {
    problems.push("본문이 `---`로 시작합니다. 프론트매터는 자동으로 붙으니 본문에는 넣지 마세요.");
  }
  if (!/^#{2,6}\s/m.test(body)) {
    problems.push("`##` 소제목이 하나도 없습니다. 소제목을 최소 1개 넣어주세요.");
  }
  const visibleLen = trimmed.replace(/\s/g, "").length;
  if (visibleLen < MIN_BODY_LEN) {
    problems.push(`본문이 너무 짧습니다(공백 제외 ${visibleLen}자). 최소 ${MIN_BODY_LEN}자 이상 써주세요.`);
  }
  if (minChars && minChars > 0 && trimmed.length < minChars) {
    problems.push(
      `본문이 목표보다 짧습니다(${trimmed.length}자 < 목표 ${minChars}자). 내용을 더 채워 다시 발행하세요.`,
    );
  }

  return problems;
}

interface Frontmatter {
  title: string;
  pubDate: string;
  tags: string[];
  topicId?: string | undefined;
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
  if (fm.topicId) lines.push(`topicId: ${yamlString(fm.topicId)}`);
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
        slug: z
          .string()
          .optional()
          .describe(
            "URL 슬러그. 공유 시 깨지지 않도록 짧은 영문(kebab-case) 권장. 예: 'mcp-3-primitives'. 미지정 시 제목에서 생성(한글 그대로).",
          ),
        topicId: z
          .string()
          .optional()
          .describe(
            "이 글이 어떤 시드 주제(suggest_topic의 id)를 다뤘는지. 지정하면 그 주제는 다시 제안되지 않는다. 시드 밖 주제면 생략.",
          ),
        minChars: z
          .number()
          .int()
          .positive()
          .optional()
          .describe(
            "본문 최소 글자 수(공백 포함). 본문이 이보다 짧으면 발행이 거부된다. write_daily_post가 심화도 밴드 하한을 넘겨 짧은 글을 막는다.",
          ),
        description: z.string().optional().describe("요약(메타 설명)"),
      },
    },
    async ({ title, body, tags, date, slug, topicId, minChars, description }) => {
      // 본문을 가볍게 검증한다. 문제가 있으면 파일을 쓰지 않고 이유를 돌려준다.
      const problems = validateBody(body, minChars);
      if (problems.length > 0) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `본문 검증 실패:\n${problems.map((p) => `- ${p}`).join("\n")}`,
            },
          ],
        };
      }

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

      const frontmatter = buildFrontmatter({ title, pubDate, tags, topicId, description });
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
      // 발행 글에 기록된 topicId로 중복을 판정한다(제목·슬러그가 바뀌어도 안정적).
      const usedIds = new Set(posts.map((p) => p.topicId).filter((id): id is string => !!id));
      const available = SEED_TOPICS.filter((t) => !usedIds.has(t.id));

      const recent = posts.slice(0, 5);
      const recentText = recent.length
        ? recent.map((p) => `- ${p.title} (${p.pubDate}) [${p.tags.join(", ")}]`).join("\n")
        : "(아직 발행된 글 없음)";

      if (available.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `시드 풀의 모든 주제(${SEED_TOPICS.length}개)가 이미 발행되었습니다.\n\n두 가지 선택지가 있습니다:\n1. 시드 밖 **자유 주제**로 바로 씁니다 — publish_post에 topicId 없이 발행하면 됩니다.\n2. 앞으로도 겹침 회피를 받고 싶은 주제라면 topics.ts에 새 시드로 추가하세요.\n\n최근 발행:\n${recentText}`,
            },
          ],
        };
      }

      // --- 영역 다각화 ---
      // 최근 글이 어떤 영역이었는지 파악(topicId → area)해서, 덜 다룬 영역을 우선하고
      // 후보를 영역별로 라운드로빈으로 뽑아 한 영역에 쏠리지 않게 섞는다.
      const idToArea = new Map(SEED_TOPICS.map((t) => [t.id, t.area] as const));
      const recentAreas = recent
        .map((p) => (p.topicId ? idToArea.get(p.topicId) : undefined))
        .filter((a): a is AreaId => !!a);
      const recentCount = (area: AreaId): number => recentAreas.filter((a) => a === area).length;

      const byArea = new Map<AreaId, Topic[]>();
      for (const t of available) {
        const list = byArea.get(t.area) ?? [];
        list.push(t);
        byArea.set(t.area, list);
      }
      // 최근 사용이 적은 영역부터
      const areaOrder = [...byArea.keys()].sort((a, b) => recentCount(a) - recentCount(b));

      const picked: Topic[] = [];
      for (let i = 0; picked.length < count && [...byArea.values()].some((l) => l.length); i++) {
        const area = areaOrder[i % areaOrder.length];
        const list = area ? byArea.get(area) : undefined;
        const next = list?.shift();
        if (next) picked.push(next);
      }

      const suggestions = picked
        .map(
          (t, i) =>
            `${i + 1}. [${t.area}·${AREAS[t.area].label}] [id: ${t.id}] ${t.title}  [${t.tags.join(", ")}]`,
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `안 겹치는 후보 주제 (영역 섞음, 남은 ${available.length}개 중 ${picked.length}개):\n${suggestions}\n\n발행할 때 고른 주제의 id를 publish_post의 topicId로 넘기면 다음부터 중복 제안되지 않습니다.\n이 후보가 마음에 안 들면 시드 밖 자유 주제로 써도 됩니다(topicId 생략).\n\n최근 발행 글(참고):\n${recentText}`,
          },
        ],
      };
    },
  );
}
