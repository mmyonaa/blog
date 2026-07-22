---
title: "TypeScript로 첫 stdio MCP 서버 만들기"
pubDate: 2026-07-16T11:15:00Z
section: "mcp"
tags: ["mcp", "typescript", "stdio"]
area: "B"
topicId: "first-stdio-server-ts"
description: "도구 하나를 가진 가장 작은 MCP 서버를 TypeScript로 처음부터 만든다. 패키지 준비부터 Claude Code에 붙여 굴리기까지 단계별로 따라간다."
---

서버가 무엇을 노출하는지 개념으로 익혔다면, 이제 가장 작은 MCP 서버를 직접 만들 차례다. 목표는 소박하다. 도구(tool) 하나를 가진 stdio 서버를 TypeScript로 처음부터 끝까지 만든다. 이 글을 따라가면 Claude Code에 붙여 대화로 굴릴 수 있는 서버가 손에 남는다.

## 프로젝트 준비

먼저 패키지를 깐다. MCP 공식 SDK와, 도구 입력을 검증할 zod가 필요하다.

```bash
npm init -y
npm i @modelcontextprotocol/sdk zod
npm i -D typescript @types/node tsx
```

`package.json`에 `"type": "module"`을 넣는다. MCP SDK는 ES Module이라 이게 없으면 import부터 막힌다.

```json
{
  "type": "module",
  "scripts": { "dev": "tsx watch src/index.ts" }
}
```

## 서버와 도구 정의

핵심은 `McpServer` 인스턴스를 만들고 거기에 도구를 등록하는 것이다. 도구는 이름, 설명, 입력 스키마, 그리고 실제로 동작하는 핸들러로 이뤄진다.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function createServer() {
  const server = new McpServer({ name: "hello-mcp", version: "0.0.0" });

  server.registerTool(
    "add",
    {
      title: "두 수 더하기",
      description: "정수 두 개를 받아 합을 돌려준다.",
      inputSchema: { a: z.number(), b: z.number() },
    },
    async ({ a, b }) => ({
      content: [{ type: "text", text: String(a + b) }],
    }),
  );

  return server;
}
```

`description`은 사람이 아니라 모델이 읽는다. 모델은 이 문장을 보고 도구를 부를지 판단하니, 무엇을 하는 도구인지 분명히 적어야 한다. `inputSchema`를 zod로 선언하면 런타임 검증과 타입이 한 번에 따라온다.

## stdio로 연결하기

서버 객체만으로는 아무 일도 안 일어난다. transport에 연결해야 클라이언트와 대화를 시작한다. 로컬에서 쓸 도구라면 stdio가 가장 쉽다.

```ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[hello-mcp] 서버 시작"); // 로그는 반드시 stderr로
```

여기서 규칙 하나만 지키면 된다. stdout은 JSON-RPC 통신 전용이므로, 사람이 볼 로그는 `console.error`로 stderr에 보낸다. `console.log`를 쓰면 프로토콜 스트림이 오염돼 연결이 깨진다.

## 빌드하고 Claude Code에 붙이기

TypeScript를 컴파일한 뒤, 빌드된 진입점을 Claude Code에 등록한다.

```bash
npx tsc
claude mcp add hello-mcp -- node dist/index.js
```

이제 대화창에서 "3하고 5 더해줘"라고 하면, 모델이 `add` 도구를 골라 호출하고 8을 돌려준다. 서버는 LLM을 부르지 않는다. 그냥 함수를 실행할 뿐이고, 언제 부를지는 모델이 정한다. 이 작은 서버 하나에 MCP의 핵심 흐름이 다 들어 있다. 도구를 더 얹고 싶으면 `registerTool`을 반복하면 되고, 읽기용 데이터가 필요하면 resource를, 반복되는 절차가 있으면 prompt를 같은 방식으로 등록하면 된다. 처음 한 개를 붙여본 순간부터, 나머지는 전부 이 패턴의 변주다.
