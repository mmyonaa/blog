---
title: "protobuf.js 코드 실행 취약점 — 스키마 파일도 입력이다"
pubDate: 2026-09-29T11:27:06Z
section: "security"
tags: ["protobuf.js", "GHSA-xq3m-2v4x-88gg", "코드 인젝션", "npm", "gRPC"]
description: "npm에서 주간 수천만 회 내려받히는 protobuf.js에서 악성 스키마로 임의 JavaScript가 실행되는 취약점을 원리, 영향 범위, 타임라인, 점검 체크리스트로 재구성한다."
generated: "research-synthesis"
sources:
  - url: "https://www.endorlabs.com/learn/the-dangers-of-reusing-protobuf-definitions-critical-code-execution-in-protobuf-js-ghsa-xq3m-2v4x-88gg"
    title: "Endor Labs - The Dangers of Reusing Protobuf Definitions"
  - url: "https://github.com/advisories/GHSA-xq3m-2v4x-88gg"
    title: "GitHub Advisory - Arbitrary code execution in protobufjs"
  - url: "https://www.bleepingcomputer.com/news/security/critical-flaw-in-protobuf-library-enables-javascript-code-execution"
    title: "BleepingComputer - Critical flaw in Protobuf library enables JavaScript code execution"
  - url: "https://www.csa.gov.sg/alerts-and-advisories/alerts/al-2026-041"
    title: "Cyber Security Agency of Singapore - Critical Vulnerability in protobuf.js"
---

## 무슨 일인가

JavaScript용 Protocol Buffers 구현체 protobuf.js(npm 패키지 `protobufjs`)에서 임의 코드 실행 취약점이 공개됐다. 추적 번호는 `GHSA-xq3m-2v4x-88gg`이다. 이 패키지는 `@grpc/proto-loader` 등을 통해 간접 의존으로 깔리는 경우가 많아서, 직접 설치한 적이 없어도 `node_modules`에 들어 있을 가능성이 높다.

## 원리: 스키마를 해석하지 않고 컴파일한다

protobuf.js는 메시지 타입마다 인코더·디코더 코드를 문자열로 조립한 뒤 `Function` 생성자로 실행한다. 속도를 위한 흔한 기법이다. 문제는 함수 이름 자리에 스키마의 타입 이름이 검증 없이 그대로 들어간다는 점이다. 타입 이름에 괄호와 세미콜론을 섞어 함수 선언을 닫아 버리면, 그 뒤에 붙은 문장이 코드로 실행된다.

실행 시점은 스키마를 읽을 때가 아니라 해당 타입을 처음 디코딩·인코딩할 때다. 그래서 트리거는 평범한 사용자 트래픽이고, 오염된 것은 스키마 쪽이다.

## 누가 영향을 받나

공격에는 공격자가 로드될 스키마(`.proto` 또는 JSON 디스크립터)를 조작할 수 있어야 한다는 전제가 붙는다. GitHub 권고문은 애플리케이션이 신뢰하는 자체 스키마만 쓴다면 직접 영향이 없다고 밝힌다. 반대로 외부 레지스트리, 파트너 연동, 서버 리플렉션처럼 런타임에 스키마를 가져오는 경로가 있다면 범위 안이다.

| 구분 | 영향 | 조치 |
| --- | --- | --- |
| 저장소에 고정된 자체 스키마만 사용 | 직접 영향 없음 | 그래도 업그레이드 |
| 외부 스키마를 런타임에 로드 | 영향 | 업그레이드 + 스키마 검증·격리 |
| 간접 의존으로만 존재 | 로드 경로 확인 필요 | `npm ls protobufjs`로 확인 |

## 타임라인

| 날짜 (2026) | 사건 |
| --- | --- |
| 3월 2일 | 유지보수자에게 제보 |
| 3월 11일 | GitHub에 수정 커밋 |
| 4월 4일 | 8.x 수정판(8.0.1) npm 배포 |
| 4월 15일 | 7.x 수정판(7.5.5) npm 배포 |
| 4월 16일 | 권고문 공개 |

수정판은 8.0.1과 7.5.5 이상이다.

## 출처 사이의 어긋남

CVE 번호가 출처마다 다르다. BleepingComputer 기사는 공식 CVE가 없고 GHSA로만 추적된다고 썼다. 반면 며칠 뒤인 4월 21일자 싱가포르 CSA 경보는 CVE-2026-41242를 명시한다. 기사 시점 이후에 CVE가 부여된 것으로 보이나, 부여 시점은 이 글에서 확인하지 못했다. 또 Endor Labs와 BleepingComputer는 PoC가 공개됐지만 실제 악용은 관찰되지 않았다고 전한다.

## 수정과 한계

패치는 타입 이름에서 영문자·숫자·밑줄 이외의 문자를 지우는 한 줄이다. Endor Labs는 이를 보수적인 응급 처치로 보고, 근본적으로는 식별자를 소스에 끼워 넣지 않는 설계가 낫다고 평한다.

## 점검 체크리스트

1. `npm ls protobufjs`로 버전을 확인하고 8.0.1 또는 7.5.5 이상으로 올린다.
2. `Root.fromJSON` 등으로 런타임에 스키마를 읽는 코드가 있는지 찾는다.
3. 그 스키마의 출처가 우리 통제 밖이면 검증하거나 격리한다.
4. 가능하면 운영에서는 미리 컴파일한 정적 산출물을 쓴다.

교훈은 단순하다. 스키마·설정·API 명세처럼 정적인 데이터로 여기던 파일도, 도구가 그것으로 코드를 만들어 실행하는 순간 실행 코드와 같은 신뢰 기준이 필요하다.
