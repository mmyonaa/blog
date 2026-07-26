---
name: responsive-check
description: >
  Check and improve responsive design by opening the real site in a browser at
  the canonical breakpoint devices (mobile / tablet / desktop), then E2E-testing
  it — clicking nav, entering links, toggling UI — to catch layout breakage
  before fixing CSS. Use whenever the task involves responsive design, mobile /
  tablet layout, breakpoints, media queries, viewport sizing, or "does this look
  right on phone/tablet". Also runs on demand via /responsive-check. Do NOT use
  for brand-new section design or full redesigns (use the design-director agent
  for that) — this is for verifying and repairing responsiveness of existing UI.
argument-hint: "[optional: page path, e.g. /topics]"
---

# Responsive Check

기존 화면의 반응형을 **실제 브라우저로 열어 대표 기기 사양에서 E2E식으로 눌러보며**
점검하고 고친다. 한 번 렌더 보고 끝내지 말고, 깨지는 곳이 없어질 때까지 반복한다.

## 대표 breakpoint 기기 (매번 이 3종)

| 구간 | 기기 대표 | 뷰포트 |
|---|---|---|
| Mobile | iPhone 12/13/14 | **390 × 844** |
| Tablet | iPad (portrait) | **768 × 1024** |
| Desktop | 일반 노트북 | **1280 × 800** |

"제일 범용적인 breakpoint"를 각 구간 대표 1개로 잡은 것이다. 각 구간에서 반드시 확인한다.

## 절차

1. **서버 기동** — dev 서버가 안 떠 있으면 `cd site && npm run dev` (백그라운드).
   URL은 `http://localhost:4321/blog/` (astro `base: /blog/` 때문에 `/blog/` 필수).
   포트는 4321 하나만 쓰고, 넓은 `pkill` 금지 — 이미 떠 있으면 재사용한다.

2. **각 기기에서 순회** — Playwright **headless**로 위 3종 뷰포트 각각:
   - `browser_resize`로 뷰포트 맞추고 대상 페이지 열기
   - `browser_take_screenshot` — 저장 위치는 반드시 `.playwright-mcp/` 아래
     (맨 파일명은 레포 루트로 새어 커밋된다)
   - **E2E식 인터랙션**: nav/햄버거 메뉴 열고 닫기, 주요 링크 클릭해 실제 진입,
     카드·그리드·토글 등 상호작용 요소를 눌러 상태 전환까지 확인.
     한 페이지만 보지 말고 홈 → 목록 → 상세까지 실제 이동 경로를 따라간다.

3. **깨짐 진단** — 각 뷰포트에서 아래를 기록:
   - 가로 오버플로/스크롤바, 요소 겹침·잘림
   - 탭 타겟 너무 작음(모바일), 폰트/타이틀 스케일 부적절
   - 그리드 붕괴, 이미지 넘침, 여백 불균형, 메뉴 동작 불량

4. **수정 → 재검증** — CSS를 고치고 **같은 기기 뷰포트로 다시 열어** 통과 확인.
   한 구간 고치다 다른 구간 깨뜨리지 않았는지 3종 모두 재확인한다.

5. **반복** — 3종 모두에서 문제 없을 때까지 2~4를 반복한다. 통과 후 무엇을 고쳤는지 요약.

## 원칙

- 추측으로 CSS 고치지 말고 **실제 렌더를 보고** 판단한다.
- headless 고정, 크롬 창 띄우지 않기.
- 톤·기존 디자인 언어는 유지 — 반응형 정돈이 목적이지 리디자인이 아니다.
