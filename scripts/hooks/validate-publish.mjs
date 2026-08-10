#!/usr/bin/env node
// PreToolUse 관문(#42) — mcp__blog-mcp__publish_post 호출 인자를 결정론으로 검증한다.
// 프롬프트 지침은 권고일 뿐이라(모델이 잊을 수 있음), 어겨선 안 되는 규칙만 여기서 강제한다.
// 차단 = exit 2 + stderr 사유 → 모델이 사유를 읽고 인자를 고쳐 재호출한다.
// 설계: docs/phase3-headless-harness.md §2-3 ("프롬프트는 권고, hooks는 강제")

// 섹션 포괄어 — 이것"만"으로 태그를 채우면 차단. 구체 소재 태그가 하나라도 섞이면 통과.
const BROAD_TAGS = new Set([
  "보안", "취약점", "다이제스트",
  "정처기", "알고리즘", "코딩테스트",
  "mcp", "개념", "블로그", "웹", "자동발행",
]);

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

let raw = "";
process.stdin.on("data", (d) => (raw += d));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0); // 훅 입력이 깨졌으면 판단 불가 — 방해하지 않는다
  }
  const t = input.tool_input ?? {};
  const errors = [];

  if (!t.section || String(t.section).trim() === "") {
    errors.push("section이 없다 — mcp | web | jeongcheogi | algo | security 중 하나를 반드시 넘겨라");
  }

  const slug = String(t.slug ?? "").trim();
  if (!slug) {
    errors.push("slug가 없다 — 짧은 영문 kebab-case slug를 반드시 넘겨라 (비우면 한글 슬러그가 되어 URL이 깨진다)");
  } else if (!SLUG_RE.test(slug)) {
    errors.push(`slug "${slug}"가 영문 kebab-case가 아니다 — 소문자 영문·숫자·하이픈만 사용하라`);
  }

  const tags = Array.isArray(t.tags) ? t.tags : [];
  if (tags.length < 3) {
    errors.push(`tags가 ${tags.length}개다 — 3~5개를 달아라`);
  } else if (tags.every((x) => BROAD_TAGS.has(String(x).toLowerCase().trim()))) {
    errors.push(
      "tags가 전부 섹션 포괄어다 — 글이 실제로 다룬 구체 소재(제품·기술·기법·고유명사) 태그를 포함하라",
    );
  }

  if (errors.length > 0) {
    process.stderr.write(`publish_post 차단(관문 검증 실패): ${errors.join(" / ")}`);
    process.exit(2);
  }
  process.exit(0);
});
