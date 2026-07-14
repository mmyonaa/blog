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

/** YAML 프론트매터에 안전하게 넣기 위한 큰따옴표 문자열. */
export function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
