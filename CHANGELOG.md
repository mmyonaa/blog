# Changelog

이 프로젝트의 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따른다.

## [1.0.0] - 2026-07-26

첫 정식 릴리스. MCP 서버(Phase 1)와 블로그 사이트가 완성되고, GitHub Pages 자동 배포까지 연결되어 "글을 쓰면 사이트에 실린다"는 사이클이 끝까지 동작한다.

### MCP 서버 (`@blog-mcp/server`)

- stdio MCP 서버 — LLM 호출 없는 순수 함수 도구 (무료 원칙)
- 3대 primitive 전부 구현:
  - Tool `publish_post` — 프론트매터 생성·구조 검증(섹션 정합성, `minChars`, `follows`/`related` 실존 검증) 후 마크다운 발행
  - Tool `suggest_topic` — 시드 주제 풀에서 미발행 후보를 결정론적으로 제안
  - Resource `blog://posts`, `blog://posts/{slug}` — 발행된 글 목록·본문
  - Prompt `write_daily_post` — 주제 선정 → 집필 → 자기 검토 → 발행 워크플로 패키징 (심화도 밴드, 사실 접지, 표기 원칙, 이모지 금지)
- 섹션 레지스트리(`topics.ts`) — 5개 섹션(mcp · web · jeongcheogi · algo · security)을 한 곳에서 관리

### 블로그 사이트 (`@blog-mcp/site`)

- Astro SSG — Content Collection 기반 마크다운 렌더링, 릴리스 시점 47편 발행
- 읽기 경험: 목차+스크롤스파이, Shiki 듀얼테마 코드 하이라이팅(복사 버튼), 한글 타이포그래피, 다크모드
- 탐색: 클라이언트 검색(⌘K), 태그·섹션 페이지, 관련 글 추천, 이전/다음 글, 페이지네이션
- 고유 비주얼: 주제 그래프(카테고리 트렁크 + 후속 간선), 발행 히트맵, MCP 오빗 다이어그램
- 댓글(giscus)·익명 피드백 폼, RSS·사이트맵·글별 JSON-LD
- 모바일·태블릿 반응형 정돈

### 배포·인프라

- 레포 이름 `mcp` → `blog` 변경 — 사이트 주소 `https://mmyonaa.github.io/blog/`
- GitHub Actions 배포 워크플로 — main push 시 pnpm 워크스페이스 빌드 → Pages 배포
- 레포 public 전환, Pages(Actions 소스) 활성화

[1.0.0]: https://github.com/mmyonaa/blog/releases/tag/v1.0.0
