# blog-mcp

> 블로그 글을 자동으로 쓰고 발행하는 것을 목표로,
> 그 과정에서 **MCP(Model Context Protocol) 서버를 직접 만들어보고 배우는** 학습 프로젝트.

**진짜 목적은 결과물(블로그)이 아니라 MCP를 제대로 익히는 것이다.** 그래서 발행 파이프라인은 최대한 단순하게 두고, MCP 서버 설계에 집중한다.

> 발행되는 블로그 자체는 **섹션(section)** 으로 나뉜다 — `MCP 만들기`(이 프로젝트 개발기·MCP 해설)와 `정처기`(정보처리기사 개념 정리). 섹션은 레지스트리에 한 줄 추가로 늘릴 수 있는 확장 축이다.

## 이 프로젝트는 세 조각으로 나뉜다

MCP 서버는 스스로 글을 쓰지 않는다. 도구를 "노출"할 뿐이다. 그래서 실제 동작은 세 조각의 협업이다.

| 조각 | 역할 | LLM 호출? | 비용 |
|---|---|---|---|
| **트리거** | 매일 1회 실행 (GitHub Actions cron) | ❌ | 무료 |
| **오케스트레이터** | 글을 실제로 "쓰는" LLM 루프 | ⭕ 여기만 Claude 호출 | 유료(소액) |
| **MCP 서버** | 도구·리소스·프롬프트 제공 (주제 선정, 발행 등) | ❌ 그냥 함수 실행 | **무료** ← 학습의 핵심 |

즉 **MCP 서버 자체는 토큰을 쓰지 않아 무료**다. 돈은 마지막 자동화 단계에서 오케스트레이터(LLM)가 돌 때만 든다.

## MCP 서버가 노출하는 것 (3대 primitive 전부)

Phase 1에서 MCP의 세 가지 primitive를 모두 구현했다. 이 하나의 서버로 tool·resource·prompt를 한 번에 배우는 게 목표.

| 종류 | 이름 | 설명 |
|---|---|---|
| 🔧 Tool | `publish_post` | 마크다운 글을 프론트매터와 함께 `YYYY-MM-DD-slug.md`로 발행 |
| 🔧 Tool | `suggest_topic` | 시드 주제 풀에서 아직 안 쓴 후보를 결정론적으로 제안 (LLM 미사용) |
| 📄 Resource | `blog://posts` | 발행된 글 목록(JSON) — 지난 글 맥락 |
| 📄 Resource | `blog://posts/{slug}` | 특정 글 본문(마크다운) |
| 💬 Prompt | `write_daily_post` | "오늘의 글쓰기" 워크플로 전체를 재사용 프롬프트로 패키징 |

## 진행 로드맵 (무료 → 무료 → 유료)

- **Phase 1 — MCP 서버 만들기** ✅ 🆓 &nbsp;위 3대 primitive를 갖춘 stdio 서버 완성.
- **Phase 2 — Claude Code에 붙여 대화형 테스트** 🚧 🆓 &nbsp;`claude mcp add`로 등록해 대화로 도구를 굴린다. 구독으로 커버되어 무료. **MCP 학습의 90%가 여기서 끝난다.** (현재 진행 중)
- **Phase 3 — 오케스트레이터 + cron 자동화** ⬜ 💸 &nbsp;사람 없이 매일 발행. 이때만 `ANTHROPIC_API_KEY`가 필요.

Phase 2까지는 API 키 없이 전부 무료로 진행한다.

## 기술 스택

- **MCP 서버**: TypeScript + [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol) (stdio transport, zod 스키마)
- **오케스트레이터**: `@anthropic-ai/claude-agent-sdk` (Phase 3)
- **블로그 렌더링**: [Astro](https://astro.build) SSG (태그 페이지 · RSS 피드) → GitHub Pages
- **트리거**: GitHub Actions cron (Phase 3)
- **패키지 관리**: pnpm workspace (`server` + `site`)

## 프로젝트 구조

```
.
├── server/          # MCP 서버 (@blog-mcp/server)
│   └── src/
│       ├── index.ts       # stdio 진입점
│       ├── server.ts      # 서버 팩토리 (primitive 등록)
│       ├── tools.ts       # publish_post / suggest_topic
│       ├── resources.ts   # blog://posts, blog://posts/{slug}
│       ├── prompts.ts     # write_daily_post
│       ├── posts.ts       # 발행된 글 읽기
│       ├── topics.ts      # 시드 주제 풀
│       ├── util.ts        # 슬러그·날짜 유틸
│       └── config.ts      # 콘텐츠 디렉토리 설정
├── site/            # Astro 블로그 (발행된 글이 여기 렌더됨)
│   └── src/
│       ├── content/blog/      # publish_post가 쓰는 마크다운 목적지
│       ├── content.config.ts  # 글 프론트매터 스키마
│       ├── pages/             # 글·목록·섹션·태그·RSS·검색 인덱스
│       ├── components/        # 목록·페이지네이션·헤더/푸터
│       ├── layouts/           # Base.astro (메타·OG·JSON-LD)
│       └── lib/               # 태그·날짜 헬퍼
└── docs/            # 설계 노트 — 아래 §문서 참고
```

발행된 글은 `site/src/content/blog/`에 저장된다(환경변수 `BLOG_CONTENT_DIR`로 재정의 가능).

## 문서

설계 판단과 그 근거는 `docs/`에 남긴다. 구현보다 문서가 앞서는 경우가 많다(= 제안 단계).

| 문서 | 다루는 것 | 상태 |
|---|---|---|
| [plan.md](docs/plan.md) | 전체 설계도 — MCP 구조·3단계 로드맵·배포·비용 | 기준 문서 |
| [content-strategy.md](docs/content-strategy.md) | 무슨 글을, 어떤 톤·구조로 쓸까 | 적용 중 |
| [research-synthesis-mode.md](docs/research-synthesis-mode.md) | 웹 소스를 종합해 쓰는 Mode R 설계 | 제안 |
| [publishing-routing.md](docs/publishing-routing.md) | 모드별로 발행처를 다르게 라우팅 | 제안 |
| [이미지-넣기.md](docs/이미지-넣기.md) | 글에 이미지를 넣는 두 가지 층 | 제안 |
| [view-count-supabase.md](docs/view-count-supabase.md) | 조회수 — 정적 사이트에 동적 데이터 붙이기 | 제안 |
| [custom-domain-setup.md](docs/custom-domain-setup.md) | 커스텀 도메인 연결 절차 | 절차 문서 |

## 빠른 시작

```bash
pnpm install
pnpm build                        # server + site 빌드

# 서버 단독 실행 (stdio — 사람이 직접 보는 로그는 stderr로)
pnpm --filter @blog-mcp/server start
```

### Phase 2 — Claude Code에 붙여 대화로 테스트

```bash
# 레포 루트에서 빌드된 서버를 등록
claude mcp add blog-mcp -- node server/dist/index.js
```

등록 후 Claude Code에서 `write_daily_post` 프롬프트를 부르거나
"오늘 글 하나 써서 발행해줘"라고 시키면, `blog://posts`로 지난 글을 읽고
`suggest_topic`으로 주제를 고른 뒤 `publish_post`로 발행하는 흐름을 대화로 확인할 수 있다.

## 상태

🚧 **Phase 2 진행 중** — MCP 서버(Phase 1) 완성, Claude Code에 붙여 대화형으로 도구를 다듬는 단계.
현재까지 16편 발행(`MCP 만들기` · `정처기`). 배포 워크플로(GitHub Actions Pages)는 아직 없다.
