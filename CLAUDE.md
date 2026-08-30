# CLAUDE.md

매일 블로그 글을 자동 발행하는 것을 목표로 MCP 서버를 직접 만들어 배우는 학습 프로젝트다.
`server/`(stdio MCP 서버 — LLM 호출 없음, 무료 원칙)와 `site/`(Astro SSG 블로그)로 구성된다.

이 문서는 **대화형 세션과 헤드리스(`claude -p`) 실행이 공유하는 불변 규칙**만 담는다.
글쓰기 상세 지침(분량 밴드·톤·구조)의 단일 출처는 MCP 프롬프트 `write_daily_post`(`server/src/prompts.ts`)이고,
입력 검증의 단일 출처는 `publish_post` 도구(`server/src/tools.ts`)다. 규칙을 바꿀 땐 코드를 고치고, 여기엔 원칙만 남긴다.

## 글 발행 워크플로 (참조 순서)

1. `write_daily_post` MCP 프롬프트의 지침을 따른다 — 워크플로 전체가 여기 패키징되어 있다.
2. `blog://posts` 리소스로 기존 글의 제목·태그를 먼저 읽는다 (중복 회피 + 태그 표기 통일).
3. `suggest_topic(section)` → 주제 선택 → 집필 → `publish_post` 순서로 진행한다.

## 발행 불변 규칙 (publish_post)

- **section 필수**: `mcp` | `web` | `jeongcheogi` | `boangisa` | `algo` | `security`. 유효 값의 단일 출처는 `server/src/topics.ts`의 `SECTIONS` 레지스트리 — 어디에도 하드코딩하지 않는다.
- **slug 필수, 영문 kebab-case**: 시드 주제면 그 `id`를 그대로 slug로. 비워두면 한글 슬러그가 되어 URL이 깨진다.
- **tags 3~5개, 구체적 소재 우선**: 제품·기술·기법·고유명사를 태그로. 섹션 포괄어(예: 보안 섹션의 `보안`·`취약점`)만으로 채우지 않는다. 같은 대상은 기존 글의 표기를 재사용한다(`typescript`/`ts` 흔들림 금지).
- **topicId**: `suggest_topic` 후보에서 고른 주제면 반드시 넘긴다 (중복 재제안 방지). 시드 밖 자유 주제면 생략.
- **minChars**: 심화도 밴드 하한을 함께 넘긴다. 거부되면 내용을 채워 재호출한다.
- **body는 본문만**: 프론트매터는 도구가 생성한다. 본문을 `---`로 시작하지 않는다.

## 성공 기준

발행 완료의 판정은 모델의 응답 문구가 아니라 **`site/src/content/blog/`에 새 `.md` 파일이 실제로 생겼는지**로 한다.
파일이 없으면 발행되지 않은 것이다.

## 섹션 선택

- 대화형: 사용자가 지정한 섹션을 따른다. 지정이 없으면 물어본다.
- 무인 실행(Phase 3): 로테이션 규칙은 래퍼(#10)에서 확정한다. 기본 가정은 `mcp` → `jeongcheogi` → `security` → `mcp-trend` → `boangisa` 순환 (`mcp-trend`는 mcp 섹션의 Mode R 생태계 동향 리서치, #71).

## 작업 관리

일감은 GitHub Project([mcp blog](https://github.com/users/mmyonaa/projects/5)) 단위로 진행한다.
착수 시 Todo → In Progress, 완료 시 Done + 완료일 갱신, 진행 기록은 이슈 코멘트나 커밋 메시지로 남긴다.

## 로컬 전용 문서

`docs/`는 gitignore라 **CI 러너에는 존재하지 않는다**. 설계 문서(plan.md, content-strategy.md,
phase3-headless-harness.md 등)는 로컬 참고용이며, 러너에서도 유효해야 하는 규칙은 반드시 이 파일이나 코드에 둔다.
