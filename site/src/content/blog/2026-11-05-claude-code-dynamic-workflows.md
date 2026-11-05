---
title: "Claude Code의 dynamic workflows: 서브에이전트 수백 개를 스크립트로 부리는 방식"
pubDate: 2026-11-05T13:21:59Z
section: "mcp"
tags: ["claude-code", "dynamic-workflows", "subagent", "opus-4.8", "bun"]
area: "T"
description: "Opus 4.8과 함께 나온 Claude Code dynamic workflows를 Anthropic 공지 두 건과 외부 기사로 교차검증해, 동작 구조와 출처 간 어긋나는 수치, 도입 전 체크리스트를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.anthropic.com/news/claude-opus-4-8"
    title: "Introducing Claude Opus 4.8 - Anthropic"
  - url: "https://claude.com/blog/introducing-dynamic-workflows-in-claude-code"
    title: "Introducing dynamic workflows in Claude Code - Claude"
  - url: "https://memeburn.com/claude-opus-4-8-anthropic-launches-its-most-capable-ai-model"
    title: "Claude Opus 4.8: Anthropic Launches Its Most Capable AI Model Yet With Dynamic Workflows and Agent Swarms - Memeburn"
---

## 한 에이전트로 안 풀리는 일

Anthropic은 2026년 5월 28일 Claude Opus 4.8을 내놓으며 Claude Code에 dynamic workflows를 함께 공개했다. 핵심은 Claude가 작업마다 오케스트레이션 스크립트를 직접 작성하고, 그 스크립트가 서브에이전트를 병렬로 돌린다는 점이다. 파일 수백 개에 걸친 마이그레이션이나 저장소 전체 버그 탐색처럼 한 번의 대화로는 감당이 안 되던 작업이 대상이다.

## 동작 구조

Anthropic 글을 기준으로 정리하면 다음과 같다.

1. Claude가 프롬프트를 하위 작업으로 쪼개고 병렬로 서브에이전트에 나눈다.
2. 결과는 합치기 전에 검증된다. 다른 에이전트가 앞선 결과를 반박해 보고, 답이 수렴할 때까지 반복한다.
3. 조율이 대화 바깥에서 일어나므로 작업이 커져도 계획이 흐트러지지 않는다. 진행 상황이 저장되어 중단돼도 이어서 실행된다.

Memeburn은 여기에 세부 사항을 보탠다. 중간 결과가 Claude의 컨텍스트가 아니라 스크립트 변수에 남고, 동시 실행은 16개, 한 번의 실행당 총 1,000개가 상한이라는 것이다. 이 상한 수치는 Anthropic 두 글에서 확인되지 않은 단일 출처 정보다.

## 사례: Bun의 Zig에서 Rust 이식

Anthropic은 Jarred Sumner가 Bun을 Zig에서 Rust로 옮긴 사례를 소개한다. 기존 테스트의 99.8%가 통과했고, 약 75만 줄 규모이며, 첫 커밋부터 병합까지 11일 걸렸다고 한다. 구조 매핑, 파일별 이식(파일당 검토자 2명), 빌드와 테스트를 통과할 때까지 도는 수정 루프로 단계를 나눈 점이 눈에 띈다. 다만 이 수치는 Anthropic의 서술이며, 이 글에서 독립 검증하지는 못했다.

## 출처끼리 어긋나는 부분

| 항목 | Opus 4.8 공지 | dynamic workflows 글 | Memeburn |
| --- | --- | --- | --- |
| 단계 | 연구 프리뷰 | 정식 출시(추후 갱신) | 연구 프리뷰 |
| 대상 플랜 | Enterprise, Team, Max | Pro 포함 여러 플랜(Pro는 `/config`에서 켬) | Enterprise, Team, Max |
| 규모 | 수백 개 | 수십~수백 개 | 최대 1,000개 |

공지 시점의 서술과 이후 갱신이 다른 것으로 보이며, 현재 기준은 최신 글과 공식 문서를 따르는 편이 안전하다.

## 도입 전 체크리스트

- 토큰 소비가 일반 세션보다 훨씬 크다. Anthropic도 범위가 좁은 작업부터 시작하라고 권한다.
- 첫 실행 때 Claude Code가 실행 내용을 보여 주고 확인을 요청한다. 조직 관리자는 관리형 설정으로 끌 수 있다.
- 시작 방법은 "워크플로를 만들어 달라"고 요청하거나, 노력 수준 메뉴의 `ultracode` 설정을 켜는 것이다. 이 설정은 노력 수준을 xhigh로 올리고 워크플로 사용 여부를 Claude가 판단하게 한다. Anthropic은 auto mode와 함께 쓰기를 권한다.
- 검증 기준이 되는 테스트 스위트가 있는 작업일수록 결과를 믿기 쉽다. Anthropic의 대형 마이그레이션 예시도 기존 테스트를 기준으로 삼는다.

## 정리

dynamic workflows는 새 모델이라기보다 모델 위에 얹은 실행 방식의 변화다. 병렬화와 상호 반박 검증을 스크립트로 고정해 긴 작업을 안정적으로 돌리려는 시도이고, 대신 비용과 검증 책임이 사용자에게 남는다.
