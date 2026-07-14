import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPost, listPosts } from "./posts.js";

/**
 * 발행된 글을 읽기 전용 컨텍스트로 노출한다.
 *  - blog://posts        → 글 목록(JSON)
 *  - blog://posts/{slug} → 특정 글 본문(마크다운)
 *
 * LLM이 "지난 글"을 읽어 중복 회피·시리즈 연결에 활용한다.
 */
export function registerPostsResource(server: McpServer): void {
  // 목록 리소스 (정적 URI)
  server.registerResource(
    "blog-posts",
    "blog://posts",
    {
      title: "발행된 글 목록",
      description: "지금까지 발행된 블로그 글의 메타데이터 목록(JSON).",
      mimeType: "application/json",
    },
    async (uri) => {
      const posts = await listPosts();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(posts, null, 2),
          },
        ],
      };
    },
  );

  // 개별 글 리소스 (URI 템플릿)
  server.registerResource(
    "blog-post",
    new ResourceTemplate("blog://posts/{slug}", {
      list: async () => {
        const posts = await listPosts();
        return {
          resources: posts.map((p) => ({
            uri: `blog://posts/${p.slug}`,
            name: p.title,
            description: p.description ?? `${p.pubDate} · ${p.tags.join(", ")}`,
            mimeType: "text/markdown",
          })),
        };
      },
    }),
    {
      title: "글 본문",
      description: "slug로 지정한 글의 본문(마크다운).",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const raw = Array.isArray(variables.slug) ? variables.slug[0] : variables.slug;
      // URI 템플릿 변수는 percent-encoding되어 오므로 디코딩(한글 슬러그 대응)
      const slug = raw ? decodeURIComponent(raw) : undefined;
      const post = slug ? await getPost(slug) : null;
      if (!post) {
        return {
          contents: [
            { uri: uri.href, mimeType: "text/markdown", text: `글을 찾을 수 없습니다: ${slug ?? "(없음)"}` },
          ],
        };
      }
      const header = `# ${post.title}\n\n_${post.pubDate} · ${post.tags.join(", ")}_`;
      return {
        contents: [
          { uri: uri.href, mimeType: "text/markdown", text: `${header}\n\n${post.body}\n` },
        ],
      };
    },
  );
}
