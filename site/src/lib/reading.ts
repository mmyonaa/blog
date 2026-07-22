/** 읽는 시간(분): 본문(마크다운 원문) 글자 수 기준, 한국어 ≈ 500자/분. */
export const readMin = (body: string | undefined): number =>
  Math.max(1, Math.round((body ?? "").length / 500));

/** 본문 글자 수(마크다운 원문 기준). readMin과 같은 원천을 쓴다. */
export const charCount = (body: string | undefined): number => (body ?? "").length;

/** 천 단위 콤마. 로케일 편차 없이 결정적으로(빌드 재현성). 예: 1234 → "1,234". */
export const fmtCount = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
