---
title: "MCP와 function calling은 뭐가 다른가 — 표현 형식과 공급 규격"
pubDate: 2026-07-31T02:53:12Z
section: "mcp"
tags: ["mcp", "function-calling", "llm", "개념"]
area: "C"
topicId: "mcp-vs-function-calling"
follows: "2026-07-20-mcp-vs-agent-vs-orchestrator"
related: ["2026-07-15-what-is-mcp", "2026-07-26-tool-description-design"]
description: "MCP와 function calling은 경쟁 관계가 아니라 다른 층에 있다. function calling은 모델이 도구 호출 의사를 표현하는 출력 형식이고, MCP는 그 형식에 흘려 넣을 도구를 조달하는 공급 규격이다. 두 층이 한 번의 도구 호출에서 어떻게 맞물리는지 실제 요청 형태로 구분한다."
---

LLM에게 도구를 쥐여주는 이야기에는 두 이름이 항상 같이 나온다. function calling과 MCP. 둘 다 "모델이 외부 함수를 쓴다"는 그림을 설명하는 말이라 처음엔 같은 것의 다른 이름처럼 보인다. 하지만 둘은 경쟁 관계가 아니라 아예 다른 층에 있다. function calling은 **모델이 도구를 부르겠다는 의사를 표현하는 출력 형식**이고, MCP는 **그 도구를 어디서 어떻게 공급받을지 정한 통신 규격**이다.

## function calling — 모델의 출력 형식

function calling은 모델 API의 기능이다. 요청에 도구 목록(이름·설명·입력 스키마)을 실어 보내면, 모델은 일반 텍스트 대신 "이 도구를 이 인자로 호출해 달라"는 구조화된 출력을 돌려준다. Anthropic Messages API 기준으로 요청은 이런 모양이다.

```json
{
  "model": "claude-sonnet-5",
  "max_tokens": 1024,
  "tools": [
    {
      "name": "get_weather",
      "description": "도시 이름을 받아 현재 날씨를 돌려준다",
      "input_schema": {
        "type": "object",
        "properties": { "city": { "type": "string" } },
        "required": ["city"]
      }
    }
  ],
  "messages": [{ "role": "user", "content": "서울 날씨 알려줘" }]
}
```

모델의 응답에는 `{"name": "get_weather", "input": {"city": "서울"}}` 같은 tool_use 블록이 담겨 온다. 여기서 핵심은 **모델이 함수를 실제로 실행하지 않는다**는 점이다. 모델은 호출 의사를 JSON으로 표현할 뿐이고, 진짜 함수를 실행해 결과를 다음 요청에 넣어주는 루프는 API를 호출한 쪽 코드의 몫이다.

## MCP — 도구의 공급 규격

function calling만으로도 도구는 쓸 수 있다. 문제는 공급이다. 위 요청의 `tools` 배열을 애플리케이션마다 직접 짜 넣어야 하고, 도구를 하나 추가하려면 그 도구를 쓰는 앱 코드를 전부 고쳐야 한다. 도구 구현과 그것을 쓰는 앱이 한 몸으로 붙어버린다.

MCP는 이 공급 문제를 표준화한다. 도구를 가진 쪽이 MCP 서버가 되어 도구 목록을 노출하고, Claude Code 같은 MCP 클라이언트가 서버에 접속해 `tools/list`로 목록을 받아온다. 실행도 클라이언트가 `tools/call`로 서버에 위임한다. 서버 하나를 만들어 두면 MCP를 지원하는 어떤 클라이언트에도 코드 수정 없이 꽂을 수 있다 — 도구가 앱에서 분리되어 독립적으로 배포되는 것이다.

## 한 번의 도구 호출에서 둘이 맞물리는 순서

두 층은 실제 호출 한 번에서 이렇게 이어진다.

1. MCP 클라이언트가 서버에서 `tools/list`로 도구 목록을 수집한다.
2. 클라이언트는 그 목록을 function calling의 `tools` 배열 형식으로 변환해 모델에 보낸다.
3. 모델이 tool_use 출력으로 호출 의사를 표현한다.
4. 클라이언트는 그 호출을 해당 MCP 서버의 `tools/call`로 넘겨 실행한다.
5. 결과를 다시 모델에게 넣어 대화를 잇는다.

즉 MCP 서버가 내놓은 도구도 모델 앞에서는 결국 function calling 형식으로 전달된다. MCP는 function calling을 대체하는 게 아니라 그 앞단, 도구가 모델에 도착하기까지의 구간을 담당한다.

| | function calling | MCP |
|---|---|---|
| 정체 | 모델 API의 기능 | 독립된 프로토콜 |
| 정하는 것 | 호출 의사의 표현 형식 | 도구의 발견·호출 규격 |
| 실행 주체 | API를 호출한 앱 코드 | MCP 서버 |
| 표준 범위 | 벤더마다 형식이 다름 | 클라이언트·서버 공통 표준 |

## 구분이 실무에서 갈리는 지점

이 구분이 서면 흔한 혼동이 정리된다. "MCP를 쓰면 function calling이 필요 없나?"라는 질문은 층을 섞은 것이다 — MCP로 조달한 도구도 모델과는 function calling으로 대화한다. 반대로 "function calling이 되는데 MCP가 왜 필요하냐"는 질문의 답은 재사용이다. 도구를 앱 코드에 직접 박으면 그 앱 전용이 되지만, MCP 서버로 만들면 여러 클라이언트가 같은 도구를 나눠 쓴다. 하나는 모델과 대화하는 형식이고, 하나는 그 대화에 흘려 넣을 도구를 조달하는 방법이다. 층이 다르니 둘은 언제나 함께 쓰인다.
