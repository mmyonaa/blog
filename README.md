# blog-mcp

> 블로그 글을 자동으로 쓰고 발행하는 것을 목표로,
> 그 과정에서 **MCP(Model Context Protocol) 서버를 직접 만들어보고 배우는** 학습 프로젝트.

**사이트**: https://mmyonaa.github.io/blog/ · [CHANGELOG](CHANGELOG.md)

**진짜 목적은 결과물(블로그)이 아니라 MCP를 제대로 익히는 것이다.** 그래서 발행 파이프라인은 최대한 단순하게 두고, MCP 서버 설계에 집중한다.

> 발행되는 블로그는 **섹션(section)** 으로 나뉜다. 섹션은 레지스트리(`server/src/topics.ts`)에 한 줄 추가로 늘릴 수 있는 확장 축이다.
>
> | 섹션 | 다루는 것 |
> |---|---|
> | `MCP·에이전트 만들기` | MCP 서버·에이전트를 만들며 배운 개념과 자동화 여정 |
> | `블로그·웹 만들기` | Astro·TypeScript 등 블로그 사이트를 만들며 배운 웹 기술 |
> | `정처기` | 정보처리기사 시험 개념 정리 |
> | `정보보안기사` | 정보보안기사 필기 5과목 개념 정리 |
> | `알고리즘` | 코딩테스트를 위한 알고리즘·자료구조를 구현 중심으로 정리 |
> | `보안` | 최근 보안 사고·취약점을 웹 리서치로 종합 |

## 이 프로젝트는 세 조각으로 나뉜다

MCP 서버는 스스로 글을 쓰지 않는다. 도구를 "노출"할 뿐이다. 그래서 실제 동작은 세 조각의 협업이다.

| 조각 | 역할 |
|---|---|
| **트리거** | 매일 1회 실행 (GitHub Actions cron) |
| **오케스트레이터** | 글을 실제로 "쓰는" 루프 |
| **MCP 서버** | 도구·리소스·프롬프트 제공 (주제 선정, 발행 등) ← 학습의 핵심 |

## MCP 서버가 노출하는 것 (3대 primitive 전부)

Phase 1에서 MCP의 세 가지 primitive를 모두 구현했다. 이 하나의 서버로 tool·resource·prompt를 한 번에 배우는 게 목표.

| 종류 | 이름 | 설명 |
|---|---|---|
| 🔧 Tool | `publish_post` | 마크다운 글을 프론트매터와 함께 `YYYY-MM-DD-slug.md`로 발행 |
| 🔧 Tool | `suggest_topic` | 시드 주제 풀에서 아직 안 쓴 후보를 결정론적으로 제안 |
| 🔧 Tool | `search_web` / `read_url` | Mode R 리서치 도구 — 웹 검색·본문 추출 (Tavily 백엔드를 어댑터 뒤에) |
| 📄 Resource | `blog://posts` | 발행된 글 목록(JSON) — 지난 글 맥락 |
| 📄 Resource | `blog://posts/{slug}` | 특정 글 본문(마크다운) |
| 💬 Prompt | `write_daily_post` | "오늘의 글쓰기" 워크플로 전체를 재사용 프롬프트로 패키징 (주제 선정 → 집필 → 자기 검토 → 발행) |
| 💬 Prompt | `write_research_post` | Mode R — 보안 섹션의 리서치 종합 발행 워크플로 (검색 → 원문 읽기 → 출처와 함께 집필, `sources` 필수) |

### 글 품질을 지키는 장치 (할루시네이션·검증)

글의 품질은 **두 겹**으로 지킨다.

- **구조적 검증(강제)** — `publish_post`가 결정론적으로 막는다: 섹션·영역 정합성, 본문 최소 분량(`minChars`), `##` 소제목, 이중 프론트매터, 그리고 `follows`/`related`가 **존재하지 않는 글을 가리키면 발행 거부**(끊긴 간선·링크 할루시네이션 차단).
- **서술 접지(유도)** — `write_daily_post` 프롬프트가 집필·검토 태도를 잡는다: 확신 없는 수치·버전·인용은 단정하지 않기, 없는 API·플래그는 지어내지 않기, 그리고 **발행 전 자기 검토(self-critique) 1회** — 필자가 아닌 편집자 눈으로 초안을 다시 읽어 사실·코드 실행성·중복·구조를 점검하고 고쳐 쓴다.

