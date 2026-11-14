---
title: "AAIF가 10개 프로젝트가 된 날 — Agent Skills 기증이 MCP 개발자에게 뜻하는 것"
pubDate: 2026-11-14T12:20:03Z
section: "mcp"
tags: ["aaif", "agent skills", "mcp", "open responses", "opensandbox"]
area: "T"
description: "2026년 10월 22일 AAIF가 Agent Skills 등 네 프로젝트를 추가해 10개를 호스팅하게 됐다. 세 출처를 교차해 무엇이 바뀌었고 MCP 서버 개발자는 무엇을 확인해야 하는지 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.linuxfoundation.org/press/agentic-ai-foundation-announces-four-new-projects-agent-skills-open-responses-openenv-and-opensandbox"
    title: "Agentic AI Foundation Announces Four New Projects (Linux Foundation)"
  - url: "https://www.unite.ai/agentic-ai-foundation-adds-four-projects-to-reach-10-in-first-year"
    title: "Agentic AI Foundation Adds Four Projects to Reach 10 in First Year (Unite.AI)"
  - url: "https://pasqualepillitteri.it/en/news/26441/anthropic-agent-skills-linux-foundation-en"
    title: "Anthropic Donates Agent Skills to the Linux Foundation, Announces AAIF Move"
---

## 무슨 일이 있었나

2026년 10월 22일, Linux Foundation 산하 Agentic AI Foundation(AAIF)이 샌호제이에서 열린 AGNTCon + MCPCon North America에서 신규 프로젝트 네 개를 발표했다. 2025년 12월 출범 때 MCP, goose, AGENTS.md 세 개로 시작한 재단이 1년 만에 10개 프로젝트를 호스팅하게 됐다. 이 사실은 Linux Foundation 보도자료와 Unite.AI 기사가 일치한다.

## 네 프로젝트를 층별로 보기

보도자료는 네 프로젝트가 에이전트 스택의 서로 다른 층을 맡는다고 설명한다. 이를 개발자 관점에서 다시 정리하면 아래와 같다.

| 프로젝트 | 기증 주체 | 스택에서의 위치 |
| --- | --- | --- |
| Agent Skills | Anthropic | 지침·스크립트를 필요할 때 불러오는 능력 패키지 |
| Open Responses | OpenAI | 여러 모델 제공자를 같은 스키마로 호출하는 인터페이스 |
| OpenEnv | Hugging Face | 에이전트 학습용 RL 환경(컨테이너 서비스) |
| OpenSandbox | Alibaba | 에이전트 코드를 격리 실행하는 샌드박스 |

MCP는 이 표에서 "에이전트가 외부 도구·데이터에 연결되는 층"을 맡는다. 흥미로운 점은 OpenEnv가 환경의 도구 노출 방식으로 MCP를 쓴다는 것이다(보도자료·Unite.AI 공통). 학습 환경에서도 MCP 서버가 재사용되는 셈이다.

## MCP와 Skills는 어떻게 다른가

MCP 서버는 실행 가능한 도구와 데이터를 프로토콜로 노출한다. Skill은 SKILL.md 같은 텍스트와 스크립트 묶음으로, 에이전트가 그 도구를 어떻게 쓸지 알려 준다. 서버를 따로 띄울 필요가 없다는 점이 가장 큰 차이다. 두 표준이 같은 재단에 모였으니 거버넌스 창구도 한 곳으로 모인다.

## 수치는 어디까지 믿을 수 있나

Unite.AI는 AAIF 게시물을 인용해 70개 이상의 플랫폼 지원, 100만 개 이상의 공개 skill, 약 2억 8천만 설치를 전한다. Pillitteri의 기사도 같은 수치를 쓰되 Anthropic의 자체 집계라고 밝히고, 집계 방식이 공개되지 않았으며 같은 skill을 여러 기기에 복사하면 중복 집계될 수 있다고 지적한다. 즉 이 숫자는 확산 규모의 대략적 신호일 뿐, 실제 일일 사용량이 아니다. 또 "70개 이상 플랫폼이 읽는다"는 말이 모든 곳에서 똑같이 동작한다는 뜻도 아니다.

## 개발자 체크리스트

- 이미 skill을 쓰고 있다면 명세 저장소와 도메인이 재단으로 넘어갔다는 점만 알아 두면 된다. 사용·개선에 재단 가입은 필요 없다고 Anthropic 공식 글을 인용한 Pillitteri가 전한다.
- Pillitteri에 따르면 로드맵(버전 번호가 붙은 릴리스, 변경 제안 절차, 보안 지침)은 일정이 없는 제안 단계다. 지금은 skill이 설치 전에 검증되지 않으므로 출처를 직접 확인한다.
- skill은 에이전트와 같은 권한으로 실행되므로, 외부 skill은 코드 의존성과 같은 수준으로 검토한다.
- 사용하려는 에이전트에서 해당 skill을 직접 시험한다.

## 정리

이번 발표의 핵심은 새 기능이 아니라 소유권이다. MCP에 이어 Skills도 한 회사의 손을 떠나 중립 재단으로 갔다. 다만 재단 소속이 곧 보안 검증이나 호환성 보장을 뜻하지는 않는다. 그 부분은 아직 사용자의 몫이다.
