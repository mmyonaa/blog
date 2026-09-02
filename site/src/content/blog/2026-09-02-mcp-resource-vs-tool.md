---
title: "MCP에서 Resource로 만들지 Tool로 만들지 — 기준은 부작용이다"
pubDate: 2026-09-02T09:47:48Z
section: "mcp"
tags: ["mcp", "resources", "tools", "typescript"]
description: "MCP 서버를 만들 때 같은 데이터를 Resource로 노출할지 Tool로 노출할지 헷갈리는 순간이 온다. application-controlled와 model-controlled라는 통제 주체 차이에서 출발해 부작용 여부·시점 결정 주체·파라미터화 필요성 세 기준으로 판별하고, 같은 로그 데이터를 두 방식으로 등록하는 코드로 차이를 정리한다."
---

# MCP에서 Resource로 만들지 Tool로 만들지 — 기준은 부작용이다

MCP 서버를 만들다 보면 같은 데이터를 두 가지 방식으로 노출할 수 있어 보이는 순간이 온다. "최근 로그 보여줘"라는 기능 하나를 Resource로 등록할 수도, Tool로 등록할 수도 있기 때문이다. 스펙은 둘 다 허용하지만 아무 기준 없이 고르면 클라이언트마다 동작이 달라지는 서버가 나온다.

## 두 primitive는 통제 주체가 다르다

MCP 문서는 Resource를 "application-controlled", Tool을 "model-controlled"라고 구분한다. Resource는 URI로 식별되는 데이터이고, 그것을 언제 대화에 끼워 넣을지는 클라이언트(또는 사용자)가 정한다. 파일 탐색기에서 파일을 첨부하는 것과 비슷하다. 반면 Tool은 모델이 대화 맥락을 보고 스스로 "지금 이걸 호출해야겠다"고 판단해서 부르는 함수다. 이 차이가 바로 선택 기준이다.

## 판별 기준 세 가지

**1. 부작용이 있는가.** 상태를 바꾸거나 외부에 요청을 보내면 Tool이다. 순수 조회만 한다면 Resource 후보에 들어간다.

**2. 누가 시점을 정하는가.** "지금 열려 있는 문서"처럼 사용자 맥락에 따라 정적으로 붙는 데이터는 Resource가 자연스럽다. 모델이 대화 흐름을 보고 그때그때 필요성을 판단해야 하는 데이터는 Tool이 맞다.

**3. 임의 인자로 검색·필터링이 필요한가.** Resource도 URI 템플릿으로 매개변수를 받을 수 있지만, 자유도는 Tool의 입력 스키마만큼 크지 않다. 키워드·레벨·기간 같은 조합 조건으로 걸러야 한다면 Tool 쪽이 훨씬 자연스럽다.

## 같은 데이터, 두 가지 등록

로그를 예로 들면, 고정된 "최근 로그"는 Resource로, 조건부 검색은 Tool로 나누는 편이 각 primitive의 설계 의도에 맞는다.

```ts
import { z } from "zod";

// 정적 조회 — 클라이언트가 붙일지 말지 결정
server.registerResource(
  "recent-logs",
  "logs://app/recent",
  { title: "최근 로그", mimeType: "text/plain" },
  async (uri) => ({
    contents: [{ uri: uri.href, text: readRecentLogs(100) }],
  })
);

// 조건부 검색 — 모델이 필요할 때 호출
server.registerTool(
  "search-logs",
  {
    title: "로그 검색",
    description: "키워드와 레벨로 로그를 필터링해 최근 N줄을 반환한다",
    inputSchema: {
      keyword: z.string().optional(),
      level: z.enum(["error", "warn", "info"]).optional(),
      limit: z.number().default(50),
    },
  },
  async ({ keyword, level, limit }) => ({
    content: [{ type: "text", text: searchLogs({ keyword, level, limit }) }],
  })
);
```

`recent-logs`는 인자가 없는 고정 조회라 Resource로 충분하다. `search-logs`는 조합 조건을 받아야 하니 Tool의 입력 스키마가 필요하다. 같은 로그 데이터라도 "어떻게 접근하느냐"에 따라 알맞은 primitive가 갈린다는 점이 드러난다.

## 애매할 땐 어느 쪽으로

두 기준이 겹치는 회색지대도 있다. 예를 들어 파라미터가 하나뿐인 조회는 URI 템플릿을 쓴 Resource로도, 인자 하나짜리 Tool로도 만들 수 있다. 이럴 때는 클라이언트 지원 범위를 기준으로 삼는 편이 실용적이다. 모든 MCP 클라이언트가 Tool은 기본으로 지원하지만, Resource를 UI에 어떻게 노출할지는 클라이언트마다 다르다 — 아예 Resource 목록을 사용자에게 보여주지 않는 클라이언트도 있다. 확신이 서지 않으면 Tool로 만드는 쪽이 더 많은 클라이언트에서 실제로 동작할 가능성이 높다.

반대로 데이터 목록이 크고 사용자가 직접 골라 붙이는 워크플로(문서·파일·설정값 등)라면 Resource가 맞다. 모델이 매번 "이 파일 내용을 보여줘"라고 도구를 호출하게 만드는 것보다, 사용자가 필요한 파일을 직접 첨부하게 하는 편이 토큰도 아끼고 의도도 명확하다.

결국 기준은 하나로 요약된다. 결정권이 모델에게 있어야 자연스러운 동작이면 Tool, 결정권이 사람이나 클라이언트에게 있어야 자연스러운 동작이면 Resource다. 부작용 유무는 그 결정을 빠르게 걸러주는 첫 번째 체크포인트일 뿐이다.
