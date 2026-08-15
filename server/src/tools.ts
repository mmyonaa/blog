import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getContentDir } from "./config.js";
import { listPosts } from "./posts.js";
import {
  AREAS,
  SECTIONS,
  SEED_TOPICS,
  areaOfTopicId,
  isAreaId,
  sectionOfArea,
  type AreaId,
  type SectionId,
  type Topic,
} from "./topics.js";

/** 유효한 section id 목록(레지스트리 파생 — 하드코딩 금지). */
const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];

/** 문자열이 유효한 section인지 좁힌다. */
function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as string[]).includes(value);
}
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
  section: string;
  /** 세부 영역(AreaId). topicId에서 자동 도출되거나 입력으로 온다. 그래프의 세부 분기축. */
  area?: string | undefined;
  topicId?: string | undefined;
  /** 이 글이 잇는 부모 글의 slug(정규화된 값). 그래프의 후속 간선. */
  follows?: string | undefined;
  /** 관련 글 slug 목록(정규화). RelatedPosts·그래프가 참조. */
  related?: string[] | undefined;
  description?: string | undefined;
  /** 리서치 글의 근거 출처(#18). 실제로 읽고 본문에 반영한 URL만. */
  sources?: { url: string; title?: string | undefined }[] | undefined;
  /** 생성 모드 표시(#18). 웹 리서치 종합이면 "research-synthesis". */
  generated?: string | undefined;
}

