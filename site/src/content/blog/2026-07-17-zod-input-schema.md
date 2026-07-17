---
title: "zod로 MCP 도구 입력 스키마 정의하기"
pubDate: 2026-07-17T06:05:59Z
section: "mcp"
tags: ["mcp", "zod", "typescript"]
topicId: "zod-input-schema"
description: "MCP 도구는 LLM이 채워 보내는 인자를 받는다. zod로 입력 스키마를 선언하면 JSON Schema 생성·런타임 검증·타입 추론을 한 번에 얻는다. 왜 필요한지와 실제 정의 방법을 정리한다."
---

MCP 도구는 LLM이 부르는 함수다. 그런데 인자를 채우는 쪽이 사람이 아니라 모델이다. 모델은 그럴듯하게 틀린 값을 보내기도 한다. 숫자 자리에 문자열을 넣거나, 필수 필드를 빼먹거나, 있지도 않은 키를 덧붙인다. 그래서 도구는 "어떤 인자를 받는지"를 **기계가 읽을 수 있는 형식**으로 선언해야 한다. 그게 입력 스키마다.

## 스키마는 두 곳에서 쓰인다

입력 스키마는 한 번 정의해서 두 가지 일을 한다.

1. **LLM에게 알려주기**: 도구 목록을 받을 때, 클라이언트는 각 도구의 입력 형식을 JSON Schema로 본다. 모델은 이걸 보고 인자를 채운다.
2. **서버에서 검증하기**: 모델이 보낸 인자를 실제로 실행하기 전에, 형식이 맞는지 확인한다.

이 둘을 손으로 각각 관리하면 반드시 어긋난다. JSON Schema를 직접 쓰고, 검증 코드도 따로 쓰고, TypeScript 타입도 또 따로 선언하면 세 벌이 서로 안 맞는 순간이 온다. zod는 이 셋을 한 선언에서 뽑아낸다.

## zod로 한 번에 선언하기

zod는 런타임 스키마 라이브러리다. 스키마를 값으로 정의하면 검증도 되고, 거기서 TypeScript 타입도 추론된다.

```ts
import { z } from "zod";

const CreateEventInput = z.object({
  title: z.string().min(1).describe("일정 제목"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
  attendees: z.array(z.string().email()).default([]),
  allDay: z.boolean().optional(),
});

// 스키마에서 타입이 따라 나온다
type CreateEventInput = z.infer<typeof CreateEventInput>;
```

`.describe()`로 붙인 설명은 그냥 주석이 아니다. JSON Schema의 `description`으로 나가서 **모델이 각 필드의 의미를 이해하는 근거**가 된다. 필드 설명을 잘 써두면 모델이 인자를 훨씬 정확하게 채운다.

## MCP SDK에 연결하기

TypeScript MCP SDK는 zod 스키마를 그대로 받는다. `registerTool`에 `inputSchema`로 zod의 shape을 넘기면, SDK가 JSON Schema 변환과 검증을 대신 해준다. 핸들러에는 이미 검증·타입 추론이 끝난 인자가 들어온다.

```ts
server.registerTool(
  "create_event",
  {
    title: "일정 생성",
    description: "캘린더에 일정을 추가한다",
    inputSchema: CreateEventInput.shape,
  },
  async ({ title, date, attendees }) => {
    // title, date, attendees 는 이미 검증된 값
    await calendar.add({ title, date, attendees });
    return { content: [{ type: "text", text: `추가됨: ${title}` }] };
  }
);
```

핸들러 안에서 `title`이 빈 문자열일까 걱정하지 않아도 된다. `.min(1)`을 통과하지 못한 호출은 여기까지 오지 못하고 클라이언트로 검증 에러가 돌아간다.

## 몇 가지 실전 감각

- **필수와 선택을 분명히 하라.** `.optional()`이 없으면 필수 필드다. 모델은 필수라고 표시된 값은 어떻게든 채우려 하니, 정말 없어도 되는 건 optional로 두거나 `.default()`를 준다.
- **enum으로 선택지를 좁혀라.** `z.enum(["low", "high"])`처럼 값의 범위를 못박으면 모델이 엉뚱한 문자열을 만들 여지가 사라진다.
- **설명은 모델을 위한 것이다.** 사람이 읽는 문서가 아니라 모델이 읽는 명세라고 생각하고 쓴다. "날짜"보다 "YYYY-MM-DD 형식의 날짜"가 낫다.

입력 스키마는 도구의 계약서다. 계약이 느슨하면 모델이 그 틈으로 이상한 값을 밀어넣고, 검증이 없으면 그게 그대로 실행된다. zod 한 선언으로 명세·검증·타입을 묶어두면, 그 틈이 처음부터 생기지 않는다.
