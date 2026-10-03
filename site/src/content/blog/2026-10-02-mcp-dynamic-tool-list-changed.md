---
title: "MCP 도구 목록은 고정이 아니다 — enable·disable과 tools/list_changed 알림"
pubDate: 2026-10-02T10:32:49Z
section: "mcp"
tags: ["mcp", "list_changed", "typescript-sdk", "tools", "capability"]
related: ["2026-08-16-mcp-tool-annotations", "2026-08-24-mcp-logging-capability"]
description: "MCP 서버가 실행 중에 도구를 켜고 끄는 방법과, 그 변화를 클라이언트에게 알리는 tools/list_changed 알림을 TypeScript SDK의 RegisteredTool 핸들로 정리한다."
---

대부분의 MCP 서버는 시작할 때 도구를 전부 등록하고 끝낸다. 클라이언트는 연결 직후 `tools/list`를 한 번 부르고, 그 목록을 세션 내내 그대로 쓴다. 그런데 서버의 상태에 따라 보여줄 도구가 달라져야 하는 경우가 있다. 로그인 전에는 조회 도구만, 로그인 뒤에는 쓰기 도구까지. 초기 설정이 끝나기 전에는 `setup` 하나만, 끝난 뒤에는 본 도구들을. 이런 상황을 위해 스펙은 도구 목록이 바뀔 수 있다는 것을 전제로 설계돼 있다.

## 스펙: listChanged capability와 알림

서버는 초기화 응답의 `capabilities.tools.listChanged`를 `true`로 선언해 "내 도구 목록은 바뀔 수 있다"고 미리 알린다. 실제로 목록이 바뀌면 서버가 클라이언트에게 알림을 보낸다.

```text
{ "jsonrpc": "2.0", "method": "notifications/tools/list_changed" }
```

알림에는 무엇이 바뀌었는지가 들어 있지 않다. "바뀌었으니 다시 물어보라"는 신호일 뿐이고, 클라이언트는 이걸 받으면 `tools/list`를 다시 호출해 최신 목록을 가져온다. 알림이라 응답도 없다. 이 단순함 덕분에 서버는 변경 내용을 추적할 필요 없이 "바뀌었다"만 쏘면 된다.

같은 구조가 resources와 prompts에도 있다. `notifications/resources/list_changed`, `notifications/prompts/list_changed`가 각각 짝이다.

## TypeScript SDK: registerTool이 돌려주는 핸들

TypeScript SDK에서 `registerTool`은 등록만 하고 끝나는 함수가 아니다. `RegisteredTool` 객체를 돌려주고, 이 핸들로 나중에 도구를 조작할 수 있다.

- `disable()` / `enable()`: 목록에서 숨기거나 다시 드러낸다.
- `update({ description, paramsSchema, callback, ... })`: 설명·입력 스키마·콜백을 바꾼다.
- `remove()`: 아예 등록을 해제한다.

네 가지 모두 내부적으로 `sendToolListChanged()`를 호출하므로 알림을 직접 보낼 필요가 없다. `McpServer`는 `listChanged: true` capability도 알아서 선언한다.

로그인 뒤에만 발행 도구를 여는 예제다.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "gated-demo", version: "0.1.0" });

// 처음엔 숨겨 둔다. 핸들을 변수에 잡아 둬야 나중에 켤 수 있다.
const publish = server.registerTool(
  "publish_post",
  { description: "글을 발행한다", inputSchema: { title: z.string() } },
  async ({ title }) => ({ content: [{ type: "text", text: `발행: ${title}` }] }),
);
publish.disable();

server.registerTool(
  "login",
  { description: "토큰으로 로그인한다", inputSchema: { token: z.string() } },
  async ({ token }) => {
    if (token !== process.env.DEMO_TOKEN) {
      return { isError: true, content: [{ type: "text", text: "토큰이 틀렸다" }] };
    }
    publish.enable(); // 여기서 notifications/tools/list_changed 가 자동으로 나간다
    return { content: [{ type: "text", text: "로그인 완료. publish_post 사용 가능" }] };
  },
);

await server.connect(new StdioServerTransport());
```

연결 직후 클라이언트가 보는 목록에는 `login`만 있다. 토큰이 맞으면 `publish_post`가 켜지고 알림이 나가며, 클라이언트가 목록을 다시 받으면 두 개가 된다.

## 알아 둘 동작

**비활성 도구는 목록에서만 빠지는 게 아니다.** `tools/call`로 이름을 직접 찍어 호출해도 SDK가 "disabled" 에러를 돌려준다. 그래서 LLM이 옛 목록을 기억하고 있어도 우회가 안 된다.

**연결 전에 부른 enable/disable은 알림을 내지 않는다.** 아직 보낼 상대가 없어서다. 위 예제처럼 `connect` 전에 `disable()`을 호출해도 문제없는 이유는, 클라이언트가 어차피 연결 뒤에 첫 `tools/list`를 부르기 때문이다.

**remove보다 disable이 편하다.** `remove()`는 핸들을 버리는 셈이라 다시 살리려면 재등록해야 한다. 켰다 껐다 할 도구라면 `disable()`로 두고 핸들을 유지하는 편이 단순하다.

**알림을 처리하는 건 클라이언트 몫이다.** 서버가 알림을 보내도 클라이언트가 무시하면 목록은 갱신되지 않는다. 주요 클라이언트는 처리하지만, 직접 만든 클라이언트라면 `notifications/tools/list_changed` 핸들러를 달고 `tools/list`를 다시 부르는 코드를 넣어야 한다.

## 언제 쓰고 언제 안 쓰나

상태 전이가 뚜렷할 때 쓴다. 인증 전후, 설정 완료 전후, 특정 리소스가 준비됐는지처럼 경계가 분명한 경우다. 반대로 매 호출마다 도구가 들락날락하면 LLM이 어떤 도구가 있는지 확신하지 못해 계획을 세우기 어려워진다. 도구가 많아서 줄이고 싶은 거라면 켜고 끄기보다 도구 자체를 합치거나 설명을 다듬는 쪽이 먼저다.

이 블로그 서버의 `suggest_topic`도 생각해 볼 거리다. 시드 주제가 전부 소진된 섹션에서는 후보를 줄 게 없는데, 지금은 호출해야 "다 발행됐다"는 답을 받는다. 소진 시점에 도구 설명을 `update()`로 바꿔 "이 섹션은 자유 주제로 쓰라"고 미리 알리면, LLM이 쓸모없는 호출을 한 번 덜 하게 된다.
