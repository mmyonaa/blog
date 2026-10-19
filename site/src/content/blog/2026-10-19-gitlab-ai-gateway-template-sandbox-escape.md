---
title: "GitLab AI Gateway CVE-2026-90970 — 프롬프트 템플릿 샌드박스가 뚫리면 게이트웨이 호스트가 열린다"
pubDate: 2026-10-19T10:59:14Z
section: "security"
tags: ["gitlab", "ai-gateway", "CVE-2026-90970", "샌드박스 탈출", "템플릿 인젝션"]
description: "GitLab 셀프호스트 AI Gateway의 CVSS 9.9 샌드박스 탈출 취약점을 공식 권고문과 보도 기준으로 교차검증하고, 2월의 유사 사고와 묶어 영향 범위와 점검 순서를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://docs.gitlab.com/releases/patches/other-patches/patch-release-gitlab-ai-gateway-19-4-1-released"
    title: "GitLab AI Gateway Critical Patch Release: 19.2.4, 19.3.2, and 19.4.1 (GitLab Docs)"
  - url: "https://docs.gitlab.com/releases/patches/other-patches/patch-release-gitlab-ai-gateway-18-8-1-released"
    title: "GitLab AI Gateway Critical Patch Release: 18.6.2, 18.7.1, and 18.8.1 (GitLab Docs)"
  - url: "https://thehackernews.com/2026/10/gitlab-patches-critical-self-hosted-ai.html"
    title: "GitLab Patches Critical 9.9 AI Gateway Flaw Allowing Command Execution on Self-Hosted Servers (The Hacker News)"
  - url: "https://tech-insider.org/gitlab-ai-gateway-cve-2026-90970-duo-agent-2026"
    title: "GitLab Patches CVSS 9.9 AI Gateway RCE in Duo Agent (Tech Insider)"
---

GitLab이 2026년 10월 2일 자체 호스팅 AI Gateway의 치명적 취약점 CVE-2026-90970을 공개했다. 로그인한 사용자가 만든 "flow" 설정이 프롬프트 템플릿 샌드박스를 벗어나 게이트웨이 서버에서 명령을 실행할 수 있는 결함이다. CVSS는 9.9다. 이 글은 GitLab 공식 권고문 두 건과 보도 두 건을 대조해 확인된 사실과 확인되지 않은 부분을 나눠 정리한다.

## 무엇이 뚫렸나

AI Gateway는 GitLab 인스턴스와 LLM 사이를 잇는 서비스다. Duo Agent Platform에서는 사용자가 프롬프트와 도구 호출을 엮은 flow를 직접 정의할 수 있고, 이 정의가 템플릿 엔진을 거친다. 권고문에 따르면 특정 조건에서 조작된 flow 설정이 샌드박스를 탈출해 게이트웨이에서 임의 명령을 실행하게 만들 수 있다. 약점 분류는 CWE-1336(템플릿 엔진의 특수 요소 무력화 실패)이다.

핵심은 모델이 속는 문제가 아니라는 점이다. 프롬프트 인젝션은 모델의 판단을 흔들지만, 이 결함은 사용자 입력이 템플릿 평가기에 닿는 경로 자체가 안전하지 않다는 뜻이다. 사용자가 쓴 설정 파일도 신뢰할 수 없는 입력이다.

## 영향 범위

| 구분 | 조치 필요 여부 |
| --- | --- |
| GitLab.com, GitLab Dedicated | X (GitLab이 이미 수정) |
| GitLab이 운영하는 게이트웨이를 쓰는 자체 설치형 GitLab | X |
| 직접 호스팅하는 AI Gateway 18.1.6 이상 19.2.4 미만 | O, 19.2.4로 업데이트 |
| 19.3 계열 3 미만 | O, 19.3.2로 업데이트 |
| 19.4 계열 1 미만 | O, 19.4.1로 업데이트 |

취약 버전과 수정 버전은 권고문과 The Hacker News, Tech Insider가 일치한다. 다만 The Hacker News는 19.2.4 아래에 별도 수정 버전이 없다는 점, 즉 19.1 이하 게이트웨이가 어떻게 되는지 권고문이 말하지 않는다는 점을 짚는다. 해당 버전을 쓴다면 GitLab에 직접 확인해야 한다.

## 악용 여부: 출처가 한 갈래로 모인다

The Hacker News에 따르면 CISA는 10월 2일 CVE 레코드에 악용 상태를 "none"으로 기재했다. Tech Insider도 10월 3일 기준 실제 악용과 공개 PoC가 없다고 전한다. 두 곳 모두 이 시점의 상태라는 한계가 있으니 이후 변동은 별도로 확인해야 한다. 권고문은 우회책을 제시하지 않고, 이미 공격받았는지 가려내는 방법도 알려주지 않는다.

## 2월에도 같은 종류가 있었다

GitLab은 2월 6일 같은 게이트웨이의 CVE-2026-1868(CVSS 9.9)을 수정했다. 해당 권고문은 flow 정의를 통한 템플릿 확장 문제이며 서비스 거부나 코드 실행으로 이어질 수 있다고 설명한다. 이번 권고문은 이 사건을 언급하지 않는다. 같은 CWE 계열이 8개월 간격으로 두 번 나왔다는 것은 두 보도 사이의 연결이지 GitLab의 공식 판단이 아니다.

## 점검 순서

1. 게이트웨이를 직접 호스팅하는지부터 확인한다. 아니라면 조치할 일이 없다.
2. 게이트웨이 이미지 또는 Helm 차트의 태그로 버전을 확인하고, 해당 계열의 수정 버전으로 올린다.
3. Duo Agent Platform 권한을 가진 계정을 정리한다. 공격에 필요한 조건이 이 권한 하나이기 때문이다.
4. 게이트웨이의 네트워크 위치를 점검한다. The Hacker News는 이 서버가 JWT 서명 키와 모델 제공자 연결 정보를 쥐고 있다고 지적한다. 침해되면 키 교체가 필요할 수 있다.
5. 업데이트 전 기간에 등록된 flow 설정에 이상한 템플릿 구문이 없는지 훑어본다.

## 개발자 관점의 교훈

사용자가 정의하는 flow, 템플릿, 워크플로 파일은 기능이 아니라 입력 표면이다. 에이전트 기능이 사용자 설정을 서버에서 평가하는 순간, 그 서버는 코드 실행 서비스가 된다. 로그인 필요 조건은 큰 방어가 되지 못한다. 개발 조직에서는 대부분이 그 권한을 갖기 때문이다.
