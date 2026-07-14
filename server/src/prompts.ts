import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

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
        length: z
          .string()
          .optional()
          .describe("목표 분량(대략적인 글자 수, 기본 800)"),
      },
    },
    ({ topic, length }) => {
      const targetLen = length && length.trim() !== "" ? length : "800";
      const topicLine = topic && topic.trim() !== ""
        ? `4. 주제는 "${topic}"으로 한다.`
        : `4. \`suggest_topic\` 도구를 호출해 안 겹치는 후보를 받고, 그중 하나를 고른다.`;

      const text = [
        "당신은 이 블로그의 정기 필자다. 아래 순서로 오늘의 글 한 편을 작성하고 발행하라.",
        "",
        "1. `blog://posts` 리소스를 읽어 지금까지 발행된 글의 제목·태그를 파악한다.",
        "2. 최근 글과 주제·내용이 겹치지 않도록 한다. 시리즈로 이어질 수 있으면 자연스럽게 연결한다.",
        "3. 필요하면 특정 지난 글을 `blog://posts/{slug}`로 열어 맥락을 확인한다.",
        topicLine,
        "5. 다음 기준으로 본문을 작성한다:",
        "   - 언어: 한국어",
        `   - 분량: 약 ${targetLen}자`,
        "   - 대상: 개발을 배우는 독자",
        "   - 형식: 마크다운. 적절한 소제목과, 가능하면 코드 예제 1개 이상 포함",
        "   - 톤: 군더더기 없이 명확하게. 과장·클리셰 지양",
        "6. `publish_post` 도구로 발행한다. `title`, `body`(프론트매터 제외한 본문), `tags`, 필요시 `description`을 채운다. `date`는 생략하면 오늘로 설정된다.",
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
