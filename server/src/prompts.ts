import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SECTIONS, type SectionId } from "./topics.js";

const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];

/**
 * 심화도(depth) 티어별 목표 분량 밴드.
 * LLM이 주제 성격에 맞춰 티어를 고르고, 아래 밴드를 목표로 본문 길이를 잡는다.
 */
const DEPTH_BANDS = {
  quick: { label: "quick", range: "600~900자", min: 600, hint: "개념 한입 · 짧은 정리" },
  standard: { label: "standard", range: "1200~1600자", min: 1200, hint: "기본 · 개념 + 예제" },
  deep: { label: "deep", range: "2000~2800자", min: 2000, hint: "구현/튜토리얼 · 단계별 심화" },
  epic: { label: "epic", range: "4000~7000자", min: 4000, hint: "장문 · 심층 가이드/여러 절 구성" },
} as const;

type Depth = keyof typeof DEPTH_BANDS;

/**
 * `write_daily_post` 프롬프트를 서버에 등록한다.
 *
 * "오늘의 글쓰기" 워크플로 전체를 하나의 재사용 프롬프트로 패키징한다.
 * 프롬프트 자체는 아무것도 실행하지 않고, LLM(오케스트레이터/Claude Code)이
 * 리소스·도구를 순서대로 쓰도록 안내하는 메시지만 돌려준다.
 */
