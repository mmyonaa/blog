---
title: "MCP 도구가 JSON을 돌려준다 — outputSchema와 structuredContent"
pubDate: 2026-08-28T17:18:43Z
section: "mcp"
tags: ["mcp", "outputSchema", "structuredContent", "typescript-sdk", "zod"]
description: "MCP 도구 결과가 텍스트 content 하나에 갇혀 있던 시절과, outputSchema·structuredContent가 그 결과를 스키마로 검증된 JSON으로 바꾼 방식을 TypeScript SDK 코드로 정리한다."
---

## 텍스트 한 덩어리로 돌아오던 시절

MCP 도구의 결과는 원래 `content` 배열 하나였다. 텍스트든 이미지든 리소스 링크든 전부 `content` 항목으로 담아, 사람이든 그걸 읽는 LLM이든 알아서 해석하도록 던졌다. 도구가 원래 구조화된 데이터 — 예를 들어 `{ "temperature": 22.5, "condition": "cloudy" }` 같은 날씨 조회 결과 — 를 갖고 있어도, 클라이언트에 넘길 땐 이걸 JSON 문자열로 직렬화해 텍스트 블록에 욱여넣는 수밖에 없었다. 받는 쪽(다른 도구, 스크립트, 워크플로 엔진)이 다시 파싱해야 했고, 그 파싱이 항상 성공한다는 보장은 스펙 어디에도 없었다.

MCP 스펙은 이 틈을 `outputSchema`와 `structuredContent`로 메웠다. 도구가 자신이 반환할 JSON의 형태를 스키마로 미리 선언하고, 실행 결과에는 그 스키마를 만족하는 구조화 객체를 함께 실어 보낸다.

## 선언과 반환

TypeScript SDK에서는 `registerTool`에 `inputSchema`와 나란히 `outputSchema`를 붙인다. Zod로 쓰면 입력 스키마와 똑같은 방식으로 다룰 수 있다.

```ts
import { z } from "zod";

server.registerTool(
  "get_weather",
  {
    description: "도시의 현재 날씨를 조회한다",
    inputSchema: { city: z.string() },
    outputSchema: {
      temperature: z.number(),
      condition: z.string(),
    },
  },
  async ({ city }) => {
    const data = await fetchWeather(city);
    return {
      content: [
        { type: "text", text: `${city}: ${data.temperature}도, ${data.condition}` },
      ],
      structuredContent: data,
    };
  },
);
```

포인트는 `structuredContent`를 얹어도 `content`가 사라지지 않는다는 것이다. `content`는 여전히 사람이 읽을 텍스트 요약을 담고, `structuredContent`는 그 옆에 나란히 붙는 기계용 데이터다. `outputSchema`를 선언하지 않은 도구는 예전처럼 `content`만 돌려주면 그만이다 — 하위 호환이 깨지지 않는다.

## 검증은 누구 책임인가

SDK는 서버가 `structuredContent`를 돌려줄 때 그 값을 `outputSchema`로 실제로 검증한다. 스키마와 어긋나는 값을 반환하면 도구 실행 자체가 에러로 처리된다. 즉 `outputSchema`는 문서에 적어두는 힌트가 아니라, 서버가 스스로에게 거는 런타임 계약이다. 클라이언트 쪽도 이 스키마를 도구 목록을 받는 시점에 미리 읽을 수 있다 — 어떤 도구가 숫자 하나를 돌려주는지, 중첩된 객체를 돌려주는지를 호출하기 전에 알 수 있다는 뜻이다.

이 계약은 한쪽 방향으로만 걸리지 않는다. 서버가 스스로 어긴 응답을 걸러내는 동시에, 클라이언트도 그 스키마를 신뢰하고 후처리 코드를 짤 수 있다는 게 핵심이다. `structuredContent.temperature`가 항상 숫자라는 걸 문서가 아니라 스펙이 보장해주면, 그 값을 받는 쪽은 방어적으로 타입을 다시 확인하는 코드를 뺄 수 있다.

## 언제 쓰나

한 번 쓰고 사람이 읽고 끝나는 도구라면 `content`의 텍스트 요약만으로 충분하다. `structuredContent`가 값을 발하는 지점은 도구 결과가 다음 단계의 입력으로 흘러갈 때다 — 여러 도구를 체이닝하는 워크플로, 결과를 다시 파싱해 조건 분기하는 에이전트 로직, 혹은 결과를 그대로 UI 컴포넌트에 바인딩해야 하는 인터랙티브 도구 같은 상황이다. 지금까지 텍스트 파싱에 기대던 자리를 스키마가 보증하는 구조로 바꾸는 것, `outputSchema`가 하는 일은 그게 전부다. 도구가 많아지고 서로를 호출하는 체인이 길어질수록, 파싱 실패라는 흔한 실패 모드 하나를 스펙 차원에서 지워주는 셈이다.

당장 모든 도구에 `outputSchema`를 붙일 필요는 없다. 반환값이 사람이 읽는 한 문장 요약뿐이라면 굳이 스키마를 선언해 유지보수 부담을 늘릴 이유가 없다. 하지만 도구가 다른 도구나 자동화 코드의 입력으로 쓰일 걸 안다면, 처음부터 `outputSchema`를 함께 설계하는 편이 나중에 텍스트를 정규식으로 다시 파싱하는 것보다 훨씬 싸게 먹힌다.
