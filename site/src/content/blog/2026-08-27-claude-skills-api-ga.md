---
title: "Claude Skills API가 정식 출시됐다 — 코드 실행 샌드박스 안에서 도는 스킬"
pubDate: 2026-08-27T16:21:55Z
section: "mcp"
tags: ["skills-api", "files-api", "code-execution-tool", "sandbox", "mcp"]
area: "T"
description: "Anthropic이 2026년 8월 20일 Claude Platform에 정식 출시한 Skills API와 Files API를 뜯어본다. Claude Code Skill의 프롬프트 주입 방식과 달리 코드 실행 샌드박스 컨테이너 안에서 도는 실행 모델, 커스텀 스킬 업로드 규칙, 그리고 한 매체의 보도가 1차 문서와 어긋난 지점까지 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://platform.claude.com/docs/en/build-with-claude/skills-guide"
    title: "Using Agent Skills with the API - Claude Platform Docs"
  - url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool"
    title: "Code execution tool - Claude Platform Docs"
  - url: "https://cryptobriefing.com/claude-morning-brief-feature-rollout/"
    title: "Claude rolls out Morning Brief feature to select users - Crypto Briefing"
---

## 8월 20일, 스킬이 API로 들어왔다

Anthropic이 2026년 8월 20일 Claude Platform에 Skills API와 Files API를 정식 출시(GA)했다. Claude Code나 claude.ai에서 써 오던 스킬(Skill) 기능이 이제 Messages API 호출 안에서 직접 업로드하고 실행할 수 있는 대상이 됐다는 뜻이다.

## 기존 스킬과 무엇이 다른가

이 블로그가 앞서 다룬 Claude Code Skill은 프롬프트 주입에 가까운 구조였다. 이름과 설명만 먼저 시스템 프롬프트에 걸어두고(progressive disclosure), 작업과 관련 있다고 판단되면 그때 SKILL.md 본문을 불러와 로컬 파일 시스템과 Bash 도구로 실행한다.

Skills API의 실행 모델은 다르다. 공식 문서에 따르면 스킬은 `container` 파라미터의 `skills` 배열에 `type`(anthropic 또는 custom)과 `skill_id`를 넣어 지정하고, 반드시 code execution 도구(`code_execution_20250825`)를 함께 켜야 동작한다. 요청이 들어오면 스킬 파일은 인터넷 접근이 차단된 서버 사이드 샌드박스 컨테이너의 `/skills/{skill-name}/` 경로에 복사되고, 그 안에서 Python과 Bash가 실행된다. 로컬 파일 시스템이 아니라 요청마다(혹은 재사용하는 컨테이너 안에서) 격리된 실행 환경이 도는 구조다. 한 요청에 최대 20개 스킬까지 조합할 수 있고, 스킬이 만든 파일은 `file_id`로 반환돼 같은 날 GA된 Files API로 내려받는다.

커스텀 스킬을 올리려면 SKILL.md를 포함한 폴더를 30MB 이하 zip으로 압축해 업로드한다. `name`은 64자 이하로 소문자·숫자·하이픈만 허용하고 "anthropic"·"claude" 같은 예약어는 쓸 수 없다. 버전은 델타가 아니라 완전한 스냅숏이라, 갱신할 때마다 파일 전체를 다시 올려야 한다.

## 보도와 1차 문서가 어긋나는 지점

이 소식을 다룬 한 매체는 Skills API를 "Claude를 서드파티 도구에 구조적이고 반복 가능하게 연결하는 장치"라고 설명했다. 하지만 공식 문서를 보면 Skills API가 다루는 건 도구·데이터 연결이 아니라 지침과 스크립트 묶음, 즉 스킬 자체의 업로드와 실행이다. 외부 시스템에 연결하는 역할은 여전히 MCP 서버의 몫이고, Skills API는 그 위에서 "요청을 어떤 절차로 처리할지"를 코드 실행 환경에 실어 보내는 별개의 축이다. 보도자료성 요약과 1차 문서의 설명이 갈릴 때는 후자를 따라야 하는 이유가 이 사례에 그대로 드러난다.

## 개발자에게 남는 것

MCP로 도구를 연결하고 Agent Skill로 절차를 패키징하는 조합이 이제 API 레벨에서도 그대로 재현된다. Claude Code에서 스킬을 만들어 대화형으로 쓰던 것과 달리, Skills API는 서버 애플리케이션이 사용자 요청마다 문서 생성이나 데이터 가공 같은 반복 작업을 스킬 단위로 호출하게 해준다. 다만 샌드박스는 인터넷 접근이 없으므로 외부 API 호출이 필요한 작업은 애초에 이 경로에 맞지 않는다. 그런 작업은 여전히 MCP 서버나 별도 도구 정의로 가야 한다. 커스텀 스킬을 만들 때는 코드 실행 컨테이너 안에서 완결되는 작업(파일 생성·가공·분석)인지부터 먼저 따져보는 편이 안전하다.
