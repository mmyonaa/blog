---
title: "MCP 진행 알림과 취소 — 오래 걸리는 도구를 호출자가 지켜보고 끊게 하는 법"
pubDate: 2026-10-07T11:52:36Z
section: "mcp"
tags: ["mcp", "progress", "cancellation", "typescript-sdk", "AbortSignal"]
description: "MCP의 notifications/progress와 notifications/cancelled 흐름을 정리하고, TypeScript SDK 도구 핸들러에서 진행률 보고와 취소 처리를 구현하는 방법을 보인다."
---

도구 호출이 몇 초 안에 끝나면 신경 쓸 일이 없다. 하지만 대용량 파일 색인, 빌드, 외부 API 폴링처럼 수십 초 이상 걸리는 도구는 호출자 입장에서 멈춘 것과 구분이 안 된다. MCP는 이를 위해 두 가지 장치를 둔다. 서버가 진행 상황을 알리는 **progress 알림**, 클라이언트가 진행 중인 요청을 포기하는 **cancellation 알림**이다.

## 진행 알림: 클라이언트가 토큰을 주면 서버가 보고한다

진행 알림은 서버가 마음대로 보내는 게 아니라, 클라이언트가 요청에 `progressToken`을 실어 보냈을 때만 쓸 수 있다.

```text
요청:  tools/call, params._meta.progressToken = "job-1"
알림:  notifications/progress
       { progressToken: "job-1", progress: 30, total: 100, message: "3/10 파일 처리" }
```

`progress`는 단조 증가해야 하고, `total`과 `message`는 선택이다. 전체량을 모르면 `total`을 생략하고 `progress`만 올리면 된다. 토큰이 없는 요청에는 진행 알림을 보내지 않는 것이 규칙이다.

## 취소: 요청 ID를 가리키는 단방향 알림

클라이언트는 `notifications/cancelled`에 취소할 `requestId`와 선택적 `reason`을 담아 보낸다. 응답을 요구하지 않는 알림이라, 서버는 작업을 멈추고 그 요청에는 응답을 보내지 않는 것이 기본 동작이다. 이미 끝난 요청이나 알 수 없는 ID에 대한 취소는 무시해도 된다. 알림이라 경합이 생길 수 있으므로, 취소가 도착하기 전에 응답이 나가는 경우도 정상으로 취급해야 한다.

## TypeScript SDK에서 구현하기

도구 핸들러의 두 번째 인자(`extra`)에 두 가지가 들어 있다. 취소 시 중단되는 `signal`(AbortSignal)과, 진행 알림을 보낼 때 쓰는 `sendNotification`, 그리고 요청의 `_meta`다. 아래는 전제를 `@modelcontextprotocol/sdk`와 `zod`가 설치된 환경으로 두고 쓴 예다.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "slow-demo", version: "0.1.0" });

server.registerTool(
  "slow_job",
  {
    description: "단계를 나눠 오래 걸리는 작업을 흉내 낸다. 진행률을 보고하고 취소를 존중한다.",
    inputSchema: { steps: z.number().int().min(1).max(20) },
  },
  async ({ steps }, extra) => {
    const token = extra._meta?.progressToken;
    for (let i = 1; i <= steps; i++) {
      if (extra.signal.aborted) {
        throw new Error("취소됨");
      }
      await new Promise((r) => setTimeout(r, 1000));
      if (token !== undefined) {
        await extra.sendNotification({
          method: "notifications/progress",
          params: { progressToken: token, progress: i, total: steps },
        });
      }
    }
    return { content: [{ type: "text", text: `${steps}단계 완료` }] };
  },
);

await server.connect(new StdioServerTransport());
```

핵심은 루프의 각 반복에서 `signal.aborted`를 확인하는 것이다. 취소 알림을 받아도 서버가 알아서 코드를 멈춰 주지는 않는다. SDK는 `signal`만 중단시킬 뿐이고, 실제 중단은 핸들러가 이 신호를 확인하거나 `fetch(url, { signal })`처럼 하위 호출에 넘겨 줄 때 일어난다.

## 설계할 때 챙길 점

- **토큰이 없으면 조용히 넘어간다.** 모든 클라이언트가 `progressToken`을 보내는 것은 아니므로 위 예처럼 존재 여부를 먼저 확인한다.
- **알림 빈도를 제한한다.** 반복마다 보내면 stdio 채널이 알림으로 가득 찬다. 퍼센트가 바뀔 때만 보내는 식으로 줄인다.
- **취소는 정리 작업과 짝이다.** 임시 파일이나 열린 연결은 `try/finally`로 닫는다. 취소된 요청은 응답이 없으니 정리가 유일한 흔적 관리 지점이다.
- **클라이언트마다 표시가 다르다.** 진행 알림을 화면에 띄우는지는 클라이언트 구현에 달려 있으므로, 알림이 보이지 않아도 서버 버그라고 단정하지 않는다.

오래 걸리는 도구일수록 진행 보고와 취소 존중이 함께 있어야 쓸 만하다. 보고만 있고 취소가 없으면 지켜보기만 하다 끝까지 기다려야 하고, 취소만 있고 보고가 없으면 언제 끊어야 할지 판단할 근거가 없다.
