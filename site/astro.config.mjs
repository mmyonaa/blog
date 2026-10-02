import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import remarkCjkFriendly from "remark-cjk-friendly";
import rehypeExternalLinks from "rehype-external-links";
import rehypeAsciiHeadingIds from "./src/lib/rehype-ascii-heading-ids.mjs";
import { readdirSync } from "node:fs";
import { PAGE_SIZE } from "./src/lib/pagination.ts";

// GitHub Pages 프로젝트 사이트: https://mmyonaa.github.io/blog/
// 배포 설정(#12)에서 함께 쓰이며, 로컬 dev에서도 /blog/ 경로로 서빙된다.
const base = "/blog";

// 2026-09-01 URL 이전 — 글이 `/blog/blog/<slug>/`에서 `/blog/<slug>/`로 올라왔다
// (base가 `/blog`인데 글 라우트도 `pages/blog/`라 `/blog/`가 두 번 들어갔다).
// 이미 색인된 옛 주소를 버리지 않도록 리다이렉트를 깔아 둔다. GitHub Pages는 서버
// 301을 못 주므로 Astro가 meta refresh + canonical 페이지를 만든다.
// 소스 경로엔 base가 자동으로 붙는다 → `LEGACY`는 실제로 `/blog/blog/…`가 된다.
const LEGACY = "/blog";
const postSlugs = readdirSync(new URL("./src/content/blog", import.meta.url))
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));
const lastPage = Math.max(1, Math.ceil(postSlugs.length / PAGE_SIZE));
const legacyRedirects = {
  [LEGACY]: `${base}/posts/`,
  ...Object.fromEntries(postSlugs.map((s) => [`${LEGACY}/${s}`, `${base}/${s}/`])),
  ...Object.fromEntries(
    Array.from({ length: lastPage - 1 }, (_, i) => [
      `${LEGACY}/page/${i + 2}`,
      `${base}/posts/page/${i + 2}/`,
    ]),
  ),
};
export default defineConfig({
  site: "https://mmyonaa.github.io",
  base,
  integrations: [
    sitemap({
      // noindex 페이지(태그 목록, 2쪽 이후 페이지네이션)와 옛 주소 리다이렉트 페이지는
      // 사이트맵에서도 뺀다 — 페이지 쪽 meta와 짝을 맞춘다(#75).
      filter: (page) =>
        !page.includes(`${base}/tags/`) &&
        !page.includes(`${base}${LEGACY}/`) &&
        !page.includes(`${base}/posts/page/`) &&
        !/\/categories\/[^/]+\/\d+\/$/.test(page),
      // 글 URL은 파일명 날짜 프리픽스(YYYY-MM-DD-slug)가 발행일 — lastmod로 실어
      // 크롤러가 새 글을 우선 가져가게 한다. 날짜 없는 페이지는 lastmod 생략.
      serialize(item) {
        const m = item.url.match(/\/blog\/(\d{4}-\d{2}-\d{2})-[^/]+\/$/);
        if (m) item.lastmod = m[1];
        return item;
      },
    }),
  ],
  // Archive는 Topics로 흡수됨(그래프가 /topics/#graph에 임베드). 기존 링크 보존용 리다이렉트.
  // 목적지엔 base가 자동으로 안 붙으므로 직접 붙인다(소스는 base가 자동 적용됨).
  // 2026-09-24 태그 표기 통일(정처기 → 정보처리기사) — 태그 슬러그가 로마자 표기라
  // 함께 바뀐다. 공유된 옛 태그 주소가 죽지 않도록 리다이렉트를 남긴다.
  redirects: {
    "/archive": `${base}/topics`,
    "/tags/jeongcheogi": `${base}/tags/jeongbocheorigisa/`,
    // 2026-10-02 중복 주제 통합(#75) — 자동 발행이 시드 주제를 자유 주제로 다시 쓴 4편을
    // 원글로 합쳤다. 신호가 갈리지 않도록 옛 주소는 원글로 보낸다.
    "/2026-09-18-db-normalization": `${base}/2026-07-17-db-normalization/`,
    "/2026-09-03-graph-traversal-bfs-dfs": `${base}/2026-08-02-bfs-dfs/`,
    "/2026-09-23-virtual-memory-page-replacement": `${base}/2026-08-10-page-replacement/`,
    "/2026-09-27-mcp-sampling-capability": `${base}/2026-08-13-mcp-sampling/`,
    ...legacyRedirects,
  },
  // 개발 중 하단에 뜨는 Astro 개발 툴바 비활성화(배포본엔 원래 없음)
  devToolbar: { enabled: false },
  markdown: {
    // 한글 등 CJK 문자에 붙은 **강조**/*이탤릭*이 깨지지 않게(CommonMark flanking 완화)
    remarkPlugins: [remarkCjkFriendly],
    // 글 본문의 "외부" 링크만 새 탭으로. 내부 링크는 그대로 둔다
    // (같은 탭 유지 + View Transitions 동작). target=_blank엔 noopener 필수.
    rehypePlugins: [
      // 소제목 앵커를 ASCII로(#ecb). Astro의 기본 heading id 부여보다 먼저 돌아야 한다.
      rehypeAsciiHeadingIds,
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
