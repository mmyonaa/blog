import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const SERVER_NAME = "blog-mcp";
export const SERVER_VERSION = "0.0.0";

/**
 * blog-mcp MCP 서버 인스턴스를 생성한다.
 *
 * 도구/리소스/프롬프트는 이후 일감에서 이 팩토리 안에 등록한다:
 *  - #3 publish_post, #4 suggest_topic  → registerTool
 *  - #5 blog://posts                    → registerResource
 *  - #6 write_daily_post                → registerPrompt
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // TODO(#3,#4): server.registerTool(...)
  // TODO(#5):    server.registerResource(...)
  // TODO(#6):    server.registerPrompt(...)

  return server;
}