export function registerWriteDailyPostPrompt(server: McpServer): void {
  server.registerPrompt(
    "write_daily_post",
    {
      title: "오늘의 블로그 글 쓰기",
      description:
        "지난 글을 참고해 겹치지 않는 주제로 한국어 기술 블로그 한 편을 쓰고 발행하는 워크플로 지침.",
      argsSchema: {
        topic: z
          .string()
          .optional()
          .describe("직접 지정할 주제(생략 시 suggest_topic 후보 중 선택)"),
        depth: z
          .enum(["quick", "standard", "deep", "epic"])
          .optional()
          .describe(
            "글의 심화도(분량 밴드). quick=개념 한입(600~900자), standard=기본(1200~1600자), deep=구현/튜토리얼 심화(2000~2800자), epic=장문(4000~7000자). 생략 시 standard. 주제 성격에 맞춰 조정 가능.",
          ),
        length: z
          .string()
          .optional()
          .describe(
            "목표 글자 수를 직접 지정(대략, 상한 없음). 지정하면 depth 밴드보다 우선한다. 아주 긴 글은 여기에 큰 값(예: 10000)을 넣는다.",
          ),
        section: z
          .string()
          .optional()
          .describe(`어느 섹션의 글인가. ${SECTION_IDS.join(" | ")} 중 하나. 생략 시 mcp.`),
      },
    },
    ({ topic, depth, length, section }) => {
      const sec: SectionId = section && (section in SECTIONS) ? (section as SectionId) : "mcp";
      const isJeong = sec === "jeongcheogi";
      const chosen: Depth = depth ?? "standard";
      const explicitLen = length && length.trim() !== "" ? length : null;
      const explicitNum = explicitLen ? Number(explicitLen) : NaN;
      // 직접 지정 분량이 있으면 그 85%를 하한으로, 아니면 티어 하한.
      const minChars = Number.isFinite(explicitNum) ? Math.round(explicitNum * 0.85) : DEPTH_BANDS[chosen].min;
      const lengthLine = explicitLen
        ? `   - 분량: 약 ${explicitLen}자 (직접 지정)`
        : `   - 분량: ${DEPTH_BANDS[chosen].range} (심화도 ${chosen} — 주제가 더 얕거나 깊으면 아래 티어에서 조정)`;
      const depthTable = (Object.keys(DEPTH_BANDS) as Depth[])
        .map((k) => `     · ${DEPTH_BANDS[k].label}: ${DEPTH_BANDS[k].range} (${DEPTH_BANDS[k].hint})`)
        .join("\n");
      const topicLine = topic && topic.trim() !== ""
        ? `4. 주제는 "${topic}"으로 한다. (시드 밖 주제이므로 topicId는 없다)`
        : `4. \`suggest_topic\`을 \`section: "${sec}"\`로 호출해 안 겹치는 후보를 받고, 그중 하나를 고른다. 후보는 영역이 섞여 나오니 최근 글과 다른 영역을 우선 고려한다. 각 후보의 \`[id: ...]\`를 기억해 둔다.`;

      // 섹션별 본문 형식 지침(정처기는 개념 정리형, 그 외는 개발 튜토리얼형).
      const formatLine = isJeong
        ? "   - 형식: 개념 정리형 — 정의 → 핵심 원리 → 예시 → 시험에 자주 나오는 포인트. 표나 코드는 도움이 될 때만."
        : "   - 형식: 마크다운. 적절한 소제목과, 가능하면 코드 예제 1개 이상 포함";
      const audienceLine = isJeong
        ? "   - 대상: 정보처리기사를 준비하는 사람 (개념을 처음 정리하는 수준)"
        : "   - 대상: 개발을 배우는 독자";

      const text = [
        `당신은 이 블로그의 정기 필자다. 이번 글의 섹션은 "${SECTIONS[sec].label}"(section="${sec}")이다. 아래 순서로 글 한 편을 작성하고 발행하라.`,
        "",
        "1. `blog://posts` 리소스를 읽어 지금까지 발행된 글의 제목·태그를 파악한다(같은 섹션 글과 겹치지 않게).",
        "2. 최근 글과 주제·내용이 겹치지 않도록 한다. 각 글은 그 자체로 완결되게 쓰고, \"다음 글에서는...\" 같은 예고는 넣지 않는다.",
        "3. 필요하면 특정 지난 글을 `blog://posts/{slug}`로 열어 맥락을 확인한다.",
        topicLine,
        "5. 다음 기준으로 본문을 작성한다:",
        "   - 언어: 한국어",
        lengthLine,
        "   - 심화도 티어(참고):",
        depthTable,
        "     (분량은 공백 포함 글자 수 기준. 하한에 걸치지 말고 밴드 중간값을 목표로 한다.)",
        audienceLine,
        formatLine,
        "   - 톤: 군더더기 없이 명확하게. 과장·클리셰 지양",
        "6. `publish_post` 도구로 발행한다. `title`, `body`(프론트매터 제외한 본문), `tags`, 필요시 `description`을 채운다. `date`는 생략하면 오늘로 설정된다.",
        `   - \`section: "${sec}"\`을 반드시 넘긴다.`,
        "   - suggest_topic 후보에서 고른 주제라면 그 후보의 `id`를 `topicId`로 꼭 넘긴다(중복 재제안 방지). 시드 밖 주제면 생략한다.",
        "   - `slug`에 짧은 영문 kebab-case를 **반드시** 넘긴다(URL 안정용). 시드 주제면 그 `id`를 그대로 slug로 쓰고, 자유 주제면 내용을 요약한 영문 슬러그를 만든다. 생략하면 한글 슬러그가 되어 URL이 지저분해지니 절대 비워두지 않는다.",
        "   - `tags`는 3~5개. 1단계에서 읽은 `blog://posts`의 기존 태그를 우선 재사용해 표기 흔들림(예: typescript/ts)을 막고, 소문자 영문 또는 한글로 일관되게 쓴다.",
        `   - 분량 하한을 지키도록 \`minChars: ${minChars}\`를 함께 넘긴다. 본문이 이보다 짧으면 도구가 발행을 거부하니, 그때는 내용을 더 채워 다시 호출한다.`,
        "7. 발행 결과(파일명)를 사람에게 한 줄로 보고한다.",
      ].join("\n");

      return {
        messages: [
          {
            role: "user",
            content: { type: "text", text },
          },
        ],
      };
    },
  );
}
