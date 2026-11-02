---
title: "MCP 서버 핸들러를 테스트로 묶어 두기"
pubDate: 2026-11-02T13:40:52Z
section: "mcp"
tags: ["mcp", "테스트", "node:test", "typescript-sdk"]
area: "A"
topicId: "mcp-server-unit-testing"
follows: "2026-09-02-mcp-resource-vs-tool"
description: "MCP 도구 핸들러를 등록 코드에서 분리해 클라이언트 없이 단위 테스트하는 방법을 Node 내장 테스트 러너 예제로 정리한다."
---

MCP 서버를 고칠 때마다 클라이언트를 띄워 도구를 손으로 호출해 보는 방식은 금방 한계에 부딪힌다. 도구가 다섯 개만 넘어가도 어떤 입력에서 무엇이 깨졌는지 기억에 의존하게 된다. 핸들러를 테스트로 묶어 두면 이 확인을 명령 한 줄로 줄일 수 있다.

## 핵심은 핸들러와 등록의 분리

테스트하기 어려운 구조는 대개 `server.tool(...)` 호출 안에 로직이 인라인으로 들어 있는 형태다. 로직을 순수 함수로 빼고, 등록 코드는 그 함수를 연결만 하게 만든다.

```js
// handlers.mjs
export function slugify(title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    return {
      isError: true,
      content: [{ type: "text", text: "영문/숫자가 없어 슬러그를 만들 수 없다" }],
    };
  }
  return { content: [{ type: "text", text: slug }] };
}
```

MCP 도구의 결과는 `content` 배열과, 실패를 알리는 `isError` 플래그로 이루어진다. 핸들러가 이 형태를 그대로 반환하면 테스트에서 SDK 없이도 응답 구조를 검증할 수 있다. 서버 쪽 등록은 이 함수를 import해 입력 스키마와 함께 연결하면 끝이다.

## Node 내장 테스트 러너로 검증

별도 프레임워크 없이 `node:test`만으로 충분하다.

```js
// handlers.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { slugify } from "./handlers.mjs";

test("정상 입력은 kebab-case 슬러그를 돌려준다", () => {
  const res = slugify("Hello MCP World!");
  assert.equal(res.isError, undefined);
  assert.equal(res.content[0].text, "hello-mcp-world");
});

test("변환할 문자가 없으면 isError로 응답한다", () => {
  const res = slugify("한글만");
  assert.equal(res.isError, true);
});
```

`node --test`로 실행한다. 두 번째 테스트처럼 실패 경로를 명시적으로 고정해 두는 것이 중요하다. 도구가 예외를 던지는 것과 `isError: true`로 응답하는 것은 클라이언트와 모델에게 전혀 다르게 보이기 때문이다. 모델이 오류 내용을 읽고 스스로 재시도할 수 있게 하려면 후자가 적합한 경우가 많고, 그 계약을 테스트가 지켜 준다.

## 무엇을 테스트하고 무엇을 남길까

단위 테스트가 잡아 주는 것은 핸들러 로직, 경계 입력, 오류 응답 형태다. 반면 도구 이름 등록, 입력 스키마, 전송 계층 연결은 핸들러만으로는 검증되지 않는다. 이 부분은 두 가지로 보완할 수 있다.

- 스키마(zod 등)는 핸들러와 별개로 `parse`에 잘못된 입력을 넣어 거부되는지 테스트한다.
- 등록과 전송까지 포함한 통합 확인은 MCP Inspector나 SDK가 제공하는 클라이언트로 실제 서버 프로세스를 띄워 소수의 스모크 테스트로 둔다. 사용하는 SDK 버전에 따라 제공 API가 다르니 문서를 확인하고 쓴다.

테스트의 비중은 핸들러 단위 테스트를 넓게, 통합 스모크를 얇게 두는 편이 유지 비용이 낮다. 핸들러가 부작용(파일 쓰기, 네트워크)을 가진다면 그 부분을 인자로 주입받게 만들어, 테스트에서는 가짜 구현을 넘기면 된다.

## 정리

- 로직은 순수 함수로, 등록은 연결만 맡게 나눈다.
- 성공 응답뿐 아니라 `isError` 경로를 테스트로 고정한다.
- 핸들러 단위 테스트를 기본으로 하고, 서버 전체 확인은 얇은 스모크 테스트로 보완한다.
