---
title: "Uber MCP Gateway 설계: 서버가 수백 개가 되면 MCP에서 무엇이 먼저 무너지나"
pubDate: 2026-10-05T12:25:00Z
section: "mcp"
tags: ["MCP Gateway", "Uber", "mcp", "MCP Registry", "Omni MCP"]
area: "T"
description: "Uber가 공개한 MCP Gateway 설계를 보안 업계 보고서와 교차해 읽고, MCP 서버가 수백 개로 늘 때 생기는 거버넌스와 컨텍스트 문제를 체크리스트로 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.uber.com/ca/en/blog/designing-mcp-gateway"
    title: "Designing MCP Gateway: Uber's MCP Management Platform"
  - url: "https://www.infosecurity-magazine.com/news/mcp-creating-major-governance-gaps/"
    title: "MCP Is Creating Major Governance Gaps, Researchers Warn"
  - url: "https://www.csoonline.com/article/4087656/what-cisos-need-to-know-about-new-tools-for-securing-mcp-servers.html"
    title: "What CISOs need to know about new tools for securing MCP servers"
---

MCP 서버 하나를 만드는 일은 쉽다. 문제는 팀마다 서버를 따로 만들기 시작한 뒤에 생긴다. Uber는 2026년 10월 1일 엔지니어링 블로그에서 이 문제를 풀려고 만든 MCP Gateway의 설계를 공개했다. 이 글은 그 내용을 보안 업계 자료와 맞대어, 개발자가 자기 프로젝트에 가져갈 만한 점검 항목으로 다시 정리한다.

## Uber가 겪은 문제와 구조

Uber에 따르면 팀들이 각자 MCP 통합을 만들면서 도구 발견이 어려워지고 인프라가 중복됐다. 해법은 게이트웨이 한 겹이다. 구조는 둘로 나뉜다.

| 구성 | 역할 |
|---|---|
| MCP Registry (control plane) | 서버·도구 목록, 소유자, 활성화 상태의 단일 출처 |
| Proxy Gateway (data plane) | MCP 호출을 HTTP·gRPC·TChannel로 변환해 기존 서비스에 전달 |

기존 API를 고치지 않고 도구로 노출한다는 점이 핵심이다. 다만 서버 800개 이상, 도구 5000개 이상이라는 규모는 Uber 글에만 나오는 수치이므로 "Uber에 따르면"으로 읽어야 한다.

## 설계에서 가져갈 세 가지

1. **발견이 곧 노출은 아니다.** 크롤러가 서비스 정의에서 도구를 자동 생성하되 전부 비활성 상태로 등록하고, 소유 팀이 검토해 켠다. 도구 설명이 바뀌면 diff 승인을 거친다. 도구 설명은 모델이 읽는 입력이라 변경 관리가 보안과 직결된다.
2. **권한과 마스킹을 한곳에서.** 호출자(사람·서비스·에이전트)별 정책을 서버 단위로 걸고 도구 단위로 덮어쓸 수 있으며, 응답의 민감 정보는 게이트웨이가 가린다.
3. **컨텍스트 비용을 줄인다.** 서버가 수백 개면 도구 정의만으로 모델 컨텍스트가 찬다. Uber는 서버·도구를 점진적으로 찾는 Omni MCP, 응답에서 필요한 필드만 남기는 Response Projection, 도구 정의를 컨텍스트에 싣지 않고 CLI로 호출하는 Code Mode를 소개했다.

## 보안 자료와 맞춰 보기

Infosecurity Magazine가 전한 Ox Security 보고서는 공개 레지스트리 세 곳의 서버 15,465개를 분석해, 호스트명의 일부가 더 이상 해석되지 않고 구매 가능한 상태라 서버 사칭이 가능하다고 주장했다. 이는 한 업체의 주장이다. 한편 CSO Online은 인증이 선택 사항이고 프롬프트 인젝션·도구 오염 같은 위험이 남아 있으며, 업계가 게이트웨이·섀도 MCP 서버 탐지 제품으로 대응 중이라고 정리한다. 세 출처의 방향은 같다. 프로토콜이 아니라 그 위의 운영 계층이 빈자리라는 것이다. 어긋나는 지점은 해법의 위치다. Uber는 사내 플랫폼으로 직접 만들었고, 시장은 제품으로 판다.

## 도입 전 체크리스트

- 사내에서 도는 MCP 서버의 목록과 소유자가 있는가
- 새로 발견된 도구가 기본 비활성이고 승인 후에만 켜지는가
- 도구 설명 변경에 리뷰와 롤백 경로가 있는가
- 호출 주체별 권한과 응답 마스킹이 서버 코드가 아닌 공통 계층에 있는가
- 에이전트에 도구 정의를 전부 싣지 않고 필요할 때 찾게 하는가

서버가 열 개 안팎이면 과한 구조일 수 있다. 그래도 앞의 두 항목은 규모와 상관없이 지금 적용할 수 있다.
