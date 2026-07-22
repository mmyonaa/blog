---
title: "Astro Content Collection으로 마크다운 블로그 만들기"
pubDate: 2026-07-16T12:00:00Z
section: "web"
tags: ["astro", "ssg", "typescript"]
area: "W"
topicId: "astro-content-collection"
description: "마크다운 폴더를 스키마가 붙은 타입 안전한 데이터로 바꾸는 Astro Content Collection. 컬렉션 정의부터 목록·상세 페이지 렌더링까지 블로그 한 채를 통째로 만들어본다."
---

정적 블로그에서 글은 마크다운 파일로 두는 게 편하다. DB도 관리자 화면도 없이, 파일 하나가 글 하나가 된다. 그런데 파일이 쌓이면 새 고민이 생긴다. 이 마크다운들을 코드에서 어떻게 안전하게 읽을까? 어떤 글은 프론트매터에 `date`를 쓰고 어떤 글은 `pubDate`를 쓴다면? 태그를 깜빡 빠뜨린 글이 있다면? 빌드가 조용히 깨지거나, 런타임에 `undefined`가 터진다.

Astro의 **Content Collection**은 바로 이 지점을 해결한다. 마크다운 폴더를 스키마가 붙은 타입 안전한 데이터 소스로 바꿔, 잘못된 프론트매터는 빌드 타임에 걸러내고, 글을 읽을 때는 자동완성이 따라오게 한다. 이 글에서는 컬렉션을 정의하는 것부터 목록·상세 페이지를 렌더링하는 것까지, 블로그 한 채를 통째로 세워본다.

## Content Collection이 푸는 문제

핵심 아이디어는 단순하다. "이 폴더의 마크다운들은 이런 모양이어야 한다"를 **스키마로 한 번 선언**해두는 것이다. 그러면 Astro가 빌드할 때 모든 파일을 그 스키마로 검사한다.

- 프론트매터에 필수 필드가 빠졌거나 타입이 틀리면 → **빌드가 실패**하며 어느 파일이 문제인지 알려준다.
- 글을 코드에서 읽을 때는 스키마에서 추론된 **타입이 그대로 따라온다**. `post.data.title`은 `string`, `post.data.pubDate`는 `Date`임을 편집기가 안다.

즉 "느슨한 마크다운"과 "엄격한 타입" 사이의 다리를 놓아준다. 이 안전망 덕분에 글이 수백 편으로 늘어도 프론트매터 규격이 흔들리지 않는다.

## 컬렉션 정의하기

컬렉션은 프로젝트에 하나 있는 `src/content.config.ts`에서 정의한다. 마크다운을 어디서 읽을지(loader)와, 어떤 모양이어야 하는지(schema)를 함께 적는다.

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  // src/content/blog 아래 모든 .md 파일을 읽는다
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
  }),
});

export const collections = { blog };
```

스키마는 zod로 쓴다. `title`은 필수 문자열, `pubDate`는 날짜, `tags`는 문자열 배열이되 없으면 빈 배열, `description`은 있어도 되고 없어도 된다. 이 선언 하나가 이후 모든 글의 계약이 된다.

`glob` loader는 파일 경로에서 각 글의 **id(슬러그)** 도 만들어낸다. `2026-07-16-my-post.md`는 id가 `2026-07-16-my-post`가 되고, 이게 그대로 URL 경로에 쓰인다.

## 글 한 편의 모양

이제 글은 이 스키마를 따르는 마크다운이면 된다. 프론트매터에 선언한 필드를 채우고, 그 아래에 본문을 쓴다.

```markdown
---
title: "첫 글"
pubDate: 2026-07-16
tags: ["astro", "블로그"]
---

여기부터 본문이다. 평범한 마크다운으로 쓰면 된다.
```

만약 `title`을 빠뜨리거나 `pubDate`에 `"어제"` 같은 걸 적으면, `astro build`가 그 파일을 짚어 에러를 낸다. 잘못된 글이 조용히 배포되는 일이 없다.

## 목록 페이지 만들기

글들을 읽어 목록을 그리려면 `getCollection`을 쓴다. 컬렉션 이름을 넘기면 모든 글을 배열로 돌려준다.

```astro
---
import { getCollection } from "astro:content";

const posts = (await getCollection("blog"))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---

