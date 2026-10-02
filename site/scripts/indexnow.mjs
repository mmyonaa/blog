// 배포 직후 최근 글 URL을 IndexNow(api.indexnow.org)에 제출한다 — 빙·네이버 등 참여
// 엔진이 즉시 크롤한다(Google은 미참여). 사이트맵만으론 신규 사이트가 크롤 예산을 못 받아
// '발견됨 - 색인 안 됨'에 머무는 문제의 우회(#75). 키 파일은 site/public/<key>.txt로
// /blog/ 밑에 서빙되며, IndexNow 규약상 키 파일 경로 밑의 URL만 제출할 수 있다.
//
// 사용: node site/scripts/indexnow.mjs            (실제 제출)
//       DRY_RUN=1 node site/scripts/indexnow.mjs  (대상 URL만 출력)
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://mmyonaa.github.io";
const BASE = "/blog";
const HOST = new URL(SITE).host;
// 최근 며칠 치 글을 제출할지 — 매일 1편 발행 + 배포 실패 하루치 여유.
const RECENT_DAYS = Number(process.env.INDEXNOW_DAYS ?? 3);

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const keyFile = readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("site/public/<key>.txt 가 없다 — IndexNow 키 파일 필요");
const key = readFileSync(join(publicDir, keyFile), "utf8").trim();

const res = await fetch(`${SITE}${BASE}/sitemap-0.xml`);
if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
const xml = await res.text();
const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
const urls = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)]
  .filter(([, , lastmod]) => lastmod && new Date(lastmod).getTime() >= cutoff)
  .map(([, loc]) => loc);
// 새 글이 실리는 목록 페이지도 같이 — 홈·전체 글.
urls.push(`${SITE}${BASE}/`, `${SITE}${BASE}/posts/`);

console.log(`IndexNow: ${urls.length}개 URL (최근 ${RECENT_DAYS}일)`);
for (const u of urls) console.log("  " + u);
if (process.env.DRY_RUN) process.exit(0);

const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: `${SITE}${BASE}/${keyFile}`, urlList: urls }),
});
// 200/202가 정상. 4xx는 키/URL 문제라 로그만 남기고 배포는 실패시키지 않는다.
console.log(`IndexNow 응답: ${r.status} ${r.statusText}`);
if (r.status >= 400) process.exitCode = 1;
