---
title: "Node2Shell(CVE-2026-111497): Brotli 압축 해제가 서버 코드 실행으로 이어진 경로"
pubDate: 2026-11-04T13:07:07Z
section: "security"
tags: ["node.js", "brotli", "node2shell", "express", "cve-2026-111497"]
description: "2026년 10월 Node.js 보안 릴리스의 Brotli 디코더 취약점을 여러 출처로 교차검증해, 내 앱이 노출되는 경로와 대응 순서를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://nodejs.org/en/blog/vulnerability/october-2026-security-releases"
    title: "Node.js - Wednesday, October 21, 2026 Security Releases"
  - url: "https://www.sysdig.com/blog/node2shell-cve-2026-111497-detecting-the-node-js-brotli-rce"
    title: "Node2Shell (CVE-2026-111497): Detecting the Node.js Brotli RCE | Sysdig"
  - url: "https://www.aikido.dev/blog/node2shell-nodejs-brotli-rce-cve-2026-111497"
    title: "Node2Shell: Node.js Brotli vulnerability allows remote code execution | Aikido"
---

## 무슨 일이 있었나

2026년 10월 21일 Node.js 프로젝트가 보안 릴리스를 냈고, 그중 Brotli 디코더의 범위 밖 쓰기(out-of-bounds write) 취약점 CVE-2026-111497이 "Node2Shell"이라는 이름으로 퍼졌다. 원인은 잘못된 블록 전환(block switch)을 "입력이 더 필요함"으로 처리해, 디코더가 8바이트 내부 버퍼 뒤로 계속 데이터를 쓰는 것이다. 공격자가 만든 Brotli 데이터를 `node:zlib`이 풀면 크래시, 메모리 노출, 코드 실행이 가능하다.

## 타임라인

| 날짜 | 사건 |
| --- | --- |
| 10월 21일 | Node.js 22.23.4, 24.22.1, 26.12.1 배포. Brotli 본체도 같은 수정 반영 |
| 10월 21일 | 공개 저장소 등장(Sysdig에 따르면 수정 배포 약 5시간 뒤) |
| 10월 22일 | 공식 24.22.0 이미지에서 코드 실행을 재현했다는 보고 |
| 10월 26일 | Sysdig에 따르면 ELLIO가 실제 악용을 확인 |

## 출처가 어긋나는 지점

- 악용 여부: Aikido(10월 22일)는 실제 악용 보고가 없다고 썼고, Sysdig는 10월 28일 갱신에서 10월 26일 악용 확인으로 정정했다. 시점 차이일 뿐 모순은 아니지만, 오래된 글만 읽으면 위험을 낮게 볼 수 있다.
- 심각도: Node.js 공지는 high, Sysdig에 따르면 Google의 CVSS v4.0 점수는 9.2(Critical)다.
- 신뢰도: Sysdig는 안정적인 원격 코드 실행 재현은 한정된 환경뿐이고 크래시는 쉽게 재현된다고 정리한다. 일부 연구는 실질 영향이 서비스 거부라고 주장한다. 최악을 단정하지 말고, 크래시는 기본 시나리오로 보는 것이 안전하다.

## 내 앱이 노출되는 경로

핵심은 "공격자가 영향을 줄 수 있는 Brotli 데이터를 우리 코드가 푸는가"다.

| 경로 | 노출 |
| --- | --- |
| Express 5 / body-parser 2.x의 요청 본문 | O (`Content-Encoding: br` 본문을 해제) |
| 서버 측 `fetch()`로 외부 URL 호출(웹훅 등) | O (응답이 br이면 해제) |
| `node:zlib`의 Brotli 함수에 외부 입력 | O |
| Express 4 body-parser 1.20.x | X (본문 기준, 다른 미들웨어는 별도 확인) |

수정 버전이 없는 25.x, 20.x 이하는 단종(EOL)이라 취약한 채로 남는다. Bun은 1.4.4 이상에서 수정되었다고 Aikido가 밝혔다. 배포판 패키지 Node.js는 시스템 Brotli를 쓸 수 있어, 버전 번호만으로 안전을 판단할 수 없다.

## 대응 체크리스트

1. 호스트, CI, 컨테이너의 Node.js 버전을 전수 확인한다(`node --version`).
2. 22.23.4, 24.22.1, 26.12.1 이상으로 올리고 이미지를 다시 빌드한다. `node:24.22.0`으로 고정한 Dockerfile은 재빌드해도 취약하다.
3. 외부 요청을 받는 서비스와 외부 URL을 호출하는 서비스부터 먼저 패치한다.
4. 즉시 패치가 어렵다면 프록시에서 요청의 `Content-Encoding: br`을 거부한다. 응답 쪽 경로는 막지 못하므로 임시 조치일 뿐이다.
5. Node.js 프로세스는 낮은 권한으로 실행하고 비밀 값은 환경 변수에서 최대한 뺀다.

## 개발자 관점의 교훈

이 버그는 Node.js 코드가 아니라 번들된 네이티브 라이브러리에 있었다. 앱의 의존성 목록에는 나타나지 않으니, 런타임 자체를 인벤토리에 넣어야 한다. 수정 배포 후 하루 안에 PoC가 나온 만큼, 패치 순서는 심각도 숫자보다 도달 가능성으로 정하는 편이 현실적이다.
