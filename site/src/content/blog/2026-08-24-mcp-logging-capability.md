---
title: "MCP 로깅 capability — 서버가 클라이언트에게 실어 보내는 구조화된 로그"
pubDate: 2026-08-24T05:46:37Z
section: "mcp"
tags: ["mcp", "logging", "typescript-sdk", "capability"]
description: "MCP 서버가 stdout·stderr와는 별개로, 프로토콜 메시지 자체에 로그를 실어 클라이언트에게 보내는 logging capability를 다룬다. capability 선언, RFC 5424 8단계 레벨, sendLoggingMessage 코드, 클라이언트가 logging/setLevel로 볼륨을 조절하는 원리, 그리고 progress 알림과의 차이까지 실제 SDK 소스로 정리한다."
---

이 블로그에서 이미 stdio 전송의 규칙 하나를 다뤘다 — MCP 서버는 stdout에 아무 텍스트나 찍으면 안 되고, 사람이 보는 로그는 stderr로 보내야 한다는 규칙이다. 그건 프로세스가 터미널이나 파일에 남기는 "운영 로그"의 이야기였다. MCP에는 이것과 별개로, 프로토콜 메시지 자체로 로그를 실어 클라이언트에게 보내는 채널이 하나 더 있다. 바로 logging capability다.

## capability 선언이 먼저다

MCP에서 서버가 낼 수 있는 부가 기능은 대부분 capability로 미리 선언해야 클라이언트가 존재를 안다. logging도 마찬가지다.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer(
  { name: "my-server", version: "1.0.0" },
  { capabilities: { logging: {} } }
);
```

이 선언이 없으면 `sendLoggingMessage`를 호출해도 SDK가 내부적으로 무시한다. capability는 "이 서버는 로그 알림을 보낼 수 있다"는 초기화 시점의 자기소개일 뿐, 실제 전송 여부는 아래에서 다룰 레벨 필터를 통과해야 결정된다.

## 8단계 레벨

로그 레벨은 RFC 5424의 syslog 심각도 체계를 그대로 가져와 8단계다. 심각도가 낮은 쪽부터 나열하면 `debug < info < notice < warning < error < critical < alert < emergency` 순이다. 대부분의 서버는 `debug`·`info`·`warning`·`error` 네 단계만 실제로 쓰고 나머지는 존재만 알아두면 된다.

## 서버가 로그를 보내는 법

도구 실행 중간중간 진행 상황을 알리고 싶을 때 이 채널을 쓴다.

```typescript
server.registerTool(
  "sync_data",
  { description: "외부 데이터를 동기화한다" },
  async () => {
    await server.sendLoggingMessage({
      level: "info",
      logger: "sync_data",
      data: "원격 목록 조회 시작",
    });

    // 실제 동기화 작업...

    await server.sendLoggingMessage({
      level: "info",
      logger: "sync_data",
      data: "120건 동기화 완료",
    });

    return { content: [{ type: "text", text: "동기화 완료" }] };
  }
);
```

`data` 필드는 타입이 정해져 있지 않다. 문자열 한 줄을 넣어도 되고, 구조화된 객체를 넣어도 된다. 도구 실행 결과(`content`)와 달리 이 알림은 LLM의 응답에 직접 섞이지 않는다 — 클라이언트가 별도로 받아 표시 여부와 방식을 스스로 정한다. 콘솔에 흘려보내든, 로그 패널에 모으든 그건 클라이언트 재량이다.

## 클라이언트가 볼륨을 조절한다

반대 방향의 요청도 있다. 클라이언트는 `logging/setLevel` 요청으로 "이 레벨 이상만 보내 달라"고 서버에 알릴 수 있다.

SDK 내부는 이 요청을 받으면 세션별로 임계 레벨을 저장해 두고, `sendLoggingMessage`가 호출될 때마다 그 메시지의 레벨이 임계값보다 낮으면 실제 전송을 건너뛴다. 클라이언트가 아직 `setLevel`을 한 번도 보내지 않았다면 임계값이 없는 상태라 서버가 보내는 모든 레벨이 그대로 나간다. 즉 필터링은 클라이언트가 원할 때만 켜지는 옵트인 구조다.

## 진행률 알림과는 다르다

MCP에는 `notifications/progress`라는 별도 메커니즘도 있다. 이건 요청에 실린 `progressToken`을 기준으로 "몇 퍼센트 진행됐다"는 수치를 추적하는 용도라, 사람이 읽는 문장을 실어 보내는 logging과는 목적이 다르다. 둘 다 도구 실행 중간에 클라이언트로 무언가를 흘려보낸다는 점은 같지만, 하나는 진행률 계기판이고 하나는 로그 스트림이라고 구분하면 된다.

stderr 로그가 서버를 운영하는 사람을 위한 것이라면, logging capability의 알림은 그 서버를 호출하는 클라이언트(그리고 그 뒤의 LLM 또는 사람)를 위한 것이다. 대상이 다르니 채널도 다르게 둔 셈이다.
