---
title: "에이전트가 서로를 어떻게 찾나 — DNS를 디렉터리로 쓰는 DNS-AID"
pubDate: 2026-08-23T05:37:43Z
section: "mcp"
tags: ["mcp", "dns-aid", "a2a", "dns", "linux-foundation"]
area: "T"
description: "Linux Foundation이 2026년 5월 발표한 DNS-AID는 새 DNS 레코드 타입 없이 SVCB·TXT·TLSA·DNSSEC을 조합해 AI 에이전트와 MCP 서버를 DNS로 발행·검색·검증하는 오픈소스 프로젝트다. A2A Agent Card와의 관계, 동작 원리, 지금 시도해볼 만한지를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.linuxfoundation.org/press/linux-foundation-announces-dns-aid-project-to-advance-decentralized-ai-agent-discovery"
    title: "Linux Foundation Announces DNS-AID Project to Advance Decentralized AI Agent Discovery"
  - url: "https://github.com/dns-aid/dns-aid-core"
    title: "dns-aid/dns-aid-core: DNS-based Agent Identification and Discovery"
  - url: "https://blog.tobira.ai/linux-foundation-dns-aid-decentralized-agent-discovery"
    title: "Linux Foundation DNS-AID: decentralized AI agent discovery on the existing DNS stack"
  - url: "https://www.helpnetsecurity.com/2026/06/01/dns-aid-ai-agent-discovery-dns"
    title: "DNS-AID lets AI agents find and verify each other through DNS"
---

MCP 서버와 AI 에이전트가 빠르게 늘면서 새로운 문제가 생겼다. "이 에이전트는 어디 있고, 어떤 프로토콜을 쓰며, 진짜 그 조직이 운영하는 게 맞나"를 확인할 표준화된 방법이 없다는 것이다. 지금까지는 하드코딩된 URL을 config에 박아 넣거나, 특정 플랫폼의 폐쇄형 마켓플레이스에 등록하는 식으로 때웠다. Linux Foundation이 2026년 5월 27일 공개한 오픈소스 프로젝트 DNS-AID는 이 발견(discovery) 문제를 인터넷이 이미 40년 가까이 검증해 온 인프라, DNS로 풀자고 제안한다.

## 무엇을 발표했나

DNS-AID는 Infoblox가 초기 코드를 개발해 Linux Foundation 산하로 이관한 프로젝트다. 목표는 중앙 레지스트리나 플랫폼별 하드코딩 없이, DNS를 에이전트와 MCP 서버를 위한 벤더 중립적 글로벌 디렉터리로 쓰는 것이다. Cloudflare, GoDaddy, Infoblox, Internet Systems Consortium, Equinix, CSC, Indeed, WWT가 초기 참여사로 이름을 올렸다. 함께 공개된 것은 세 가지다. IETF DNS 실무그룹에 제출된 표준화 초안(코드명 BANDAID), Python SDK·CLI·MCP 서버로 구성된 레퍼런스 구현 `dns-aid-core`, 그리고 이를 뒷받침하는 초기 지지 기업 목록이다. 아직 정식 RFC가 아니라 초안 단계이므로, 필드 이름 같은 세부 규격은 표준화 논의 과정에서 바뀔 수 있다는 점은 감안해야 한다.

## 새 레코드 타입을 만들지 않았다

이 프로젝트가 흥미로운 지점은 새 DNS 레코드 타입을 발명하지 않았다는 것이다. 대신 이미 배포되어 있고 검증된 레코드를 조합한다. 서비스 엔드포인트와 프로토콜은 SVCB/HTTPS 레코드(RFC 9460)로, capability 정보와 A2A Agent Card·DID 링크 같은 메타데이터는 TXT 레코드로, TLS 인증서 고정은 TLSA(DANE)로, 전체 서명은 DNSSEC으로 맡는다. `_agents.example.com`을 진입점으로 삼고 그 아래 `_a2a._agents.example.com`처럼 프로토콜별 하위 레이블을 두는 네임스페이스 패턴을 쓴다. 개념을 보여주는 예시 레코드는 다음과 같다.

```
_agents.example.com.       IN SVCB 1 atlas.example.com. alpn="h2" port=443
_a2a._agents.example.com.  IN TXT  "dns-aid=1; type=a2a; card=https://example.com/.well-known/agent.json"
_443._tcp.atlas.example.com. IN TLSA 3 1 1 <cert-hash>
```

레코드 자체는 이미 DNSSEC과 SVCB를 지원하는 DNS 서버라면 오늘도 등록할 수 있다. 새로운 서버 소프트웨어나 리졸버가 필요 없다는 뜻이다.

## A2A를 대체하지 않고, 그 아래에 선다

주의할 점은 DNS-AID가 A2A Agent Card나 MCP 자체를 대체하는 게 아니라는 것이다. A2A Agent Card는 에이전트의 이름·스킬·인증 방식을 설명하는 자기소개서에 가깝고, DNS-AID는 "그 자기소개서가 인터넷 어디에 있고 그 도메인 소유자가 발행한 게 맞는지"를 확인하는 하위 계층이다. TXT 레코드가 Agent Card URL을 가리키는 구조라, 이미 Agent Card나 `.well-known` 엔드포인트를 운영 중인 서버라면 DNS-AID는 그 위에 신뢰 앵커 하나를 더 얹는 셈이다.

## 기존 발견 방식과 비교

| 방식 | 신뢰 근거 | 중앙 카탈로그 의존 | 표준화 상태 |
|---|---|---|---|
| 하드코딩 URL | 없음 | X | 없음 |
| 플랫폼 마켓플레이스 등록 | 플랫폼 자체 검수 | O | 플랫폼별 상이 |
| A2A Agent Card | TLS 인증서 | X | LF 표준(v1.2) |
| DNS-AID | DNSSEC 서명 체인 | X | IETF 초안 |

## 지금 써볼 만한가

레퍼런스 구현은 Route 53, Cloudflare, Azure DNS, Google Cloud DNS, Infoblox 등 여러 DNS 공급자를 백엔드로 지원하고, 로컬 테스트용 BIND9 도커 구성도 제공한다. 다만 아직 IETF 초안 단계라 프로덕션의 유일한 인증 경로로 지금 당장 올리는 건 이르다. 도메인에 DNSSEC과 TLSA를 이미 운영 중이라면 추가 부담은 크지 않으니, 사이드 프로젝트나 사내 실험 환경에서 먼저 붙여보는 정도가 합리적이다.

개발 중인 MCP 서버가 있다면 다음을 점검해볼 만하다. 서버 도메인에 DNSSEC이 켜져 있는가. A2A Agent Card나 `.well-known` 엔드포인트를 이미 노출하고 있는가(DNS-AID는 이를 대체하지 않고 가리킬 뿐이다). 여러 조직의 에이전트를 검색·크롤링해야 하는 시나리오가 있는가. 마지막으로, 아직 확정 표준이 아니므로 단일 신뢰 경로로 의존하지 않는 것이 안전하다.
