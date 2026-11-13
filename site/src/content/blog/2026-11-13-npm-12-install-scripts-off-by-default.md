---
title: "npm 12, 설치 스크립트를 기본 차단하다 — 무엇이 바뀌고 무엇을 점검해야 하나"
pubDate: 2026-11-13T13:16:17Z
section: "security"
tags: ["npm", "npm 12", "공급망 공격", "install scripts", "Shai-Hulud"]
description: "npm 12가 의존성의 설치 스크립트, Git·원격 URL 의존성을 기본 차단한다. 세 출처를 교차해 변경 범위와 프로젝트별 점검 순서를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.infoq.com/news/2026/08/npm-12-released"
    title: "npm 12 Released: Install Scripts off by Default as Registry Moves to Explicit Trust - InfoQ"
  - url: "https://thehackernews.com/2026/07/npm-12-disables-install-scripts-by.html"
    title: "npm 12 Disables Install Scripts by Default to Reduce Supply Chain Risk - The Hacker News"
  - url: "https://www.securityweek.com/npm-12-will-change-script-execution-behavior-to-prevent-supply-chain-attacks"
    title: "NPM 12 Will Change Script Execution Behavior to Prevent Supply Chain Attacks - SecurityWeek"
---

`npm install`을 실행하면 의존성이 들고 있는 스크립트가 내 컴퓨터에서 자동으로 돌아갔다. 이 오래된 기본값이 npm 12에서 뒤집혔다. 최근 npm 생태계를 휩쓴 자기 복제 웜 공격이 대부분 이 경로를 탔기 때문이다. 세 출처를 맞춰 보면 변경 범위는 비교적 일치한다. 이 글은 그 내용을 개발자 입장에서 다시 정리한다.

## 무엇이 기본값에서 꺼졌나

GitHub는 6월에 예고했고 7월 초 npm 12 출시를 공지했다. SecurityWeek은 출시 전 예고 시점의 기사이고, The Hacker News(7월 9일)와 InfoQ(8월 14일)는 출시 이후 기사다. 세 출처가 공통으로 확인하는 변경은 다음과 같다.

| 항목 | npm 12 기본값 | 의미 |
| --- | --- | --- |
| `allowScripts` | off | 의존성의 `preinstall`, `install`, `postinstall` 스크립트 차단 |
| node-gyp 빌드 | 차단 | `binding.gyp`만 있고 설치 스크립트가 없는 패키지도 포함 |
| `--allow-git` | none | Git 의존성(직접·간접)을 해석하지 않음 |
| `--allow-remote` | none | HTTPS tarball 같은 원격 URL 의존성을 해석하지 않음 |

`prepare` 스크립트도 Git, file, link 의존성에 한해 같은 방식으로 막힌다고 InfoQ와 SecurityWeek이 전한다.

## 왜 이 항목들인가

SecurityWeek에 따르면 최근 Shai-Hulud 계열 공격 중에는 악성 `binding.gyp`를 이용한 사례가 있었다. 스크립트를 한 줄도 선언하지 않아도 node-gyp 빌드가 암묵적으로 실행되기 때문에, 스크립트만 막아서는 부족했다는 뜻이다. Git 의존성 차단의 근거도 같은 글에 나온다. Git 의존성의 `.npmrc`가 Git 실행 파일 경로를 덮어쓸 수 있어서, `--ignore-scripts`를 줘도 코드가 실행될 수 있었다고 한다. 한편 이 세 경로가 지난 1년간 악성 npm 공격의 약 53%에 관여했다는 수치는 InfoQ가 JFrog를 인용한 것이라, 이 글에서는 한 출처의 주장으로만 둔다.

## 업그레이드 전 점검 순서

세 출처가 공통으로 권하는 절차다.

1. npm을 11.16.0 이상으로 올린다. 이 버전부터 차단될 스크립트에 대한 경고가 나온다.
2. 평소처럼 설치한 뒤 경고를 확인한다.
3. 아래 명령으로 스크립트나 외부 소스가 걸린 패키지 목록을 본다.

```bash
npm approve-scripts --allow-scripts-pending
```

4. 정말 필요한 패키지만 승인하고, 결과로 생긴 허용 목록을 `package.json`에 커밋한다.

InfoQ가 전한 커뮤니티 지적도 알아 둘 만하다. 기존 `ignore-scripts=true` 설정이 허용 목록보다 우선해서 조용히 무력화할 수 있다. 처음 설치하는 패키지는 `node_modules`에 없으면 `approve-scripts`가 `ENOMATCH` 오류를 낸다. 전역 설치와 `npx`는 이 명령을 쓸 수 없고 설정으로 지정해야 한다. 보안 연구자들은 승인 피로도 경고했다. esbuild, sharp, puppeteer처럼 스크립트에 의존하는 패키지가 많아서, 빌드가 자꾸 깨지면 목록을 무비판적으로 전부 허용하게 될 수 있다는 것이다.

## 함께 바뀌는 토큰 정책

The Hacker News에 따르면 2FA를 우회하는 granular access token은 토큰 생성·삭제, 패키지 접근 권한 변경 같은 민감 작업을 더 이상 할 수 없다. 이 변경은 2026년 8월 초 적용 예정이었다. 직접 게시 권한을 없애고 사람의 2FA 승인을 거치는 staged publish로 제한하는 변경은 2027년 1월로 예고되었다. 자동 배포 파이프라인이 있다면 장기 토큰 대신 OIDC 기반 trusted publishing으로 옮길 시점이다.

## 정리

기본 차단은 감염 확산 경로 하나를 끊을 뿐, 승인한 패키지가 탈취되는 경우까지 막지는 않는다. 허용 목록은 버전에 묶이므로 업데이트 때마다 다시 검토하는 습관이 필요하다.
