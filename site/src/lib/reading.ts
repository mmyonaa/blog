/** 읽는 시간(분): 본문(마크다운 원문) 글자 수 기준, 한국어 ≈ 500자/분. */
export const readMin = (body: string | undefined): number =>
  Math.max(1, Math.round((body ?? "").length / 500));
