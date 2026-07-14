import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { getContentDir } from "./config.js";

export interface PostSummary {
  /** 파일명에서 확장자를 뺀 값 (`2026-07-14-첫-글`). */
  slug: string;
  /** 날짜 접두어를 뗀 주제 슬러그 (`첫-글`). 중복 판정에 사용. */
  topicSlug: string;
  title: string;
  pubDate: string;
  tags: string[];
  description?: string | undefined;
}

export interface Post extends PostSummary {
  /** 프론트매터를 제외한 마크다운 본문. */
  body: string;
}

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

/** gray-matter가 날짜를 Date로 파싱할 수 있으므로 문자열 YYYY-MM-DD로 정규화. */
function normalizeDate(value: unknown, fallback: string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.trim() !== "") return value.slice(0, 10);
  return fallback;
}

function toSummary(fileName: string, raw: string): Post {
  const { data, content } = matter(raw);
  const slug = fileName.replace(/\.md$/, "");
  return {
    slug,
    topicSlug: slug.replace(DATE_PREFIX, ""),
    title: typeof data.title === "string" ? data.title : slug,
    pubDate: normalizeDate(data.pubDate, slug.slice(0, 10)),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    description: typeof data.description === "string" ? data.description : undefined,
    body: content.trim(),
  };
}

async function readMarkdownFiles(): Promise<string[]> {
  const dir = getContentDir();
  const files = await readdir(dir).catch(() => [] as string[]);
  return files.filter((f) => f.endsWith(".md"));
}

/** 발행된 글 목록을 최신순으로 반환한다(본문 제외 요약). */
export async function listPosts(): Promise<PostSummary[]> {
  const dir = getContentDir();
  const files = await readMarkdownFiles();
  const posts: Post[] = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf8");
    posts.push(toSummary(file, raw));
  }
  posts.sort((a, b) => b.pubDate.localeCompare(a.pubDate) || b.slug.localeCompare(a.slug));
  return posts.map(({ body: _body, ...summary }) => summary);
}

/** 특정 글의 본문까지 반환한다. 없으면 null. */
export async function getPost(slug: string): Promise<Post | null> {
  const dir = getContentDir();
  const raw = await readFile(join(dir, `${slug}.md`), "utf8").catch(() => null);
  return raw === null ? null : toSummary(`${slug}.md`, raw);
}
