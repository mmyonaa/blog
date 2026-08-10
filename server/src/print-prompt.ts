// write_daily_post 프롬프트 텍스트를 stdout으로 출력하는 CLI.
// 헤드리스 래퍼(scripts/daily-post.sh)가 `claude -p`에 주입할 프롬프트를 뽑는 용도 —
// MCP 슬래시 프롬프트가 헤드리스에서 발동되지 않아(#10 판가름) 텍스트 주입으로 우회한다.
//
// 사용: node server/dist/print-prompt.js [section] [depth]
import { buildWriteDailyPostText } from "./prompts.js";

const [section, depth] = process.argv.slice(2);
process.stdout.write(
  buildWriteDailyPostText({
    section,
    depth: depth as Parameters<typeof buildWriteDailyPostText>[0]["depth"],
  }),
);
