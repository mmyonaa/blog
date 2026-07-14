import { resolve } from "node:path";

/**
 * 발행된 마크다운 글이 저장될 디렉토리.
 *
 * 기본값은 Astro가 읽을 `site/src/content/blog` (cwd 기준).
 * 환경변수 `BLOG_CONTENT_DIR`로 재정의 가능(테스트/CI에서 유용).
 */
export function getContentDir(): string {
  const fromEnv = process.env.BLOG_CONTENT_DIR;
  if (fromEnv && fromEnv.trim() !== "") return resolve(fromEnv);
  return resolve(process.cwd(), "site/src/content/blog");
}
