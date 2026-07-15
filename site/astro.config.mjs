import { defineConfig } from "astro/config";

// GitHub Pages 프로젝트 사이트: https://mmyonaa.github.io/mcp/
// 배포 설정(#12)에서 함께 쓰이며, 로컬 dev에서도 /mcp/ 경로로 서빙된다.
export default defineConfig({
  site: "https://mmyonaa.github.io",
  base: "/mcp",
});
