---
title: "MCP Elicitation — 도구 실행 중 서버가 사람에게 되묻는 법"
pubDate: 2026-08-20T05:40:31Z
section: "mcp"
tags: ["mcp", "elicitation", "json-schema", "sampling"]
description: "MCP 도구가 실행 중에 사람에게 구조화된 입력을 되묻는 Elicitation을 다룬다. elicitation/create 요청의 message·requestedSchema 구조, 평평한 스키마 제약의 이유, accept·decline·cancel 세 응답 갈래, 그리고 Sampling과의 차이를 정리한다."
---

## 도구가 실행 중에 멈춰서 되물어야 할 때

MCP 도구는 보통 인자를 받아 한 번에 실행되고 결과를 돌려준다. 그런데 실행 도중에 사람에게 되물어야 하는 상황이 있다. 삭제 대상이 여러 개라 하나를 고르게 해야 하거나, 필수 값이 비어 있어 채워 넣게 해야 하는 경우다. Tools·Resources·Prompts 세 primitive는 이런 "실행 중 대화"를 다루지 못한다. Sampling도 답이 아니다 — Sampling은 서버가 LLM에게 완성을 요청하는 것이지, 사람에게 직접 묻는 것이 아니다.

MCP 스펙은 이 빈칸을 Elicitation으로 채운다. 서버가 도구 처리 중에 클라이언트에게 `elicitation/create` 요청을 보내 사람의 입력을 구조화된 형태로 받아오는 흐름이다.

## 동작 방식

Elicitation은 서버가 주도하는 요청이라, 클라이언트가 이걸 처리할 수 있다는 걸 먼저 밝혀야 한다. 초기화 단계에서 클라이언트가 elicitation capability를 광고하고, 서버는 그걸 확인한 뒤에만 이 요청을 보낼 수 있다.

요청 파라미터는 두 가지다.

- `message`: 사람에게 보여줄 질문 문구
- `requestedSchema`: 받고 싶은 답의 모양을 정의한 JSON Schema

여기서 중요한 제약이 하나 있다. `requestedSchema`는 중첩 객체나 배열을 허용하지 않고, 문자열·숫자·불리언·enum 같은 원시 타입 필드로만 이루어진 평평한 객체여야 한다. 클라이언트가 이 스키마를 보고 자동으로 폼 UI를 그릴 수 있어야 하기 때문이다. 임의로 복잡한 구조를 허용하면 클라이언트마다 렌더링이 갈리고, 서버가 사람이 눈치채기 어려운 필드를 몰래 끼워 넣기도 쉬워진다.

```json
// 서버 -> 클라이언트 요청
{
  "method": "elicitation/create",
  "params": {
    "message": "삭제할 브랜치를 선택하세요",
    "requestedSchema": {
      "type": "object",
      "properties": {
        "branch": { "type": "string", "enum": ["feature/a", "feature/b"] },
        "force": { "type": "boolean" }
      },
      "required": ["branch"]
    }
  }
}
```

## 응답은 accept·decline·cancel 세 갈래

사람은 이 요청에 세 가지 방식으로 반응할 수 있다. 값을 채우고 확인하면 `accept`, 명시적으로 거부하면 `decline`, 그냥 창을 닫아버리면 `cancel`이다. `content` 필드는 `accept`일 때만 채워진다.

```json
// 클라이언트 -> 서버 응답 (accept)
{
  "result": {
    "action": "accept",
    "content": { "branch": "feature/a", "force": false }
  }
}
```

이 세 갈래 구분이 실용적인 이유는, 서버 쪽 후속 처리가 달라야 하기 때문이다. `decline`은 사람이 의도를 갖고 거절한 것이니 그 도구 흐름을 종료하면 되지만, `cancel`은 판단을 유보한 것에 가까워 나중에 다시 물어볼 여지를 남겨야 할 수도 있다.

## Sampling과 나란히 놓고 보면

Sampling과 Elicitation은 둘 다 "서버가 클라이언트에게 되묻는" 역방향 흐름이라는 점에서 닮았지만, 묻는 대상이 다르다. Sampling은 LLM에게 자연어 완성을 요청해 판단이나 텍스트 생성을 빌리고, Elicitation은 사람에게 정해진 스키마의 답을 요청해 확인이나 선택을 받는다. 하나는 지능을 빌리는 통로, 다른 하나는 사람의 동의를 구하는 통로다.

이 구분 덕분에 도구를 설계할 때 "이 결정은 모델이 대신 내려도 되는가, 사람의 승인이 필요한가"라는 질문에 답이 명확해진다. 파일 삭제나 배포처럼 되돌리기 어려운 동작일수록 Sampling이 아니라 Elicitation으로 사람을 끌어들이는 편이 안전하다.
