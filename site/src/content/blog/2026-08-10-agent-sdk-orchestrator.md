---
title: "MCP 서버에 오케스트레이터 붙이기 — 뼈대는 스크립트가, 지능은 claude -p가"
pubDate: 2026-08-10T05:14:27Z
section: "mcp"
tags: ["agent-sdk", "claude code", "오케스트레이터", "자동발행", "headless"]
area: "A"
topicId: "agent-sdk-orchestrator"
follows: "2026-07-20-mcp-vs-agent-vs-orchestrator"
related: ["2026-07-27-github-actions-cron", "2026-08-02-claude-code-testing"]
description: "MCP 서버와 cron 사이의 빈칸 — 에이전트를 깨우고 성공을 판정하는 오케스트레이터를 만들었다. Agent SDK 라이브러리 대신 셸 스크립트 + claude -p 헤드리스를 고른 이유, 성공 판정을 모델의 말이 아니라 파일시스템에 두는 설계, 슬래시 프롬프트가 헤드리스에서 발동되지 않아 프롬프트를 텍스트로 주입한 우회까지 실제 코드로 정리한다."
---

매일 자동 발행이라는 목표에서 지금까지 만든 것은 두 조각이다. 도구를 공급하는 MCP 서버, 그리고 매일 트리거를 당기는 GitHub Actions cron. 그런데 둘 사이가 비어 있다. 트리거가 당겨졌을 때 에이전트를 깨우고, 글이 정말 발행됐는지 판정하고, 실패하면 재시도하고, 성공하면 커밋하는 존재 — 오케스트레이터다. 이번 글은 그 빈칸을 채운 개발기다.

## 선택지: SDK 라이브러리 vs 헤드리스 CLI

에이전트 루프를 코드에서 돌리는 방법은 두 갈래다. Claude Agent SDK를 라이브러리로 가져와 직접 세션을 관리하거나, 같은 하네스를 CLI로 감싼 `claude -p`(헤드리스 모드)를 호출하거나. Claude Code 자체가 Agent SDK 위에 지어져 있어서, `claude -p`는 SDK로 만든 에이전트를 명령 한 줄로 빌려 쓰는 셈이다.

오케스트레이터가 할 일을 나열해 보면 답이 나왔다. 섹션 로테이션, 에이전트 실행, 성공 판정, 재시도, 커밋·푸시 — 전부 결정론적 작업이고, LLM이 필요한 건 "글쓰기" 하나뿐이다. 그래서 뼈대는 셸 스크립트가 소유하고, 지능이 필요한 속살만 `claude -p`에 위임하기로 했다.

## 루프와 판정은 스크립트가 소유한다

실제 스크립트의 핵심 루프는 이렇다.

```bash
for attempt in 1 2 3; do
  before=$(ls "$CONTENT_DIR")
  PROMPT=$(node server/dist/print-prompt.js "$SECTION")
  claude -p "$PROMPT" --mcp-config .mcp.json \
    --allowedTools "mcp__blog-mcp__suggest_topic,mcp__blog-mcp__publish_post" || true
  new_post=$(comm -13 <(echo "$before") <(ls "$CONTENT_DIR") | head -1)
  [ -n "$new_post" ] && break
done
```

핵심은 성공 판정이다. 에이전트가 "발행 완료했습니다"라고 답해도 믿지 않는다. 실행 전후의 파일 목록을 비교해 새 .md 파일이 실제로 생겼는지만 본다. 파일이 없으면 실패고, 루프가 다시 돈다. 판정 기준을 모델의 말이 아니라 파일시스템이라는 물리적 사실에 두면 모델이 어떻게 헛돌아도 오케스트레이터는 속지 않는다.

`--allowedTools`로 도구를 화이트리스트로 죄는 것도 같은 맥락이다. 무인 실행에서 에이전트에게 셸이나 파일 쓰기를 열어줄 이유가 없다.

## 함정: 슬래시 프롬프트가 헤드리스에선 안 당겨진다

대화형 세션에서는 MCP 서버가 노출한 write_daily_post 프롬프트를 슬래시 명령으로 당기면 됐다. 헤드리스에서도 같은 명령을 넘기면 될 줄 알았는데, "Unknown command"로 무시됐다(적어도 이 프로젝트가 쓴 버전에서는 그랬다).

우회는 단순했다. 서버가 프롬프트를 조립할 때 쓰는 함수를 그대로 불러 stdout으로 찍는 작은 CLI(print-prompt.js)를 두고, 그 출력을 `claude -p`의 인자로 주입한다. 글쓰기 지침의 단일 출처는 여전히 서버 코드 하나다.

## 오케스트레이터는 대단한 게 아니었다

예전 글에서 오케스트레이터를 "여러 행위자를 지휘하는 조정자"라는 층위로 정리했는데, 직접 만들어 보니 실체는 60줄 남짓한 셸 스크립트였다. 중요한 건 규모가 아니라 위치다. 에이전트를 신뢰 경계 밖에 두고, 결과를 물리적 사실로 검증하고, 실패를 재시도로 흡수하는 바깥 루프 — 이 구분만 지키면 오케스트레이터는 cron이 당길 수 있는 스크립트 하나로 충분하다.
