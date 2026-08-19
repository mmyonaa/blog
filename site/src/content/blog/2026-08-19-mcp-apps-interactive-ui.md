---
title: "MCP 도구가 텍스트 대신 화면을 그린다 — MCP Apps 뜯어보기"
pubDate: 2026-08-19T05:39:54Z
section: "mcp"
tags: ["mcp", "mcp-apps", "iframe", "postmessage"]
area: "T"
description: "MCP 도구가 텍스트 대신 대화창 안에서 인터랙티브 UI를 돌려줄 수 있게 하는 공식 확장 MCP Apps를 뜯어본다. ui:// 리소스와 App 클래스로 동작하는 방식, iframe 샌드박스 보안 모델, 2025년 11월 제안부터 2026년 7월 확장 프레임워크 정식화까지의 타임라인을 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps"
    title: "MCP Apps - Bringing UI Capabilities To MCP Clients"
  - url: "https://modelcontextprotocol.io/extensions/apps/overview"
    title: "MCP Apps — Model Context Protocol Documentation"
  - url: "https://blog.modelcontextprotocol.io/posts/2026-07-28"
    title: "The 2026-07-28 Specification — Model Context Protocol Blog"
---

# MCP 도구가 텍스트 대신 화면을 그린다 — MCP Apps 뜯어보기

MCP 도구는 지금까지 텍스트나 구조화된 데이터를 돌려주는 것이 전부였다. 대시보드를 보여주고 싶어도, 지도를 클릭해 드릴다운하고 싶어도 결국 "지난주 것만 보여줘", "매출순으로 정렬해줘"를 매번 문장으로 다시 요청해야 했다. MCP Apps는 이 틈을 메우려고 만들어진 공식 확장이다. 도구가 텍스트 대신 대화창 안에서 바로 동작하는 인터랙티브 UI를 돌려줄 수 있게 한다.

## 어떻게 동작하나

구조는 기존 MCP primitive 두 개를 조합한다. 도구 정의에 `_meta.ui.resourceUri`로 `ui://` 스킴 리소스를 가리키고, 그 리소스가 HTML·CSS·JS를 담는다.

```json
{
  "name": "visualize_data",
  "description": "데이터를 인터랙티브 차트로 시각화",
  "inputSchema": { "...": "..." },
  "_meta": {
    "ui": { "resourceUri": "ui://charts/interactive" }
  }
}
```

호스트(Claude Desktop 같은 MCP 클라이언트)는 이 리소스를 받아 샌드박스 iframe에 렌더링한다. 화면 쪽은 `@modelcontextprotocol/ext-apps` 패키지의 `App` 클래스로 호스트와 통신한다.

```js
import { App } from "@modelcontextprotocol/ext-apps";

const app = new App();
await app.connect();

app.ontoolresult = (result) => {
  document.querySelector("#chart").textContent = JSON.stringify(result.data);
};

await app.callServerTool({ name: "fetch_details", arguments: { id: "123" } });
await app.updateModelContext({
  content: [{ type: "text", text: "사용자가 옵션 B를 선택함" }],
});
```

iframe과 호스트 사이는 `postMessage` 위에 얹은 별도 JSON-RPC 방언으로 오간다. 도구 호출을 요청하거나(`callServerTool`), 사용자의 선택을 모델의 컨텍스트로 되돌려 보내는(`updateModelContext`) 식으로 화면과 대화가 서로를 알게 된다.

## 그냥 웹 앱을 링크로 주면 안 되나

독립된 웹 앱을 만들어 링크만 보내도 되지만, MCP Apps는 대화 맥락을 잃지 않는다는 점이 다르다. 사용자가 탭을 옮기거나 어느 대화창에 그 대시보드가 있었는지 헤맬 필요가 없다. 또 앱이 서버의 다른 도구를 직접 호출할 수 있어 별도 API·인증·상태 관리를 앱이 새로 구현할 필요도 없다.

## 보안 모델

서버가 만든 코드를 호스트 안에서 실행하는 구조라 격리가 핵심이다. 공식 문서는 네 겹의 방어선을 든다.

| 방어선 | 내용 |
| --- | --- |
| iframe 샌드박스 | 부모 페이지 DOM·쿠키·로컬스토리지 접근 차단 |
| 사전 선언 템플릿 | 호스트가 렌더링 전에 HTML을 미리 검토 가능 |
| 감사 가능한 메시지 | 모든 통신이 로깅 가능한 JSON-RPC로 오감 |
| 사용자 동의 | 앱이 시작한 도구 호출에 명시적 승인 요구 가능 |

## 타임라인과 지금 상태

MCP Apps는 2025년 11월 제안된 뒤 2026년 1월 26일 첫 공식 MCP 확장으로 정식 발표됐다. MCP-UI 프로젝트와 OpenAI Apps SDK의 기존 패턴을 표준화한 결과라고 공식 블로그는 설명한다. 이후 7월 28일 나온 스펙 개정에서는 확장 프레임워크 자체가 코어에 정식으로 자리 잡으면서, Tasks(장시간 작업 처리)가 MCP Apps·Enterprise Managed Authorization과 나란히 공식 확장 목록에 합류했다.

현재 Claude, VS Code(GitHub Copilot), Goose, Microsoft 365 Copilot, Postman 등 여러 클라이언트가 MCP Apps를 지원한다고 공식 문서는 안내한다. 다만 확장이라는 점은 그대로다 — 클라이언트마다 지원 여부와 구현 시점이 다르므로, 붙이려는 호스트가 실제로 이 확장을 구현했는지는 각 클라이언트의 문서로 먼저 확인하는 편이 안전하다.

## 언제 쓸 만한가

문서가 꼽는 기준은 명확하다. 사용자가 데이터를 탐색해야 하거나(정렬·필터·드릴다운), 여러 옵션이 얽힌 설정을 한 화면에서 보여줘야 하거나, PDF·3D 모델처럼 텍스트로 설명하기 어려운 매체를 다루거나, 실시간으로 갱신되는 상태를 보여줘야 할 때다. 반대로 단순한 조회·요약이라면 텍스트 응답으로 충분하고, 굳이 iframe과 샌드박스 보안 모델까지 끌어올 이유는 없다.
