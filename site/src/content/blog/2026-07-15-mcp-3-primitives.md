---
title: "MCP의 3대 primitive — Tools, Resources, Prompts"
pubDate: 2026-07-15T03:48:33Z
tags: ["mcp", "개념"]
topicId: "three-primitives"
description: "MCP 서버가 LLM에게 노출하는 세 가지 기본 요소 Tools·Resources·Prompts를 각각 언제 쓰는지 구분한다."
---

지난 글에서 MCP가 LLM과 외부 세계를 잇는 프로토콜이라고 했다. 그렇다면 서버는 무엇을 노출할 수 있을까? MCP는 딱 세 가지 종류의 요소(primitive)를 정의한다. 이 셋을 구분하지 못하면 서버 설계가 금방 엉킨다.

## Tools — 모델이 실행하는 동작

Tool은 LLM이 직접 호출하는 함수다. 부수 효과(파일 쓰기, API 호출, 메일 발송)를 가질 수 있고, 호출 여부는 모델이 판단한다. 입력 스키마를 함께 선언한다.

```ts
server.tool("publish_post", { title: z.string(), body: z.string() },
  async ({ title, body }) => {
    await writeFile(title, body);
    return { content: [{ type: "text", text: "발행 완료" }] };
  });
```

핵심은 "모델이 능동적으로 부른다"는 점이다.

## Resources — 모델이 읽는 데이터

Resource는 읽기 전용 데이터다. `blog://posts` 같은 URI로 식별하고, 부수 효과가 없다. 파일 내용, DB 조회 결과, 문서처럼 "컨텍스트로 넣고 싶은 것"이 여기 해당한다. Tool과 달리 동작이 아니라 상태를 노출한다.

## Prompts — 사람이 고르는 템플릿

Prompt는 미리 짜둔 대화 템플릿이다. 보통 사용자가 슬래시 명령 등으로 명시적으로 선택해 실행한다. "오늘의 글을 써라" 같은 정형화된 작업 절차를 담기 좋다.

## 어떻게 나눌까

- 부수 효과가 있고 모델이 판단해 부른다 → **Tool**
- 읽기만 하고 컨텍스트로 쓰인다 → **Resource**
- 사람이 고르는 정해진 절차다 → **Prompt**

이 경계를 지키면 "읽기인데 Tool로 만들어" 모델이 남용하는 실수를 줄일 수 있다.
