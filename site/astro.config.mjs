import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import remarkCjkFriendly from "remark-cjk-friendly";
import rehypeExternalLinks from "rehype-external-links";

// GitHub Pages 프로젝트 사이트: https://mmyonaa.github.io/mcp/
// 배포 설정(#12)에서 함께 쓰이며, 로컬 dev에서도 /mcp/ 경로로 서빙된다.
export default defineConfig({
  site: "https://mmyonaa.github.io",
  base: "/mcp",
  integrations: [sitemap()],
  // 개발 중 하단에 뜨는 Astro 개발 툴바 비활성화(배포본엔 원래 없음)
  devToolbar: { enabled: false },
  markdown: {
    // 한글 등 CJK 문자에 붙은 **강조**/*이탤릭*이 깨지지 않게(CommonMark flanking 완화)
    remarkPlugins: [remarkCjkFriendly],
    // 글 본문의 "외부" 링크만 새 탭으로. 내부 링크는 그대로 둔다
    // (같은 탭 유지 + View Transitions 동작). target=_blank엔 noopener 필수.
    rehypePlugins: [
      [
        rehypeExternalLinks,
        { target: "_blank", rel: ["noopener", "noreferrer"] },
      ],
    ],
    // 코드블록 라이트/다크 이중 테마(#25). 전환 CSS는 global.css의 .astro-code 규칙.
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
