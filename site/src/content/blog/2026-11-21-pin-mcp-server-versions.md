---
title: "MCP 서버 업그레이드 도구는 왜 보관됐나 — 최신 자동 추적 대신 버전 고정"
pubDate: 2026-11-21T13:36:15Z
section: "mcp"
tags: ["mcp", "mcp-upgrade", "버전 고정", "rug pull", "npx"]
area: "T"
description: "MCP 서버를 한 번에 올려주던 mcp-upgrade가 2026년 10월 보관(archived)된 이유를 출발점으로, 도구 정의가 바뀌는 위험과 버전 고정 운영법을 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://github.com/GeiserX/mcp-upgrade"
    title: "GeiserX/mcp-upgrade (archived)"
  - url: "https://www.swarmia.com/blog/github-jira-mcp-servers-engineering-reporting"
    title: "The GitHub and Jira MCP servers are great until you ask them about the whole org (Swarmia)"
  - url: "https://jetstream.security/insights/mcp-server-security-questions"
    title: "6 Questions to Ask Before You Connect to an MCP Server (JetStream)"
  - url: "https://www.ovaledge.com/blog/mcp-server-security"
    title: "MCP Server Security: Enterprise Risks & Checklist (OvalEdge)"
---

## 무슨 일이 있었나

설치된 MCP 서버를 클라이언트(Claude Code, Cursor, VS Code 등) 설정에서 찾아 한 번에 업그레이드해 주던 오픈소스 CLI `mcp-upgrade`가 2026년 10월 말 보관(archived) 처리됐다. 저장소 README에 남긴 이유가 눈여겨볼 만하다. 작성자는 "모든 서버를 최신으로 올린다"는 모델 자체가 틀렸다고 적었다.

## 왜 모델이 틀렸나

`npx -y 패키지`나 `uvx 패키지`는 실행할 때마다 최신 버전을 받아 온다. 그러니 업그레이드 도구가 없어도 이미 "자동 최신" 상태다. 문제는 최신이라는 점 자체다. 검토하지 않은 업데이트가 도구가 에이전트에게 말하는 내용을 바꿀 수 있기 때문이다. 일반 라이브러리와 다른 점은, MCP 서버가 코드뿐 아니라 도구 이름·설명·스키마라는 텍스트도 공급하고 모델이 이를 지침으로 읽는다는 것이다(JetStream).

## 교차 확인된 사실과 한 출처의 주장

| 항목 | 상태 | 근거 |
|---|---|---|
| 버전을 고정하고 리뷰를 거쳐 올려야 한다 | 세 출처 일치 | mcp-upgrade, JetStream, OvalEdge |
| 승인 뒤 도구 설명이 바뀌는 rug pull 위험 | 두 출처 일치 | JetStream, OvalEdge |
| postmark-mcp가 이메일을 몰래 BCC | 두 출처 일치(다운로드 수는 1,643회 vs "1,600회 이상"으로 표기만 다름) | JetStream, OvalEdge |
| Jira 검색 도구가 호출당 5건만 반환한 사례 | Swarmia 글에 따르면(해당 이슈 인용), 단독 출처 | Swarmia |

마지막 항목은 단정할 수 없다. 다만 도구 동작이 업스트림 사정으로 바뀌면 집계 결과가 조용히 틀어질 수 있다는 점은 보여 준다.

## 개발자 관점의 대응

1. 설정에 버전을 명시한다. 프로젝트 `.mcp.json` 예시다(`some-mcp-server`는 자리표시용 이름이다).

```json
{
  "mcpServers": {
    "example": {
      "command": "npx",
      "args": ["-y", "some-mcp-server@1.2.3"]
    }
  }
}
```

uvx는 README가 안내하는 대로 `패키지==1.2.3` 형태로 고정한다.

2. 올릴 때는 일반 의존성처럼 풀 리퀘스트로 처리하고, 변경 로그와 도구 목록의 차이를 함께 본다.
3. 도구 정의를 해시해 두고 달라지면 재승인을 요구하는 방식은 JetStream과 OvalEdge 모두 권고한다. 다만 이를 기본 제공하는 클라이언트인지는 각자 확인해야 한다.
4. 서버가 쓰는 자격 증명 범위를 줄이고, 쓰지 않는 도구는 끈다.

## 정리

MCP 서버는 "설치하고 잊는" 도구가 아니라 공급망의 일부다. 자동 최신을 편의로 보던 관성이 보안 측면에서는 위험 요인이었고, 업그레이드 도구의 퇴장은 그 점을 드러낸 사례다. 고정과 리뷰를 습관으로 만드는 편이 낫다.
