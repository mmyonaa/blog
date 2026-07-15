// 발행 시각 표기 유틸.
// KST(UTC+9)로 변환한 'YYYY-MM-DD HH:MM:SS' (라벨 없음, 초까지).
export function fmtDateTime(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 3600 * 1000).toISOString();
  return `${kst.slice(0, 10)} ${kst.slice(11, 19)}`;
}
