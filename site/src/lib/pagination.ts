/** 목록 페이지네이션 공통 설정·헬퍼. */

/**
 * 페이지당 글 수. 목록(글/카테고리/태그) 전체가 이 값을 공유한다.
 * 카드뷰 그리드가 데스크톱 3열이므로 3의 배수로 두어 마지막 줄이
 * 빈 칸 없이 채워지게 한다(8이면 한 칸 비어 글이 빠진 듯 보인다).
 */
export const PAGE_SIZE = 9;

/**
 * 페이지 번호 표시 윈도우. 첫·끝·현재±1만 남기고 사이는 생략(…)으로 접는다.
 * 예) current=6, last=12 → [1, "…", 5, 6, 7, "…", 12]
 */
export function pageWindow(current: number, last: number): (number | "…")[] {
  const keep = new Set<number>([1, last, current - 1, current, current + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}
