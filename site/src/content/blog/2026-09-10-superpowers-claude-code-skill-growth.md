---
title: "Superpowers — 절차를 강제하는 Claude Code 스킬이 가장 빨리 자란 이유"
pubDate: 2026-09-10T09:56:49Z
section: "mcp"
tags: ["claude code", "superpowers", "agent-skills", "subagent-driven-development", "tdd"]
area: "T"
description: "Claude Code 플러그인 시스템이 열린 첫날 공개된 스킬 Superpowers가 다섯 달 만에 GitHub 스타를 두 배로 불린 과정을, 저자 블로그·GitHub 저장소·리뷰 글·Hacker News 토론을 교차검증해 정리한다. 절차를 강제하는 스킬이 왜 인기와 반발을 동시에 얻는지, MCP와 Skill의 역할이 어떻게 다른지까지 짚는다."
generated: "research-synthesis"
sources:
  - url: "https://github.com/obra/superpowers"
    title: "GitHub - obra/superpowers"
  - url: "https://blog.fsck.com/2025/10/09/superpowers/"
    title: "Superpowers: How I'm using coding agents in October 2025"
  - url: "https://medium.com/@anilmathewm/i-gave-claude-code-a-brain-its-called-superpowers-and-it-has-150-000-github-stars-for-a-reason-16c4074a9209"
    title: "I Gave Claude Code a Brain. It's Called Superpowers"
  - url: "https://news.ycombinator.com/item?id=47624814"
    title: "Hacker News: A Rave Review of Superpowers (For Claude Code) discussion"
---

## 플러그인 시스템 첫날에 나온 프로젝트

2025년 10월 9일, Anthropic이 Claude Code에 플러그인 마켓플레이스를 연 바로 그날 obra/superpowers가 함께 공개됐다. 만든 사람은 개발자 Jesse Vincent(핸들 obra)다. 자신의 블로그에 올린 공개 글에 따르면, 원래는 몇 주간 다듬어온 개인 작업 프로세스를 스킬(Skill)로 정리해 git 저장소를 직접 clone·symlink하는 방식으로 공유할 계획이었는데, 마침 그날 아침 공식 플러그인 시스템이 나오자 배포 방식만 바꿔 예정보다 일찍 내놓았다고 한다. 우연한 동시 출시가 아니라, 새 배포 채널에 맞춰 발표 시점을 당긴 쪽에 가깝다.

## 도구가 아니라 순서를 강제하는 스킬

Superpowers는 새 도구를 얹어주는 스킬이 아니라 작업 순서를 강제하는 스킬이다. GitHub 저장소 설명에 따르면 핵심 흐름은 이렇다. 브레인스토밍으로 스펙을 다듬어 사람의 승인을 받고, 승인된 스펙으로 세부 실행 계획을 쓰고, 계획을 다시 검토받은 뒤, 작업 단위마다 새 서브에이전트를 띄워 red-green TDD로 구현하고 코드 리뷰까지 받는다. 세션 시작 시 "스킬이 있으면 반드시 사용해야 한다"는 지시를 주입해, 모델이 스킬의 존재를 알고도 건너뛰는 상황을 막는 설계다.

## 다섯 달 사이 두 배로 는 스타

성장 속도를 시점별로 짚으면 이렇다.

| 시점 | 스타 수 | 근거 |
|---|---|---|
| 2025-10-09 | 공개 (0에서 시작) | 저자 블로그 |
| 2026-01-15 | 공식 Anthropic 마켓플레이스 등재 | 한 리뷰 글에 따르면 |
| 2026-04-14 | 약 15만, 포크 1만 3천 | 같은 리뷰 글(작성 시점 기준) |
| 2026-09-10(오늘) | 약 28만 3천, 포크 2만 5천 | GitHub 저장소 직접 확인 |

4월과 9월 두 지점만 봐도 다섯 달 사이 스타 수가 거의 두 배로 늘었다. 다만 이 수치는 살아 있는 카운터라서 어느 글이든 "언제 기준인지" 없이 스타 수만 인용하면 다른 시점끼리 비교하는 셈이 된다. 이 글의 숫자도 읽는 시점에는 이미 낡았을 것이다.

## 커뮤니티 반응은 엇갈린다

Hacker News 토론에서는 상반된 평가가 같이 올라왔다. 한 개발자는 브레인스토밍 스킬과, 서브에이전트가 스펙·계획을 맞대응(adversarial)으로 검토하는 방식이 "혼자서는 놓쳤을 문제를 잡아준다"고 평가했다. 반면 같은 사람이 스펙과 계획을 굳이 나누는 데는 의문을 제기했다 — 계획 문서가 결국 마크다운 안의 코드 블록으로 끝나 버려, 모델이 스펙만으로 바로 구현에 들어가도 될 만큼 좋아졌다는 것이다. 강제된 프로세스가 모두에게 이득은 아니라는 뜻이고, 이미 자기 워크플로가 잡힌 개발자에게는 단계가 늘어나는 비용으로 느껴질 수 있다.

## MCP 서버 개발자가 참고할 점

이 블로그가 다룬 Agent Plugins 1.0, Claude Skills API GA와 Superpowers를 나란히 놓으면 역할 구분이 또렷해진다. MCP는 에이전트에게 외부 도구·데이터 접근 권한을 주는 배관이고, Skill은 그 배관을 어떤 순서로 쓸지 알려주는 절차서다. MCP 서버 하나를 잘 만드는 일과, 그 서버를 어떻게 쓸지 절차로 문서화하는 일은 완전히 다른 작업이라는 걸 Superpowers 사례가 보여준다. 자기 프로젝트에 이런 스킬을 들이려면 스타 수보다 SKILL.md 원문을 직접 읽고, 강제되는 순서가 실제 작업 리듬과 맞는지부터 확인하는 편이 낫다.
