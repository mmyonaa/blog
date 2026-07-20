/**
 * 발행 스트릭 잔디(heatmap)용 활동 집계.
 * 글 pubDate들을 일자별로 세어 GitHub 컨트리뷰션 그리드처럼 주×요일 격자로 만든다.
 * 빌드 타임(SSG)에 계산된다.
 */

export interface HeatCell {
  /** 해당 칸의 날짜 */
  date: Date;
  /** 그날 발행 수. 미래(오늘 이후) 칸은 -1 */
  count: number;
  /** 오늘 이후(그리드 채움용 빈칸) */
  future: boolean;
}

export interface MonthLabel {
  /** "7월" 형태 */
  name: string;
  /** 1-based 주(열) 시작 인덱스 */
  col: number;
  /** 이 월이 차지하는 주 수 */
  span: number;
}

export interface Activity {
  /** 열(주) 개수 */
  weeks: number;
  /** 열 우선(week0의 일~토, 이어서 week1…) 순서의 칸들 */
  cells: HeatCell[];
  /** 상단 월 라벨 */
  months: MonthLabel[];
  /** 전체 글 수 */
  total: number;
}

const DAY_MS = 86_400_000;

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 그 주의 일요일(주 시작)로 정규화한 새 Date. */
function sundayOf(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

/**
 * 발행 활동 격자를 만든다.
 * 주 수는 블로그 나이에 맞춰 적응한다(첫 글이 오래됐을수록 넓게). minWeeks~maxWeeks로 클램프.
 */
export function buildActivity(
  dates: Date[],
  opts: { minWeeks?: number; maxWeeks?: number } = {},
): Activity {
  const minWeeks = opts.minWeeks ?? 13;
  const maxWeeks = opts.maxWeeks ?? 53;

  const counts = new Map<string, number>();
  let first: Date | null = null;
  for (const d of dates) {
    counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);
    if (!first || d < first) first = d;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastSunday = sundayOf(today);

  let weeks = minWeeks;
  if (first) {
    const span =
      Math.round((lastSunday.getTime() - sundayOf(first).getTime()) / (7 * DAY_MS)) + 1;
    weeks = Math.min(maxWeeks, Math.max(minWeeks, span));
  }

  const start = new Date(lastSunday);
  start.setDate(lastSunday.getDate() - (weeks - 1) * 7);

  const cells: HeatCell[] = [];
  const months: MonthLabel[] = [];
  const cursor = new Date(start);
  let prevMonth = -1;

  for (let w = 0; w < weeks; w++) {
    const month = cursor.getMonth(); // 열 시작(일요일)의 월
    if (month !== prevMonth) {
      months.push({ name: `${month + 1}월`, col: w + 1, span: 1 });
      prevMonth = month;
    } else if (months.length) {
      months[months.length - 1].span++;
    }
    for (let d = 0; d < 7; d++) {
      const future = cursor > today;
      cells.push({
        date: new Date(cursor),
        count: future ? -1 : counts.get(dayKey(cursor)) ?? 0,
        future,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return { weeks, cells, months, total: dates.length };
}

/**
 * 강도 구간 상한(포함). [4, 9] → lv1: 1~4편, lv2: 5~9편, lv3: 10편 이상.
 * heatLevel과 범례(HEAT_LEGEND)가 모두 여기서 파생된다 — 구간을 바꿀 땐 이 배열만.
 */
const HEAT_UPPER = [4, 9];

/** 발행 수 → 강도 레벨(0~HEAT_UPPER.length+1). 미래는 -1. */
export function heatLevel(count: number): number {
  if (count < 0) return -1;
  if (count === 0) return 0;
  for (let i = 0; i < HEAT_UPPER.length; i++) {
    if (count <= HEAT_UPPER[i]) return i + 1;
  }
  return HEAT_UPPER.length + 1;
}

/** 잔디 범례: 레벨별 라벨. */
export const HEAT_LEGEND: { lv: number; label: string }[] = [
  { lv: 0, label: "0편" },
  ...HEAT_UPPER.map((upper, i) => ({
    lv: i + 1,
    label: `${i === 0 ? 1 : HEAT_UPPER[i - 1] + 1}~${upper}편`,
  })),
  { lv: HEAT_UPPER.length + 1, label: `${HEAT_UPPER[HEAT_UPPER.length - 1] + 1}편 이상` },
];
