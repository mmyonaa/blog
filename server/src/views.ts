/**
 * 조회수 신호(#73) — Supabase post_views를 읽어 suggest_topic의 성과 되먹임에 쓴다.
 *
 * 원칙:
 *  - LLM 호출 없음(무료 원칙). 가중치는 결정론적 산술로만 계산한다.
 *  - Graceful degradation: 키 미설정·네트워크 실패·신호 희박이면 조용히 빈 신호를
 *    돌려주고, 호출부는 현행(라운드로빈)과 동일하게 동작해야 한다. 절대 throw하지 않는다.
 *  - 조회수는 부정확한 지표다(크롤러 포함·차단 누락). 절대값 판단이 아니라
 *    area 간 상대 순위에만 쓴다.
 */
import { areaOfTopicId, isAreaId, type AreaId } from "./topics.js";
import type { PostSummary } from "./posts.js";

/** 사이트 빌드와 같은 시크릿을 재사용한다(단일 출처) — PUBLIC_이지만 서버에서도 이 이름으로 읽는다. */
const SUPA_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

/** RPC 응답 대기 상한(ms). suggest_topic 응답성을 지키기 위해 짧게 끊는다. */
const FETCH_TIMEOUT_MS = 3000;

/**
 * 신호 하한 — 매핑된 글들의 조회수 총합이 이보다 작으면 가중을 적용하지 않는다(탐색 우선).
 * cold-start 구간에서 노이즈 몇 건이 순서를 흔드는 것을 막는 결정론적 관문.
 */
const MIN_TOTAL_VIEWS = 30;

/**
 * get_views_bulk RPC(#67)로 slug별 누적 조회수를 일괄 조회한다.
 * 실패하면(키 없음·타임아웃·비정상 응답) null — 호출부는 가중 없이 진행한다.
 */
export async function fetchViewsBulk(): Promise<Map<string, number> | null> {
  if (!SUPA_URL || !SUPA_KEY) return null;
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/get_views_bulk`, {
      method: "POST",
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) return null;
    const map = new Map<string, number>();
    for (const row of rows) {
      if (
        row &&
        typeof row === "object" &&
        typeof (row as { slug?: unknown }).slug === "string" &&
        typeof (row as { count?: unknown }).count === "number"
      ) {
        map.set((row as { slug: string }).slug, (row as { count: number }).count);
      }
    }
    return map;
  } catch {
    return null;
  }
}

/** 글의 area를 결정한다: 프론트매터 area 우선(리서치 글), 없으면 시드 topicId에서 도출. */
function areaOfPost(post: PostSummary): AreaId | undefined {
  if (post.area && isAreaId(post.area)) return post.area;
  return post.topicId ? areaOfTopicId(post.topicId) : undefined;
}

/**
 * area별 성과 점수를 계산한다 — 점수 = 그 area 글들의 "조회수 ÷ 발행 후 경과일" 평균.
 * 경과일 정규화로 오래된 글의 누적 유리함을 보정한다(공정성).
 *
 * 신호가 희박하면(총 조회 < MIN_TOTAL_VIEWS) 빈 Map을 돌려 가중을 끈다(cold-start 탐색 우선).
 * 순수 함수 — now를 주입받아 결정론적으로 테스트 가능하다.
 */
export function areaViewScores(
  posts: PostSummary[],
  views: Map<string, number>,
  now: Date,
): Map<AreaId, number> {
  const sums = new Map<AreaId, { perDaySum: number; posts: number; views: number }>();
  let totalViews = 0;

  for (const post of posts) {
    const area = areaOfPost(post);
    if (!area) continue;
    const count = views.get(post.slug) ?? 0;
    const ageMs = now.getTime() - new Date(post.pubDate).getTime();
    const ageDays = Math.max(1, ageMs / 86_400_000);
    const acc = sums.get(area) ?? { perDaySum: 0, posts: 0, views: 0 };
    acc.perDaySum += count / ageDays;
    acc.posts += 1;
    acc.views += count;
    sums.set(area, acc);
    totalViews += count;
  }

  if (totalViews < MIN_TOTAL_VIEWS) return new Map();

  const scores = new Map<AreaId, number>();
  for (const [area, acc] of sums) {
    scores.set(area, acc.perDaySum / acc.posts);
  }
  return scores;
}
