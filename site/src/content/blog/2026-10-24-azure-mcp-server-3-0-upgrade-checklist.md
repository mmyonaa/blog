---
title: "Azure MCP Server 3.0 안정판: 도구가 늘어난 것보다 업그레이드 체크리스트가 중요하다"
pubDate: 2026-10-24T09:39:00Z
section: "mcp"
tags: ["azure-mcp-server", "mcp", "azure", "최소권한"]
area: "T"
description: "Azure MCP Server 3.0 안정판의 변경점을 공식 블로그·릴리스 페이지·기사로 교차검증하고, 깨지는 지점 중심의 업그레이드 체크리스트와 읽기 전용 시작법을 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://devblogs.microsoft.com/azure-sdk/azure-mcp-server-3-0-stable-release"
    title: "Azure MCP Server 3.0 stable release (Azure SDK Blog)"
  - url: "https://visualstudiomagazine.com/articles/2026/10/20/azure-mcp-server-3-0-adds-cloud-operations-tools-for-ai-agents.aspx"
    title: "Azure MCP Server 3.0 Adds Cloud Operations Tools for AI Agents (Visual Studio Magazine)"
  - url: "https://github.com/microsoft/mcp/releases"
    title: "Releases - microsoft/mcp (GitHub)"
---

Microsoft가 오픈소스 Azure MCP Server의 3.0 안정판을 냈다. 에이전트가 Azure 리소스를 조회하고 다루게 해 주는 MCP 서버다. 새 도구 목록보다 눈여겨볼 것은 기존 연동을 깨뜨릴 수 있는 변경이다. 이 글은 변경점을 그 관점으로 다시 묶는다.

## 타임라인과 출처 간 차이

| 시점 | 사건 |
| --- | --- |
| 10월 12일 | 3.0 안정판 릴리스 (공식 블로그 기준) |
| 10월 14일 | 공식 블로그 공지 게시 |
| 10월 20~21일 | GitHub 릴리스 페이지에 4.0.0-beta.1, beta.2 등록 |

기사(Visual Studio Magazine)는 공지일인 14일을 기준으로 쓰고, 릴리스일 12일은 공식 블로그에만 나온다. 그래서 12일은 공식 블로그에 따른 날짜로 적는다. 또 릴리스 페이지에서는 이미 4.0 베타가 진행 중이어서, 3.0은 최신 줄기가 아니라 안정 줄기라는 점을 알 수 있다.

## 새로 들어온 것

공식 블로그에 따르면 Backup, Resilience Management, Azure SRE Agent(55개 명령), Terraform, Advisor 최적화 도구가 추가됐다. 다만 SRE Agent 도구는 여전히 프리뷰 리소스 공급자를 쓰므로, MCP 서버가 안정판이 되어도 아래 서비스의 가용성은 그대로다. 두 출처는 이 점에서 일치한다.

## 업그레이드 체크리스트

두 출처가 공통으로 꼽은 항목을 위험도 순으로 재배열했다.

1. **데이터베이스 쿼리 도구의 성격 변경**: MySQL·PostgreSQL 쿼리 도구는 이제 읽기 전용이 아닌 파괴적 도구로 분류되고, SQL 동사 필터도 사라졌다. 허용 범위는 로그인한 계정의 DB 권한이 정한다.
2. **알 수 없는 파라미터는 오류**: 예전 호출에 남은 쓸모없는 옵션(구독, 리소스 그룹, 테넌트 등)을 정리해야 한다.
3. **응답 구조 변경**: 일부 응답이 `results`, `servers` 같은 래퍼로 감싸진다. 파서와 테스트 픽스처를 갱신한다.
4. **이름 변경**: 프리뷰 사용자는 `resilience`를 `resiliency`로 바꿔야 한다. 필터와 허용 목록의 접두사도 포함이다.
5. **HTTP 클라이언트**: 공식 블로그에 따르면 서버는 stateless 프로토콜 `2026-07-28`을 쓰며, 이 버전의 클라이언트는 모든 POST에 `Mcp-Method`, `Mcp-Name` 헤더를 보내야 한다. `2025-11-25` 클라이언트는 호환 협상된다.
6. **VM 생성**: 이미지를 명시해야 한다.

## 보안 기본값은 신규 리소스에만 적용된다

새 Storage 계정은 Shared Key 인증이 꺼지고, 새 Event Hubs 네임스페이스는 로컬 인증이 꺼지며, 새 Recovery Services 자격 증명 모음은 공용 네트워크가 막힌다. 두 출처 모두 기존 리소스는 바뀌지 않는다고 밝힌다. 구조화 출력(`outputSchema`)은 기본이 꺼져 있고 옵션으로 켠다.

## 읽기 전용으로 시작하기

공식 블로그의 예시를 줄인 VS Code 설정이다(Node.js, Azure CLI 로그인, 호환 MCP 클라이언트 전제).

```json
{
  "servers": {
    "azure-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@azure/mcp@3.0.0", "server", "start", "--read-only"]
    }
  }
}
```

공식 블로그의 말대로 자연어 프롬프트는 접근 제어를 대신하지 못한다. 개발용 구독과 필요한 권한만 가진 계정으로 시작하고, 쓰기 도구는 승인 절차를 갖춘 뒤에 연다.
