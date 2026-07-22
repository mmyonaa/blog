---
title: "MCP Resource로 LLM에게 컨텍스트 읽히기"
pubDate: 2026-07-17T05:35:41Z
section: "mcp"
tags: ["mcp", "resources", "개념"]
area: "C"
follows: "2026-07-15-mcp-3-primitives"
topicId: "resources-context"
description: "MCP Resource는 도구가 아니라 LLM이 읽어들이는 데이터다. 도구와 무엇이 다른지, URI로 무엇을 노출하는지, 그리고 실제 서버에서 어떻게 구현하는지 살펴본다."
---

MCP의 3대 primitive 중 Tool은 자주 이야기되지만, Resource는 상대적으로 덜 다뤄진다. 그런데 LLM에게 "지금 이 프로젝트의 상태"나 "이미 쌓여 있는 데이터"를 읽히고 싶을 때 진짜 필요한 건 Tool이 아니라 Resource인 경우가 많다.

## Tool과 Resource는 방향이 다르다

가장 헷갈리는 지점부터 정리하자. 둘은 하는 일이 아니라 **주도권**이 다르다.

- **Tool**은 모델이 "이걸 실행해줘"라고 *호출*하는 동작이다. 부작용(파일 쓰기, API 호출)을 일으키는 게 목적이다.
- **Resource**는 클라이언트가 *읽어서* 컨텍스트에 넣는 데이터다. 원칙적으로 부작용이 없고, GET 요청에 가깝다.

비유하자면 Tool은 함수 호출, Resource는 파일 읽기다. "새 글을 발행해줘"는 Tool이고, "지금까지 발행된 글 목록"은 Resource다. 이 블로그의 MCP 서버도 발행은 `publish_post` Tool로, 기존 글 조회는 `blog://posts` Resource로 나눠 두었다.

## URI로 노출한다

Resource의 핵심은 각 데이터에 **URI**를 붙인다는 점이다. `blog://posts`, `file:///README.md`, `db://users/42`처럼 스킴을 자유롭게 정할 수 있다. 클라이언트는 이 URI로 리소스를 식별하고 읽어온다.

리소스는 두 방식으로 제공한다. 목록이 고정적이면 정적으로 나열하고, `blog://posts/{slug}`처럼 파라미터가 들어가면 **템플릿**으로 등록한다.

## 실제 구현

TypeScript SDK로 정적 리소스 하나를 등록하면 이렇다.

```ts
server.registerResource(
  "posts",
  "blog://posts",
  {
    title: "발행된 글 목록",
    description: "지금까지 발행된 모든 글의 메타데이터",
    mimeType: "application/json",
  },
  async (uri) => {
    const posts = await loadAllPosts(); // 파일 시스템에서 읽기
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(posts, null, 2),
        },
      ],
    };
  }
);
```

읽기 핸들러는 `contents` 배열을 돌려준다. 각 항목에는 어떤 URI의 데이터인지, 어떤 형식(`mimeType`)인지, 그리고 실제 내용(`text` 또는 바이너리면 `blob`)이 담긴다.

## 왜 Tool로 안 하고 Resource로 하나

"글 목록도 그냥 `list_posts` Tool로 만들면 되지 않나?" 물론 된다. 하지만 구분하는 데는 이유가 있다.

- **의도가 드러난다.** Resource는 "읽기 전용, 부작용 없음"을 프로토콜 수준에서 약속한다. 클라이언트는 안심하고 미리 읽어 컨텍스트에 넣을 수 있다.
- **클라이언트가 UI를 붙일 수 있다.** 많은 MCP 클라이언트가 리소스를 "첨부할 수 있는 항목" 목록으로 보여준다. 사용자가 직접 골라 대화에 끌어다 넣는 식이다.
- **캐싱·구독이 가능하다.** 리소스는 변경 알림(`notifications/resources/updated`)을 지원해서, 내용이 바뀌면 클라이언트가 다시 읽게 할 수 있다.

정리하면 이렇다. 모델이 세상을 **바꾸는** 통로는 Tool, 모델에게 세상을 **보여주는** 창은 Resource다. 서버를 설계할 때 이 동작이 "실행"인지 "읽기"인지부터 물으면, 어느 쪽에 둘지 대개 분명해진다.
