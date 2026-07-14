#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, SERVER_NAME, SERVER_VERSION } from "./server.js";

/**
 * blog-mcp 서버 진입점.
 * stdio transport로 MCP 서버를 띄운다. CI cron·로컬 테스트 양쪽에서
 * 서브프로세스로 spawn되어 오케스트레이터(또는 Claude Code)가 붙는다.
 *
 * ⚠️ stdout은 MCP JSON-RPC 프로토콜 전용이다. 사람이 볼 로그는 반드시 stderr로 보낸다.
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${SERVER_NAME}] v${SERVER_VERSION} stdio 서버 시작`);
}

main().catch((err: unknown) => {
  console.error("[blog-mcp] 치명적 오류:", err);
  process.exit(1);
});
