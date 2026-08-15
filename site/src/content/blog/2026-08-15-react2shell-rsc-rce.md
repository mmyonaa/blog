---
title: "React2Shell — CVSS 10.0이 흔들어놓은 React 생태계"
pubDate: 2026-08-15T06:18:05Z
section: "security"
tags: ["react", "nextjs", "rce", "역직렬화", "cisa-kev"]
description: "2025년 12월 CVSS 10.0으로 공개된 React Server Components의 원격 코드 실행 취약점 \"React2Shell\"(CVE-2025-55182/CVE-2025-66478)을 타임라인과 피해 규모, 개발자 체크리스트로 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://nextjs.org/blog/CVE-2025-66478"
    title: "Security Advisory: CVE-2025-66478 - Next.js Blog"
  - url: "https://github.com/vercel/next.js/security/advisories/GHSA-9qr9-h5gf-34mp"
    title: "RCE in React Server Components - GitHub Security Advisory"
  - url: "https://vercel.com/changelog/cve-2025-55182"
    title: "Summary of CVE-2025-55182 - Vercel"
  - url: "https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components"
    title: "Denial of Service and Source Code Exposure in React Server Components - React Blog"
  - url: "https://www.bleepingcomputer.com/news/security/react2shell-flaw-exploited-to-breach-30-orgs-77k-ip-addresses-vulnerable/"
    title: "React2Shell flaw exploited to breach 30 orgs, 77k IP addresses vulnerable - BleepingComputer"
---

## React2Shell — CVSS 10.0이 흔들어놓은 React 생태계

2025년 12월 3일, React 팀과 Vercel은 React Server Components(RSC)의 핵심 프로토콜인 Flight에서 치명적 원격 코드 실행(RCE) 취약점을 공개했다. CVE-2025-55182(React)와 CVE-2025-66478(Next.js)로 등록된 이 취약점은 CVSS 최고점인 10.0을 받았고 "React2Shell"이라는 별명이 붙었다. 서버가 클라이언트 요청을 처리하며 신뢰할 수 없는 입력을 역직렬화(CWE-502)하는 과정에서, 공격자가 조작한 HTTP 요청 하나만으로 인증 없이 서버 명령을 실행할 수 있었다.

### 무엇이 취약했나

RSC는 서버에서 렌더링한 컴포넌트 트리를 클라이언트로 직렬화해 보내는데, 이 직렬화 형식이 Flight 프로토콜이다. react-server-dom-webpack, react-server-dom-parcel, react-server-dom-turbopack 세 패키지가 이를 구현하며, Next.js(App Router), React Router의 RSC 프리뷰, Vite·Parcel의 RSC 플러그인, Waku, RedwoodSDK 등 RSC를 채택한 프레임워크는 모두 같은 코드 경로를 공유했다. "Next.js를 안 쓰니 안전하다"는 판단이 통하지 않았다는 뜻이다 — react-server 계열 패키지를 임베드한 프레임워크라면 전부 대상이었다.

### 타임라인

| 날짜 | 사건 |
| --- | --- |
| 12/3 | RCE 공개(CVE-2025-55182/66478), CVSS 10.0 |
| 12/4 | 공개 PoC 등장, 스캔·익스플로잇 급증 |
| 12/5 | CISA KEV 등재, 연방기관 12/26까지 패치 의무 |
| 12/11 | 패치 우회 시도 중 DoS 2건·소스코드 노출 1건 추가 발견 |
| 2026-01-26 | 12월 DoS 패치가 불완전했음이 드러나 재패치(CVE-2026-23864) |

### 실제 피해 규모

Shadowserver는 인터넷에 노출된 취약 IP를 77,664개(그중 약 23,700개가 미국 소재) 확인했고, Palo Alto Networks Unit 42는 최소 30개 조직이 실제로 침해당했다고 보고했다. 일부는 중국 국가 배후로 알려진 UNC5174와 연계된 공격으로, Cobalt Strike·Snowlight·Vshell 같은 악성코드가 심어졌다. Cloudflare·Vercel 등이 WAF에 긴급 룰을 배포했지만 이는 임시방편이었고, 코드 업그레이드가 유일한 근본 해결책이었다.

### 개발자가 확인할 것

- Next.js를 App Router로 쓴다면 15.0.5·15.1.9·15.2.6·15.3.6·15.4.8·15.5.7·16.0.7 이상인지, React는 19.0.1·19.1.2·19.2.1 이상인지 확인한다.
- 이후 발견된 DoS·소스코드 노출까지 막으려면 React 19.0.4·19.1.5·19.2.4 이상인지, 2026년 1월 26일자 추가 DoS 패치(CVE-2026-23864)까지 반영됐는지 다시 확인한다.
- Server Function 안에서 비밀 값을 문자열로 반환하거나 암묵적으로 직렬화되게 두지 않는다 — 소스코드 노출 취약점은 함수 인자가 뒤섞여 문자열화되는 경로에서 발생했다.
- 패치 전 온라인 상태였다면 API 키·DB 자격증명 등 비밀 값을 회전한다.
- WAF나 CDN의 임시 완화 규칙에 의존하지 말고, 실제 배포본을 업그레이드·재빌드·재배포한다.

React 팀은 이번 사태를 두고 "치명적 CVE 뒤에 후속 취약점이 따라붙는 건 업계 전반에서 흔한 패턴"이라며 Log4Shell 사례를 언급했다. 최초 공지 하나만 보고 안심하기보다, 같은 컴포넌트를 다루는 공식 보안 페이지를 몇 주간 다시 확인하는 습관이 필요하다는 뜻이다.
