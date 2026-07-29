// spike(#52): 관련 글 추천 — 본문 TF-IDF(문자 bigram) vs 현행 태그 IDF 비교.
// 의존성 0. 형태소 분석기 없이 한글은 문자 bigram으로 토크나이즈해
// 조사·활용 문제를 우회한다("임베딩은"/"임베딩이" → 공통 bigram "임베").
// 실행: node spike-related-similarity.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "site/src/content/blog";

// ── 로드 + 프론트매터 파싱 (이 레포 포맷 전용 간이 파서) ──
const posts = readdirSync(DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const raw = readFileSync(join(DIR, f), "utf8");
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/);
    const head = fm?.[1] ?? "";
    const title = head.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? f;
    const section = head.match(/^section:\s*(\S+)/m)?.[1] ?? "?";
    const tagsLine = head.match(/^tags:\s*\[(.*)\]/m)?.[1] ?? "";
    const tags = [...tagsLine.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    const body = raw.slice(fm?.[0].length ?? 0);
    return { id: f.replace(/\.md$/, ""), title, section, tags, body };
  });

// ── 방법 A: 현행 태그 IDF (site/src/lib/related.ts 복제) ──
function tagRelated(target, all, n = 3) {
  const total = all.length;
  const df = new Map();
  for (const p of all) for (const t of new Set(p.tags)) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t) => Math.log(total / (df.get(t) ?? total));
  const tset = new Set(target.tags);
  return all
    .filter((p) => p.id !== target.id)
    .map((p) => {
      const shared = [...new Set(p.tags)].filter((t) => tset.has(t));
      const score = shared.reduce((s, t) => s + idf(t), 0) * (p.section === target.section ? 1.15 : 1);
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// ── 방법 B: 본문 TF-IDF 코사인 (한글 bigram + 영문 단어) ──
function tokenize(body) {
  const text = body
    .replace(/```[\s\S]*?```/g, " ")   // 코드 블록 제외 — 문법 토큰이 유사도를 오염
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_|~-]/g, " ")
    .toLowerCase();
  const tokens = [];
  for (const run of text.matchAll(/[가-힣]+|[a-z][a-z0-9.+]*/g)) {
    const w = run[0];
    if (/^[가-힣]/.test(w)) {
      if (w.length === 1) tokens.push(w);
      for (let i = 0; i < w.length - 1; i++) tokens.push(w.slice(i, i + 2));
    } else if (w.length > 1) tokens.push(w); // 영문은 단어 그대로 (mcp, astro…)
  }
  return tokens;
}

function buildVectors(all) {
  const tfs = all.map((p) => {
    const tf = new Map();
    for (const t of tokenize(p.body)) tf.set(t, (tf.get(t) ?? 0) + 1);
    return tf;
  });
  const df = new Map();
  for (const tf of tfs) for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const N = all.length;
  return tfs.map((tf) => {
    const vec = new Map();
    let norm = 0;
    for (const [t, f] of tf) {
      const w = (1 + Math.log(f)) * Math.log(N / df.get(t));
      if (w > 0) { vec.set(t, w); norm += w * w; }
    }
    return { vec, norm: Math.sqrt(norm) };
  });
}

function cosine(a, b) {
  const [small, big] = a.vec.size < b.vec.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of small.vec) { const w2 = big.vec.get(t); if (w2) dot += w * w2; }
  return dot / (a.norm * b.norm || 1);
}

// ── 실행 + 측정 ──
const t0 = performance.now();
const vecs = buildVectors(posts);
const t1 = performance.now();
const simTop = posts.map((_, i) =>
  posts
    .map((p, j) => ({ p, score: i === j ? -1 : cosine(vecs[i], vecs[j]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3),
);
const t2 = performance.now();

console.log(`글 수: ${posts.length}`);
console.log(`벡터화: ${(t1 - t0).toFixed(0)}ms · 전수 유사도(${posts.length}²): ${(t2 - t1).toFixed(0)}ms · 합계 ${(t2 - t0).toFixed(0)}ms\n`);

// 일치도: 두 방법의 top-3 집합 겹침
let overlapSum = 0, tagShort = 0;
posts.forEach((p, i) => {
  const tagTop = tagRelated(p, posts).map((r) => r.p.id);
  if (tagTop.length < 3) tagShort++;
  const simIds = simTop[i].map((r) => r.p.id);
  overlapSum += tagTop.filter((id) => simIds.includes(id)).length;
});
console.log(`top-3 평균 일치: ${(overlapSum / posts.length).toFixed(2)}/3`);
console.log(`태그 방식이 3개를 못 채우는 글: ${tagShort}/${posts.length}\n`);

// 샘플 비교 (섹션 섞어서)
const samples = ["2026-07-29-subscription-vs-api-cost", "2026-07-26-astro-css-scoped-styles", "2026-07-29-db-index", "2026-07-23-claude-billing-error", "2026-07-16-mcp-stdout-stderr"];
for (const sid of samples) {
  const i = posts.findIndex((p) => p.id === sid);
  if (i < 0) continue;
  console.log(`■ ${posts[i].title}`);
  console.log(`  [태그] ${tagRelated(posts[i], posts).map((r) => r.p.title.slice(0, 30)).join(" | ") || "(없음)"}`);
  console.log(`  [본문] ${simTop[i].map((r) => `${r.p.title.slice(0, 30)}(${r.score.toFixed(2)})`).join(" | ")}\n`);
}
