---
title: "Astro와 CSS의 궁합 — scoped가 기본값인 프레임워크"
pubDate: 2026-07-26T05:19:30Z
section: "web"
tags: ["astro", "css", "scoped-style", "css-in-js", "define-vars"]
area: "W"
related: ["2026-07-18-astro-island-architecture", "2026-07-20-what-is-ssg-astro"]
description: "Astro에서 CSS는 컴포넌트 안에 그냥 쓰면 자동으로 격리되고, 출력은 순수 CSS로 남는다. scoped가 기본값이라는 철학, 전역으로 나가는 문(is:global·:global), define:vars로 서버 값을 스타일에 넘기는 법, 런타임 CSS-in-JS와 상성이 나쁜 이유, 그리고 번들 순서라는 함정까지 — Astro의 스타일링이 React 계열과 어떻게 다른지 정리한다."
---

# Astro와 CSS의 궁합 — scoped가 기본값인 프레임워크

React로 프로젝트를 시작하면 스타일링부터 회의가 열린다. CSS Modules로 갈까, styled-components로 갈까, Tailwind로 갈까. 프레임워크가 아무것도 정해주지 않으니 팀마다 답이 다르고, 프로젝트마다 스타일 코드의 생김새가 다르다.

Astro는 이 회의를 없앤다. `.astro` 컴포넌트 안에 `<style>` 태그를 쓰면 그걸로 끝이다. 별도 라이브러리도, 네이밍 컨벤션도 필요 없다. 이 글은 그 기본 동작이 어떻게 굴러가는지, 다른 프레임워크와 무엇이 다른지, 그리고 조심할 지점은 어디인지 정리한다.

## 기본값이 scoped다

`.astro` 파일 안의 `<style>`은 자동으로 그 컴포넌트에만 적용된다.

```astro
---
// Card.astro
const { title } = Astro.props;
---
<article>
  <h2>{title}</h2>
  <slot />
</article>

<style>
  h2 {
    font-size: 1.25rem;
    color: var(--heading);
  }
</style>
```

여기서 `h2 { ... }`는 페이지의 모든 `h2`가 아니라 이 컴포넌트가 렌더링한 `h2`에만 걸린다. 빌드 시점에 Astro가 컴포넌트 고유의 식별 속성을 요소에 붙이고, 셀렉터도 그 속성 조건으로 좁혀서 컴파일하기 때문이다. 개발자는 `card__title` 같은 방어적 클래스 이름을 짓는 대신 요소 셀렉터를 그냥 쓰면 된다.

이 "기본이 scoped"라는 철학은 Svelte·Vue의 scoped 스타일과 같은 계열이다. 반대로 React는 격리를 원하면 CSS Modules든 CSS-in-JS든 개발자가 직접 선택해야 한다. Astro에서는 선택할 것이 없다는 점 자체가 특징이다.

## 전역으로 나가는 문

물론 전부 격리만 하고 살 수는 없다. 디자인 토큰(색·폰트·간격 변수)이나 리셋은 전역이어야 한다. Astro는 세 가지 문을 열어둔다.

- `<style is:global>` — 그 블록 전체를 전역으로 내보낸다.
- `:global(...)` — scoped 블록 안에서 특정 셀렉터만 전역으로 푼다. 마크다운 렌더링 결과처럼 컴포넌트 바깥에서 생성된 DOM을 스타일링할 때 유용하다.
- CSS 파일 import — 레이아웃 컴포넌트에서 `import "../styles/global.css"`처럼 불러오면 일반 전역 CSS로 번들된다.

실무 패턴은 대체로 이렇다. 전역 토큰과 리셋은 CSS 파일로 레이아웃에서 import하고, 컴포넌트별 스타일은 각 `.astro` 파일의 scoped `<style>`에 둔다. 전역과 지역의 경계가 파일 구조에 그대로 드러난다.

## 서버 값을 스타일로: define:vars

props 값을 스타일에 반영하고 싶을 때, React라면 인라인 스타일이나 CSS-in-JS로 풀 일을 Astro는 CSS 변수 주입으로 푼다.

```astro
---
const { accent = "steelblue" } = Astro.props;
---
<div class="badge"><slot /></div>

<style define:vars={{ accent }}>
  .badge {
    border-left: 3px solid var(--accent);
  }
</style>
```

`define:vars`는 넘긴 값을 CSS 변수로 만들어 요소에 걸어준다. 서버에서 계산한 값이 순수 CSS 변수로 내려가므로, 클라이언트에는 여전히 JS가 한 줄도 실려 가지 않는다.

## 런타임 CSS-in-JS와는 상성이 나쁘다

styled-components나 Emotion 같은 라이브러리는 브라우저에서 JS를 실행해 스타일을 생성한다. 그런데 Astro의 기본 출력은 JS가 없는 정적 HTML이다. 두 전제가 정면으로 충돌한다.

아일랜드 아키텍처 위에서 보면 더 분명하다. 런타임 CSS-in-JS는 hydrate되는 island 안에서만 동작하고, 그 island에 스타일 생성 런타임까지 얹는다. "필요한 곳에만 JS를 보낸다"는 Astro의 존재 이유를 스타일링이 갉아먹는 셈이다. Astro에서 동적 스타일이 필요하면 CSS 변수를 바꾸는 방식(다크 모드 전환이 대표적이다)으로 설계하는 편이 프레임워크의 결에 맞는다.

빌드 시점에 CSS를 뽑아내는 zero-runtime 계열(Tailwind, vanilla-extract 등)은 이 충돌이 없어서 무리 없이 어울린다.

## 함정 하나: 번들 순서

주의할 점도 있다. 여러 컴포넌트의 스타일은 빌드 때 번들로 합쳐지는데, 이때 CSS가 삽입되는 순서가 소스에서 기대한 순서와 항상 일치한다고 보장하기 어렵다. 같은 요소를 여러 층에서 스타일링하면서 "나중에 선언한 쪽이 이긴다"는 cascade 순서에 기대면, 개발 서버에서는 멀쩡하다가 프로덕션 빌드에서 뒤집히는 일이 생길 수 있다.

대응은 단순하다. 순서 대신 명시성(specificity)으로 승부를 정하거나, 덮어쓸 값을 CSS 변수로 설계해 순서 의존을 아예 없애는 것이다. scoped 격리 덕분에 애초에 셀렉터 충돌 자체가 드물어서, 이 원칙만 지키면 문제 될 일은 많지 않다.

## 정리

Astro와 CSS의 궁합을 한 줄로 줄이면 이렇다. **일반 CSS를 컴포넌트에 그냥 쓰면 알아서 격리해주고, 출력은 순수 CSS다.** 스타일링 전략을 고르는 고민이 사라지는 대신, 런타임 스타일링에 기대는 습관은 버려야 한다. 동적인 부분은 CSS 변수로, 전역은 명시적인 문(is:global·import)으로. 콘텐츠 중심 사이트에서 CSS 총량을 작게 유지하면서도 컴포넌트 단위로 사고할 수 있다는 것이 Astro 스타일링의 실질적인 이득이다.
