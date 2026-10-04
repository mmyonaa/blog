---
title: "TanStack 침해: 2FA와 provenance가 다 켜져 있었는데 악성 버전이 나간 경로"
pubDate: 2026-10-04T11:11:05Z
section: "security"
tags: ["TanStack", "Mini Shai-Hulud", "GitHub Actions", "pull_request_target", "공급망공격"]
description: "2026년 5월 11일 TanStack npm 패키지 침해를 CI 공격 체인 관점에서 재구성하고, 저장소 관리자가 점검할 항목을 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.endorlabs.com/learn/how-a-misconfigured-ci-workflow-became-an-npm-supply-chain-compromise"
    title: "How a Misconfigured CI Workflow Became an npm Supply-Chain Compromise (Endor Labs)"
  - url: "https://www.stepsecurity.io/blog/mini-shai-hulud-is-back-a-self-spreading-supply-chain-attack-hits-the-npm-ecosystem"
    title: "TeamPCP's Mini Shai-Hulud Is Back (StepSecurity)"
  - url: "https://www.securityweek.com/tanstack-mistral-ai-uipath-hit-in-fresh-supply-chain-attack"
    title: "TanStack, Mistral AI, UiPath Hit in Fresh Supply Chain Attack (SecurityWeek)"
---

## 무슨 일이 있었나

2026년 5월 11일 UTC 기준 19시 20분대, `@tanstack/*` 42개 패키지에 악성 버전 84개가 npm에 올라왔다. Endor Labs와 StepSecurity가 이 수치에 일치하고, 배포 시각은 Endor Labs 기준 19:20~19:26이다. 이 글에서 눈여겨볼 점은 유출된 토큰이 없다는 것이다. TanStack 사후 분석을 인용한 Endor Labs에 따르면 maintainer 계정 탈취도, npm 토큰 유출도, branch protection 우회도 없었다. 2FA, OIDC trusted publishing, provenance가 모두 켜진 상태였다.

## 공격 체인 재구성

세 가지 이미 알려진 약점이 이어졌다.

| 단계 | 일어난 일 | 악용된 가정 |
|---|---|---|
| 1. PR 제출 | 이름을 바꾼 fork에서 PR을 열어 `pull_request_target` 워크플로를 실행시킴 | 이 트리거는 base 저장소 권한으로 돌고, PR 코드를 체크아웃해 실행하면 fork 코드가 신뢰받음 |
| 2. 캐시 오염 | 빌드 중 pnpm 저장소 캐시에 악성 바이너리를 심음 | `permissions`를 줄여도 캐시 저장은 막지 못함 |
| 3. 흔적 제거 | PR을 깨끗한 상태로 force-push하고 닫음 | 닫힌 PR만 보면 아무 일도 없어 보임 |
| 4. 기폭 | 무관한 maintainer PR이 main에 병합되자 release 워크플로가 오염된 캐시를 복원 | 캐시 키가 공개된 lockfile 해시라 예측 가능 |
| 5. 토큰 탈취 | 러너 프로세스 메모리에서 OIDC 토큰을 꺼내 직접 publish | 토큰은 정상 워크플로와 구분되지 않음 |

결과적으로 악성 패키지에는 유효한 SLSA provenance가 붙었다. provenance는 어느 워크플로에서 빌드됐는지를 증명할 뿐, 그 안에서 어떤 단계가 publish를 실행했는지는 담지 못한다.

## 어긋나는 부분

피해 규모는 출처마다 범위가 다르다. TanStack만 보면 42개 패키지, 84개 버전으로 일치한다. 반면 SecurityWeek는 같은 캠페인(Mini Shai-Hulud, TeamPCP 소행으로 지목됨)이 UiPath, Mistral AI, OpenSearch 클라이언트 등으로 번져 170여 개 패키지, 400개 이상 버전에 이른다고 보도했다. 이는 TanStack 건과 캠페인 전체를 구분해 읽어야 한다는 뜻이다. 또 StepSecurity는 웜이 탈취한 자격 증명으로 해당 maintainer의 다른 패키지까지 감염시킨다고 설명하는데, 이 전파 방식은 두 출처에서 공통으로 확인된다.

## 개발자 체크리스트

- 5월 11일 전후로 `@tanstack/*`를 새로 설치했다면 해당 환경의 모든 시크릿을 유출된 것으로 보고 교체한다. 영향 버전 목록은 StepSecurity 글과 TanStack 보안 권고에 있다.
- 로컬 설치뿐 아니라 CI 러너도 대상이다. 페이로드는 클라우드 자격 증명, SSH 키, AI 도구 설정까지 긁는다고 보고됐다.
- 내 저장소의 워크플로에서 `pull_request_target`이 PR 코드를 체크아웃해 실행하는지 확인한다.
- fork PR이 실행되는 잡과 release 잡이 같은 캐시 키를 공유하지 않게 분리한다.
- 서드파티 액션은 커밋 SHA로 고정한다.
- publish 권한(`id-token: write`)이 필요한 잡에는 캐시 복원 자체를 두지 않는 방안을 검토한다.

## 정리

방어선은 하나씩 보면 모두 작동했다. 뚫린 곳은 선과 선 사이, 즉 신뢰 수준이 다른 잡이 캐시를 공유하는 지점이었다. provenance가 있다고 안전하다고 결론 내리지 말고, 릴리스 파이프라인 안에서 무엇이 실행되는지부터 점검하자.
