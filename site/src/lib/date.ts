// 발행 시각 표기 유틸.
// KST(UTC+9)로 변환한 'YYYY-MM-DD HH:MM:SS' (라벨 없음, 초까지).
export function fmtDateTime(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 3600 * 1000).toISOString();
  return `${kst.slice(0, 10)} ${kst.slice(11, 19)}`;
}

// KST 기준 날짜만 'YYYY-MM-DD'. 초 단위 시각이 불필요한 곳(예: featured 아이라인)에.
export function fmtDate(d: Date): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 상대 시각: 7일 이내면 '방금/N분 전/N시간 전/N일 전', 그 밖은 날짜(YYYY-MM-DD).
// SSG라 기준 시각은 빌드 시점 — 매 발행마다 재빌드되므로 오차는 하루 안쪽.
export function fmtRelative(d: Date, now: Date = new Date()): string {
  const min = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return fmtDateTime(d).slice(0, 10);
}