> 서술 접지는 *유도*이지 *강제*가 아니다. 표층 신호(단정 표현·미검증 플래그)를 결정론 게이트로 강제하는 하이브리드는 백로그에 있다.

## 진행 로드맵

- **Phase 1 — MCP 서버 만들기** ✅ &nbsp;위 3대 primitive를 갖춘 stdio 서버 완성.
- **Phase 2 — Claude Code에 붙여 대화형 테스트** ✅ &nbsp;`claude mcp add`로 등록해 대화로 도구를 굴렸다. **MCP 학습의 90%가 여기서 끝난다.**
- **Phase 3 — 오케스트레이터 + cron 자동화** ✅ &nbsp;사람 없이 매일 발행, 가동 중. 래퍼가 매일 KST 14시에 글을 쓰고 커밋한다.

## 기술 스택

- **MCP 서버**: TypeScript + [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol) (stdio transport, zod 스키마)
- **웹 리서치**: [Tavily](https://tavily.com) (search/extract API) — `SearchBackend` 어댑터 뒤에 두어 교체 가능, 보안 섹션 Mode R에서만 사용
- **오케스트레이터**: 래퍼 스크립트(`scripts/daily-post.sh`) + hooks 관문 — 루프·성공 판정은 스크립트가, 글쓰기만 Claude Code에 위임
- **블로그 렌더링**: [Astro](https://astro.build) SSG (섹션·태그 페이지 · RSS·sitemap · 클라이언트 검색 · Search Console 등록) → GitHub Pages 자동 배포 (`.github/workflows/deploy.yml`, main push 시)
- **댓글·의견**: giscus(GitHub Discussions 기반 공개 댓글) + 익명 의견 모달(폼 엔드포인트)
- **조회수**: [Supabase](https://supabase.com) — 브라우저가 RPC를 직접 호출, 표는 RLS로 잠그고 `security definer` 함수만 개방(anon 키 공개 무해 설계), 일일 스냅샷 cron으로 시계열 적재
- **트리거**: GitHub Actions cron (`daily-post.yml`, 매일 KST 14:23)
- **패키지 관리**: pnpm workspace (`server` + `site`)

## 프로젝트 구조

```
.
├── server/          # MCP 서버 (@blog-mcp/server)
│   └── src/
│       ├── index.ts       # stdio 진입점
│       ├── server.ts      # 서버 팩토리 (primitive 등록)
│       ├── tools.ts       # publish_post / suggest_topic
│       ├── search.ts      # search_web / read_url (Tavily 어댑터, Mode R)
│       ├── resources.ts   # blog://posts, blog://posts/{slug}
│       ├── prompts.ts     # write_daily_post / write_research_post
│       ├── print-prompt.ts # 프롬프트 출력 CLI
│       ├── posts.ts       # 발행된 글 읽기
│       ├── topics.ts      # 섹션 레지스트리 + 시드 주제 풀
│       ├── util.ts        # 슬러그·날짜 유틸
│       └── config.ts      # 콘텐츠 디렉토리 설정
└── site/            # Astro 블로그 (발행된 글이 여기 렌더됨)
    └── src/
        ├── content/blog/      # publish_post가 쓰는 마크다운 목적지
        ├── content.config.ts  # 글 프론트매터 스키마
        ├── pages/             # 글·목록·섹션·태그·RSS·검색 인덱스·의견 페이지
        ├── components/        # 목록·헤더/푸터·댓글·의견 모달
        ├── layouts/           # Base.astro (메타·OG·JSON-LD)
        └── lib/               # 섹션·태그·날짜·의견 설정 헬퍼
```

발행된 글은 `site/src/content/blog/`에 저장된다(환경변수 `BLOG_CONTENT_DIR`로 재정의 가능).

## 라이선스

- **코드**: [MIT](LICENSE)
- **블로그 글**(`site/src/content/blog/`): [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.ko) — 출처를 밝히면 비영리 목적으로 같은 조건 하에 공유·변형 가능

## 빠른 시작

```bash
pnpm install
pnpm build                        # server + site 빌드

# 서버 단독 실행 (stdio — 사람이 직접 보는 로그는 stderr로)
pnpm --filter @blog-mcp/server start
```
