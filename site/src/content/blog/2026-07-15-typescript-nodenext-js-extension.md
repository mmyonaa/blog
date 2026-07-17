---
title: "TypeScript에서 import 경로에 왜 .js를 붙일까 — NodeNext 모듈 해석"
pubDate: 2026-07-15T09:12:00Z
section: "mcp"
tags: ["typescript", "esm", "tsconfig"]
topicId: "nodenext-js-ext"
description: "TS 파일인데 import에는 .js를 쓴다. 어색해 보이는 이 규칙이 사실 Node ESM과 tsc 동작의 필연적 결과임을 짚는다."
---

이 프로젝트의 서버 코드를 열어보면 이상한 점이 눈에 띈다. 분명 `posts.ts` 파일인데, 다른 파일에서 불러올 때는 `./posts.js`라고 쓴다. 존재하지도 않는 `.js`를 가리키는 것처럼 보이는데 왜 이렇게 쓸까. 답은 TypeScript가 아니라 **Node의 ESM 규칙**에 있다.

## ESM은 확장자를 생략할 수 없다

Node.js가 ES Module로 파일을 실행할 때, 상대 경로 import에는 **파일 확장자가 반드시 있어야 한다**. 브라우저 번들러(webpack, Vite)에 익숙하면 `./posts`처럼 확장자 없이 쓰던 습관이 있는데, 그건 번들러가 뒤에서 확장자를 붙여 찾아준 것이다. 순수 Node ESM에는 그런 보정이 없다. 확장자가 없으면 그냥 못 찾는다.

## TypeScript는 경로를 고쳐주지 않는다

그럼 소스에 `./posts.ts`라고 쓰면 되지 않을까? 안 된다. 핵심은 **tsc가 import 경로 문자열을 절대 건드리지 않는다**는 점이다. `tsc`는 `posts.ts`를 `posts.js`로 컴파일하지만, 그 파일을 가리키는 import 문자열 `"./posts.ts"`는 그대로 남겨둔다. 결국 실행되는 `.js`가 `./posts.ts`를 찾게 되고, 그런 파일은 없으니 터진다.

그래서 규칙이 뒤집힌다. **소스는 `.ts`지만, import에는 컴파일된 뒤의 파일 기준으로 `.js`를 쓴다.** tsc가 경로를 안 고치니, 처음부터 최종 산출물 기준으로 적어야 하는 것이다.

## tsconfig에서 켜지는 스위치

이 동작은 모듈 해석을 `nodenext`로 둘 때 강제된다.

```jsonc
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}
```

이 설정에서는 확장자 없는 상대 import가 아예 컴파일 에러가 된다.

```ts
import { listPosts } from "./posts";     // ❌ 에러: 확장자가 필요하다
import { listPosts } from "./posts.js";  // ✅ .ts를 가리키되 .js로 쓴다
```

처음엔 어색하지만 외울 규칙은 하나다. 런타임에 실제로 실행되는 건 `.js`이고, import는 그 런타임 파일을 가리킨다. **소스 확장자가 아니라 실행 파일 확장자를 쓴다**고 기억하면 다시는 헷갈리지 않는다.
