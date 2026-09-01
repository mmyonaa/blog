---
title: "MCP 도구에 annotations 달기 — description 밖에서 행동을 힌트하는 법"
pubDate: 2026-08-16T05:34:33Z
section: "mcp"
tags: ["mcp", "tools", "annotations", "typescript"]
description: "MCP 도구는 description 말고도 annotations라는 채널로 자신의 행동 특성을 알릴 수 있다. readOnlyHint·destructiveHint·idempotentHint·openWorldHint 네 필드가 각각 무엇을 뜻하는지, 왜 힌트일 뿐 보장이 아닌지, registerTool에 실제로 붙이는 코드까지 정리한다."
---

MCP 도구를 정의할 때 `description`에 "이 도구는 파일을 읽기만 하고 수정하지 않는다"라고 아무리 자세히 적어도, 그건 자연어 문장일 뿐이다. 클라이언트가 승인 UI를 그리거나 위험한 호출 앞에서 사용자 확인을 띄우려면, 자연어를 다시 파싱해 의도를 추측하는 대신 구조화된 필드를 보고 싶어한다. MCP는 이 용도로 `annotations`라는 별도 채널을 도구 정의에 둔다.

## description과 무엇이 다른가

이 블로그에서 전에 다룬 [description 설계](/blog/blog/2026-07-26-tool-description-design/)는 "LLM이 어떤 도구를 고를지" 판단하는 근거였다. annotations는 방향이 다르다 — LLM이 아니라 **클라이언트(호스트 애플리케이션)**가 읽는 메타데이터다. 도구를 실행하기 전에 "사용자 확인이 필요한 호출인가?"를 판단하는 재료로 쓰인다.

MCP 스펙이 정의하는 표준 annotations 필드는 네 가지다.

- `readOnlyHint`: 환경을 변경하지 않는다 (기본값 `false`)
- `destructiveHint`: 되돌리기 어려운 변경을 가할 수 있다 (기본값 `true`)
- `idempotentHint`: 같은 인자로 반복 호출해도 추가 효과가 없다 (기본값 `false`)
- `openWorldHint`: 예측 불가능한 외부 세계(웹 검색 등)와 상호작용한다 (기본값 `true`)

이 블로그의 `publish_post` 도구를 기준으로 채워보면 이렇다.

```typescript
server.registerTool(
  "publish_post",
  {
    title: "블로그 글 발행",
    description:
      "마크다운 블로그 글을 프론트매터와 함께 파일로 생성한다. " +
      "파일명은 `YYYY-MM-DD-slug.md`. 같은 이름이 있으면 실패한다.",
    inputSchema: { /* ... */ },
    annotations: {
      title: "블로그 글 발행",
      readOnlyHint: false,      // 파일을 새로 만든다
      destructiveHint: false,   // 기존 글을 덮어쓰지 않고, 이름이 겹치면 아예 실패한다
      idempotentHint: false,    // 같은 title로 두 번 부르면 두 번째는 실패(부작용 없는 반복이 아니다)
      openWorldHint: false,     // 로컬 파일시스템만 건드리고 외부 네트워크는 안 나간다
    },
  },
  async (args) => { /* ... */ },
);
```

읽기 전용에 가까운 `blog://posts` 계열 리소스나, 이 서버의 `suggest_topic` 같은 도구라면 반대로 `readOnlyHint: true, destructiveHint: false, idempotentHint: true`로 채우는 편이 맞다. 같은 인자로 몇 번을 불러도 로컬 상태(발행된 글 목록)를 다시 읽어 후보를 계산할 뿐, 아무것도 바꾸지 않기 때문이다.

## "힌트"라는 이름이 핵심이다

네 필드 모두 이름에 `Hint`가 붙어 있는 이유는 스펙이 이 값을 신뢰 경계로 쓰지 말라고 명시하기 때문이다. annotations는 서버가 스스로 신고하는 값이라서, 악의적이거나 부주의한 서버는 파일을 지우는 도구에 `destructiveHint: false`를 달아버릴 수도 있다. 클라이언트는 이 신고를 UI를 그리는 힌트로만 쓰고, 실제 안전장치(권한 승인, 샌드박싱, rate limit)는 별도로 둬야 한다. MCP 도구가 [URL을 SSRF에 노출하거나](/blog/blog/2026-08-15-mcp-tool-ssrf/) [셸 인젝션에 취약해지는](/blog/blog/2026-08-12-mcp-tool-command-injection/) 경로도 결국 "서버가 스스로 신고한 값을 클라이언트가 곧이곧대로 믿었을 때" 열린다는 점에서 같은 원칙이다 — annotations는 신뢰의 근거가 아니라 UX 판단의 재료다.

## 클라이언트마다 다루는 정도가 다르다

annotations를 실제로 UI에 반영하느냐는 클라이언트 구현에 달려 있다. 어떤 클라이언트는 `destructiveHint: true`인 도구 호출 앞에서 확인 대화상자를 띄우고, 어떤 클라이언트는 이 필드를 아예 무시하고 모든 도구 호출에 동일한 승인 절차를 적용한다. 그래서 annotations를 채웠다고 해서 특정 UX가 보장되는 건 아니다. 다만 채워두면 그 정보를 활용하는 클라이언트에서는 더 정확한 판단을 받을 수 있고, 무시하는 클라이언트에서도 손해는 없다 — 그래서 선택 필드이면서도 채워두는 편이 낫다.

`title` 필드도 annotations 안에 함께 둘 수 있는데, 이건 도구 이름(`publish_post`처럼 프로그램이 식별자로 쓰는 문자열)과 별개로 사람이 읽을 사용자 친화적 이름("블로그 글 발행")을 UI에 보여주기 위한 것이다. 도구 이름은 코드 규칙(snake_case 등)을 따르느라 읽기 불편한 경우가 많은데, `title`을 따로 두면 그 제약 없이 자연스러운 표시 이름을 붙일 수 있다.

## 정리

description이 "LLM에게 이 도구를 언제 골라야 하는지"를 말한다면, annotations는 "클라이언트에게 이 도구가 실행되면 무슨 일이 벌어지는지"를 말한다. 독자와 목적이 다른 두 채널이라, 도구 하나를 잘 설계하려면 description만으로는 부족하고 이 네 개의 boolean 힌트까지 함께 챙기는 편이 좋다. 다만 이 값이 강제되는 보안 경계가 아니라 자기 신고라는 점은 서버를 설계할 때도, 클라이언트를 신뢰할 때도 잊지 않아야 한다.
