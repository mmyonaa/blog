---
title: "MCP 생태계는 리비전 다섯 개를 동시에 말한다 — 최신 클라이언트가 조용히 실패하는 자리"
pubDate: 2026-10-15T12:17:23Z
section: "mcp"
tags: ["mcp", "protocol-version", "server-discover", "server-card", "stateless"]
area: "T"
related: ["2026-08-16-mcp-2026-07-28-stateless-spec"]
description: "2026-07-28이 현재 스펙이지만 원격 엔드포인트 조사에서 최신 리비전을 말한 곳은 4%였다. 스펙이 설계한 버전 협상과 실제 생태계의 간격을, 호환성 표와 dual-era 구현 지침으로 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning"
    title: "Versioning and Compatibility (MCP 2026-07-28 specification)"
  - url: "https://modelcontextprotocol.io/specification/versioning"
    title: "Versioning (Model Context Protocol)"
  - url: "https://modelcontextprotocol.io/seps/2127-mcp-server-cards"
    title: "SEP-2127: MCP Server Cards - HTTP Server Discovery"
  - url: "https://dev.to/pennyforgehq/the-mcp-ecosystem-is-speaking-five-revisions-at-once-here-is-the-dated-count-3amd"
    title: "The MCP Ecosystem Is Speaking Five Revisions at Once. Here Is the Dated Count. (PennyForge)"
---

2026-07-28 리비전이 현재 스펙이 된 지 두 달 반이 지났다. 그런데 원격 MCP 서버에 붙여 보면 돌아오는 응답의 세대가 제각각이다. 스펙은 버전 불일치를 명시적 에러로 처리하도록 설계했는데, 그 에러를 낼 줄 아는 서버가 아직 소수다.

## 한 생태계, 다섯 개의 리비전

PennyForge가 2026년 10월 1일 원격 엔드포인트 186개를 훑은 결과다. 한 곳의 단발 조사이니 정확한 비율보다 분포의 모양으로 읽는 편이 낫다.

| 리비전 | 엔드포인트 | 비중 |
| --- | --- | --- |
| 2025-11-25 | 36 | 19% |
| 2025-06-18 | 21 | 11% |
| 2026-07-28 | 7 | 4% |
| 2025-03-26 · 2024-11-05 | 8 | 5% |

나머지 46%는 인증 뒤에 가려 보이지 않았다. 최신 리비전을 말한 엔드포인트는 4%뿐이고, 함께 조사한 로컬 npm 서버들은 2025-06-18만 말했다.

## 스펙은 핸드셰이크를 버렸다

2026-07-28에는 `initialize` 핸드셰이크가 없다. 모든 요청이 `_meta`의 `io.modelcontextprotocol/protocolVersion`으로 자기 버전을 선언하고, HTTP에서는 `MCP-Protocol-Version` 헤더에도 같은 값이 실린다. 서버는 요청마다 독립적으로 받거나 거절한다.

거절할 때는 `-32022` 에러에 `data.supported`로 지원 버전을 실어야 한다. 클라이언트는 거기서 겹치는 값을 골라 재시도한다. 서버는 `server/discover`도 반드시 구현해야 하며, 클라이언트는 그걸 먼저 불러 지원 버전을 미리 받을 수 있다.

## MUST와 현실 사이

같은 조사의 다음 날 재측정에서, 응답한 엔드포인트 109개 중 `server/discover`를 받아 준 곳은 3개였다. MUST로 못 박은 RPC가 현실에서는 예외에 가깝다.

스펙의 호환성 표는 이 상황을 이미 적어 두었다. 핸드셰이크로 세션을 여는 세대가 legacy, 요청마다 메타데이터를 싣는 세대가 modern이다.

| 클라이언트 | 서버 | 결과 |
| --- | --- | --- |
| modern | legacy | 실패 |
| legacy | modern | 실패 |
| dual-era | legacy · modern | 동작 |

지금의 서버 분포를 겹치면 결론은 하나다. modern 전용 클라이언트는 상당수 서버에서 실패한다. 게다가 legacy 서버는 modern 에러를 낼 줄 몰라 침묵하거나 엉뚱한 의미로 요청을 처리하기도 한다. 실패가 에러로 드러나지 않는 쪽이 더 고약하다.

## 그래서 무엇을 해야 하나

클라이언트를 만든다면 dual-era가 기본값이다. stdio에서는 `server/discover`를 먼저 던지고 알아보지 못하는 에러가 오면 `initialize`로 내려간다. HTTP에서는 modern 요청을 보낸 뒤 `400`의 본문을 열어 판단한다. 한 번 가린 세대는 서버 단위로 캐시하라고 스펙이 권한다.

서버를 만든다면 두 세대를 같은 엔드포인트에서 받는 쪽이 안전하다. modern 전용이라면 `initialize`에 돌려주는 에러에 지원 버전을 적어 두자. legacy 클라이언트에는 올라올 방법이 없어 그 문장이 유일한 단서가 된다.

연결하기 전에 알아내려는 작업도 있다. SEP-2127(Server Cards)은 신원·엔드포인트·지원 버전을 담은 정적 문서를 `<streamable-http-url>/server-card`에 두자는 제안으로 Final 상태다. 도구 목록은 일부러 뺐다. 사용자나 설정에 따라 달라지는 값을 정적 문서가 약속할 수 없어서다.
