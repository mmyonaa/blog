---
title: "ChainDrop — npm 패키지 하나 설치했다가 CI/CD 자격증명이 통째로 털린 이유"
pubDate: 2026-08-30T10:28:28Z
section: "security"
tags: ["npm", "chaindrop", "shai-hulud", "preinstall-hook", "공급망공격"]
description: "2026년 8월 4일 keyv·cacheable npm 패키지 관리자 계정이 탈취되며 시작된 ChainDrop(Mini Shai-Hulud 변종) 공급망 공격을 다룬다. preinstall 훅으로 실행되는 자가 증식 웜의 구조, 탈취 토큰으로 스스로 퍼지는 방식, .claude·.vscode 설정 파일을 통한 IDE 재감염 경로까지 Microsoft·Wiz·SecurityWeek 세 출처를 교차검증해 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.microsoft.com/en-us/security/blog/2026/08/04/chaindrop-supply-chain-compromise-anatomy-self-propagating-worm"
    title: "ChainDrop supply chain compromise: Anatomy of a self-propagating worm"
  - url: "https://www.wiz.io/blog/keyv-and-cacheable-npm-supply-chain-attack"
    title: "keyv and cacheable npm Package Hijacked in Supply Chain Attack"
  - url: "https://www.securityweek.com/over-400-npm-packages-infected-in-chaindrop-supply-chain-attack"
    title: "Over 400 NPM Packages Infected in ChainDrop Supply Chain Attack"
---

## 무슨 일이 있었나

2026년 8월 4일, 캐싱 라이브러리 `keyv`와 `cacheable` 계열 npm 패키지의 관리자 GitHub 계정이 탈취됐다. 공격자는 이 계정으로 저장소에 먼저 지속성 코드를 심고, 곧이어 악성 버전을 게시했다. Microsoft와 SecurityWeek는 이 공격을 **ChainDrop**으로 명명했고, 보안 업체 Wiz는 같은 사건을 "Mini Shai-Hulud 계열의 변종"으로 분류했다 — 이름은 갈렸지만 가리키는 사건은 같다.

Wiz에 따르면 이 웜은 짧은 시간 안에 400개가 넘는 패키지로 번졌고, SecurityWeek는 StepSecurity 집계를 인용해 4시간 만에 440개 패키지·2,200개 이상의 악성 버전이 게시됐다고 전한다. 감염된 패키지들의 주간 다운로드 수를 합치면 5억 회를 넘는다는 것이 SecurityWeek의 설명이다. `keyv`처럼 여러 프로젝트의 의존성 트리 깊숙이 깔리는 패키지가 진원지였다는 점이 확산 규모를 키웠다.

## preinstall 훅 하나로 시작되는 감염

Microsoft의 분석에 따르면 악성 버전들은 `preinstall` 라이프사이클 훅으로 `setup.mjs`를 실행시키고, 이 파일이 Bun 런타임 기반의 난독화된 2단계 페이로드를 구동한다. npm은 `preinstall`을 애플리케이션 코드 실행이나 테스트보다 먼저 돌리기 때문에, `npm install` 한 번만으로 코드 리뷰나 CI 테스트 단계에 닿기도 전에 악성코드가 실행된다.

실행되면 로컬 셸 히스토리와 설정 파일뿐 아니라 npm·GitHub·AWS·Kubernetes·HashiCorp Vault 자격증명을 찾아 실제로 해당 서비스 API를 호출해 유효성까지 검증한다. Wiz는 이번 변종이 Claude·OpenAI·Cursor·Gemini용 AI 에이전트 자격증명과 암호화폐 키스토어까지 수집 대상에 새로 추가됐다고 밝혔다.

## 웜의 핵심: 훔친 토큰으로 스스로 퍼진다

탈취한 npm 게시 토큰이 발견되면, 페이로드는 그 계정이 게시할 수 있는 다른 패키지의 최신 버전을 내려받아 자기 자신을 심고 `preinstall` 훅을 추가한 뒤 패치 버전을 올려 재게시한다. 사람의 개입 없이 탈취된 계정 하나가 수십 개의 악성 릴리스를 만들어내는 구조다. Microsoft는 이 때문에 악성 릴리스 다수가 대응하는 소스 커밋이나 PR 없이 "평범한 패치 버전 증가"로만 나타났다고 설명한다.

더 눈에 띄는 지점은 개발 환경으로의 2차 감염 경로다. 탈취한 GitHub 자격증명으로 저장소에 `.claude/settings.json`, `.claude/setup.mjs`, `.vscode/tasks.json` 같은 설정 파일을 주입해두면, 원래 감염된 npm 패키지가 제거된 뒤에도 그 저장소를 Claude Code나 VS Code에서 열기만 해도 페이로드가 다시 실행된다. 패키지 감염과 IDE 감염이 서로를 되살리는 구조인 셈이다.

명령 제어(C2) 주소도 페이로드에 고정되어 있지 않다. Wiz는 이 악성코드가 이더리움 스마트 컨트랙트를 조회해 C2 도메인을 받아온다고 분석했다(이른바 EtherHiding). 공격자는 악성코드를 다시 배포하지 않고도 컨트랙트 값만 바꿔 C2 주소를 교체할 수 있다.

## 타임라인

| 시각(UTC, 2026-08-04) | 사건 |
| --- | --- |
| 09:00경 | keyv 저장소에 지속성 페이로드(.claude·.vscode 설정) 주입 (Wiz) |
| 09:00 직후 | keyv 악성 버전(6.0.0) 게시, 웜 확산 시작 (Wiz) |
| 09:00~13:00 | 440개 패키지·2,200개 이상 악성 버전으로 확산 (StepSecurity, SecurityWeek 인용) |
| 이후 | Wiz·Microsoft·JFrog·Socket 등이 각각 분석 공개, Microsoft가 "ChainDrop"으로 명명 |

## 개발자 체크리스트

- 최근 설치 로그에서 `keyv`, `cacheable`, `cache-manager`, `flat-cache` 등 관련 패키지의 게시 버전을 확인한다. 소스 커밋 없이 패치 버전만 오른 릴리스가 있으면 격리 대상이다.
- 영향받은 패키지를 설치한 워크스테이션·CI 러너는 잠재적 감염으로 간주하고 재구축한다.
- npm·GitHub·클라우드·SSH 자격증명을 깨끗한 것으로 확인된 환경에서 회전(rotate)한다.
- 저장소의 `.claude/`, `.vscode/` 아래 낯선 `setup.mjs`나 `tasks.json` 변경 이력을 점검한다.
- lifecycle 스크립트를 전역으로 끄기보다, 정말 필요한 패키지만 허용 목록으로 관리한다. 무차별 비활성화는 정상적인 빌드도 함께 깨뜨린다.

npm의 `preinstall` 훅은 원래 네이티브 애드온 빌드 같은 정상적인 용도로 만들어졌지만, 이번 사건은 그 신뢰가 그대로 공격 표면이 될 수 있음을 보여준다. 패키지 하나를 설치하는 순간이 곧 코드 실행 순간이라는 사실은, 의존성을 추가할 때마다 되새길 값어치가 있다.
