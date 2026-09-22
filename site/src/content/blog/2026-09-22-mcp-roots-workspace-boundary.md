---
title: "MCP Roots — 서버가 작업 경계를 클라이언트에게 묻는 법"
pubDate: 2026-09-22T10:10:23Z
section: "mcp"
tags: ["mcp", "roots", "typescript-sdk", "capability"]
description: "MCP의 Roots capability를 다룬다. 서버가 클라이언트에게 작업 중인 폴더 범위를 묻는 roots/list 요청과 notifications/roots/list_changed 알림의 구조를, TypeScript SDK의 listRoots·getClientCapabilities 코드로 정리하고, 이 capability가 접근 통제가 아니라 힌트일 뿐이라는 한계까지 짚는다."
---

## Roots란 무엇인가

MCP의 capability들은 저마다 통제 주체가 다르다. Sampling은 서버가 클라이언트의 LLM을 빌리고, Elicitation은 서버가 사람에게 되묻는다. Roots는 방향이 반대다. **클라이언트가 서버에게 "지금 내가 다루는 작업 범위는 여기까지야"라고 먼저 알려주는** capability다.

예를 들어 IDE에 붙은 MCP 클라이언트가 로컬 저장소 두 개를 열어두고 있다면, 그 저장소 경로가 곧 root다. 파일을 읽고 쓰는 서버는 이 root 목록을 받아 "사용자가 지금 관심 있는 영역"을 알 수 있다. 서버가 설정 파일이나 환경변수로 프로젝트 경로를 하드코딩해야 했던 문제를, 클라이언트가 매 세션 알려주는 방식으로 바꾼 셈이다.

## capability 선언과 요청 흐름

Roots는 클라이언트 capability다. 초기화 시 클라이언트가 자신이 root 목록을 제공할 수 있다고 선언해야 서버가 이를 사용할 수 있다.

```json
{
  "capabilities": {
    "roots": { "listChanged": true }
  }
}
```

`listChanged`는 root 목록이 바뀔 때 변경 알림을 보낼 수 있다는 뜻이다. 서버는 이 선언을 확인한 뒤 `roots/list` 요청을 보내고, 클라이언트는 URI와 이름을 담은 배열로 응답한다.

```json
// 서버 → 클라이언트
{ "method": "roots/list" }

// 클라이언트 → 서버
{
  "result": {
    "roots": [
      { "uri": "file:///home/user/project-a", "name": "project-a" },
      { "uri": "file:///home/user/project-b" }
    ]
  }
}
```

root의 `uri`는 스키마상 문자열일 뿐 특정 프로토콜로 제한돼 있지 않지만, 실제로는 로컬 파일시스템 경로를 가리키는 `file://` URI로 쓰이는 경우가 흔하다.

## TypeScript SDK로 구현하기

`@modelcontextprotocol/sdk`의 `Server`는 `listRoots()`를 제공한다. 다만 모든 클라이언트가 이 capability를 구현하는 건 아니므로, 호출 전에 `getClientCapabilities()`로 지원 여부를 먼저 확인해야 한다.

```typescript
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { RootsListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";

async function loadWorkspaceRoots(server: Server) {
  if (!server.getClientCapabilities()?.roots) {
    return []; // 클라이언트가 roots를 지원하지 않음
  }
  const { roots } = await server.listRoots();
  return roots; // [{ uri, name? }, ...]
}

// 사용자가 작업 폴더를 바꾸면 클라이언트가 알림을 보낸다
server.setNotificationHandler(RootsListChangedNotificationSchema, async () => {
  const roots = await loadWorkspaceRoots(server);
  // 캐시해 둔 root 목록을 갱신
});
```

`listRoots()`는 매번 서버가 요청해야 하는 pull 방식이고, `notifications/roots/list_changed`는 클라이언트가 변경을 알리는 push 방식이다. 이 둘을 합치면 서버는 초기 root 목록을 한 번 가져온 뒤, 변경 알림이 올 때만 다시 요청하는 캐싱 구조를 짤 수 있다.

## 힌트일 뿐, 접근 통제가 아니다

여기서 짚어야 할 한계가 있다. Roots는 클라이언트가 "이 범위를 봐 달라"고 알려주는 신호일 뿐, 서버의 파일 접근을 그 범위 안에 강제로 가두는 장치가 아니다. 서버가 root 밖 경로를 요청받으면 여전히 접근할 수 있다. tool annotation의 `destructiveHint`가 그랬듯, Roots도 스펙 차원에서는 "이렇게 협력하자"는 약속이지 런타임 강제가 아니다. 접근을 실제로 root 안으로 제한하려면, 서버 코드가 전달받은 root URI들과 실제 파일 경로를 직접 대조하는 검증 로직을 따로 둬야 한다. root 목록을 UI 힌트로만 쓰고 끝내면, 사용자는 "이 폴더 안에서만 작업하겠지"라고 믿지만 서버는 그 믿음을 지키지 않는 상태가 될 수 있다.

이 블로그를 발행하는 MCP 서버는 작업 대상이 이 저장소 하나로 고정돼 있어 root를 물을 필요가 없다. 반대로 범용 코드 편집기나 파일 탐색기처럼 "지금 어떤 폴더를 열어놨는지"가 매번 달라지는 서버라면, Roots는 그 경계를 하드코딩 없이 받아오는 사실상 유일한 표준 경로다.
