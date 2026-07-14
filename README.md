# blog-mcp

> 매일 한 편씩 블로그 글을 자동으로 쓰고 발행하는 것을 목표로,
> 그 과정에서 **MCP(Model Context Protocol) 서버를 직접 만들어보고 배우는** 학습 프로젝트.

**진짜 목적은 결과물(블로그)이 아니라 MCP를 제대로 익히는 것이다.** 그래서 발행 파이프라인은 최대한 단순하게 두고, MCP 서버 설계에 집중한다.

## 이 프로젝트는 세 조각으로 나뉜다

MCP 서버는 스스로 글을 쓰지 않는다. 도구를 "노출"할 뿐이다. 그래서 실제 동작은 세 조각의 협업이다.

| 조각 | 역할 | LLM 호출? | 비용 |
|---|---|---|---|
| **트리거** | 매일 1회 실행 (GitHub Actions cron) | ❌ | 무료 |
| **오케스트레이터** | 글을 실제로 "쓰는" LLM 루프 | ⭕ 여기만 Claude 호출 | 유료(소액) |
| **MCP 서버** | 도구·리소스 제공 (주제 선정, 발행 등) | ❌ 그냥 함수 실행 | **무료** ← 학습의 핵심 |

즉 **MCP 서버 자체는 토큰을 쓰지 않아 무료**다. 돈은 마지막 자동화 단계에서 오케스트레이터(LLM)가 돌 때만 든다.

## 진행 로드맵 (무료 → 무료 → 유료)

- **Phase 1 — MCP 서버 만들기** 🆓 &nbsp;`publish_post` / `suggest_topic` 도구 + `blog://posts` 리소스를 갖춘 stdio 서버.
- **Phase 2 — Claude Code에 붙여 대화형 테스트** 🆓 &nbsp;`claude mcp add`로 등록하고 대화로 도구를 굴린다. 구독으로 커버되어 무료. **MCP 학습의 90%가 여기서 끝난다.**
- **Phase 3 — 오케스트레이터 + cron 자동화** 💸 &nbsp;사람 없이 매일 발행. 이때만 `ANTHROPIC_API_KEY`가 필요.

Phase 2까지는 API 키 없이 전부 무료로 진행한다.

## 기술 스택

- **MCP 서버**: TypeScript + [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol) (stdio transport, zod 스키마)
- **오케스트레이터**: `@anthropic-ai/claude-agent-sdk` (Phase 3)
- **블로그 렌더링**: [Astro](https://astro.build) SSG → GitHub Pages
- **트리거**: GitHub Actions cron (Phase 3)

## 문서

전체 설계·아키텍처·비용·함정 정리는 [docs/plan.md](docs/plan.md) 참고.

## 상태

🚧 Phase 1 준비 중.
