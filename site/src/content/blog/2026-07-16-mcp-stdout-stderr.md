---
title: "MCP 서버는 왜 stdout에 로그를 찍으면 안 되나 — stdout vs stderr"
pubDate: 2026-07-16T10:30:00Z
tags: ["mcp", "node", "stdio"]
description: "stdio MCP 서버에서 console.log 한 줄이 연결을 통째로 깨뜨릴 수 있다. stdout이 통신 채널인 이유와, 로그를 stderr로 보내야 하는 까닭을 짚는다."
---

stdio로 붙는 MCP 서버를 만들다 보면 황당한 버그를 만난다. 서버는 분명 잘 도는데, 클라이언트가 "응답을 못 읽는다"며 연결이 깨진다. 로직에는 문제가 없다. 범인은 엉뚱한 곳, 바로 `console.log` 한 줄이다.

## stdio 서버의 stdout은 통신 채널이다

stdio transport에서 클라이언트와 서버는 **표준 입출력(stdin/stdout)** 으로 대화한다. 서버가 stdout에 쓰는 모든 바이트를 클라이언트는 **JSON-RPC 메시지로 파싱**한다. 즉 stdout은 사람이 보라고 있는 게 아니라, 프로토콜 전용 배관이다.

여기에 `console.log("서버 시작!")` 같은 걸 찍으면, 그 문장이 JSON-RPC 스트림 한가운데 끼어든다. 클라이언트는 그걸 메시지로 해석하려다 파싱에 실패하고, 연결이 무너진다. 코드가 멀쩡한데도 깨지는 이유다.

## 로그는 stderr로 보낸다

해법은 단순하다. 사람이 볼 로그는 전부 **stderr**로 보낸다. stderr는 프로토콜과 분리된 별도 채널이라, 여기에 뭘 찍든 JSON-RPC 스트림을 오염시키지 않는다. Node에서는 `console.error`가 stderr로 나간다.

```ts
// ❌ stdout 오염 → 프로토콜이 깨진다
console.log("[server] 시작됨");

// ✅ stderr로 → 안전하다
console.error("[server] 시작됨");
```

터미널에서 눈으로 보면 둘 다 똑같이 찍히지만, `console.error`는 통신 채널을 건드리지 않는다. 그래서 서버 시작 로그, 디버그 출력은 전부 stderr로 보내는 게 원칙이다.

## 규칙 하나로 기억하기

stdio MCP 서버에서 stdout은 **오직 프로토콜의 것**이다. `console.log`, 디버그 `print`, 라이브러리가 몰래 찍는 안내 문구 — 사람을 위한 출력이라면 무엇이든 stderr로 보낸다. 나중에 HTTP transport로 옮기면 이 제약은 사라지지만, stdio를 쓰는 동안에는 이 한 줄 규칙이 "왜 안 되지" 버그의 태반을 막아준다.
