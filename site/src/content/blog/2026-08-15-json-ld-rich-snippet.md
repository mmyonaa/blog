---
title: "검색엔진에게 글의 정체 알려주기 — JSON-LD 구조화 데이터와 리치 스니펫"
pubDate: 2026-08-15T06:53:48Z
section: "web"
tags: ["json-ld", "schema-org", "seo", "리치스니펫"]
related: ["2026-07-23-url-slug", "2026-07-20-ssr-vs-csr-vs-ssg"]
description: "사람이 보는 HTML만으로 검색엔진은 이 날짜가 발행일인지, 이 이름이 저자인지 추측해야 한다. JSON-LD 구조화 데이터는 그 추측을 없애는 크롤러 전용 명세다. schema.org BlogPosting을 Astro 블로그에 심는 실제 구현으로 형식과 필드를 뜯어보고, 그 보상인 리치 스니펫이 무엇이며 왜 자격이지 보장이 아닌지까지 정리한다."
---

블로그 글 페이지의 HTML에는 제목, 날짜, 저자 이름이 다 들어 있다. 사람은 한눈에 알아본다. 그런데 검색엔진 크롤러에게 그 HTML은 스타일 입힌 텍스트 덩어리일 뿐이다. `<span>2026-08-15</span>`가 발행일인지 수정일인지 행사 날짜인지, `<a>`에 걸린 이름이 저자인지 언급된 인물인지 — 크롤러는 문맥으로 추측해야 하고, 추측은 틀릴 수 있다. 구조화 데이터는 이 추측을 없애기 위해 페이지에 함께 심는 기계용 명세서다.

## JSON-LD — 구조화 데이터의 사실상 표준

구조화 데이터를 표현하는 문법은 여럿 있다. HTML 속성에 끼워 넣는 microdata와 RDFa, 그리고 별도의 JSON 블록으로 두는 JSON-LD(JSON for Linked Data). 이 중 Google이 권장하는 형식이 JSON-LD다. 이유는 단순한데, 마크업과 분리되어 있어서다. microdata는 본문 태그 곳곳에 속성을 흩뿌려야 해서 템플릿이 지저분해지고 수정도 어렵지만, JSON-LD는 페이지 어디든 블록 하나로 완결된다.

어휘는 schema.org에서 온다. Google·Microsoft 등이 함께 만든 공통 어휘 사전으로, "블로그 글은 BlogPosting이라 부르고 발행일은 datePublished라 부르자"는 약속이다. 문법(JSON-LD)과 어휘(schema.org)가 합쳐져 하나의 명세가 된다.

## Astro 블로그에 심어보기

이 블로그의 글 상세 페이지가 실제로 만드는 객체를 단순화하면 이렇다. SSG이므로 이 코드는 빌드 시점에 글마다 한 번 실행되어 HTML에 굳는다.

```astro
---
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.data.title,
  description: post.data.description ?? "",
  datePublished: post.data.pubDate.toISOString(),
  dateModified: post.data.pubDate.toISOString(),
  keywords: post.data.tags,
  url: pageUrl,
  mainEntityOfPage: pageUrl,
  author: { "@type": "Person", name: "저자 이름" },
  publisher: { "@type": "Organization", name: "블로그 이름" },
};
---
<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```

필드를 하나씩 보면:

- `@context` — "schema.org 어휘 사전을 쓴다"는 선언. 모든 JSON-LD의 첫 줄이다.
- `@type` — 이 페이지의 정체. 블로그 글이면 `BlogPosting`, 상품이면 `Product`, 레시피면 `Recipe`.
- `headline`·`description`·`keywords` — 제목·요약·태그. 프론트매터에서 그대로 가져온다.
- `datePublished`·`dateModified` — 발행일과 수정일. 수정일을 따로 추적하지 않는 블로그라면 둘 다 발행일을 넣는다.
- `author`·`publisher` — 값이 문자열이 아니라 다시 `@type`을 가진 객체다. 저자는 사람(`Person`), 발행 주체는 조직(`Organization`)이라는 것까지 명시한다.
- `mainEntityOfPage` — "이 URL이 이 글의 대표 페이지"라는 표시. 같은 글이 여러 URL로 접근될 때 대표를 지정한다.

`<script type="application/ld+json">`이 심는 방법의 전부다. 브라우저는 이 타입의 스크립트를 실행하지 않고 무시한다. 화면 렌더링에는 아무 영향이 없고, 오직 크롤러만 읽는다.

## 함정 하나 — URL은 절대 경로여야 한다

`url`·`image` 같은 필드에 `/blog/foo/` 같은 상대 경로를 넣으면 안 된다. 크롤러가 문서 밖에서 이 데이터를 다룰 때 상대 경로는 기준을 잃기 때문이다. Astro라면 astro.config에 `site`를 설정해 두고 이렇게 조합한다.

```ts
const pageUrl = Astro.site
  ? new URL(`/blog/${post.id}/`, Astro.site).href
  : `/blog/${post.id}/`;
```

`new URL(경로, 도메인)`이 `https://example.com/blog/foo/` 형태의 절대 URL을 만들어 준다. `Astro.site`가 없을 수 있으니(설정 전 로컬 빌드 등) 삼항으로 폴백을 두는 식이다.

## 보상 — 리치 스니펫

이 수고의 보상이 리치 스니펫(요즘 Google 문서는 리치 결과라 부른다)이다. 검색 결과의 기본 형태는 파란 제목·URL·두 줄 설명인데, 리치 스니펫은 여기에 부가 정보가 붙은 확장된 결과다. 블로그 글이면 발행일과 저자, 레시피면 별점·조리 시간·썸네일, 상품이면 가격·재고·리뷰 평점, FAQ 페이지면 접이식 질문 목록이 검색 결과에 바로 표시된다.

Google이 이런 정보를 표시하려면 페이지에서 "가격이 뭔지, 발행일이 뭔지"를 확실하게 알아야 하는데, HTML을 보고 추측하기엔 불안하니 구조화 데이터에 명시된 값을 근거로 삼는다. 위 `BlogPosting`의 `datePublished`·`author`가 바로 그 재료다. 같은 순위라도 날짜나 별점이 붙은 결과가 눈에 더 띄어 클릭률에 유리하니, SEO 작업에서 기본으로 챙기는 항목이 됐다.

## 자격이지 보장이 아니다

주의할 점이 하나 있다. 구조화 데이터를 넣는 것은 리치 스니펫의 자격 요건을 갖추는 것이지 표시를 보장하지 않는다. 실제 표시 여부는 Google이 페이지 신뢰도 등을 보고 자체 판단하며, 완벽하게 넣어도 안 나올 수 있다. 다만 안 넣으면 아예 후보조차 되지 않는다.

작성한 마크업이 올바른지는 Google이 제공하는 리치 결과 테스트 도구에 URL이나 코드를 넣어 확인할 수 있다. 필수 필드 누락이나 형식 오류를 잡아준다.

정리하면 이렇다. 구조화 데이터는 화면에 아무것도 바꾸지 않는, 검색엔진과의 전용 채널이다. 정적 블로그라면 빌드 때 프론트매터를 JSON 블록 하나로 변환해 심는 게 전부라 런타임 비용도 없다. 비용 없이 자격을 얻어두는 장치 — 넣지 않을 이유가 없는 쪽에 가깝다.
