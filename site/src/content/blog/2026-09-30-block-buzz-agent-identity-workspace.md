---
title: "Block의 Buzz — 에이전트에게 계정 대신 키를 주면 무엇이 달라지나"
pubDate: 2026-09-30T11:15:19Z
section: "mcp"
tags: ["buzz", "nostr", "claude-code", "goose", "에이전트 신원"]
area: "T"
description: "Block이 공개한 오픈소스 워크스페이스 Buzz를 1차 출처와 대조해, 에이전트에게 공유 서비스 계정 대신 자기 키를 주는 설계가 무엇을 바꾸는지 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://block.xyz/inside/introducing-buzz-where-humans-and-agents-work-together"
    title: "Introducing Buzz: where humans and agents work together (Block)"
  - url: "https://github.com/block/buzz"
    title: "block/buzz (GitHub)"
  - url: "https://pasqualepillitteri.it/en/news/18968/buzz-jack-dorsey-ai-agent-workspace"
    title: "Buzz, what Jack Dorsey's AI agent workspace actually does"
---

에이전트를 팀에 붙일 때 가장 자주 막히는 지점은 모델 성능이 아니라 "이 행동을 누가 시켰는가"를 로그에서 알 수 없다는 점이다. Block이 공개한 Buzz는 이 문제를 신원 계층에서 풀려는 오픈소스 프로젝트다. 발표 후 두 달이 지났지만 최근 다시 화제가 되어, 1차 출처와 대조해 정리한다.

## 무엇이 공개됐나

Block 공식 글에 따르면 Buzz는 2026년 7월 21일 공개된 협업 워크스페이스다. 채널, 스레드, DM, 음성, 코드 저장소, 자동화 워크플로를 갖췄고 Nostr 프로토콜 위에서 돈다. 라이선스는 Apache-2.0이다. 저장소 README는 모든 메시지와 워크플로 단계, git 이벤트가 하나의 서명된 이벤트 로그에 쌓인다고 설명한다.

에이전트는 Claude Code, Codex, goose 같은 하네스로 연결하며, README는 ACP 하네스와 에이전트용 `buzz-cli`(JSON 입력, JSON 출력)를 언급한다. MCP와 직접 겹치는 부분은 적다. 다만 도구 호출이 아니라 에이전트의 "자리"를 다룬다는 점에서 MCP 서버 설계와 함께 볼 만하다.

## 핵심 설계: 공유 계정이 아니라 자기 키

Block은 다중 에이전트 협업의 근본 문제를 신원이라고 보고 Nostr를 택했다고 밝힌다. 사람이든 에이전트든 각자 키 쌍을 가지며, 이 키는 플랫폼이 아니라 참여자에게 속한다. README도 에이전트가 자기 키, 자기 채널 멤버십, 자기 감사 기록을 갖는다고 쓴다.

| 항목 | 흔한 봇 통합 | Buzz의 접근 |
| --- | --- | --- |
| 행위자 표시 | 앱 토큰 또는 머신 계정 | 에이전트 개인 키로 서명 |
| 권한 범위 | 권한 플래그 | 신원과 채널 멤버십 |
| 감사 | 서비스별 로그 | 단일 이벤트 로그 |
| 교체와 폐기 | 토큰 재발급 | 해당 키만 정리 |

이 표의 왼쪽 열은 Buzz 발표문이 아니라 일반적인 봇 통합 방식을 내가 대비시킨 것이다. 한 출처(Pasquale Pillitteri)는 에이전트 키가 사람 소유자의 보조 서명과 묶인다고 쓰지만, 이 부분은 공식 문서에서 확인하지 못했으므로 단정하지 않는다.

## 출처끼리 어긋난 지점

- 공개일: Block 글과 해설 기사 모두 7월 21일로 일치한다.
- 스타 수: 저장소 화면은 약 34k를 보여 주고, 해설 기사는 9월 28일 기준 35,150이라 한다. 시점 차이로 보이며, 이 수치는 계속 변한다.
- 성숙도: README는 모바일 클라이언트와 승인 게이트를 "연결 중", 평판 체계를 "구상 단계"로 분류한다. 해설 기사도 베타로 본다. 회사 전체를 AI에 맡기는 도구라는 식의 과장은 근거가 없다.

## 개발자 관점 체크리스트

1. 지금 쓰는 에이전트가 공유 서비스 계정으로 행동하는지 확인한다.
2. 에이전트 행동 로그에서 "승인한 사람"을 복원할 수 있는지 점검한다.
3. 에이전트를 폐기할 때 다른 참여자에게 영향이 없는지 본다.
4. 도입한다면 베타 단계임을 전제로 자체 호스팅 범위부터 시험한다.

Buzz가 Slack과 GitHub를 대체할지는 아직 알 수 없다. 그러나 "에이전트도 자기 신원을 가진 참여자"라는 발상은 MCP 서버의 인증과 감사 설계에도 그대로 옮겨 볼 수 있다.
