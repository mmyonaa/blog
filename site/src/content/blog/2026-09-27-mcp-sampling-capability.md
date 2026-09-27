---
title: "MCP Sampling — 서버가 클라이언트의 LLM을 빌려 쓰는 법, 그리고 이 서버가 쓰지 않는 이유"
pubDate: 2026-09-27T10:39:58Z
section: "mcp"
tags: ["mcp", "sampling", "typescript-sdk", "capability"]
description: "MCP의 Sampling capability가 서버 대신 클라이언트에게 LLM 호출을 위임하는 구조를 createMessage 요청으로 살펴보고, 승인 절차가 필수인 이유와 \"LLM 호출 없음\"이 원칙인 이 블로그 서버가 왜 이 기능 없이도 충분한지를 정리한다."
---

## 도구가 판단을 못 내릴 때

MCP 도구는 대개 결정론적이다. 입력을 받아 정해진 로직으로 결과를 돌려준다. 그런데 도구 내부에서 "이 두 문장이 같은 주제를 다루는가" 같은 판단이 필요하면 곤란해진다. 서버가 직접 LLM API를 호출할 수도 있지만, 그러려면 서버가 자기 API 키와 비용을 떠안아야 한다.

MCP의 Sampling capability는 이 문제를 반대 방향으로 푼다. 서버가 LLM을 호출하는 대신 클라이언트에게 "네가 물려 있는 모델로 이 메시지를 완성해서 돌려달라"고 요청한다. 비용과 모델 선택권은 클라이언트, 결국 사용자가 쥔다.

## 요청 구조

TypeScript SDK에서는 고수준 McpServer가 감싸고 있는 저수준 Server 인스턴스가 createMessage를 제공한다.

```ts
// mcpServer는 McpServer 인스턴스. mcpServer.server로 저수준 Server에 접근한다.
const result = await mcpServer.server.createMessage({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text:
          '다음 두 제목이 같은 주제면 "same", 다르면 "different"만 답하라.\n' +
          'A: "MCP Roots란 무엇인가"\nB: "작업 경계를 정하는 MCP capability"',
      },
    },
  ],
  systemPrompt: "한 단어로만 답하라.",
  includeContext: "none",
  maxTokens: 10,
});
```

method는 프로토콜상 sampling/createMessage다. includeContext는 none·thisServer·allServers 중 하나로, 클라이언트가 이 서버나 다른 서버들의 리소스를 프롬프트에 섞을지 정한다. 모델 자체는 서버가 고르지 못하고 modelPreferences의 hints·costPriority·speedPriority로 힌트만 줄 수 있다. 최종 선택은 클라이언트 몫이다.

## 승인이 필수인 이유

Sampling은 서버가 클라이언트의 자원을 대신 소비하는 요청이라 클라이언트가 sampling capability를 선언한 경우에만 동작하고, 대부분의 구현은 실행 전에 프롬프트 내용을 사용자에게 보여주고 승인을 받는다. 서버가 몰래 대화 맥락을 끌어다 다른 데 쓰는 것을 막는 장치다.

## 이 서버가 쓰지 않는 이유

이 저장소의 server/는 "LLM 호출 없음"이 원칙이다. Sampling은 서버가 직접 LLM을 호출하는 게 아니라 클라이언트에게 위임하는 구조라 이 원칙과 정면으로 부딪히진 않는다. 그럼에도 suggest_topic은 여전히 순수 필터링 함수로 남아 있다. 이 서버를 호출하는 주체가 애초에 Claude Code라는 LLM 에이전트이기 때문이다.

Sampling이 값어치를 하는 전형적 상황은 호스트가 LLM이 아닌데 도구 실행 중 짧은 판단이 필요할 때다. 반대로 지금처럼 호출자가 이미 대화형 에이전트라면, 서버가 후보를 결정론적으로 추리고 최종 판단은 그 에이전트가 내리는 편이 왕복 하나를 아낀다. capability는 클라이언트마다 지원 여부가 갈리므로, 판단을 서버 밖으로 미루면 호환성도 함께 챙기게 된다.
