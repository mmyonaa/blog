---
title: "Astro 블로그에 RSS 피드 달기 — 정적 사이트와 RSS는 찰떡이다"
pubDate: 2026-07-20T05:01:17Z
section: "web"
tags: ["rss", "astro", "ssg", "피드"]
area: "W"
description: "뉴스레터도 알고리즘도 없이 새 글을 독자에게 알리는 가장 오래된 방법, RSS. 정적 블로그와 RSS가 왜 잘 맞는지 짚고, @astrojs/rss로 피드 엔드포인트를 실제 코드로 만들어본다."
---

블로그에 글을 쌓기 시작하면 곧 다음 질문이 온다. "새 글이 올라온 걸 독자가 어떻게 알지?" 뉴스레터를 돌리자니 발송 인프라가 필요하고, SNS에 올리자니 알고리즘이 노출을 결정한다. 그 사이에 30년 가까이 살아남은 답이 있다. RSS다.

## RSS는 그냥 XML 파일이다

RSS(Really Simple Syndication)는 거창한 기술이 아니다. 사이트의 최신 글 목록을 정해진 형식의 XML 문서로 노출하는 약속일 뿐이다. 독자는 피드 리더(Feedly, Inoreader 등)에 이 XML의 주소를 등록하고, 리더가 주기적으로 파일을 다시 받아 새 항목이 생겼는지 비교한다.

핵심은 방향이다. 이메일 구독은 발행자가 독자에게 **밀어 보내는(push)** 구조라 발송 시스템과 구독자 명단 관리가 필요하다. RSS는 독자가 **당겨 가는(pull)** 구조다. 발행자는 파일 하나를 갱신해 둘 뿐이고, 서버는 구독자가 누군지도 모른다. 알고리즘 개입 없이 시간순으로, 구독자 정보 수집 없이 익명으로 동작한다.

## 정적 사이트와 잘 맞는 이유

이 구조가 SSG 블로그와 정확히 맞물린다. 피드는 "요청 시점에 계산할 것"이 없다 — 글 목록은 빌드 시점에 이미 확정돼 있다. 그러니 HTML 페이지를 미리 찍어내듯 `rss.xml`도 빌드 때 한 번 생성해 두면 끝이다. 데이터베이스도, 실행 중인 서버도 필요 없다. GitHub Pages 같은 정적 호스팅 위에서 구독 기능이 공짜로 생기는 셈이다.

## @astrojs/rss로 구현하기

Astro에서는 공식 패키지 하나로 끝난다.

```bash
npm install @astrojs/rss
```

Astro의 파일 기반 라우팅은 `.astro` 페이지만 받는 게 아니다. `src/pages/` 아래 `.ts` 파일에서 `GET` 함수를 내보내면 그 경로의 응답을 직접 만들 수 있다. `src/pages/rss.xml.ts`를 두면 `/rss.xml` 주소가 생긴다.

```ts
// src/pages/rss.xml.ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: "blog",
    description: "MCP 서버로 글을 발행하며 배운 것을 기록하는 블로그",
    site: context.site ?? "https://example.github.io",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      pubDate: post.data.pubDate,
      categories: post.data.tags,
      link: `/blog/${post.id}/`,
    })),
    customData: "<language>ko-kr</language>",
  });
}
```

Content Collection에서 글을 모아 최신순으로 정렬하고, `rss()` 헬퍼에 넘기면 XML 직렬화는 패키지가 알아서 한다. SSG 모드에서는 이 함수가 빌드 때 실행되어 결과가 정적 `rss.xml` 파일로 떨어진다.

## 놓치기 쉬운 세 가지

**절대 URL.** 피드 리더는 내 사이트 밖에서 XML을 읽으므로 `link`가 절대 경로로 해석돼야 한다. `astro.config.mjs`에 `site`를 설정해 두면 `context.site`로 받아 기준 주소로 쓸 수 있다. 특히 GitHub Pages처럼 `base` 경로(예: `/mcp`) 아래에 배포한다면 `link`에도 그 접두어를 붙여야 한다. 로컬에선 멀쩡한데 배포하면 링크가 404 나는 단골 원인이다.

**description 폴백.** 프론트매터의 `description`이 선택 항목이라면 `?? ""`처럼 비어 있을 때의 값을 정해 둔다. 항목 하나가 `undefined`면 피드 전체 생성이 깨질 수 있다.

**언어 선언.** RSS 표준 필드에 없는 값은 `customData`로 넣는다. `<language>ko-kr</language>`을 선언해 두면 리더가 피드를 한국어로 취급한다.

## 확인은 리더로

배포 후 브라우저에서 `/rss.xml`을 열어 XML이 나오는지 보고, 피드 리더에 주소를 등록해 글 목록이 뜨는지 확인하면 끝이다. 사이트에는 RSS 링크를 눈에 띄는 곳에 하나 걸어 두자. 피드는 만들어 두는 것보다 독자가 그 존재를 아는 게 더 어렵다.
