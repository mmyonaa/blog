import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Mode R 리서치 도구(#16) — search_web / read_url.
 *
 * 백엔드는 어댑터 인터페이스 뒤에 숨긴다. Tavily가 1차 구현(#15 결정)이고,
 * Exa/Jina로 갈아탈 일이 생기면 SearchBackend 구현체 하나만 추가한다.
 * 도구 자체는 LLM을 부르지 않는다 — HTTP 호출뿐(무료 원칙, 외부 크레딧만 소모).
 */

export interface SearchHit {
  title: string;
  url: string;
  /** 검색 결과에 붙는 짧은 본문 발췌 */
  snippet: string;
  score?: number;
}

export interface SearchBackend {
  readonly name: string;
  search(query: string, k: number, topic: "general" | "news"): Promise<SearchHit[]>;
  /** URL 본문을 마크다운 텍스트로 */
  read(url: string): Promise<string>;
}

/** Tavily 백엔드 — https://docs.tavily.com (search: basic 1크레딧, extract: 1크레딧/5URL) */
class TavilyBackend implements SearchBackend {
  readonly name = "tavily";
  constructor(private apiKey: string) {}

  private async post(path: string, body: Record<string, unknown>): Promise<any> {
    const res = await fetch(`https://api.tavily.com${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Tavily ${path} ${res.status}: ${detail.slice(0, 200)}`);
    }
    return res.json();
  }

  async search(query: string, k: number, topic: "general" | "news"): Promise<SearchHit[]> {
    const data = await this.post("/search", {
      query,
      max_results: k,
      topic,
      search_depth: "basic",
    });
    return (data.results ?? []).map((r: any) => ({
      title: String(r.title ?? ""),
      url: String(r.url ?? ""),
      snippet: String(r.content ?? ""),
      score: typeof r.score === "number" ? r.score : undefined,
    }));
  }

  async read(url: string): Promise<string> {
    const data = await this.post("/extract", { urls: url, format: "markdown" });
    const ok = (data.results ?? [])[0];
    if (!ok?.raw_content) {
      const why = (data.failed_results ?? [])[0]?.error ?? "본문 없음";
      throw new Error(`추출 실패(${url}): ${why}`);
    }
    return String(ok.raw_content);
  }
}

/** 환경변수로 백엔드를 고른다. 키가 없으면 null — 도구는 등록되되 안내 에러를 돌려준다. */
export function getBackend(): SearchBackend | null {
  const key = process.env.TAVILY_API_KEY;
  if (key && key.trim() !== "") return new TavilyBackend(key.trim());
  return null;
}

const NO_KEY_MSG =
  "검색 백엔드 미설정: 환경변수 TAVILY_API_KEY가 없다. " +
  "리서치 없이 진행하거나, 사람에게 키 설정(로컬: 셸 환경변수, CI: 레포 시크릿)을 요청하라.";

/** read_url 결과가 컨텍스트를 폭파하지 않도록 자르는 상한(문자 수). */
const READ_MAX_CHARS = 20_000;

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "search_web",
    {
      title: "웹 검색",
      description:
        "웹을 검색해 제목·URL·발췌를 돌려준다. 최신 사건·버전·수치처럼 학습 데이터에 없거나 바뀌었을 정보가 필요할 때 호출하라. " +
        "뉴스성 주제(보안 사고·릴리스 소식)는 topic='news'를 쓰면 시의성 있는 결과가 나온다. 본문 전체가 필요하면 결과 URL을 read_url에 넘겨라.",
      inputSchema: {
        query: z.string().min(1).describe("검색 쿼리 (영문이 결과 폭이 넓다)"),
        k: z.number().int().min(1).max(10).default(5).describe("결과 개수 (기본 5)"),
        topic: z
          .enum(["general", "news"])
          .default("general")
          .describe("news면 최근 뉴스 위주로 검색"),
      },
    },
    async ({ query, k, topic }) => {
      const backend = getBackend();
      if (!backend) return { isError: true, content: [{ type: "text", text: NO_KEY_MSG }] };
      try {
        const hits = await backend.search(query, k, topic);
        if (hits.length === 0) {
          return {
            content: [
              { type: "text", text: `결과 없음: "${query}" — 쿼리를 바꾸거나 topic을 조정해 재시도하라.` },
            ],
          };
        }
        const text = hits
          .map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.snippet}`)
          .join("\n\n");
        return { content: [{ type: "text", text: `[${backend.name}] "${query}" 결과 ${hits.length}건\n\n${text}` }] };
      } catch (e) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `검색 실패: ${e instanceof Error ? e.message : String(e)} — 잠시 후 재시도하거나 쿼리를 단순화하라.`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "read_url",
    {
      title: "URL 본문 읽기",
      description:
        "URL의 본문을 마크다운으로 추출해 돌려준다. search_web 결과 중 근거로 쓸 페이지의 전문이 필요할 때 호출하라. " +
        `긴 문서는 앞 ${READ_MAX_CHARS.toLocaleString()}자에서 잘린다.`,
      inputSchema: {
        url: z.string().url().describe("본문을 읽을 페이지 URL"),
      },
    },
    async ({ url }) => {
      const backend = getBackend();
      if (!backend) return { isError: true, content: [{ type: "text", text: NO_KEY_MSG }] };
      try {
        const body = await backend.read(url);
        const truncated = body.length > READ_MAX_CHARS;
        const text = truncated
          ? `${body.slice(0, READ_MAX_CHARS)}\n\n…(이하 ${body.length - READ_MAX_CHARS}자 생략)`
          : body;
        return { content: [{ type: "text", text: `[${url}]\n\n${text}` }] };
      } catch (e) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `본문 추출 실패: ${e instanceof Error ? e.message : String(e)} — 다른 출처 URL로 시도하라.`,
            },
          ],
        };
      }
    },
  );
}
