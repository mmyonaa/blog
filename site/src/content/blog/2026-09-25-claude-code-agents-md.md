---
title: "Claude Code가 AGENTS.md를 읽기 시작했다 — 그런데 CLAUDE.md는 안 사라진다"
pubDate: 2026-09-25T10:21:17Z
section: "mcp"
tags: ["claude code", "agents.md", "claude.md", "agentic-ai-foundation"]
area: "T"
description: "Claude Code 2.1.277이 AGENTS.md를 프로젝트 지침 파일로 읽기 시작했다. CLAUDE.md가 있으면 여전히 그쪽이 우선인 fallback 방식이라는 점, AGENTS.md가 리눅스 재단 Agentic AI Foundation 산하 중립 표준이라는 배경, 그리고 여러 코딩 에이전트를 함께 쓰는 팀이 두 파일을 어떻게 나눠야 하는지를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://agents.md/"
    title: "AGENTS.md — a simple, open format for guiding coding agents"
  - url: "https://windowsforum.com/news/claude-code-2-1-277-adds-agents-md-fallback-not-merge.445031"
    title: "Claude Code 2.1.277 Adds AGENTS.md Fallback, Not Merge"
  - url: "https://ai-tldr.dev/releases/anthropic-claude-code-2-1-277"
    title: "Claude Code 2.1.277 — AGENTS.md works when there's no CLAUDE.md"
---

## 무엇이 바뀌었나

2026년 9월 18일 나온 Claude Code 2.1.277은 프로젝트 지침 파일로 `AGENTS.md`를 읽는 기능을 추가했다. 지금까지 Claude Code는 저장소 루트의 `CLAUDE.md`만 봤다. 이 버전부터는 `CLAUDE.md`가 없는 저장소에서 `AGENTS.md`를 대신 읽는다.

다만 순서가 중요하다. `CLAUDE.md`가 있으면 `AGENTS.md`는 무시된다 — 이번 변경은 "병합"이 아니라 "대체가 없을 때의 대안"이다. 이 저장소처럼 `CLAUDE.md`를 이미 쓰고 있다면 동작은 그대로다. 어떤 파일을 우선할지는 `/config`의 "Project instructions" 항목에서 직접 고를 수 있고, Claude 전용·CLAUDE.md-or-AGENTS.md(기본값)·둘 다 읽기·관리자 강제 항목까지 여러 모드가 있다. Bedrock·Vertex·Foundry로 배포된 Claude Code는 아직 이 기능이 없다.

## AGENTS.md는 누구 것인가

`AGENTS.md`는 OpenAI Codex 팀 주도로 시작된 포맷이지만, 지금은 리눅스 재단 산하 Agentic AI Foundation이 관리하는 중립 표준이다. README가 사람을 위한 설명이라면 AGENTS.md는 빌드·테스트 명령, 코드 스타일, PR 규칙처럼 에이전트에게 필요한 세부 지침을 담는 자리다. 형식에 강제 스키마는 없고, 모노레포에서는 하위 디렉터리마다 별도 파일을 둘 수 있으며 가장 가까운 파일이 우선한다. 공식 사이트는 60,000개 넘는 오픈소스 프로젝트가 이미 채택했다고 밝히고 있고, Codex·Cursor·Gemini CLI·VS Code·GitHub Copilot 등 지원 도구 목록도 길다.

## 그래서 뭘 해야 하나

당장 코드를 바꿀 필요는 없다. 이미 `CLAUDE.md`가 있는 저장소는 이번 업데이트로 아무것도 달라지지 않는다. 다만 Claude Code 외에 Codex나 Copilot처럼 AGENTS.md를 읽는 도구를 함께 쓰는 팀이라면 정리해 둘 시점이다.

| 상황 | 권장 대응 |
| --- | --- |
| Claude Code만 쓴다 | 지금처럼 CLAUDE.md 유지 |
| 여러 에이전트를 함께 쓴다 | 공통 규칙은 AGENTS.md로, Claude 전용 규칙(스킬·훅·서브에이전트 워크플로)만 CLAUDE.md에 남긴다 |
| 두 파일을 동시에 쓴다 | 같은 규칙을 양쪽에 복사하지 않는다 — 한쪽이 최신, 다른 쪽이 그걸 가리키는 구조가 안전하다 |
| Bedrock·Vertex·Foundry 배포 | AGENTS.md를 당장 읽지 않으므로 CLAUDE.md를 유지한다 |

핵심은 "이름을 바꾸는 것"과 "권한을 정리하는 것"을 같은 일로 착각하지 않는 데 있다. AGENTS.md는 코드를 실행하지 않는 평범한 텍스트 파일이지만, 셸 접근 권한을 가진 에이전트에게는 다음에 무엇을 할지 알려주는 지침서이기도 하다. CI 워크플로 파일이나 Dockerfile을 리뷰하듯, 이 파일에 대한 변경도 같은 수준의 리뷰를 거치는 편이 안전하다.
