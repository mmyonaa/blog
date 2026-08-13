---
title: "MCP Sampling — 서버가 자기 LLM 없이 지능을 빌리는 법"
pubDate: 2026-08-13T06:25:13Z
section: "mcp"
tags: ["mcp", "sampling", "llm", "typescript"]
description: "MCP의 세 primitive(Tools, Resources, Prompts)는 클라이언트가 서버에게 요청하는 방향이지만, Sampling은 그 반대다 — 서버가 클라이언트에게 LLM 완성을 요청한다. 서버가 API 키 없이도 지능을 빌리는 이 흐름의 동작 방식과, 이 블로그의 무인 발행 파이프라인이 대신 헤드리스 호출을 택한 이유를 코드로 정리한다."
---

## 도구 호출의 반대 방향

이 블로그에서는 MCP의 세 primitive인 Tools, Resources, Prompts를 다뤘다. 셋 다 방향이 같다 — 클라이언트가 서버에게 "도구를 실행해줘", "리소스를 읽게 해줘", "프롬프트 템플릿을 줘"라고 요청한다. 그런데 스펙에는 이 흐름을 뒤집는 기능이 하나 더 있다. Sampling이다. 서버가 클라이언트에게 "이 메시지들로 LLM 완성을 하나 만들어줘"라고 요청하는, 역방향 흐름이다.

이 프로젝트의 `server/`는 CLAUDE.md에 "LLM 호출 없음, 무료 원칙"이라고 못박아 뒀다. 서버 코드 어디에도 Anthropic API 키가 없다. 그런데도 서버가 등록한 도구는 결국 (Claude Code 같은 클라이언트를 거쳐) LLM이 쓴 글을 만들어낸다. Sampling은 이 간극을 메우도록 스펙이 마련해 둔 공식 경로다 — 서버가 자기 API 키 없이도, 지능이 필요한 작업을 연결된 클라이언트에게 위임할 수 있게 한다.

## 동작 방식

서버가 `sampling/createMessage` 요청을 보내면, 클라이언트는 그 요청을 곧바로 모델에 넘기지 않는다. 스펙은 사용자가 요청 내용과 결과를 검토·수정·거부할 수 있는 human-in-the-loop 단계를 요구한다. 승인되면 클라이언트가 자신이 붙들고 있는 모델(Claude Code라면 Claude)로 완성을 생성해 서버에 돌려준다. 서버 입장에서는 함수를 하나 호출한 것과 다르지 않지만, 그 안에는 사람의 승인이라는 문이 하나 끼어 있는 셈이다.

TypeScript SDK에서 `McpServer`는 저수준 `Server` 인스턴스를 `server.server`로 노출한다. Sampling 요청은 이 저수준 인스턴스의 `createMessage`로 보낸다.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerSummarizeTool(server: McpServer): void {
  server.registerTool(
    "summarize_with_client_model",
    {
      title: "클라이언트 모델로 요약",
      description: "연결된 클라이언트의 LLM에게 텍스트 요약을 위임한다.",
      inputSchema: { text: z.string().min(1) },
    },
    async ({ text }) => {
      const caps = server.server.getClientCapabilities();
      if (!caps?.sampling) {
        return {
          content: [{ type: "text", text: "연결된 클라이언트가 sampling을 지원하지 않습니다." }],
          isError: true,
        };
      }

      const result = await server.server.createMessage({
        messages: [
          { role: "user", content: { type: "text", text: `다음을 한 문장으로 요약해줘:\n\n${text}` } },
        ],
        maxTokens: 200,
      });

      if (result.content.type !== "text") {
        return { content: [{ type: "text", text: "텍스트가 아닌 응답을 받았습니다." }], isError: true };
      }
      return { content: [{ type: "text", text: result.content.text }] };
    },
  );
}
```

`getClientCapabilities()`로 클라이언트가 sampling을 선언했는지부터 확인해야 한다. 이 기능을 지원하는지는 클라이언트 구현에 달려 있어서, 붙는 클라이언트마다 다를 수 있다.

## 이 프로젝트가 안 쓰는 이유

Sampling을 쓰면 서버는 API 키 없이도 요약·판단 같은 작업을 할 수 있지만, 그 대가로 매 요청마다 사람의 승인 대기가 끼어든다. 매일 새벽 사람 없이 도는 이 블로그의 자동 발행 파이프라인에는 맞지 않는 모델이다 — 그래서 오케스트레이터는 `claude -p` 헤드리스 호출로 이 승인 단계를 아예 건너뛰는 쪽을 택했다. 반대로 대화형 세션처럼 사용자가 곁에 붙어 있는 상황이라면, 서버가 별도 API 키 없이 클라이언트의 모델을 빌려 쓰는 Sampling이 오히려 더 깔끔한 선택이 된다. 같은 문제(서버에 지능을 어떻게 공급할 것인가)를 무인 실행과 대화형 실행이라는 다른 조건에서 각자 다르게 푼 셈이다.
