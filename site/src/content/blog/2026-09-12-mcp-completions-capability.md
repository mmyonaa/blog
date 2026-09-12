---
title: "MCP Completions — 프롬프트 인자가 스스로 후보를 알려주는 법"
pubDate: 2026-09-12T09:30:30Z
section: "mcp"
tags: ["mcp", "completions", "typescript-sdk", "zod"]
description: "MCP 프롬프트·리소스 템플릿 인자에 자동완성 후보를 붙이는 completion/complete 요청을 다룬다. 요청 구조, TypeScript SDK의 completable() 헬퍼로 구현하는 코드, 100개 제한 응답 형식, 그리고 이 기능이 LLM의 도구 호출과는 무관하게 사람이 값을 입력하는 순간만을 위한 장치인 이유를 정리한다."
---

# MCP Completions — 프롬프트 인자가 스스로 후보를 알려주는 법

이 블로그를 발행하는 MCP 서버의 `write_daily_post` 프롬프트에는 `section`이라는 인자가 있다. 값으로 넣을 수 있는 건 `mcp`, `web`, `jeongcheogi`, `boangisa`, `algo`, `security` 여섯 개뿐이지만, 스키마는 그냥 `z.string().optional()`이라 이 목록은 `description` 문자열에 적혀 있을 뿐이다. 클라이언트가 그 설명을 읽지 않고 값을 채우면 오타 하나로 조용히 다른 섹션 글이 나갈 수 있다.

MCP는 이 문제를 위해 별도의 요청 하나를 프로토콜 레벨에 두고 있다. `completion/complete`다. 클라이언트가 사용자가 입력 중인 값을 서버에 보내면, 서버가 그 값에 맞는 후보 목록을 돌려준다. 셸의 탭 완성과 같은 자리다.

## 요청 구조

`completion/complete` 요청은 세 가지를 담는다: 어떤 프롬프트(또는 리소스)의, 어떤 인자에 대해, 지금까지 입력된 값이 무엇인지.

```text
{
  "method": "completion/complete",
  "params": {
    "ref": { "type": "ref/prompt", "name": "write_daily_post" },
    "argument": { "name": "section", "value": "m" },
    "context": { "arguments": { "topic": "" } }
  }
}
```

`ref`는 두 종류다. 프롬프트 인자를 완성할 때는 `ref/prompt` + 프롬프트 이름, 리소스 템플릿의 URI 변수를 완성할 때는 `ref/resource` + URI를 쓴다(예: `blog://posts/{slug}`의 `slug` 부분). `context.arguments`는 사용자가 이미 채운 다른 인자들이다. 서버는 이 값을 보고 후보를 좁힐 수 있다 — 가령 `section`이 이미 `security`로 정해졌다면 `topic` 후보를 보안 주제로만 추릴 수 있다.

## 서버 쪽 구현

TypeScript SDK는 Zod 스키마를 감싸는 `completable()` 헬퍼를 제공한다. `registerPrompt`의 `argsSchema`에서 문자열 필드를 이걸로 감싸면 된다.

```typescript
import { completable } from "@modelcontextprotocol/sdk/server/completable.js";
import { z } from "zod";

const SECTION_IDS = ["mcp", "web", "jeongcheogi", "boangisa", "algo", "security"];

server.registerPrompt(
  "write_daily_post",
  {
    argsSchema: {
      section: completable(z.string().optional(), (value) =>
        SECTION_IDS.filter((id) => id.startsWith(value ?? "")),
      ),
    },
  },
  (args) => ({ messages: [/* ... */] }),
);
```

`completable`의 두 번째 인자는 `(입력값, context?) => string[]` 형태의 콜백이다. SDK가 이 콜백을 `completion/complete` 요청과 연결해주므로, 별도로 요청 핸들러를 등록할 필요가 없다. 서버가 이 기능을 쓰려면 초기화 시점에 `completions` capability도 선언되어 있어야 한다 — `completable`을 하나라도 쓰는 프롬프트나 리소스를 등록하면 SDK가 이 선언을 챙겨준다.

응답은 `values` 배열과 함께 `total`, `hasMore`를 담을 수 있다. `values`는 한 번에 최대 100개까지만 담기게 되어 있어서, 후보가 그보다 많으면 앞부분만 보내고 `hasMore: true`로 "더 있다"는 걸 알린다.

## 어디까지 쓰이나

Completions는 사람이 인자를 입력하는 UI를 가진 클라이언트에서 의미가 있다. 이전 글에서 다뤘듯 Prompts 자체가 모델이 아니라 사용자가 직접 골라 실행하는 primitive이기 때문에, 자동완성이 붙는 자리도 자연스럽게 여기다. 반대로 LLM이 도구(Tool)를 호출할 때 인자를 채우는 경로는 이 요청을 타지 않는다 — 모델은 스키마와 description을 보고 스스로 값을 정하지, 입력 도중 서버에 후보를 물어보지 않는다. 즉 completions는 "사람이 편집기에서 값을 고르는 순간"을 도와주는 장치이지, 모델의 도구 호출 정확도를 높이는 장치는 아니다. 이 구분을 헷갈리면 Tool 인자에 completable을 붙이고 왜 동작이 안 보이는지 헤매게 된다.

또한 이 기능이 실제로 어떻게 보이는지는 전적으로 클라이언트에 달려 있다. 서버는 후보 목록만 돌려줄 뿐, 그걸 드롭다운으로 그릴지 인라인 힌트로 보여줄지는 클라이언트 UI의 몫이고 지원 여부도 클라이언트마다 다르다. Tools·Resources·Prompts 세 primitive처럼 서버가 "무엇을 할 수 있는지"를 정의하는 층과, 그것을 사람에게 어떻게 보여줄지 정하는 층이 MCP에서는 항상 분리되어 있다는 점을 completions도 그대로 따른다.
