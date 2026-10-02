/**
 * 제목/문자열을 URL·파일명용 슬러그로 변환한다.
 * 유니코드 문자(한글 포함)·숫자는 유지하고, 그 외는 하이픈으로 접는다.
 */
export function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return s || "post";
}

/** 오늘 날짜를 `YYYY-MM-DD`(UTC)로 반환. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 현재 시각을 초까지 포함한 ISO 8601(UTC). 예: `2026-07-15T05:03:22Z` */
export function nowIso(): string {
  return `${new Date().toISOString().slice(0, 19)}Z`;
}

/** YAML 프론트매터에 안전하게 넣기 위한 큰따옴표 문자열. */
export function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * 두 slug가 같은 주제를 가리키는지 — 같거나, 한쪽의 토큰열이 다른 쪽에 연속으로 들어가면 true.
 * `bfs-dfs` ⊂ `graph-traversal-bfs-dfs`, `page-replacement` ⊂ `virtual-memory-page-replacement`.
 * 짧은 쪽이 토큰 1개면(`mcp`, `db`) 거의 모든 글과 겹치므로 판정하지 않는다.
 */
export function slugsOverlap(a: string, b: string): boolean {
  if (a === b) return true;
  const ta = a.split("-").filter(Boolean);
  const tb = b.split("-").filter(Boolean);
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.length < 2) return false;
  for (let i = 0; i + short.length <= long.length; i++) {
    if (short.every((t, j) => t === long[i + j])) return true;
  }
  return false;
}
