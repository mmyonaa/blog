---
title: "REA: 바이너리를 읽는 MCP 서버가 GitHub 트렌딩 1위가 된 이유"
pubDate: 2026-10-20T10:13:07Z
section: "mcp"
tags: ["rea", "mcp", "ghidra", "reverse-engineering", "claude-code"]
area: "T"
description: "소스 없이 바이너리와 네트워크 캡처를 분석하게 해 주는 오픈소스 MCP 서버 REA의 구조와, 보도마다 엇갈리는 별 수치를 교차검증하고 도입 전 점검 항목을 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://github.com/morluto/rea"
    title: "morluto/rea - GitHub 저장소"
  - url: "https://techgig.com/news/ai/rea-server-enables-ai-agents-to-reverse-engineer-software/134948678"
    title: "REA server enables AI agents to reverse engineer software - TechGig"
  - url: "https://startupfortune.com/an-ai-tool-called-rea-now-reverse-engineers-software-in-minutes-not-years"
    title: "An AI tool called REA now reverse engineers software in minutes not years - Startup Fortune"
---

10월 첫 주 이후 GitHub 트렌딩을 점령한 프로젝트가 REA(Reverse Engineer Anything)다. 모델이 아니라 MCP 서버라는 점이 눈에 띈다. MCP를 "에이전트에게 도구를 쥐여 주는 규격"으로만 알고 있다면, 이 사례는 도구의 범위가 어디까지 넓어졌는지 보여 준다.

## REA가 하는 일

저장소 설명은 "에이전트와 함께 앱 동작부터 네이티브 바이너리까지 역분석한다"는 한 줄이다. TechGig 보도에 따르면 Claude Code나 Codex 같은 에이전트가 네이티브 바이너리, Electron 앱, .NET 어셈블리, Android APK, 웹사이트, 저장된 네트워크 캡처를 분석 대상으로 삼고, REA는 의사코드·모듈 그래프·요청 로그와 근거를 구조화해 돌려준다. 같은 기능을 CLI로도 쓸 수 있고, 분석은 로컬에서 돈다.

핵심은 REA가 디스어셈블러를 대체하지 않는다는 점이다. Startup Fortune은 Ghidra, Hopper, IDA Pro의 출력을 에이전트가 읽기 좋은 형태로 넘겨 주는 층이라고 설명한다. TechGig는 깊은 네이티브 분석에는 Hopper·Ghidra·IDA 같은 엔진이 따로 필요하지만, 정적 JavaScript·.NET·웹사이트·캡처 분석은 추가 엔진 없이 된다고 적는다. 저장소 커밋 기록에도 Hopper와 pwndbg 연동 수정이 보여, 외부 도구를 감싸는 구조라는 설명과 맞는다.

## 별 수치는 출처마다 다르다

인기 규모는 보도가 엇갈린다.

| 출처 | 시점 | 별 | 포크 |
| --- | --- | --- | --- |
| TechGig | 10월 14일 | 11만 5천 이상 | 2만 5천 이상 |
| Startup Fortune | 10월 14일 | 23만 4천 이상 | 5만 8천 이상 |
| GitHub 저장소 페이지 | 10월 19~20일 | 약 32만 5천 | 약 8만 2천 |

같은 날짜인데 두 기사의 수치가 두 배 가까이 벌어진다. 집계 시각이나 방식 차이로 보이지만 원인은 확인하지 못했다. 신뢰할 수 있는 것은 "며칠 만에 수십만 단위로 늘었다"는 방향까지다. 정확한 숫자는 저장소 페이지를 직접 보는 편이 낫다.

## 도입 전 점검 목록

- 분석 대상이 내 소유이거나 분석 권한이 있는 소프트웨어인가. 문서가 내세우는 용도는 보안 연구, 침해 대응, CTF, 자기 소프트웨어 디버깅, 상호운용성이다.
- 필요한 엔진(Hopper, Ghidra와 JDK, IDA)을 갖췄는가. 없다면 웹·캡처 분석부터 시작할 수 있다.
- 결과를 근거와 함께 검증하는가. TechGig에 따르면 REA는 결과마다 출처(바이트 범위, JSON 포인터)를 달고 판단하지 못한 부분도 명시한다. 에이전트의 설명을 그대로 믿지 말고 이 근거를 대조한다.
- 지식재산권 문제를 따졌는가. Startup Fortune은 같은 워크플로가 상용 소프트웨어 복제나 게임 포팅에도 쓰인다고 지적한다. 이 주장은 해당 매체의 보도에 근거하며, 이 글에서 독립적으로 확인하지 않았다.

## 개발자 관점의 의미

MCP 서버를 만들 때 REA의 설계에서 가져갈 점은 두 가지다. 하나는 이미 검증된 전문 도구를 직접 다시 만들지 않고 얇게 감싸 에이전트에 연결한 구조다. 다른 하나는 모든 결과에 근거와 한계를 붙이는 출력 규약이다. 도구가 강력해질수록 "무엇을 알아냈는가"만큼 "무엇을 모르는가"를 함께 돌려주는 설계가 중요해진다.
