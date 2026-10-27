---
title: "MCP Inspector로 내 서버 들여다보기 — 클라이언트 없이 도구를 직접 호출하기"
pubDate: 2026-10-27T10:43:07Z
section: "mcp"
tags: ["mcp-inspector", "mcp", "stdio", "디버깅", "typescript-sdk"]
area: "A"
topicId: "mcp-inspector-debugging"
description: "MCP 서버를 Claude 같은 클라이언트에 붙이기 전에 MCP Inspector로 도구 목록과 호출 결과를 직접 확인하는 방법과, stdio 서버에서 흔한 실수를 정리한다."
---

MCP 서버를 만들고 곧바로 LLM 클라이언트에 연결하면 문제가 생겼을 때 원인이 어디인지 알기 어렵다. 서버 코드가 틀렸는지, 설정 경로가 틀렸는지, 모델이 도구를 안 골랐는지가 한꺼번에 섞이기 때문이다. MCP Inspector는 이 중 서버 쪽만 따로 떼어 확인하게 해 주는 공식 개발 도구다. 모델 없이 프로토콜 수준에서 서버와 직접 대화한다.

## 확인용 서버 만들기

덧셈 도구 하나만 가진 stdio 서버다. TypeScript SDK(`@modelcontextprotocol/sdk`)와 `zod`가 설치되어 있고 ESM 환경이라고 가정한다.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "demo", version: "0.1.0" });

server.registerTool(
  "add",
  {
    description: "두 수를 더한다",
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => {
    console.error(`add called: ${a}, ${b}`); // 로그는 stderr로
    return { content: [{ type: "text", text: String(a + b) }] };
  }
);

await server.connect(new StdioServerTransport());
```

## Inspector 실행

빌드한 결과물을 Inspector에 실행 명령으로 넘긴다. 파일 경로는 본인 프로젝트에 맞게 바꾼다.

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

실행하면 로컬 주소가 출력되고, 브라우저에서 열면 웹 UI가 뜬다. Inspector가 서버 프로세스를 직접 띄워 stdio로 연결하므로 별도 설정 파일이 필요 없다. 접속 주소에는 세션 토큰이 포함될 수 있으니 터미널에 출력된 주소를 그대로 쓰는 편이 안전하다. 포트와 인증 방식은 버전에 따라 다를 수 있다.

## 어디를 보나

- **Tools 탭**: `tools/list` 결과가 나열된다. 설명과 입력 스키마가 의도대로 노출되는지 먼저 본다. 모델이 도구를 고르는 근거는 이 설명과 스키마뿐이므로, 여기서 모호하면 클라이언트에서도 모호하다.
- **호출 폼**: 스키마에서 만들어진 입력란에 `a`, `b`를 넣고 실행하면 응답의 `content`와 오류 여부를 그대로 볼 수 있다. 잘못된 타입을 일부러 넣어 검증 오류가 어떻게 돌아오는지도 확인해 보자.
- **알림·로그 창**: 서버가 stderr로 쓴 내용과 프로토콜 알림이 표시된다. 위 예제의 `console.error` 출력이 여기서 보인다.
- **Resources, Prompts 탭**: 서버가 리소스나 프롬프트를 등록했다면 같은 방식으로 목록 조회와 읽기를 해 볼 수 있다.

## stdio 서버의 대표적 함정

stdio 전송에서 stdout은 프로토콜 메시지 전용 통로다. 디버깅하다 무심코 `console.log`를 넣으면 JSON 메시지 사이에 일반 텍스트가 끼어 연결이 깨지거나 파싱 오류가 난다. 로그는 반드시 `console.error`처럼 stderr로 보낸다. Inspector에서 연결 단계부터 실패한다면 이 문제를 가장 먼저 의심한다.

두 번째는 빌드 누락이다. Inspector에 넘기는 것은 실행 가능한 결과물이므로 TypeScript를 고쳤다면 다시 빌드해야 반영된다. 도구 목록이 예전 그대로라면 코드가 아니라 빌드 산출물을 보고 있을 가능성이 크다.

## 클라이언트에 붙이기 전의 점검 순서

1. Inspector에서 연결이 되는가 (stdout 오염, 실행 경로 문제 배제)
2. 도구 목록과 설명, 스키마가 의도대로인가
3. 정상 입력과 비정상 입력 모두에서 응답 형태가 맞는가

이 세 가지를 통과한 서버라면, 이후 클라이언트에서 생기는 문제는 설정이나 모델의 도구 선택 쪽으로 범위를 좁힐 수 있다. 자동화 스크립트에서 같은 확인을 반복하고 싶다면 Inspector가 제공하는 CLI 모드를 쓸 수 있는데, 옵션 이름은 버전에 따라 달라질 수 있으니 `--help`로 먼저 확인하길 권한다.
