---
title: "MCP 리소스 템플릿 — URI 하나로 수많은 리소스를 노출하는 법"
pubDate: 2026-10-12T13:19:37Z
section: "mcp"
tags: ["mcp", "resource-template", "typescript-sdk", "uri-template"]
description: "고정 URI 리소스의 한계와, URI 템플릿으로 매개변수화된 리소스를 TypeScript SDK로 등록하는 방법을 정리한다."
---

## 고정 리소스의 한계

MCP 리소스는 서버가 클라이언트에 읽기 전용 데이터를 URI로 노출하는 방식이다. 가장 단순한 형태는 URI 하나에 데이터 하나를 대응시키는 것이다. 그런데 노출할 대상이 글 수백 편, 노트 수천 개라면 어떨까. 하나씩 등록하는 코드는 현실적이지 않고, 데이터가 늘 때마다 서버를 고쳐야 한다.

이때 쓰는 것이 **리소스 템플릿**이다. URI 안에 변수 자리를 두고, 클라이언트가 변수를 채운 URI로 읽기를 요청하면 서버가 그 값으로 내용을 만들어 돌려준다. 웹 라우터의 경로 매개변수(`/posts/:slug`)와 같은 발상이다.

## 템플릿 형식

템플릿은 RFC 6570 URI 템플릿 문법을 따른다. 중괄호로 변수를 표시한다.

```text
note://{id}
file:///logs/{date}.log
```

클라이언트는 `resources/templates/list` 요청으로 서버가 가진 템플릿 목록을 받는다. 이 목록은 "어떤 URI를 만들어 읽을 수 있는가"를 알려 줄 뿐, 실제 존재하는 항목을 나열하는 것은 아니다. 존재하는 항목 목록이 필요하면 `resources/list`에 따로 답해야 한다.

## TypeScript SDK 예제

아래는 공식 TypeScript SDK(`@modelcontextprotocol/sdk`)의 `registerResource`와 `ResourceTemplate`을 쓰는 최소 예제다. SDK 버전에 따라 메서드 시그니처가 다를 수 있으니, 설치된 버전의 타입 정의를 확인하고 쓴다.

```ts
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const notes: Record<string, string> = {
  a1: "MCP 리소스는 URI로 식별한다.",
  b2: "템플릿은 변수를 포함한 URI 패턴이다.",
};

const server = new McpServer({ name: "notes", version: "1.0.0" });

server.registerResource(
  "note",
  new ResourceTemplate("note://{id}", {
    // 존재하는 항목을 나열한다. 불필요하면 undefined로 둔다.
    list: async () => ({
      resources: Object.keys(notes).map((id) => ({
        uri: `note://${id}`,
        name: `note ${id}`,
      })),
    }),
  }),
  { title: "노트", description: "id로 노트 한 건을 읽는다", mimeType: "text/plain" },
  async (uri, { id }) => {
    const text = notes[String(id)];
    if (text === undefined) throw new Error(`note not found: ${id}`);
    return { contents: [{ uri: uri.href, text }] };
  },
);

await server.connect(new StdioServerTransport());
```

핸들러의 두 번째 인자에 템플릿 변수가 담겨 들어온다. 반환값의 `contents[].uri`에는 요청받은 URI를 그대로 넣는 것이 안전하다.

## 설계할 때 주의할 점

- **변수 검증**: 변수는 클라이언트(결국 모델)가 정하는 값이다. `file:///{path}` 같은 템플릿에 경로를 그대로 이어 붙이면 `../` 로 범위를 벗어날 수 있다. 허용 목록이나 정규화로 막아야 한다.
- **목록과 템플릿의 역할 분리**: `list`는 발견을 돕는 선택 사항이다. 항목이 너무 많으면 목록을 생략하고, 도구나 프롬프트로 id를 찾게 하는 편이 낫다.
- **없는 값은 오류로**: 존재하지 않는 id는 빈 문자열이 아니라 오류로 응답해야 호출자가 구분할 수 있다.
- **리소스와 도구의 구분**: 부작용 없이 읽기만 하는 데이터는 템플릿 리소스로, 계산이나 변경이 따르면 도구로 둔다.

## 정리

리소스 템플릿은 "데이터가 많은데 URI 규칙이 일정한" 상황의 표준 해법이다. URI 패턴 하나를 등록하고, 변수를 검증한 뒤 내용을 돌려주면 된다. 고정 리소스는 소수의 핵심 문서에, 템플릿은 대량의 개별 항목에 쓴다고 나누면 설계가 단순해진다.
