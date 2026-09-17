---
title: "MCP Pagination — 커서는 스펙에 있는데 이 서버는 왜 안 쓰는가"
pubDate: 2026-09-17T13:27:20Z
section: "mcp"
tags: ["mcp", "pagination", "typescript-sdk", "cursor"]
description: "MCP의 tools/list·resources/list·prompts/list 응답에 커서 기반 페이지네이션이 어떻게 규격화돼 있는지 스펙 스키마로 확인하고, 이 블로그의 MCP 서버가 고수준 McpServer API를 쓰는 한 실제로는 페이지를 전혀 나누지 않는다는 사실을 SDK 소스로 짚은 뒤, 저수준 Server API로 직접 커서를 구현하는 코드까지 정리한다."
---

## 목록이 길어지면 생기는 문제

MCP 서버는 `tools/list`, `resources/list`, `prompts/list` 요청으로 자신이 가진 도구·리소스·프롬프트 목록을 클라이언트에게 알려준다. 도구가 몇 개뿐이면 한 번에 다 돌려줘도 되지만, 리소스가 수천 개인 서버라면 응답 하나에 다 욱여넣는 대신 나눠 보내는 편이 낫다. MCP 스펙은 이 문제를 커서 기반 페이지네이션으로 푼다.

이 글에서는 요청·응답 메시지 구조를 스펙 스키마로 확인하고, 이 블로그를 발행하는 MCP 서버가 실제로는 페이지네이션을 전혀 안 쓰고 있다는 사실을 SDK 소스로 짚어본다.

## cursor와 nextCursor

목록 요청과 응답 메시지는 대략 이렇게 오간다.

```text
// 요청
{
  "method": "tools/list",
  "params": { "cursor": "eyJvZmZzZXQiOjIwfQ==" }
}

// 응답
{
  "result": {
    "tools": [ /* ... */ ],
    "nextCursor": "eyJvZmZzZXQiOjQwfQ=="
  }
}
```

`cursor`는 다음 페이지를 어디서부터 시작할지 서버에게 알려주는 값이고, `nextCursor`는 서버가 "더 있으면 이 값을 다음 요청의 cursor로 보내라"고 알려주는 값이다. 응답에 `nextCursor`가 없으면 마지막 페이지라는 뜻이다.

TypeScript SDK의 타입 정의를 보면 이 구조가 그대로 스키마로 박혀 있다.

```typescript
// 커서는 "불투명한 토큰"이다 — 클라이언트는 값의 형식을 해석하지 않고
// 서버가 준 그대로 다음 요청에 되돌려주기만 하면 된다
export const CursorSchema = z.string();

export const PaginatedRequestSchema = RequestSchema.extend({
  params: PaginatedRequestParamsSchema.optional(), // params.cursor
});

export const PaginatedResultSchema = ResultSchema.extend({
  nextCursor: CursorSchema.optional(),
});
```

`ListToolsRequestSchema`·`ListResourcesRequestSchema`·`ListPromptsRequestSchema`·`ListResourceTemplatesRequestSchema`는 모두 이 두 스키마를 확장한다. 커서 값 자체는 오프셋 숫자든 DB 커서든 서버 마음대로 인코딩해도 된다 — 스펙이 요구하는 건 문자열이라는 것뿐이다.

## 그런데 이 서버는 페이지를 안 나눈다

이 블로그의 MCP 서버는 `McpServer` 고수준 API의 `registerTool`로 도구를 등록한다. SDK 내부에서 `tools/list`를 처리하는 핸들러는 이렇다.

```javascript
this.server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: Object.entries(this._registeredTools)
    .filter(([, tool]) => tool.enabled !== false)
    .map(([name, tool]) => ({ name, ...toolMetadata(tool) })),
}));
```

요청 객체를 아예 받지 않는다. `cursor`가 오든 안 오든 무시하고 등록된 도구를 전부 한 번에 배열로 돌려준다. `registerTool`·`registerResource`·`registerPrompt`로 등록하는 고수준 API를 쓰는 한, 목록이 몇 개든 페이지는 나뉘지 않는다. 이 프로젝트는 도구가 열 개 남짓이니 실용적으로는 문제가 없다.

## 진짜 페이지네이션이 필요해지면

목록이 커져서 직접 페이지를 나누고 싶다면, 고수준 `McpServer` 대신 저수준 `Server` 클래스로 내려가 `setRequestHandler`를 직접 등록해야 한다. 커서 값은 스펙이 문자열이기만 하면 된다고 정해뒀을 뿐이라 인코딩은 서버 자유다.

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const PAGE_SIZE = 50;

server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
  const offset = request.params?.cursor
    ? Number(Buffer.from(request.params.cursor, "base64").toString())
    : 0;
  const page = allResources.slice(offset, offset + PAGE_SIZE);
  const hasMore = offset + PAGE_SIZE < allResources.length;

  return {
    resources: page,
    nextCursor: hasMore
      ? Buffer.from(String(offset + PAGE_SIZE)).toString("base64")
      : undefined,
  };
});
```

## 정리

페이지네이션은 primitive가 아니라 목록 응답에 얹히는 부가 규약이다. 항목 수가 적을 땐 고수준 API가 이를 완전히 감춰줘도 무방하지만, 그 감춤이 "SDK가 알아서 나눠준다"가 아니라 "SDK가 아예 나누지 않는다"는 뜻이라는 점은 구분해야 한다. 목록이 수백·수천 단위로 늘어나는 서버를 만든다면, 그 시점이 저수준 `Server` API로 내려가야 하는 신호다.
