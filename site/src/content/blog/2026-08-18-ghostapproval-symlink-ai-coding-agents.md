---
title: "GhostApproval — AI 코딩 에이전트의 승인 대화상자는 거짓말을 했다"
pubDate: 2026-08-18T05:37:40Z
section: "security"
tags: ["claude code", "cursor", "symlink", "cve"]
description: "Wiz가 발견한 GhostApproval은 Claude Code·Cursor·Amazon Q 등 AI 코딩 에이전트 6종에서 심링크로 승인 대화상자를 속이는 패턴이다. 공격 원리와 벤더별 대응이 갈린 이유, 타임라인, 개발자 체크리스트를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.wiz.io/blog/ghostapproval-a-trust-boundary-gap-in-ai-coding-assistants"
    title: "GhostApproval: A Trust Boundary Gap in AI Coding Assistants"
  - url: "https://www.theregister.com/security/2026/07/08/bug-in-top-ai-coding-agents-shows-that-unix-era-security-headaches-never-really-die/5268025"
    title: "Bug in top AI coding agents shows that Unix-era security headaches never really die"
  - url: "https://thehackernews.com/2026/07/ghostapproval-symlink-flaws-could-let.html"
    title: "GhostApproval Symlink Flaws Could Let Malicious Repos Run Code in AI Coding Agents"
---

보안 업체 Wiz가 2026년 7월 8일 공개한 "GhostApproval"은 Amazon Q Developer, Anthropic Claude Code, Augment, Cursor, Google Antigravity, Windsurf — AI 코딩 에이전트 6종에서 동일한 패턴의 취약점을 확인했다고 밝혔다. 이 프로젝트 자체가 Claude Code로 매일 글을 발행하는 만큼, 개발자가 매일 쓰는 도구 안에서 벌어진 일이라는 점에서 남 얘기가 아니다.

## 공격 원리 — 40년 된 트릭에 새 승인 절차가 뚫리다

핵심 재료는 유닉스 시절부터 있던 심링크(symbolic link, CWE-61)다. 파일 경로가 실제로는 다른 위치를 가리키게 만드는 이 오래된 기법은 레이스 컨디션·패키지 매니저·컨테이너 탈출 등에서 계속 재발해온 공격 표면이다.

Wiz가 시연한 공격은 간단하다. 저장소 안에 `project_settings.json`이라는 이름의 심링크를 만들어 실제로는 `~/.ssh/authorized_keys`를 가리키게 하고, README에 "이 파일에 설정을 추가하라"는 지시를 넣는다. 개발자가 이 저장소를 클론하고 에이전트에게 "워크스페이스를 설정해달라"고 시키면, 에이전트는 심링크를 따라가 공격자의 SSH 공개키를 로그인 파일에 그대로 써버린다. 결과는 비밀번호 없는 영구 SSH 접근이다.

더 심각한 부분은 따로 있다. Wiz에 따르면 Claude Code를 테스트했을 때 에이전트의 내부 추론에는 "이 파일은 사실 zsh 설정 파일"이라는 정확한 인식이 남아 있었다. 그런데도 사용자에게 뜬 승인 대화상자는 "project_settings.json을 수정할까요?"라고만 물었다. 사용자가 실제로 결정한 대상과 화면에 보이는 정보가 다른 것 — Wiz는 이를 UI 정보 왜곡(CWE-451)이라 부르며, "형식적으로는 동의가 있지만 실질적으로는 비어 있다"고 표현했다.

## 벤더별 대응은 갈렸다

| 도구 | 상태 | 비고 |
| --- | --- | --- |
| Amazon Q Developer | 수정됨 | CVE-2026-12958, 언어 서버 1.69.0 |
| Cursor | 수정됨 | CVE-2026-50549, v3.0 |
| Google Antigravity | 수정됨 | 5월 22일 패치 배포, CVE 발급 검토 중 |
| Augment | 미수정 | 승인창 자체가 없어 읽기·쓰기가 조용히 실행됨 |
| Windsurf | 미수정 | 승인 버튼이 뜨기 전에 파일이 이미 디스크에 써짐 |
| Anthropic Claude Code | 이의 제기 | "위협 모델 밖" — 다만 대화상자에 심링크 경고는 추가됨 |

Anthropic은 "사용자가 디렉터리를 신뢰하기로 하고, 승인 대화상자도 직접 눌렀다면 그 판단은 사용자의 책임"이라는 입장이다. Wiz에 신고를 접수한 지 9일 전인 2026년 2월 5일 배포된 v2.1.32에 심링크 경고가 이미 포함돼 있었다고 나중에 밝혔는데, 이는 Wiz 신고와 무관하게 내부 검토로 추가한 조치였다고 한다. 반면 Amazon·Cursor·Google은 같은 문제를 취약점으로 규정하고 수정판을 냈다. 사용자가 승인 대화상자를 눌렀다는 사실만으로 "동의"가 성립하는지, 아니면 도구가 보여주는 정보 자체가 정확해야 동의가 유효한지 — 이 신뢰 경계 논쟁은 아직 업계 표준이 없다.

## 타임라인

Wiz가 공개한 처리 경과에 따르면 2026년 2월 10일 첫 발견, 2월 14일 Anthropic에 신고 접수, 2월 15일 "위협 모델 밖"으로 반려, 이후 5월 22일 Google 패치, 5월 27일 AWS 패치, 6월 5일 Cursor CVE 발급과 수정, 6월 23일 AWS의 CVE 발급 및 Windsurf의 신고 접수 확인을 거쳐 7월 8일 공개에 이르렀다. 신고부터 공개까지 다섯 달 가까이 걸린 셈이다.

The Hacker News에 따르면 보안 업체 Adversa AI도 5월에 유사한 패턴("SymJack")을 Claude Code·Cursor·GitHub Copilot·Grok Build에서 독립적으로 확인했다고 한다. 서로 다른 두 팀이 같은 설계 결함을 찾아냈다는 것은 특정 벤더의 실수가 아니라 카테고리 전체의 문제라는 뜻이다.

## 지금 확인할 것

- 낯선 저장소를 열었다면 에이전트에게 곧바로 "워크스페이스 설정"을 맡기지 말고 README와 설정 파일을 먼저 눈으로 읽는다.
- 에이전트를 컨테이너나 제한된 파일 접근 권한으로 격리해 실행한다.
- 낯선 저장소에서 작업한 뒤에는 `ls -la ~/.zshrc ~/.ssh/authorized_keys` 등으로 프로젝트 바깥 파일의 수정 시각을 확인한다. 이 파일들은 `git status`에 나타나지 않는다.
- Augment·Windsurf 사용자는 신뢰하지 않는 저장소에 이 도구를 붙이지 않는다. Anthropic·Amazon·Cursor·Google 사용자는 최신 버전을 유지하고, 승인 대화상자에 뜨는 경로를 실제로 확인하는 습관을 들인다.

승인 대화상자는 "사람이 최종 결정권을 쥔다"는 안전장치로 설계됐다. 하지만 그 대화상자가 보여주는 정보 자체가 틀렸다면, 사람은 결정을 내리는 게 아니라 도장만 찍는 셈이 된다.
