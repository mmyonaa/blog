# Changelog

이 프로젝트의 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따른다.

## [1.1.0] - 2026-07-29

홈 히어로 3D 리디자인과 About 스트릭 확장, SEO 위생(검색 노출) 정비가 중심인 릴리스.

### Added

- 홈 히어로 전면 리디자인 — 3D 정물 클러스터(V2) + 브랜드 오브젝트 애셋 16종(WebP 최적화 14.8MB→1.2MB), 아웃트로 3D 풀블리드 배너
- About 발행 스트릭 확장 — 잔디 클릭 시 그날 글 목록 패널, 카테고리 분포 스택 바, 모바일 기간 토글(최근 13주↔전체), PC 2열 배치
- 발행 그래프 세로 바운딩(#63) — 기본 최근 구간만 접어 보여주고 '전체 보기' 토글
- giscus 커스텀 테마 CSS(#48) — 위젯 색을 사이트 팔레트로, 라이트/다크 토글 동기화
- 의견 제출 출처 필드(#49 후속) — 모달은 현재 글 URL, /feedback/은 `?from=` → referrer 순 폴백으로 알림 메일에 "Page" 표기
- 파비콘·터치 아이콘을 3D 브랜드 마크로 리뉴얼

### Changed

- SEO 위생 — Google Search Console 연결(소유권 태그·sitemap 제출), 홈 title 서술형("daily.mcp — MCP·웹·보안 개발 블로그")
- 푸터 재구성 — Latest 컬럼 제거, 브랜드·버전·규모 블록으로 교체
- 글 하단 영역 재구성 — 여백 압축, 이전/다음 글 카드화, AI 작성 고지 텍스트화
- 모바일·태블릿 폴리시 다수 — 히어로 첫 폴드 압축, 잔디 칸 고정+가로 스크롤, 헤더·푸터 정돈

### Fixed

- robots.txt sitemap URL이 옛 경로(`/mcp/`)를 가리켜 404 나던 문제 — 실제 base(`/blog/`)로 수정
- 모바일 '최근 글' 그리드 2열 짓눌림, 좁은 폭 헤더 nav 잘림 등 반응형 버그

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

[1.1.0]: https://github.com/mmyonaa/blog/releases/tag/v1.1.0
[1.0.0]: https://github.com/mmyonaa/blog/releases/tag/v1.0.0
