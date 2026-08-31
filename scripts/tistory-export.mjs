// 티스토리 붙여넣기용 산출물 생성기 — site 빌드의 postbuild 훅으로 자동 실행된다.
//
// 티스토리 Open API가 2024-02 종료되어 자동 업로드 경로가 없다. 그래서 사람이
// 에디터에 붙여넣을 수 있는 형태까지만 만들어 docs/tistory/에 쌓아둔다.
// 티스토리 [마크다운] 모드가 한글에 붙은 **강조**도, 표도 그대로 렌더한다는 걸
// 실측(2myona.tistory.com/301·302)으로 확인해서, 원문 마크다운을 그대로 넘긴다.
// HTML 변환은 더 이상 하지 않는다 — 빌드 산출물(site/dist)에 기대지 않으므로
// 발행 직후 빌드 없이도 뽑을 수 있다.
//
//   pnpm tistory                                     # boangisa 섹션 전체
//   node scripts/tistory-export.mjs 2026-08-30-arp-spoofing   # 특정 글만
//
// 산출물(gitignore): docs/tistory/<slug>.meta.txt(폼 입력값) + <slug>.md(본문)
// 규격과 업로드 절차는 docs/tistory-crosspost.md.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = join(root, "docs");
const OUT = join(DOCS, "tistory");
const CONTENT = join(root, "site/src/content/blog");
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

function build(slug) {
  const md = readFileSync(join(CONTENT, `${slug}.md`), "utf8");
  const head = md.split("---")[1] ?? "";
  const url = `${SITE}/${slug}/`;

  // 프론트매터는 도구가 만든 메타라 본문이 아니다. 티스토리 폼으로 옮겨간다.
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  // canonical을 넣을 수 없는 플랫폼이라, 원문 링크 한 줄이 출처 신호를 대신한다.
  const notice = `> 이 글은 [daily.mcp](${url})에 먼저 공개한 글을 옮긴 것입니다. 최신 내용은 원문에 있습니다.`;
  // 사이트 안에서만 통하는 상대 링크는 옮겨가면 깨진다.
  const abs = body.replace(/\]\(\/blog\//g, `](${SITE}/`);

  writeFileSync(join(OUT, `${slug}.md`), `${notice}\n\n${abs}\n`);
  writeFileSync(
    join(OUT, `${slug}.meta.txt`),
    [
      `제목: ${unquote(fm(head, "title"))}`,
      `카테고리: ${SECTION_LABEL}`,
      `태그: ${list(fm(head, "tags")).join(", ")}`,
      `요약(선택): ${unquote(fm(head, "description"))}`,
      `원문 URL: ${url}`,
      ``,
      `본문: ${slug}.md 전체를 티스토리 에디터 [마크다운] 모드에 붙여넣는다.`,
      `      (모드는 우측 상단 드롭다운. 한 글에서 마크다운을 고르면 되돌릴 수 없다)`,
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
