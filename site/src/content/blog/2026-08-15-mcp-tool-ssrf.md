---
title: "MCP 도구가 URL을 받을 때 — SSRF는 왜 생기고 어떻게 막나"
pubDate: 2026-08-15T05:33:00Z
section: "security"
tags: ["mcp", "ssrf", "dns-rebinding", "node", "url"]
description: "MCP 도구가 URL을 인자로 받아 대신 요청을 보낼 때 생기는 SSRF 취약점을 다룬다. 문자열 패턴 매칭으로는 왜 못 막는지, 호스트명이 아니라 실제 연결되는 IP를 검사해야 하는 이유, DNS 리바인딩의 한계와 허용 목록이라는 더 단순한 대안까지 코드로 정리한다."
---

## URL을 대신 열어주는 도구

MCP 도구 중에는 URL을 인자로 받아 서버가 대신 요청을 보내는 것들이 있다 — 웹페이지 요약, 링크 미리보기, 웹훅 발송 같은 도구다. 이 인자를 채우는 게 사람이 아니라 LLM이라는 점은 커맨드 인젝션과 같은 조건을 만든다. 그런데 URL을 받아 서버가 대신 요청하는 도구에는 셸 인젝션과는 결이 다른 취약점이 하나 더 있다. SSRF(Server-Side Request Forgery, 서버 측 요청 위조)다.

## SSRF가 왜 생기나

서버가 "이 URL로 요청을 대신 보내준다"는 기능을 제공하면, 공격자(또는 프롬프트 인젝션으로 조작된 LLM)는 외부 URL 대신 서버 자신만 접근 가능한 주소를 넣을 수 있다. 대표적인 표적은 이렇다.

- 클라우드 메타데이터 엔드포인트(169.254.169.254) — 환경에 따라 자격 증명이 여기 노출되기도 한다
- localhost나 내부망 IP대 — 방화벽 뒤에 있어 외부에서 직접 못 여는 관리 콘솔·DB·내부 API
- 사설 IP 대역(10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)

서버 입장에서 이건 자기 자신이 보내는 요청이라 방화벽 규칙을 그대로 통과한다. "요청 위조"라 불리는 이유가 여기 있다 — 공격자가 직접 두드리지 못하는 곳을 서버를 대리인 삼아 두드리는 것이다.

## 흔한 실수: 문자열만 보고 판단

가장 흔한 방어 실패는 URL 문자열 패턴만 걸러내는 것이다. "localhost", "127.0.0.1" 같은 문자열만 막으면 우회는 어렵지 않다. 10진수 표기(2130706433은 127.0.0.1과 같다), 16진수 표기(0x7f000001), 리다이렉트를 이용한 우회, 그리고 도메인 이름 자체는 평범한 공개 도메인이지만 DNS 응답이 내부망 IP를 가리키게 만드는 DNS 리바인딩까지 — 문자열 매칭으로는 다 못 막는다.

## 실제로 막으려면: 호스트명이 아니라 붙는 IP를 검사

안전한 접근은 URL의 호스트명이 아니라, 실제로 연결될 IP 주소를 확인하는 것이다.

```js
import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // 링크로컬, 클라우드 메타데이터 포함
    return false;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::1") return true;
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // 유니크 로컬
    if (v.startsWith("fe80")) return true; // 링크로컬
    return false;
  }
  return false;
}

async function assertSafeUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("허용하지 않는 프로토콜: " + url.protocol);
  }
  const { address } = await dns.lookup(url.hostname);
  if (isPrivateIp(address)) {
    throw new Error("내부망 주소로의 요청 차단: " + url.hostname + " -> " + address);
  }
  return address;
}
```

이 함수는 프로토콜을 http/https로 제한하고, hostname을 DNS로 실제 풀어본 뒤 그 IP가 사설·루프백·링크로컬 대역에 속하는지 검사한다. 다만 이것만으로 완전하지는 않다. 검사 시점과 실제 요청 시점 사이에 DNS 응답이 바뀌는 DNS 리바인딩은 별도 대응이 필요하다 — 검사에서 얻은 IP로 직접 연결하거나, 쓰는 HTTP 클라이언트에 커스텀 리졸버를 꽂아 재조회 자체를 막는 식이다. 이 부분은 fetch 기본 옵션만으로 깔끔히 풀리지 않는 경우가 많아, 프로젝트가 쓰는 클라이언트의 저수준 훅(에이전트·디스패처 커스터마이즈)을 확인해야 한다.

## 더 단순한 방어: 허용 목록

MCP 도구가 다룰 도메인 범위를 안다면, IP 검사보다 허용 목록(allowlist)이 더 단순하고 확실하다. "이 도메인들로만 요청을 보낼 수 있다"고 코드에서 못 박으면 검사 로직의 빈틈을 걱정할 필요가 없다. 범위를 예측할 수 없는 범용 웹 조회 도구라면 IP 검사에 더해 자동 리다이렉트를 끄고 매 홉마다 재검사하는 절차까지 함께 두는 편이 안전하다.

## 마무리

SSRF는 "서버가 나 대신 요청을 보내준다"는 기능 자체가 원인이다. LLM이 그 URL 인자를 채우는 MCP 도구에서는 이 위험이 한 단계 더 커진다 — 인자가 사용자의 명시적 의도가 아니라 프롬프트에 섞여 들어온 지시일 수 있어서다. 호스트명이 아니라 실제로 붙는 IP를 검사하고, 가능하면 허용 목록으로 범위를 좁히는 것이 SSRF 대응의 핵심이다.
