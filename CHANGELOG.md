# Changelog

이 프로젝트의 주요 변경 사항을 기록한다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르고, 버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따른다.

## [1.6.0] - 2026-08-21

콘텐츠 루프가 닫혔다 — 발행 결과(조회수)가 다음 주제 선택에 되먹임된다. 서버는 여전히 LLM을 호출하지 않는다(결정론적 산술만).

### Added

- 성과 신호 되먹임(#73) — suggest_topic이 Supabase 조회수(`get_views_bulk`)를 읽어 area별 "조회수÷경과일" 평균으로 정렬에 가중. 1차 키는 현행 다각화(덜 다룬 영역) 유지, 동률일 때만 성과순. 총 조회 30 미만이면 가중을 끄는 cold-start 관문, 키 미설정·실패 시 현행과 동일 동작(graceful degradation)

## [1.5.0] - 2026-08-18

mcp 섹션이 시사성을 얻었다 — 보안 섹션만 쓰던 Mode R(웹 리서치 종합)을 mcp 생태계 동향에도 돌린다. 첫 자동 발행으로 MCP 2026-07-28 스펙 개정 글이 나왔다.

### Added

- mcp 생태계 동향 글 유형(#71) — mcp 섹션에 area `T`(생태계 동향) 추가, `write_research_post`의 소재 발굴이 섹션 레지스트리의 `researchHint`로 방향을 잡고(`researchArea`로 area 자동 지정), 래퍼 로테이션을 4슬롯(mcp→jeongcheogi→security→mcp-trend)으로 확장. 새 도구·프롬프트 없이 Mode R 재사용

### Changed

- GitHub Actions 액션 메이저 업그레이드(#72) — checkout v7·pnpm/action-setup v6·upload-artifact v7·upload-pages-artifact v5·deploy-pages v5로 Node 20 deprecated 경고 해소. setup-node는 v5 고정(v6부터 자동 캐시가 npm 전용이라 `cache: pnpm`이 깨짐)

## [1.4.0] - 2026-08-16

첫 방문자 데이터 릴리스 — 정적 사이트에 방문자가 남기는 첫 동적 데이터(조회수)가 붙었다. 저장소는 Supabase, 권한 원칙은 "잠긴 표 + 좁게 열린 함수"(RLS 전면 잠금 + security definer RPC만 anon에 개방).

### Added

- 글 조회수(#66) — 브라우저가 Supabase RPC(`increment_view`/`get_view`)를 직접 호출해 글 상세에 표시. 표는 정책 없는 RLS로 전면 잠금이라 공개 anon 키로 가능한 일은 "1 올리기"뿐. 같은 탭 세션 내 재방문은 sessionStorage로 중복 집계 방지, 실패 시 자리를 비워 방문자에게 오류 미노출
- 조회수 일일 스냅샷(#67) — `post_views_daily`에 누적값을 날짜별로 적재하는 cron(KST 23:50, 기존 keep-alive 워크플로를 승격·흡수). 누적값 차분으로 일별 조회수를 계산할 수 있어 추이 그래프·최근 7일 인기글·성과 되먹임의 원재료가 된다
- 히어로 총 조회 라이브 스탯(#69) — `get_total_views` RPC로 전체 누적 조회수를 홈 히어로에 표시

### Fixed

- 자동 발행 배포에서 조회수 전면 소실 — `workflow_call`로 호출된 deploy는 호출자의 secrets를 상속하지 않아 `PUBLIC_SUPABASE_*`가 빈 값으로 빌드되고, 번들러가 fetch 로직을 죽은 코드로 제거했다. daily-post의 deploy 호출에 `secrets: inherit` 추가
- TopReads(많이 읽은 글)의 상대 시각이 클라이언트 갱신 패턴(`time[data-relative]`)에서 빠져 빌드 시점 값으로 고착되던 문제

### Security

- `increment_view`에 slug 형식 검증(`^[a-z0-9-]{1,80}$`) — 공개 anon 키로 임의 문자열 slug를 던져 쓰레기 행을 무한 생성하는 저장 공격을 입구에서 차단(스냅샷 증식도 함께 차단)

## [1.3.0] - 2026-08-15

Mode R 릴리스 — 보안 섹션이 시드 없이 웹 리서치로 최신 사고를 종합해 발행한다. 서버에 첫 외부 API(Tavily)가 붙었다(여전히 LLM 호출은 없음).

### Added

- Mode R 리서치 도구 `search_web`/`read_url`(#16) — Tavily 백엔드를 `SearchBackend` 어댑터 뒤에 캡슐화, 키 미설정 시 안내 에러, CI 시크릿 배선. `read_url`은 절단 상한을 인자로(기본 20k, 실링 50k자)
- `write_research_post` 프롬프트(#17) — 검색 → 원문 읽기 → 출처와 함께 종합하는 리서치 발행 워크플로, `write_daily_post`와 공통 블록 단일 출처화
- 리서치 글 투명성 메타(#18) — `sources`(실제 읽은 URL만)·`generated: research-synthesis` 프론트매터와 글 하단 '참고 자료' 렌더, `generated` 지정 시 sources 2건 이상 강제
- 오케스트레이터 Mode R 분기 — security 차례에 래퍼가 리서치 프롬프트·도구로 전환
- About 오비탈에 '웹 리서치' 단계 추가 — 발행 워크플로 시각화를 8단계로 갱신

### Changed

- SEO 검색 노출 정비 — title 브랜드 접미사(`— daily.mcp`) 일원화, JSON-LD 저자 실명(author.ts 단일 출처), 태그 페이지 noindex + 사이트맵 제외(228→90 URL), 글 URL `lastmod` 추가
- 상대 시각을 클라이언트에서 갱신 + 자정(KST 00:05) 스냅 리빌드 — 빌드 주기에 묶인 시간·잔디 낡음 해소
- 홈 카드에서 읽기 시간(N분) 제거 — 상대 시각만 표시
- 홈 OutroBanner에 소형 액센트 오브젝트 3종 — 반응형에서 단계적 접기

### Fixed

- 자동 발행 후 사이트 미배포 — `GITHUB_TOKEN` push는 push 트리거를 못 일으키므로 daily-post가 deploy를 `workflow_call`로 직접 호출
- 모바일 접근성·탭 타겟 — 검색 버튼 aria-label, 태그 `#` 장식의 스크린리더 낭독 제거, 목차 닫기 등 44px 히트 영역

## [1.2.0] - 2026-08-10

Phase 3 완성 릴리스 — 사람 없이 매일 발행되는 무인 파이프라인이 가동을 시작했다.

### Added

- 오케스트레이터 래퍼 `scripts/daily-post.sh`(#10) — 루프·성공 판정·재시도·커밋은 스크립트가 소유하고 글쓰기만 `claude -p` 헤드리스에 위임. 성공 판정은 모델 응답이 아니라 파일시스템(새 .md 실존), 날짜 기반 섹션 로테이션(mcp→jeongcheogi→security)
- 프롬프트 단일 출처 유지 장치 — MCP 슬래시 프롬프트가 헤드리스에서 발동되지 않아, `write_daily_post` 텍스트 빌더를 export하고 `print-prompt` CLI로 뽑아 주입
- publish_post PreToolUse 관문 훅(#42) — section·slug(kebab-case)·태그 개수·포괄어-only를 결정론으로 차단, 차단 사유를 모델이 읽고 수정 재호출
- `daily-post.yml` cron(#11) — 매일 KST 14시 무인 발행 + workflow_dispatch 수동 실행, 결과 JSON 아티팩트 보존
- 실행 학습 기록(#43) — 실행별 비용·턴·도구거부 관측치를 `docs/orchestrator-learnings.md`에 자동 누적
- 구독 OAuth 토큰 인증(#13) — API 키·추가 과금 없이 CI에서 발행 (Agent SDK + API 키 계획을 `claude -p` 래핑으로 대체)
- Cloudflare Web Analytics(#59) — 쿠키리스 방문 통계, View Transitions 페이지뷰 집계 실측 검증
- 푸터 빌드 정보(#41) — 배포 커밋 SHA(커밋 링크) + KST 빌드 시각

### Changed

- 프로젝트 스코프 `.mcp.json` 신설 — CI 러너에서도 MCP 서버가 상대 경로로 뜨도록

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

[1.4.0]: https://github.com/mmyonaa/blog/releases/tag/v1.4.0
[1.3.0]: https://github.com/mmyonaa/blog/releases/tag/v1.3.0
[1.2.0]: https://github.com/mmyonaa/blog/releases/tag/v1.2.0
[1.1.0]: https://github.com/mmyonaa/blog/releases/tag/v1.1.0
[1.0.0]: https://github.com/mmyonaa/blog/releases/tag/v1.0.0
