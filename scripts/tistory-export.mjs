// 티스토리 붙여넣기용 산출물 생성기 — site 빌드의 postbuild 훅으로 자동 실행된다.
//
// 티스토리 Open API가 2024-02 종료되어 자동 업로드 경로가 없다. 그래서 사람이
// 에디터(HTML 모드)에 붙여넣을 수 있는 형태까지만 만들어 docs/tistory/에 쌓아둔다.
// 마크다운을 다시 파싱하지 않고 빌드 산출물(site/dist)의 <article class="prose">
// 안쪽을 그대로 가져온다 — 사이트 본문과 100% 같아진다.
//
//   pnpm --filter @blog-mcp/site build            # postbuild로 자동 실행
//   node scripts/tistory-export.mjs               # boangisa 섹션 전체 다시 뽑기
//   node scripts/tistory-export.mjs 2026-08-30-arp-spoofing   # 특정 글만
//
// 산출물(gitignore): docs/tistory/<slug>.meta.txt(폼 입력값) + <slug>.html(본문)
// 규격과 업로드 절차는 docs/tistory-crosspost.md.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(root, "docs");
const OUT = join(DOCS, "tistory");
const CONTENT = join(root, "site/src/content/blog");
const DIST = join(root, "site/dist/blog");
const SITE = "https://mmyonaa.github.io/blog";
const SECTION = "boangisa";
const SECTION_LABEL = "정보보안기사";

// docs/는 로컬 전용(gitignore) — CI 러너엔 없다. 배포 빌드를 깨지 않도록 조용히 빠진다.
if (!existsSync(DOCS)) {
  console.log("tistory-export: docs/ 없음 — 건너뜀");
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const fm = (md, key) => md.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]?.trim() ?? "";
const unquote = (s) => s.replace(/^["']|["']$/g, "");
const list = (s) => [...s.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

function body(slug) {
  const file = join(DIST, slug, "index.html");
  if (!existsSync(file)) throw new Error(`빌드 산출물 없음: ${file}`);
  const m = readFileSync(file, "utf8").match(
    /<article class="prose[^"]*"[^>]*>([\s\S]*?)<\/article>/,
  );
  if (!m) throw new Error(`본문(article.prose)을 찾지 못함: ${slug}`);
  return m[1]
    .replace(/\n{3,}/g, "\n") // 빈 줄 뭉치 정리
    .replace(/href="\/blog\//g, `href="${SITE}/`) // 내부 링크 → 절대 URL
    .replace(/<table>/g, '<table style="border-collapse:collapse;width:100%">')
    .replace(/<(th|td)>/g, '<$1 style="border:1px solid #ddd;padding:6px 10px">')
    .trim();
}

function build(slug) {
  const head = readFileSync(join(CONTENT, `${slug}.md`), "utf8").split("---")[1] ?? "";
  const title = unquote(fm(head, "title"));
  const url = `${SITE}/${slug}/`;

  // canonical을 넣을 수 없는 플랫폼이라, 원문 링크 한 줄이 출처 신호를 대신한다.
  const notice =
    `<p style="color:#666;font-size:0.9em">` +
    `이 글은 <a href="${url}">daily.mcp</a>에 먼저 공개한 글을 옮긴 것입니다. 최신 내용은 원문에 있습니다.` +
    `</p>\n<hr />\n`;

  writeFileSync(join(OUT, `${slug}.html`), notice + body(slug) + "\n");
  writeFileSync(
    join(OUT, `${slug}.meta.txt`),
    [
      `제목: ${title}`,
      `카테고리: ${SECTION_LABEL}`,
      `태그: ${list(fm(head, "tags")).join(", ")}`,
      `요약(선택): ${unquote(fm(head, "description"))}`,
      `원문 URL: ${url}`,
      ``,
      `본문: ${slug}.html 전체를 티스토리 에디터 [HTML 모드]에 붙여넣는다.`,
    ].join("\n") + "\n",
  );
}

const arg = process.argv[2];
const slugs = arg
  ? [arg.replace(/\.md$/, "")]
  : readdirSync(CONTENT)
      .filter(
        (f) =>
          f.endsWith(".md") &&
          readFileSync(join(CONTENT, f), "utf8").includes(`section: "${SECTION}"`),
      )
      .map((f) => f.replace(/\.md$/, ""));

// 빌드 훅이라 한 글이 실패해도 빌드를 죽이지 않는다 — 어떤 글이 실패했는지만 남긴다.
let ok = 0;
for (const s of slugs) {
  try {
    build(s);
    ok++;
  } catch (e) {
    console.warn(`tistory-export: ${s} 건너뜀 — ${e.message}`);
  }
}
console.log(`tistory-export: ${ok}/${slugs.length}건 → docs/tistory/`);
