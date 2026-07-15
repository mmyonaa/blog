/**
 * 블로그 주제 시드 풀.
 *
 * MCP 서버는 LLM을 호출하지 않으므로(무료 원칙), suggest_topic은 이 고정 풀에서
 * 아직 발행하지 않은 후보를 결정론적으로 골라 제안한다. 최종 선택·본문 작성은
 * 오케스트레이터(또는 Claude Code)가 한다.
 *
 * 이 프로젝트를 만들며 배운 것을 그대로 글감으로 삼는 "메타 블로그" 컨셉.
 */
export interface Topic {
  /**
   * 안 바뀌는 안정적 식별자(kebab-case). 발행 시 글 프론트매터에 `topicId`로 기록되어,
   * 제목·슬러그가 리워딩돼도 "이 주제는 이미 썼다"를 확실히 판정하는 키가 된다.
   */
  id: string;
  title: string;
  tags: string[];
}

export const SEED_TOPICS: Topic[] = [
  { id: "what-is-mcp", title: "MCP란 무엇인가 — LLM에게 도구를 쥐여주는 프로토콜", tags: ["mcp", "개념"] },
  { id: "three-primitives", title: "MCP의 3대 primitive: Tools vs Resources vs Prompts", tags: ["mcp", "개념"] },
  { id: "transport-stdio-vs-http", title: "stdio vs HTTP: MCP transport 고르기", tags: ["mcp", "transport"] },
  { id: "first-stdio-server-ts", title: "TypeScript로 첫 stdio MCP 서버 만들기", tags: ["mcp", "typescript"] },
  { id: "zod-input-schema", title: "zod로 MCP 도구 입력 스키마 정의하기", tags: ["mcp", "zod"] },
  { id: "resources-context", title: "MCP Resource로 LLM에게 컨텍스트 읽히기", tags: ["mcp", "resources"] },
  { id: "prompts-workflow", title: "MCP Prompt로 반복 워크플로 패키징하기", tags: ["mcp", "prompts"] },
  { id: "files-git-vs-db", title: "왜 블로그에 DB 대신 파일 + git을 쓰나", tags: ["아키텍처", "ssg"] },
  { id: "astro-content-collection", title: "Astro Content Collection으로 마크다운 블로그 만들기", tags: ["astro", "ssg"] },
  { id: "github-actions-cron", title: "GitHub Actions cron으로 매일 도는 자동화 짜기", tags: ["ci", "cron"] },
  { id: "agent-sdk-orchestrator", title: "Claude Agent SDK로 MCP 서버에 오케스트레이터 붙이기", tags: ["agent-sdk", "mcp"] },
  { id: "subscription-vs-api-cost", title: "구독 vs API 키: 자동화 비용의 진실", tags: ["비용", "인증"] },
  { id: "claude-code-testing", title: "Claude Code에 내 MCP 서버 붙여 테스트하기", tags: ["mcp", "claude-code"] },
  { id: "github-pages-deploy", title: "GitHub Pages로 정적 블로그 무료 배포하기", tags: ["pages", "배포"] },
];
