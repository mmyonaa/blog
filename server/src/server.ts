import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPublishPost, registerSuggestTopic } from "./tools.js";
import { registerPostsResource } from "./resources.js";
import { registerWriteDailyPostPrompt } from "./prompts.js";
import { registerSearchTools } from "./search.js";

export const SERVER_NAME = "blog-mcp";
export const SERVER_VERSION = "0.0.0";

/**
 * blog-mcp MCP 서버 인스턴스를 생성한다.
 *
 * 도구/리소스/프롬프트를 이 팩토리 안에서 등록한다:
 *  - #3 publish_post (완료), #4 suggest_topic  → registerTool
 *  - #5 blog://posts                            → registerResource
 *  - #6 write_daily_post                        → registerPrompt
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerPublishPost(server);
  registerSuggestTopic(server);
  registerPostsResource(server);
  registerWriteDailyPostPrompt(server);
  registerSearchTools(server); // #16 Mode R: search_web / read_url (키 없으면 안내 에러)

  return server;
}
