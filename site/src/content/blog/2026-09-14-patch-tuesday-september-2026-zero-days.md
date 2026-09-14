---
title: "2026년 9월 패치 화요일 — 역대 최대 974건, 그리고 이미 뚫린 제로데이 둘"
pubDate: 2026-09-14T10:52:29Z
section: "security"
tags: ["Patch Tuesday", "Windows", "권한상승", "cisa-kev"]
description: "2026년 9월 마이크로소프트 패치 화요일이 역대 최대 규모로 집계됐다. 매체마다 966건에서 974건까지 갈린 집계 속에서, 실제로 공격에 쓰인 제로데이 두 건(CVE-2026-81963, CVE-2026-85880)이 무엇을 의미하는지, 개발자가 실제로 챙겨야 할 것은 무엇인지 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.bleepingcomputer.com/news/microsoft/microsoft-september-2026-patch-tuesday-fixes-966-flaws-2-zero-days"
    title: "Microsoft September 2026 Patch Tuesday fixes 966 flaws, 2 zero-days"
  - url: "https://thehackernews.com/2026/09/microsoft-patches-record-974-flaws.html"
    title: "Microsoft Patches Record 974 Flaws, Including Two Exploited Windows Zero-Days"
  - url: "https://krebsonsecurity.com/2026/09/microsoft-plugs-nearly-1000-security-holes"
    title: "Microsoft Plugs Nearly 1,000 Security Holes"
---

## 사상 최대 규모, 그런데 집계부터 엇갈렸다

2026년 9월 8일, 마이크로소프트가 정례 패치 화요일 업데이트를 냈다. 규모부터 이례적이다. BleepingComputer는 이번 배포분만 966건이라 집계했고, The Hacker News와 KrebsOnSecurity는 이달 초 앞서 나온 수정분 204건을 더해 974건이라 보도했다. Critical 등급 개수도 매체마다 105건(BleepingComputer)과 113건(Krebs)으로 갈렸다. 당일 발표분만 셀지 월간 누적을 셀지에 따라 집계가 갈리는데, 이 어긋남 자체가 지금 패치 화요일이 처한 상황을 보여준다. 보안 R&D 업체 Fortra의 Tyler Reguly는 "마이크로소프트가 계속 밀린 패치를 따라잡는 한, 이 숫자들은 이제 의미를 잃었다"고 말했다.

직전 기록은 지난 7월이었다(매체별로 570건에서 663건 사이로 집계가 갈린다). 마이크로소프트를 비롯해 Adobe·Cisco·Google·Oracle 등 대형 벤더들도 최근 AI 지원 취약점 탐색이 패치 속도와 물량을 함께 끌어올렸다고 밝히고 있다.

## 진짜 문제는 이미 공격에 쓰인 두 건

이번 배포에서 실제로 공격에 악용된 것으로 확인된 제로데이는 두 건이다.

```text
CVE-2026-81963  Windows Update Stack 권한상승, CVSS 7.8
  - 원인: 파일 접근 전 링크 해석 오류(link following)
  - 신고: Romain Deperne(Airbus Helicopters), MSTIC

CVE-2026-85880  Windows ALPC 권한상승, CVSS 7.8
  - 원인: 힙 기반 버퍼 오버플로
  - 신고: Volexity, Proofpoint
```

두 취약점 모두 권한상승(Elevation of Privilege)이라는 점이 핵심이다. 원격에서 곧바로 시스템을 장악하는 게 아니라, 이미 낮은 권한으로 코드를 실행할 수 있는 공격자가 SYSTEM 권한까지 올라서는 데 쓰인다. 피싱이나 악성 문서로 최초 침투에 성공한 뒤, 이 취약점으로 권한을 굳히는 2단계 공격에 쓰인다는 뜻이다. CISA는 두 CVE를 모두 KEV 카탈로그에 올리고, 연방 기관에 9월 22일까지 패치를 요구했다.

## 개발자에게 걸리는 부분

이번 배포에는 "개발 도구" 카테고리 취약점도 22건 섞여 있고, 그중 GitHub Copilot·VS Code 관련 정보노출 취약점(CVE-2026-81380, CVE-2026-81381)도 포함됐다. 원격코드실행만큼 치명적이진 않지만, 코드 편집기와 AI 코딩 어시스턴트도 매달 패치 대상에 오른다는 사실은 짚을 만하다.

수백에서 수천 건에 이르는 CVE를 개인 개발자가 다 검토할 필요는 없다. Tenable의 Satnam Narang은 실제로 대부분 조직에 영향을 주는 취약점 수는 여전히 적다며, 노출돼 있고 실제로 도달 가능한지를 기준으로 우선순위를 매기라고 조언한다. 개인 개발 환경에서는 다음이면 충분하다.

- Windows Update를 미루지 않는다. 이번 권한상승 두 건은 이미 악용되고 있다.
- VS Code와 GitHub Copilot 확장을 최신 버전으로 유지한다.
- CI 러너가 Windows 기반이면 이번 패치를 우선순위로 올린다.

AI 지원 취약점 탐색이 일반화되면서 이런 대량 패치는 앞으로도 반복될 가능성이 높다. 숫자에 매몰되기보다 내 환경에 실제로 걸리는 항목을 추려내는 습관이, 이번 사례가 남기는 실질적인 교훈이다.
