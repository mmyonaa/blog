---
title: "Agent Plugins 1.0 — MCP와 Skill을 한 상자에 담는 표준, 그런데 감독자는 누구인가"
pubDate: 2026-09-05T05:26:15Z
section: "mcp"
tags: ["mcp", "agent-plugins", "agent-skills", "google"]
area: "T"
description: "Amazon·Cursor·Microsoft·OpenAI·Vercel이 만든 Agent Plugins 1.0.0에 Google이 core maintainer로 합류했다는 소식이 나왔지만, 실제 GitHub 거버넌스 파일을 직접 확인해보면 이야기가 다르다. 스펙이 무엇을 표준화하고 무엇을 의도적으로 비워뒀는지, \"compatible\" 표시가 실제로 보장하는 범위가 얼마나 좁은지 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://developers.googleblog.com/agent-plugins-package-your-skills-tools-and-more"
    title: "Agent Plugins package your skills, tools, and more"
  - url: "https://thenewstack.io/agent-plugins-portability-gaps"
    title: "Anthropic defined the standards inside Agent Plugins. So why isn't it helping govern the format?"
  - url: "https://hackernoon.com/what-the-first-ai-plugin-standard-reveals-about-ais-future"
    title: "What the First AI Plugin Standard Reveals About AI's Future"
  - url: "https://github.com/agentplugins/agent-plugins-spec/blob/main/MAINTAINERS.md"
    title: "MAINTAINERS.md - agentplugins/agent-plugins-spec"
---

스킬 하나와 그 스킬이 쓰는 MCP 서버 하나를 만들어 뒀다고 하자. 한 클라이언트에는 잘 붙는다. 문제는 두 번째 클라이언트에 배포할 때다. 디렉터리 구조가 다르고, 매니페스트가 요구하는 최상위 필드가 다르고, MCP 설정이 트랜스포트를 추론하는 방식도 다르다. 결국 패키지를 통째로 포크해 똑같은 기능을 두 벌 유지보수하게 된다.

이 "포크 후 표류(fork-and-drift)" 문제를 풀겠다고 나온 것이 Agent Plugins 1.0.0이다. Amazon·Cursor·Microsoft·OpenAI·Vercel이 만들었고, Google이 2026년 8월 6일 core maintainer로 합류한다고 발표했다.

## 표준화하는 것과 하지 않는 것

Agent Plugins가 규정하는 건 딱 하나, "어디에 무엇을 두느냐"다. 플러그인은 그냥 디렉터리다. 루트에 `plugin.json`, 스킬은 `skills/` 아래 하나씩, MCP 서버 설정은 `mcp.json`에 둔다. 매니페스트 필수 필드는 `$schema`와 `name` 두 개뿐이다. 스킬 포맷 자체는 Agent Skills 스펙이, MCP 서버 동작은 MCP 스펙이 그대로 소유한다 — Agent Plugins는 위치만 고정할 뿐 두 스펙 위에 새 규칙을 얹지 않는다.

대신 설치 방법, 배포 경로, 권한 모델, 샌드박싱, 게시자 신원·서명 검증은 전부 범위 밖이다. 프로젝트 스스로 "미래 과제"로 못박아 둔 부분이다.

## "합류"는 완료된 사실인가

여기서부터 출처가 엇갈린다. Google 공식 블로그는 Amazon·Cursor·Microsoft·OpenAI·Vercel 5개사의 위원회에 Google이 합류한다고 적었다. 반면 한 매체는 OpenAI·AWS·Microsoft·GitHub·Cursor·Vercel 6개사가 스펙을 냈고 Google이 "24시간 안에" 합류했다고 보도했는데, GitHub은 Google의 발표문 어디에도 나오지 않는다.

직접 GitHub 저장소(agentplugins/agent-plugins-spec)의 `MAINTAINERS.md`를 확인해봤다. 이 글을 쓰는 시점 기준 명단은 Clare Liguori(Amazon), Roshan Sadanani(Cursor), Harald Kirschner(Microsoft), Gav Verma(OpenAI), Jonathan Hefner(Vercel) 다섯 명뿐이고 Google이나 Kevin Hou는 없다. 발표문과 거버넌스 기록의 실제 상태가 어긋나 있다는 뜻이다. "합류한다"는 표명과 "합류가 반영됐다"는 사실은 다른 문제이고, 투표권을 기준으로 본다면 지켜봐야 할 건 블로그 글이 아니라 이 파일이다. 아울러 MCP와 Agent Skills 둘 다 원래 Anthropic이 설계해 공개한 스펙인데도, 정작 그 위원회에는 Anthropic이 없다는 점도 여러 매체가 공통으로 짚는 대목이다.

## "compatible"의 실제 의미

스펙 11절은 클라이언트가 스킬 또는 MCP 서버 중 하나만 지원해도 표준 준수로 인정한다. 그 결과 아래 두 클라이언트는 공통 기능이 하나도 없어도 둘 다 준수 클라이언트다.

| 클라이언트 | Skill 지원 | MCP 지원 | stdio | Streamable HTTP | 표준 준수 |
|---|---|---|---|---|---|
| A | O | X | - | - | O |
| B | X | O | O | X | O |

스킬과 MCP 서버를 함께 담은 플러그인 하나가 A에서는 스킬만, B에서는 서버만 로드되고 둘 다 "정상 동작"으로 취급된다. 실제 상호운용 여부를 알려주는 건 준수 여부 자체가 아니라 각 클라이언트가 공개하는 개별 지원 매트릭스다.

## 지금 적용 전 확인할 것

배포하려는 클라이언트가 스킬과 MCP를 모두 지원하는지 공식 호환 클라이언트 목록에서 직접 확인하고, 배포·서명·권한 정책은 이 스펙 밖에서 따로 세워야 한다. 스킬 하나, MCP 서버 하나만 배포한다면 굳이 플러그인 포맷을 쓸 이유도 없다 — 기존 `mcp.json` 하나로 충분하다.