<ul>
  {posts.map((post) => (
    <li>
      <a href={`/blog/${post.id}/`}>{post.data.title}</a>
      <time>{post.data.pubDate.toISOString().slice(0, 10)}</time>
    </li>
  ))}
</ul>
```

`post.data`가 스키마에서 추론된 타입을 갖는다는 점에 주목하자. `pubDate`가 `Date`라서 `.valueOf()`로 정렬하고 `.toISOString()`으로 포맷할 수 있다. 문자열을 억지로 파싱할 필요가 없다.

## 개별 글 페이지 — 동적 라우트

글마다 상세 페이지를 만들려면 파일 이름에 `[...slug]`를 쓴 동적 라우트를 둔다. `getStaticPaths`가 어떤 슬러그들이 존재하는지 Astro에 알려주고, `render`가 마크다운 본문을 컴포넌트로 바꿔준다.

```astro
---
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<article>
  <h1>{post.data.title}</h1>
  <time>{post.data.pubDate.toISOString().slice(0, 10)}</time>
  <Content />
</article>
```

`getStaticPaths`는 빌드 타임에 돈다. 글이 7편이면 7개의 정적 HTML이 미리 구워진다. `<Content />`는 마크다운 본문이 렌더된 자리다 — 제목·날짜 같은 메타는 프론트매터에서, 본문은 `<Content />`에서 나온다.

## 자주 걸리는 함정

처음 붙일 때 흔히 막히는 지점 몇 개를 미리 짚어두면 시간을 아낄 수 있다.

- **`pubDate`가 문자열로 파싱되는 문제.** 스키마에 `z.date()`를 썼는데 프론트매터에 `pubDate: "2026-07-16"`처럼 **따옴표로 감싸면** YAML이 문자열로 읽어 검증이 실패한다. 따옴표 없이 `pubDate: 2026-07-16`으로 두면 YAML이 날짜로 파싱한다. 입력이 들쭉날쭉할 수 있다면 `z.coerce.date()`로 받아 문자열도 날짜로 변환하게 하는 방법도 있다.
- **loader의 `base` 경로 오타.** `glob`의 `base`가 실제 폴더와 한 글자라도 다르면 에러 없이 그냥 **글이 0편**으로 잡힌다. 목록이 텅 비면 스키마보다 먼저 이 경로부터 의심한다.
- **id는 파일 경로에서 온다.** 하위 폴더에 글을 두면 그 경로가 id(슬러그)에 그대로 들어간다. `drafts/foo.md`는 id가 `drafts/foo`가 되어 URL도 그렇게 뚫린다. 슬러그를 평평하게 두고 싶으면 파일을 한 폴더에 모으거나, 라우트에서 id를 가공한다.
- **`.md`와 `.mdx`.** 컴포넌트를 본문에 섞고 싶으면 `.mdx`가 필요하고, glob 패턴도 `**/*.{md,mdx}`로 넓혀야 한다. 순수 마크다운만 쓴다면 `.md`로 충분하다.

이 네 개만 피해도 대부분의 "왜 안 되지"는 사라진다.

## 스키마가 주는 안전망

이 구조의 진짜 값은 편해 보이는 API가 아니라, 그 밑에 깔린 **일관성 보장**이다. 우리 프로젝트에서는 글을 사람이 아니라 도구(그리고 LLM)가 발행한다. 발행하는 쪽이 프론트매터를 조금이라도 어긋나게 만들면, 컬렉션 스키마가 빌드에서 그걸 잡아낸다. 발행 도구가 만드는 프론트매터와 사이트가 기대하는 스키마를 같은 모양으로 맞춰두면, 둘 중 하나가 틀어졌을 때 배포 전에 바로 드러난다.

정리하면 Content Collection은 세 가지를 한 번에 준다. 마크다운을 읽는 **loader**, 모양을 강제하는 **schema**, 그리고 그로부터 나오는 **타입과 빌드 타임 검증**이다. 파일 기반 블로그의 단순함은 지키면서, DB가 주던 "구조가 보장된다"는 안심을 스키마 한 줄로 되찾는 셈이다. 다음에 새 필드가 필요해지면 스키마에 한 줄 더하고, 그 필드를 안 채운 글은 빌드가 알려준다. 콘텐츠가 늘어도 무너지지 않는 블로그는 이렇게 만든다.
