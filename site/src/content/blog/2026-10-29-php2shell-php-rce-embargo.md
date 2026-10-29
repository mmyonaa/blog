---
title: "PHP2Shell: PHP 코어의 인증 없는 RCE 두 건과 엠바고 소동"
pubDate: 2026-10-29T11:38:11Z
section: "security"
tags: ["php", "php2shell", "rce", "메모리 손상", "엠바고"]
description: "2026년 10월 21일 패치된 PHP2Shell(CVE-2026-109618, CVE-2026-109619)의 원인과 영향 범위, 공개 일정이 꼬인 과정, 개발자가 할 일을 교차 확인해 정리했다."
generated: "research-synthesis"
sources:
  - url: "https://www.theregister.com/security/2026/10/22/php-blames-supply-chain-security-biz-chainguard-for-putting-huge-chunks-of-the-web-at-risk/5304611"
    title: "PHP blames supply chain security biz Chainguard for putting huge chunks of the web at risk (The Register)"
  - url: "https://unit42.paloaltonetworks.com/cve-2026-109618-cve-2026-109619"
    title: "Threat Brief: Critical Vulnerabilities in PHP: CVE-2026-109618, CVE-2026-109619 (Unit 42)"
  - url: "https://www.helpnetsecurity.com/2026/10/25/week-in-review-php-vulnerabilities-patched-exploited-palo-alto-globalprotect-vpn-flaw"
    title: "Week in review: PHP vulnerabilities patched, exploited Palo Alto GlobalProtect VPN flaw (Help Net Security)"
---

## 무슨 일이 있었나

2026년 10월 21일 PHP 팀이 긴급 보안 릴리스를 냈다. 인증 없이 서버에서 코드를 실행할 수 있는 취약점 두 건으로, 통칭 PHP2Shell이다. 식별자는 CVE-2026-109618과 CVE-2026-109619이고, Unit 42와 Help Net Security 모두 CVSS 4.0 기준 9.2로 적었다.

## 원인: 오류 처리 경로의 메모리 상태

두 건 모두 요청이 비정상 종료될 때 PHP 내부 상태가 어긋나는 문제로, 메모리 손상 유형이다. The Register가 인용한 PHP 측 설명과 Unit 42의 요약은 같은 방향이다.

- CVE-2026-109618: 요청이 `memory_limit`에 걸리는 순간, 초기화가 덜 된 내부 데이터가 남아 유효한 것처럼 쓰인다. Apache의 mod_php 환경에서는 애플리케이션 코드가 실행되기 전에도 유발될 수 있다고 한다.
- CVE-2026-109619: 치명적 오류가 특정 시점에 나면, 내부 상태가 이전 요청의 해제된 메모리를 가리킨 채 남는다. 같은 워커가 처리하는 다음 요청이 그 메모리를 쓰면 use-after-free가 된다.

개발자 관점의 핵심은 취약점이 애플리케이션 코드가 아니라 런타임 자체에 있다는 점이다. 코드를 아무리 안전하게 짜도 패치 없이는 막을 수 없다.

## 영향 범위

Wiz는 최근 10년간 나온 모든 PHP 버전이 둘 중 적어도 하나의 영향을 받으며, 5.4까지 거슬러 올라간다고 밝혔다. 수정 버전은 8.5.12, 8.4.27, 8.3.36, 8.2.35다. 그 밖의 오래된 브랜치에 수정이 나오는지는 읽은 자료에서 확인하지 못했다. Unit 42는 노출 가능성이 있는 인스턴스를 2,260만 개 이상으로 집계했는데, 자사 텔레메트리 기준 수치다. PAN-OS처럼 PHP를 내장한 장비도 영향을 받으며, Help Net Security에 따르면 Palo Alto는 당시 수정 릴리스를 아직 내지 못했다.

## 타임라인

| 시점(UTC) | 사건 | 출처 |
| --- | --- | --- |
| 8~9월 | 연구자들이 취약점을 발견해 보고 | Register |
| 10월 20일 | Palo Alto 가상 패치 시그니처 적용 | Unit 42 |
| 10월 20일 23시경 | 일부 핵심 인프라 업체에 완화책 전달 | Register |
| 10월 21일 07:41 | Chainguard가 수정이 반영된 이미지 선공개 | Register |
| 10월 21일 14:00 | 공식 릴리스 | Help Net |

공개 일정은 원래 목요일이었으나, CVE 번호가 먼저 돌자 수요일로 하루 당겨졌다. 날짜 표기는 출처마다 요일과 일자를 섞어 써서 위 표는 일자 기준으로 맞췄다.

## 엠바고 논쟁: 어긋나는 주장

PHP 측은 Chainguard가 공식 릴리스보다 6시간 이상 먼저 수정본을 공개해 공격자가 바이너리로 패치를 분석할 수 있게 했다고 비판한다. Chainguard CEO는 이미 PoC가 돌고 실제 공격이 보여서 내린 판단이라며 유출은 아니라고 반박했다. 두 주장은 이 글에서 어느 쪽도 단정하지 않는다. 다만 연구 업체의 PoC 영상 공개 등 여러 경로가 겹쳤다는 점은 Register 보도로 확인된다. 교훈은 하나다. 위험이 알려진 순간부터 패치 지연 시간이 곧 노출 시간이다.

## 체크리스트

1. `php -v`로 버전을 확인하고, 위 수정 버전 이상으로 올린다.
2. 컨테이너 이미지는 기반 이미지를 새로 받아 다시 빌드한다.
3. PHP를 내장한 장비(VPN, 방화벽, 관리 콘솔)를 목록화하고 벤더 공지를 확인한다.
4. 패치 전에는 외부 노출을 줄이고 비정상 종료·메모리 한도 초과 로그를 살핀다.
