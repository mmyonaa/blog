---
title: "MCP Prompts — 서버가 미리 만든 프롬프트를 내려주는 세 번째 primitive"
pubDate: 2026-09-07T10:38:54Z
section: "mcp"
tags: ["mcp", "prompts", "typescript-sdk", "zod"]
description: "MCP의 세 primitive 중 Tool과 Resource는 이미 다뤘다. 마지막 남은 Prompts는 모델도 애플리케이션도 아닌 사용자가 직접 골라 실행한다는 점에서 통제 주체가 다르다. 이 블로그를 발행하는 MCP 서버의 write_daily_post 프롬프트 등록 코드로 구조와, 프롬프트 인자가 항상 문자열인 이유를 정리한다."
---

# MCP Prompts — 서버가 미리 만든 프롬프트를 내려주는 세 번째 primitive

MCP에는 세 가지 primitive가 있다. Tool은 모델이 스스로 판단해 호출하고, Resource는 클라이언트 애플리케이션이 맥락으로 붙여 넣는다. 그리고 Prompts는 셋 중 유일하게 사람(또는 클라이언트 UI)이 명시적으로 골라서 실행하는 것이다. 슬래시 커맨드처럼, "이 작업을 하고 싶다"는 의도를 사용자가 직접 트리거한다는 점에서 나머지 둘과 통제 주체가 다르다.

## 코드로 보면: 텍스트를 만드는 함수

Prompt는 실행되는 로직이 아니라 "메시지 목록을 만들어 돌려주는" 핸들러다. 이 블로그를 발행하는 MCP 서버의 `write_daily_post` 프롬프트를 단순화하면 이렇다.

```typescript
server.registerPrompt(
  "write_daily_post",
  {
    title: "오늘의 블로그 글 쓰기",
    description: "지난 글을 참고해 겹치지 않는 주제로 글을 쓰고 발행하는 워크플로 지침.",
    argsSchema: {
      section: z.string().optional().describe("어느 섹션의 글인가"),
      depth: z.enum(["quick", "standard", "deep"]).optional(),
    },
  },
  ({ section, depth }) => ({
    messages: [
      {
        role: "user",
        content: { type: "text", text: buildInstructionText(section, depth) },
      },
    ],
  }),
);
```

핸들러는 아무 부작용도 일으키지 않는다. `section`과 `depth` 인자를 받아 긴 지침 문자열을 조립하고, 그걸 `role: "user"`인 메시지 하나로 감싸 돌려줄 뿐이다. 클라이언트는 이 메시지를 대화 맥락에 그대로 끼워 넣고, 그 뒤 모델이 지침을 읽고 Resource와 Tool을 순서대로 호출하며 실제 작업을 진행한다. 즉 Prompt 자체는 일을 하지 않고, 일을 어떻게 하라는 "완성된 지시문"을 표준화된 방식으로 배포하는 역할만 한다.

## 인자는 항상 문자열이다

여기서 눈여겨볼 점 하나. MCP 스펙에서 프롬프트 인자(PromptArgument)는 이름과 설명, 필수 여부만 가질 뿐 타입 필드가 없다 — Tool의 inputSchema처럼 JSON Schema로 숫자·불리언을 표현하는 것과 다르게, 프롬프트를 호출하는 prompts/get 요청의 arguments는 항상 문자열 맵으로 온다. 위 예제에서 depth를 z.enum([...])로 받은 게 자연스러운 이유다. 문자열 값이 그대로 들어오니 검증이 맞아떨어진다. 반대로 인자를 숫자나 불리언으로 다루고 싶다면 문자열을 받은 뒤 서버 코드에서 직접 변환해야 한다.

## Tool·Resource와 나란히 놓고 보면

셋의 차이는 "누가 트리거를 당기는가"로 정리된다. 모델이 자율적으로 판단해 부르면 Tool, 클라이언트가 맥락으로 조용히 붙이면 Resource, 사람이 메뉴에서 골라 명시적으로 시작하면 Prompt다. Tool은 model-controlled로 부작용이 있을 수 있고, Resource는 application-controlled로 읽기 전용 데이터 첨부, Prompt는 user-controlled로 부작용 없는 텍스트 생성이라는 점에서 갈린다.

## 언제 쓰나

반복되는 워크플로 지시문을 코드베이스마다 새로 타이핑하지 않아도 되는 게 Prompt의 실질적인 이득이다. "이 리포의 커밋 메시지 규칙에 맞춰 커밋해줘", "이 프로젝트의 코드 리뷰 체크리스트로 리뷰해줘" 같은, 팀 안에서 매번 똑같이 반복하는 긴 지침을 서버 하나가 표준화해 여러 클라이언트에 똑같이 내려줄 수 있다. 클라이언트 쪽 UI에서 프롬프트 목록을 슬래시 커맨드처럼 노출해주면, 사용자는 매번 지침을 다시 쓰는 대신 이름 하나만 고르면 된다.
