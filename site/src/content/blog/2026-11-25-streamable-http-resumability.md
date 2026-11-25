---
title: "Streamable HTTP — 끊긴 연결을 이벤트 ID로 이어 붙이기"
pubDate: 2026-11-25T03:33:46Z
section: "mcp"
tags: ["mcp", "streamable-http", "sse", "last-event-id", "typescript-sdk"]
area: "C"
topicId: "streamable-http-resumability"
follows: "2026-11-11-remote-mcp-deploy"
description: "Streamable HTTP에서 SSE 스트림이 끊겼을 때 이벤트 id와 Last-Event-ID 헤더로 놓친 메시지를 되살리는 스펙 규칙과, TypeScript SDK의 EventStore로 구현하는 방법을 정리한다."
---

## 끊기면 무엇을 잃나

원격 MCP 서버에서 도구 호출이 오래 걸리면, 서버는 응답을 SSE(Server-Sent Events) 스트림에 실어 보낸다. 그런데 모바일 망 전환, 프록시 타임아웃, 로드밸런서 재시작처럼 연결은 생각보다 자주 끊긴다. 스트림이 끊긴 사이 서버가 보낸 진행 알림이나 최종 응답은 아무도 받지 못한 채 사라진다. 클라이언트는 응답이 안 왔다는 사실만 알 뿐, 서버가 작업을 끝냈는지도 모른다.

스펙은 이를 위해 재개(resumability)와 재전송(redelivery)을 선택 기능으로 정해 두었다. 이 글은 2025-06-18 버전 스펙의 Streamable HTTP 전송 규칙을 기준으로 한다.

## 연결이 끊긴 것은 취소가 아니다

먼저 의미를 분명히 해 둔다. 스펙은 연결 끊김을 요청 취소로 해석하지 말라고 한다(SHOULD NOT). 취소하려면 클라이언트가 명시적으로 `CancelledNotification`을 보내야 한다. 따라서 서버는 클라이언트가 사라져도 작업을 계속할 수 있고, 그 결과를 나중에 다시 건네줄 수 있어야 의미가 있다.

## 스펙의 재개 규칙

규칙은 두 단계다.

1. 서버는 SSE 이벤트에 `id` 필드를 붙일 수 있다(MAY). 붙인다면 그 ID는 세션 안의 모든 스트림에 걸쳐 전역적으로 유일해야 한다(MUST). 세션 관리를 쓰지 않으면 그 클라이언트의 모든 스트림 안에서 유일하면 된다.
2. 클라이언트는 끊긴 뒤 MCP 엔드포인트로 HTTP GET을 보내면서 마지막으로 받은 이벤트 ID를 `Last-Event-ID` 헤더에 넣어 재개를 시도한다(SHOULD).

```text
GET /mcp HTTP/1.1
Accept: text/event-stream
Mcp-Session-Id: <세션 ID>
Last-Event-ID: <마지막으로 받은 이벤트 ID>
```

서버는 이 헤더를 보고 끊긴 스트림에서 그 ID 이후에 나갔을 메시지를 다시 재생하고(MAY), 거기서부터 스트림을 이어 간다. 단, 다른 스트림에 실렸을 메시지를 재생해서는 안 된다(MUST NOT). 요청마다 스트림이 따로 열리므로, 재개는 "그 요청의 스트림"으로 한정된다는 뜻이다. ID가 전역 유일해야 하는 이유도 여기에 있다. ID만 보고 어느 스트림의 이벤트였는지 서버가 되짚을 수 있어야 한다.

## TypeScript SDK로 구현하기

SDK의 `StreamableHTTPServerTransport`는 `eventStore` 옵션을 넘겼을 때만 재개를 지원한다. 기본값은 꺼짐이다. `EventStore` 인터페이스는 메서드 둘이 핵심이다.

- `storeEvent(streamId, message)`: 스트림에 나가는 메시지를 저장하고 이벤트 ID를 돌려준다.
- `replayEventsAfter(lastEventId, { send })`: 그 ID 이후의 메시지를 `send`로 다시 흘려보내고, 해당 스트림 ID를 돌려준다.

아래는 개념 확인용 메모리 구현이다(SDK 1.29.0의 타입 기준). 프로세스가 재시작되면 사라지고 만료 처리도 없으므로, 운영에서는 Redis 같은 외부 저장소와 보존 기한을 붙여야 한다.

```ts
import { randomUUID } from "node:crypto";
import type { EventStore } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

class MemoryEventStore implements EventStore {
  // Map은 삽입 순서를 유지하므로 순서대로 재생할 수 있다.
  private events = new Map<string, { streamId: string; message: JSONRPCMessage }>();

  async storeEvent(streamId: string, message: JSONRPCMessage): Promise<string> {
    const eventId = `${streamId}_${randomUUID()}`; // 전역 유일
    this.events.set(eventId, { streamId, message });
    return eventId;
  }

  async replayEventsAfter(
    lastEventId: string,
    { send }: { send: (eventId: string, message: JSONRPCMessage) => Promise<void> },
  ): Promise<string> {
    const last = this.events.get(lastEventId);
    if (!last) return ""; // 모르는 ID: 재생할 것이 없다
    let after = false;
    for (const [id, ev] of this.events) {
      if (id === lastEventId) { after = true; continue; }
      // 같은 스트림의 이벤트만 재생한다 (다른 스트림은 MUST NOT)
      if (after && ev.streamId === last.streamId) await send(id, ev.message);
    }
    return last.streamId;
  }
}
```

트랜스포트에는 이렇게 연결한다.

```ts
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  eventStore: new MemoryEventStore(), // 이것을 넘겨야 재개가 켜진다
});
```

## 운영에서 챙길 점

- 저장소는 서버 인스턴스 사이에서 공유되어야 한다. 재연결 요청이 다른 인스턴스로 라우팅되면, 메모리 저장소로는 그 ID를 찾지 못한다. 세션 고정(sticky session)을 쓰거나 외부 저장소를 쓴다.
- 보존 기한을 정한다. 이벤트를 무한정 쌓을 수 없으므로, 기한이 지난 ID로 재개하면 재생할 것이 없는 경우를 클라이언트가 처리해야 한다. 이때는 요청을 새로 보내거나 결과를 조회하는 도구로 확인한다.
- 재개는 전달 보장이 아니라 최선 노력이다. 스펙 문구가 MAY·SHOULD이므로 서버와 클라이언트 모두 지원하지 않을 수 있다. 중요한 작업은 멱등하게 만들어 두는 편이 안전하다.
- 재생 대상에 민감한 데이터가 들어 있을 수 있다. 저장소의 접근 제어와 세션 검증을 일반 엔드포인트와 같은 수준으로 둔다.

## 정리

- 연결 끊김은 취소가 아니며, 서버는 작업을 이어 갈 수 있다.
- 서버가 SSE 이벤트에 전역 유일한 `id`를 붙이고, 클라이언트가 `Last-Event-ID`로 GET을 보내면 끊긴 스트림의 놓친 메시지를 재생받는다.
- 다른 스트림의 메시지는 재생하지 않는다.
- TypeScript SDK에서는 `eventStore`를 넘길 때만 켜지며, 운영용 구현은 공유 저장소와 보존 기한이 필요하다.
