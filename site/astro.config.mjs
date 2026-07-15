import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import remarkCjkFriendly from "remark-cjk-friendly";

// GitHub Pages 프로젝트 사이트: https://mmyonaa.github.io/mcp/
// 배포 설정(#12)에서 함께 쓰이며, 로컬 dev에서도 /mcp/ 경로로 서빙된다.
export default defineConfig({
  site: "https://mmyonaa.github.io",
  base: "/mcp",
  integrations: [sitemap()],
  markdown: {
    // 한글 등 CJK 문자에 붙은 **강조**/*이탤릭*이 깨지지 않게(CommonMark flanking 완화)
    remarkPlugins: [remarkCjkFriendly],
    // 코드블록 라이트/다크 이중 테마(#25). 전환 CSS는 global.css의 .astro-code 규칙.
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
