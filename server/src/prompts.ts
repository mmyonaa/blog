import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 심화도(depth) 티어별 목표 분량 밴드.
 * LLM이 주제 성격에 맞춰 티어를 고르고, 아래 밴드를 목표로 본문 길이를 잡는다.
 */
const DEPTH_BANDS = {
  quick: { label: "quick", range: "600~900자", hint: "개념 한입 · 짧은 정리" },
  standard: { label: "standard", range: "1200~1600자", hint: "기본 · 개념 + 예제" },
  deep: { label: "deep", range: "2000~2800자", hint: "구현/튜토리얼 · 단계별 심화" },
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
          .enum(["quick", "standard", "deep"])
          .optional()
          .describe(
            "글의 심화도(분량 밴드). quick=개념 한입(600~900자), standard=기본(1200~1600자), deep=구현/튜토리얼 심화(2000~2800자). 생략 시 standard. 주제 성격에 맞춰 조정 가능.",
          ),
        length: z
          .string()
          .optional()
          .describe("목표 글자 수를 직접 지정(대략). 지정하면 depth 밴드보다 우선한다."),
      },
    },
    ({ topic, depth, length }) => {
      const chosen: Depth = depth ?? "standard";
      const explicitLen = length && length.trim() !== "" ? length : null;
      const lengthLine = explicitLen
        ? `   - 분량: 약 ${explicitLen}자 (직접 지정)`
        : `   - 분량: ${DEPTH_BANDS[chosen].range} (심화도 ${chosen} — 주제가 더 얕거나 깊으면 아래 티어에서 조정)`;
      const depthTable = (Object.keys(DEPTH_BANDS) as Depth[])
        .map((k) => `     · ${DEPTH_BANDS[k].label}: ${DEPTH_BANDS[k].range} (${DEPTH_BANDS[k].hint})`)
        .join("\n");
      const topicLine = topic && topic.trim() !== ""
        ? `4. 주제는 "${topic}"으로 한다. (시드 밖 주제이므로 topicId는 없다)`
        : `4. \`suggest_topic\` 도구를 호출해 안 겹치는 후보를 받고, 그중 하나를 고른다. 후보는 영역(A/B/C)이 섞여 나오니 최근 글과 다른 영역을 우선 고려한다. 각 후보의 \`[id: ...]\`를 기억해 둔다.`;

      const text = [
        "당신은 이 블로그의 정기 필자다. 아래 순서로 오늘의 글 한 편을 작성하고 발행하라.",
        "",
        "1. `blog://posts` 리소스를 읽어 지금까지 발행된 글의 제목·태그를 파악한다.",
        "2. 최근 글과 주제·내용이 겹치지 않도록 한다. 각 글은 그 자체로 완결되게 쓰고, \"다음 글에서는...\" 같은 예고는 넣지 않는다.",
        "3. 필요하면 특정 지난 글을 `blog://posts/{slug}`로 열어 맥락을 확인한다.",
        topicLine,
        "5. 다음 기준으로 본문을 작성한다:",
        "   - 언어: 한국어",
        lengthLine,
        "   - 심화도 티어(참고):",
        depthTable,
        "     (분량은 공백 포함 글자 수 기준. 하한에 걸치지 말고 밴드 중간값을 목표로 한다.)",
        "   - 대상: 개발을 배우는 독자",
        "   - 형식: 마크다운. 적절한 소제목과, 가능하면 코드 예제 1개 이상 포함",
        "   - 톤: 군더더기 없이 명확하게. 과장·클리셰 지양",
        "6. `publish_post` 도구로 발행한다. `title`, `body`(프론트매터 제외한 본문), `tags`, 필요시 `description`을 채운다. `date`는 생략하면 오늘로 설정된다.",
        "   - suggest_topic 후보에서 고른 주제라면 그 후보의 `id`를 `topicId`로 꼭 넘긴다(중복 재제안 방지). 시드 밖 주제면 생략한다.",
        "   - `tags`는 3~5개. 1단계에서 읽은 `blog://posts`의 기존 태그를 우선 재사용해 표기 흔들림(예: typescript/ts)을 막고, 소문자 영문 또는 한글로 일관되게 쓴다.",
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
