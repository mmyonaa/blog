---
title: "프리렌더링이란 — vite-ssg가 빌드 때 HTML을 미리 찍어두는 법"
pubDate: 2026-07-21T02:20:02Z
section: "web"
tags: ["vite-ssg", "ssg", "vue", "프리렌더", "하이드레이션"]
description: "프리렌더링은 빌드 시점에 각 페이지를 완성된 HTML로 미리 만들어 두는 것이다. vite-ssg가 Node 안에서 Vue 앱을 실행해 라우트를 돌고, 동적 경로까지 HTML로 뽑아 파일로 저장하는 과정을 단계별로 짚는다."
---

배포된 SPA를 브라우저 개발자 도구로 열어 보면, 처음 도착하는 HTML은 대개 `<div id="app"></div>` 한 줄이 전부다. 실제 화면은 자바스크립트가 내려받아진 뒤에야 그려진다. 프리렌더링(prerendering)은 이 순서를 뒤집는다. **빌드할 때 미리, 각 페이지를 완성된 HTML로 만들어 두는 것**이다.

SSG(Static Site Generation, 정적 사이트 생성)가 바로 이 방식이고, `vite-ssg`는 Vite + Vue 프로젝트에서 그 일을 해 주는 도구다.

## 빌드 때 실제로 벌어지는 일

`pnpm run build`를 돌리면 vite-ssg 안에서 다음이 순서대로 일어난다.

1. **Node.js 안에서 Vue 앱을 실행한다.** 브라우저가 아니다. 화면도 DOM도 없는 서버 환경에서 같은 앱 코드를 켠다.
2. **각 라우트를 하나씩 방문한다.** `/`, `/performance`, `/performance/42`처럼 라우터에 등록된 경로를 차례로 렌더링한다.
3. **다 그려진 결과를 HTML 문자열로 뽑는다.** Vue의 `renderToString`이 컴포넌트 트리를 실제 마크업 문자열로 직렬화한다.
4. **파일로 저장한다.** 예를 들어 `/performance/42`는 `dist/performance/42/index.html`로 떨어진다.

결과물은 순수한 HTML 파일 더미다. 정적 호스팅(예: GitHub Pages, Netlify, S3)에 그대로 올리면 되고, 요청이 올 때 서버가 뭔가를 계산하지 않는다. 파일을 그냥 내려줄 뿐이다.

## 왜 브라우저가 아니라 Node인가

"페이지를 그린다"는 말을 들으면 브라우저를 떠올리기 쉽다. 하지만 빌드 서버(CI 러너 등)에는 브라우저가 없고, 있더라도 무겁다. Vue 컴포넌트는 결국 "상태를 받아 마크업을 만드는 함수"이므로, 화면 없이 문자열만 만들어 내는 데엔 브라우저가 필요 없다. Node에서 앱을 켜고 `renderToString`을 부르면 충분하다.

여기서 흔한 함정이 하나 나온다. Node에는 `window`, `document`, `localStorage`가 없다. 컴포넌트 최상위(setup 안)에서 `document.querySelector(...)` 같은 걸 무심코 호출하면 빌드가 그 자리에서 터진다. 브라우저 전용 API는 `onMounted` 안으로 미뤄야 한다 — `onMounted`는 프리렌더 단계에선 실행되지 않고, 진짜 브라우저에서만 돌기 때문이다.

## 동적 라우트는 어떻게 다 도나

`/performance/:id`처럼 파라미터가 붙은 경로는 빌드 시점에 `id`가 몇까지 있는지 자동으로 알 수 없다. 그래서 어떤 경로들을 찍을지 목록을 직접 넘겨준다.

```ts
// main.ts
import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'

export const createApp = ViteSSG(
  App,
  { routes },
  ({ router, isClient }) => {
    // 플러그인 설치 등 초기화
  },
)

// vite.config.ts
export default defineConfig({
  ssgOptions: {
    // 빌드 때 이 경로들을 추가로 프리렌더
    includedRoutes(paths, routes) {
      const ids = [1, 2, 42, 100] // 보통 API/파일에서 목록을 읽어온다
      return [
        ...paths.filter((p) => !p.includes(':')),
        ...ids.map((id) => `/performance/${id}`),
      ]
    },
  },
})
```

`includedRoutes`가 반환한 경로마다 위 4단계가 반복되어, 각각의 완성된 `index.html`이 생긴다. 여기 넣지 않은 `id`는 정적 파일이 없으므로, 존재하지 않는 상세 페이지가 된다(그래서 목록은 대개 빌드 시 데이터 소스에서 읽어 채운다).

## 정적 HTML이 다시 살아나는 지점 — 하이드레이션

프리렌더된 HTML만으로는 클릭·입력 같은 상호작용이 없다. 그건 그냥 그려진 그림이다. 그래서 브라우저는 이 HTML을 받은 뒤, 같은 Vue 앱의 자바스크립트를 실행해 **이미 있는 DOM에 이벤트 핸들러와 반응성을 다시 붙인다.** 이 과정을 하이드레이션(hydration)이라 부른다.

핵심 조건은 "서버가 찍은 HTML"과 "클라이언트가 처음 렌더한 결과"가 일치해야 한다는 것이다. 둘이 어긋나면(hydration mismatch) 콘솔 경고가 뜨고, 그 부분이 다시 그려지며 깜빡일 수 있다. 시간·랜덤값·`window` 크기처럼 서버와 브라우저에서 값이 달라지는 것을 초기 렌더에 그대로 쓰면 이 불일치가 난다.

## 정리

프리렌더링은 "언제 HTML을 만드느냐"의 문제다. 요청마다(SSR)도, 브라우저에서(CSR)도 아닌, **빌드 한 번에** 미리 만들어 둔다. vite-ssg는 Node에서 Vue 앱을 켜 각 라우트를 `renderToString`으로 HTML로 뽑고 파일로 저장한 뒤, 브라우저에서 하이드레이션으로 되살린다. 콘텐츠가 자주 안 바뀌고 SEO·초기 로딩이 중요한 사이트(블로그, 문서, 마케팅 페이지)에 잘 맞고, 대신 사용자마다 다른 실시간 콘텐츠에는 어울리지 않는다.