/** Astro content collection 친화적 YAML 프론트매터 문자열을 만든다. */
function buildFrontmatter(fm: Frontmatter): string {
  const lines = [
    "---",
    `title: ${yamlString(fm.title)}`,
    `pubDate: ${fm.pubDate}`,
    `section: ${yamlString(fm.section)}`,
    `tags: [${fm.tags.map(yamlString).join(", ")}]`,
  ];
  if (fm.area) lines.push(`area: ${yamlString(fm.area)}`);
  if (fm.topicId) lines.push(`topicId: ${yamlString(fm.topicId)}`);
  if (fm.follows) lines.push(`follows: ${yamlString(fm.follows)}`);
  if (fm.related && fm.related.length > 0) {
    lines.push(`related: [${fm.related.map(yamlString).join(", ")}]`);
  }
  if (fm.description) lines.push(`description: ${yamlString(fm.description)}`);
  if (fm.generated) lines.push(`generated: ${yamlString(fm.generated)}`);
  if (fm.sources && fm.sources.length > 0) {
    lines.push("sources:");
    for (const s of fm.sources) {
      lines.push(`  - url: ${yamlString(s.url)}`);
      if (s.title) lines.push(`    title: ${yamlString(s.title)}`);
    }
  }
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
        section: z
          .string()
          .default("mcp")
          .describe(`글의 섹션(대분류). ${SECTION_IDS.join(" | ")} 중 하나. 기본 mcp.`),
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
        area: z
          .string()
          .optional()
          .describe(
            `세부 영역(대분류 안의 갈래). ${Object.keys(AREAS).join(" | ")} 중 하나. ` +
              "topicId가 시드면 자동으로 도출되니 대개 생략. 시드 밖 주제에 영역을 달고 싶을 때만 지정. area의 소속 섹션과 section이 다르면 거부된다.",
          ),
        follows: z
          .string()
          .optional()
          .describe(
            "이 글이 잇는(후속) 이전 글. 그 글의 slug·topicId·주제슬러그 중 무엇으로 가리켜도 실제 slug로 정규화된다. 존재하지 않는 글을 가리키면 발행이 거부된다. 그래프의 후속 간선이 된다.",
          ),
        related: z
          .array(z.string())
          .optional()
          .describe(
            "관련 글 목록(slug·topicId·주제슬러그). 각 참조의 실존을 검증하고 실제 slug로 정규화한다. follows는 '직계 후속' 한 편, related는 '엮인 글들'.",
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
        sources: z
          .array(z.object({ url: z.string().url(), title: z.string().optional() }))
          .optional()
          .describe(
            "리서치 글의 근거 출처(#18). read_url로 실제 읽고 본문에 반영한 URL만 넣는다 — 검색 결과에만 보였거나 안 읽은 URL은 금지. 글 하단 '참고 자료'로 렌더된다.",
          ),
        generated: z
          .enum(["research-synthesis"])
          .optional()
          .describe(
            "생성 모드 표시. 웹 리서치를 종합해 쓴 글이면 'research-synthesis'를 넘긴다. 이 값을 넘기면 sources 2건 이상이 필수다(투명성).",
          ),
      },
    },
    async ({ title, body, tags, date, slug, topicId, area, follows, related, minChars, section, description, sources, generated }) => {
      // 리서치 글 투명성 관문(#18): 생성 모드를 밝혔으면 근거 출처가 실려야 한다.
      if (generated === "research-synthesis" && (!sources || sources.length < 2)) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: "리서치 종합 글(generated: research-synthesis)은 sources를 2건 이상 넘겨야 합니다. read_url로 실제 읽은 출처 URL을 sources에 담아 다시 발행하세요.",
            },
          ],
        };
      }

      // section이 레지스트리에 있는지 검증(하드코딩 대신 SECTIONS 파생).
      if (!isSectionId(section)) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `알 수 없는 section "${section}". 사용 가능: ${SECTION_IDS.join(", ")}`,
            },
          ],
        };
      }

      // area 결정: 입력이 있으면 그것을, 없으면 topicId(시드)에서 도출. 있으면 유효성 +
      // 소속 섹션이 section과 같은지 검증(불일치는 데이터 오염이므로 거부).
      const resolvedArea = area ?? (topicId ? areaOfTopicId(topicId) : undefined);
      if (resolvedArea !== undefined) {
        if (!isAreaId(resolvedArea)) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `알 수 없는 area "${resolvedArea}". 사용 가능: ${Object.keys(AREAS).join(", ")}`,
              },
            ],
          };
        }
        if (sectionOfArea(resolvedArea) !== section) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `area "${resolvedArea}"는 "${sectionOfArea(resolvedArea)}" 섹션 소속인데 section은 "${section}"입니다. 둘을 맞춰주세요.`,
              },
            ],
          };
        }
      }

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

      // follows/related 참조를 실존 검증하고 실제 slug로 정규화한다. 참조는 slug·topicId·
      // 주제슬러그 중 무엇으로 와도 받되, 하나라도 못 찾으면 발행을 거부한다(끊긴 간선 방지).
      const newSlug = fileName.replace(/\.md$/, "");
      let resolvedFollows: string | undefined;
      let resolvedRelated: string[] | undefined;
      if (follows !== undefined || (related && related.length > 0)) {
        const existingPosts = await listPosts();
        const resolveRef = (ref: string): string | null => {
          const r = ref.trim();
          const hit = existingPosts.find(
            (p) => p.slug === r || p.topicSlug === r || p.topicId === r,
          );
          return hit ? hit.slug : null;
        };

        const bad: string[] = [];
        if (follows !== undefined) {
          const f = resolveRef(follows);
          if (!f) bad.push(`follows: "${follows}"`);
          else if (f === newSlug) bad.push(`follows가 자기 자신을 가리킵니다: "${follows}"`);
          else resolvedFollows = f;
        }
        if (related && related.length > 0) {
          const out: string[] = [];
          for (const ref of related) {
            const r = resolveRef(ref);
            if (!r) bad.push(`related: "${ref}"`);
            else if (r !== newSlug && r !== resolvedFollows && !out.includes(r)) out.push(r);
          }
          if (out.length > 0) resolvedRelated = out;
        }

        if (bad.length > 0) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text:
                  `존재하지 않는 글을 참조합니다:\n${bad.map((b) => `- ${b}`).join("\n")}\n` +
                  `blog://posts 리소스로 실제 slug/topicId를 확인해 다시 넘겨주세요.`,
              },
            ],
          };
        }
      }

      const frontmatter = buildFrontmatter({
        title,
        pubDate,
        tags,
        section,
        area: resolvedArea,
        topicId,
        follows: resolvedFollows,
        related: resolvedRelated,
        description,
        sources,
        generated,
      });
      await writeFile(filePath, `${frontmatter}\n\n${body.trimEnd()}\n`, "utf8");

      const meta = [
        resolvedArea ? `area=${resolvedArea}` : null,
        resolvedFollows ? `follows→${resolvedFollows}` : null,
        resolvedRelated ? `related→${resolvedRelated.join(", ")}` : null,
      ].filter(Boolean);
      const metaLine = meta.length ? `\n관계: ${meta.join(" · ")}` : "";

      return {
        content: [
          { type: "text" as const, text: `발행 완료: ${fileName}\n경로: ${filePath}${metaLine}` },
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
        section: z
          .string()
          .default("mcp")
          .describe(`후보를 뽑을 섹션. ${SECTION_IDS.join(" | ")} 중 하나. 기본 mcp.`),
      },
    },
    async ({ count, section }) => {
      if (!isSectionId(section)) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `알 수 없는 section "${section}". 사용 가능: ${SECTION_IDS.join(", ")}`,
            },
          ],
        };
      }
      const sectionLabel = SECTIONS[section].label;

      const posts = await listPosts();
      // 발행 글에 기록된 topicId로 중복을 판정한다(제목·슬러그가 바뀌어도 안정적).
      const usedIds = new Set(posts.map((p) => p.topicId).filter((id): id is string => !!id));
      // 이 섹션에 속한, 아직 안 쓴 시드만 후보로.
      const available = SEED_TOPICS.filter(
        (t) => !usedIds.has(t.id) && sectionOfArea(t.area) === section,
      );
      const sectionTotal = SEED_TOPICS.filter((t) => sectionOfArea(t.area) === section).length;

      // 최근 글도 같은 섹션 것만 참고한다.
      const recent = posts.filter((p) => (p.section ?? "mcp") === section).slice(0, 5);
      const recentText = recent.length
        ? recent.map((p) => `- ${p.title} (${p.pubDate.slice(0, 10)}) [${p.tags.join(", ")}]`).join("\n")
        : "(이 섹션엔 아직 발행된 글 없음)";

      if (available.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `'${sectionLabel}' 섹션의 모든 시드 주제(${sectionTotal}개)가 이미 발행되었습니다.\n\n두 가지 선택지가 있습니다:\n1. 시드 밖 **자유 주제**로 바로 씁니다 — publish_post에 topicId 없이(section=${section}) 발행하면 됩니다.\n2. 앞으로도 겹침 회피를 받고 싶은 주제라면 topics.ts에 새 시드로 추가하세요.\n\n최근 발행:\n${recentText}`,
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

      // 각 후보에 관계 힌트를 붙인다: 태그가 겹치는 지난 글(같은 섹션 우선)과 추천 follows.
      // 결정론적(태그 교집합 크기 → 최신순). LLM 호출 없음. 발행 시 follows/related 근거가 된다.
      const hintFor = (t: Topic): string => {
        const scored = posts
          .map((p) => ({ p, shared: p.tags.filter((tag) => t.tags.includes(tag)) }))
          .filter((x) => x.shared.length > 0)
          .sort(
            (a, b) => b.shared.length - a.shared.length || b.p.pubDate.localeCompare(a.p.pubDate),
          )
          .slice(0, 3);
        if (scored.length === 0) return "";
        const ref = (p: (typeof scored)[number]["p"]) => p.topicId ?? p.slug;
        const list = scored
          .map(({ p, shared }) => `${p.title} (${ref(p)}) [겹침: ${shared.join(", ")}]`)
          .join("; ");
        const top = scored[0]!.p;
        return `\n   ↳ 관련 지난 글: ${list}\n   ↳ 추천 follows: ${ref(top)}`;
      };

      const suggestions = picked
        .map(
          (t, i) =>
            `${i + 1}. [${t.area}·${AREAS[t.area].label}] [id: ${t.id}] ${t.title}  [${t.tags.join(", ")}]${hintFor(t)}`,
        )
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `[${sectionLabel}] 안 겹치는 후보 주제 (영역 섞음, 남은 ${available.length}개 중 ${picked.length}개):\n${suggestions}\n\n발행할 때 고른 주제의 id를 publish_post의 topicId로, section은 "${section}"로 넘긴다.\n위 '추천 follows'가 이 글의 직계 선행 글이라면 publish_post의 follows로, 더 엮인 글들은 related로 넘기면 관계 그래프가 이어진다(참조는 실존 검증됨). area는 topicId에서 자동 도출되니 대개 생략.\n이 후보가 마음에 안 들면 시드 밖 자유 주제로 써도 됩니다(topicId 생략, section 유지).\n\n최근 발행 글(참고):\n${recentText}`,
          },
        ],
      };
    },
  );
}
