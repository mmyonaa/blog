---
title: "stdio MCP 서버를 원격 HTTP 서버로 올리기"
pubDate: 2026-11-11T12:50:01Z
section: "mcp"
tags: ["mcp", "streamable-http", "typescript-sdk", "express", "원격 배포"]
area: "A"
topicId: "remote-mcp-deploy"
follows: "2026-08-16-mcp-2026-07-28-stateless-spec"
description: "로컬 stdio로만 돌던 MCP 서버를 Streamable HTTP 엔드포인트로 노출해 원격에서 쓰는 방법과, 옮길 때 바뀌는 점을 정리한다."
---

stdio 서버는 클라이언트가 자식 프로세스로 띄워 표준 입출력으로 대화한다. 내 PC에서만 쓸 때는 충분하지만, 팀이 함께 쓰거나 서버를 상시 켜 두려면 네트워크로 접근 가능한 HTTP 서버가 필요하다. 이 글은 이미 만들어 둔 서버를 Streamable HTTP 전송으로 옮기는 최소 경로를 다룬다.

## 무엇이 바뀌고 무엇이 그대로인가

도구·리소스·프롬프트를 등록하는 코드는 전송 방식과 무관하다. 바뀌는 것은 마지막 연결 부분뿐이다.

| 구분 | stdio | Streamable HTTP |
|---|---|---|
| 실행 주체 | 클라이언트가 프로세스를 띄움 | 서버가 독립적으로 상시 실행 |
| 접점 | stdin/stdout | 단일 HTTP 엔드포인트(예: `/mcp`) |
| 인증 | 불필요(로컬 신뢰) | 직접 챙겨야 함 |
| 로그 | stderr 사용 | stdout도 자유롭게 사용 가능 |

stdio에서는 stdout에 아무거나 찍으면 프로토콜이 깨졌지만, HTTP에서는 그 제약이 사라진다.

## 구현 예

전제: TypeScript SDK(`@modelcontextprotocol/sdk`, v1 계열)와 `express`, `zod`를 설치한 환경이다. SDK 버전에 따라 import 경로나 API가 다를 수 있으니 사용 중인 버전의 문서를 함께 확인한다.

```ts
import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

function createServer() {
  const server = new McpServer({ name: "demo", version: "0.1.0" });
  server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }));
  return server;
}

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  // 요청마다 서버와 전송을 새로 만드는 스테이트리스 방식
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000, () => console.log("MCP on http://localhost:3000/mcp"));
```

핵심은 `sessionIdGenerator: undefined`다. 세션 ID를 발급하지 않으니 서버가 요청 사이에 상태를 들고 있을 필요가 없고, 로드밸런서 뒤에 인스턴스를 여러 개 두어도 동작한다. 대신 세션에 의존하는 기능(요청 간 구독 상태 유지 등)은 쓸 수 없다. 세션이 필요하면 ID를 발급하고 세션별 전송 객체를 저장하는 상태 있는 구성으로 가야 한다.

## 동작 확인

MCP Inspector를 띄워 전송 방식을 Streamable HTTP로, URL을 `http://localhost:3000/mcp`로 지정하면 `add` 도구를 직접 호출해 볼 수 있다. 클라이언트 설정 형식은 제품마다 다르므로, 원격 서버 URL을 받는 항목이 있는지 해당 클라이언트 문서를 확인한다.

## 배포 전 점검

- **인증**: 공개 주소에 노출하면 누구나 도구를 호출한다. 최소한 토큰 검사를 앞단에 두고, 외부에 열 거라면 스펙이 정한 인증 흐름(OAuth 기반)을 검토한다.
- **Origin 검증**: 브라우저를 통한 DNS rebinding 공격을 막기 위해 Origin 헤더를 확인하고, 로컬 실행 시에는 localhost에만 바인딩한다.
- **TLS**: 리버스 프록시에서 HTTPS를 종단한다.
- **위험한 도구의 재검토**: 로컬에서는 파일 쓰기나 셸 실행 도구가 괜찮았어도, 원격에서는 호출자가 달라진다. 노출할 도구를 다시 고른다.

정리하면, 옮기는 작업은 전송 계층 교체 자체보다 "더 이상 로컬 신뢰가 아니다"라는 전제 변화에 대응하는 일이 대부분이다. 핸들러 코드는 그대로 두고, 연결부와 보안 경계만 새로 세우면 된다.
