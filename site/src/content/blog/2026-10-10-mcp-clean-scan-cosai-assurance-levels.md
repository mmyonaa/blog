---
title: "MCP 스캐너 \"이상 없음\"은 승인이 아니다: Pluto 실험과 CoSAI v2.0 보증 수준으로 읽기"
pubDate: 2026-10-10T11:16:30Z
section: "mcp"
tags: ["mcp", "mcp-scanner", "cosai", "skillspector", "tool-poisoning"]
area: "T"
description: "악성 MCP 서버 두 개가 공개 스캐너 다섯 종의 검사를 통과한 실험과, CoSAI MCP Security v2.0의 4단계 보증 수준을 엮어 서버 도입 판단 기준으로 재구성한다."
generated: "research-synthesis"
sources:
  - url: "https://pluto.security/blog/malicious-mcp-servers-clean-scans/"
    title: "Malicious Servers, Clean Scans: The Dangerous Illusion of a Clean MCP Scan (Pluto Security)"
  - url: "https://www.coalitionforsecureai.org/mcp-security-version-2-0-from-threat-taxonomy-to-a-model-you-can-actually-audit-against"
    title: "MCP Security, Version 2.0 (Coalition for Secure AI)"
  - url: "https://adversa.ai/blog/top-mcp-security-resources-october-2026"
    title: "Top MCP security resources - October 2026 (Adversa AI)"
---

외부 MCP 서버를 설치하기 전에 스캐너를 돌려 "findings 0"을 확인하는 팀이 많다. 그런데 Pluto Security가 공개한 실험에서는 날씨 조회 도구로 위장한 악성 서버 두 개가 공개 스캐너 다섯 종의 검사에서 모두 지적을 피했다. 한 서버는 SSH·AWS·Kubernetes 자격 증명을 수집 서버로 보냈고, 다른 서버는 외부에서 받은 셸 명령을 실행했다. 사용자에게는 두 서버 모두 정상 날씨 응답을 돌려줬다.

## 스캐너가 실제로 본 것

핵심은 스캐너마다 검사 대상이 다르다는 점이다. Pluto의 정리를 기준으로 다시 묶으면 다음과 같다.

| 검사 방식 | 보는 것 | 핸들러 코드의 악성 동작 |
| --- | --- | --- |
| 메타데이터 검사 (이름·설명·스키마) | 도구 목록 응답 | X |
| 정적 규칙 | 소스 파일 | △ (우회 문법에 약함) |
| LLM 소스 리뷰 | 소스 파일 | △ (파일이 크기 상한을 넘으면 제외) |
| 런타임 감시 | 실제 실행 경로 | 실행된 경로만 |

우회 수법도 구체적이었다. 악성 코드를 약 16MiB의 무해한 텍스트 뒤에 두자 SkillSpector의 LLM 리뷰는 해당 파일을 입력에서 빼고 `CAUTION / 0`을 냈다. 같은 코드가 정상 크기일 때는 탐지됐으므로, 모델이 아니라 입력 누락이 원인이었다. 또 서버가 `clientInfo.name`을 보고 스캐너에게만 무해한 설명을 돌려주거나, 명령을 호출 시점에 외부에서 받아 오면 설치 전 검사로는 볼 수 없다. Adversa의 10월 요약은 이를 "five scanners 모두 clean"으로 줄였지만, Pluto 본문에는 기본 설정의 LLM 리뷰가 정상 크기에서는 잡았다는 단서가 있다. 요약보다 원문의 조건을 확인해야 한다.

## 판단 기준: CoSAI 보증 수준

그렇다면 스캔 결과를 어디에 쓸지가 문제다. CoSAI는 v2.0(원문 기준 2026년 8월 12일 발행)에서 4단계 보증 수준을 제시했다. 단계는 누적되며 8개 보안 영역별 요구사항이 붙는다.

- Level 1 Sandbox: 로컬 실험. 운영 자격 증명과 실데이터 금지
- Level 2 Internal: 팀 공유·스테이징
- Level 3 Production: 민감 데이터. 발신자 제약 토큰(DPoP 또는 mTLS)이 필수
- Level 4 Regulated: 다중 테넌트·적대적 환경

수준은 서버가 어디서 도는지가 아니라 데이터 민감도와 피해 범위로 정한다. 로컬 stdio 서버라도 의료 데이터를 다루면 Level 3을 목표로 해야 한다.

## 도입 전 체크리스트

- 스캔 통과를 승인 근거로 쓰지 않고, 어떤 입력을 봤는지 먼저 확인한다
- 검토한 버전으로 고정하고, 설정 파일에서 비밀 값을 분리한다
- Level 2 이상에서는 서버를 컨테이너 등으로 격리하고 네트워크 송신을 제한한다
- 각 도구 안에서 권한을 다시 확인한다 (Adversa 요약의 권고)

스캐너는 위험 신호를 찾는 도구일 뿐, 안전을 증명하지 않는다. 그 공백을 격리와 권한 분리가 메워야 한다.
