# 블로그 자동화 MCP 프로젝트 — 설계 문서

> **한 줄 목표**: 매일 한 번, 자동으로 블로그 글을 한 편씩 작성·발행한다.
> **진짜 목표**: 그 과정에서 **MCP 서버를 제대로 만들어보고 배운다.**
> **진행 원칙**: **무료로 배울 수 있는 것부터** 한다. 돈(API 키)은 맨 마지막 자동화 단계에서만 필요하다 → §2.

---

## 0. 결정 사항 (확정)

| 항목 | 결정 | 비고 |
|---|---|---|
| 프로젝트 목적 | **MCP를 제대로 배우기** | 결과 효율보다 학습 우선 → MCP 중심 설계가 정당함 |
| 진행 방식 | **3단계 로드맵** (무료 → 무료 → 유료) | §2. Phase 1·2는 API 키 없이 진행 |
| 발행 대상 | **GitHub Pages + SSG** | §3 |
| SDK 언어 | **TypeScript** (Node ≥ 20) | 공식 SDK가 가장 성숙 + hogwarts 환경 재사용 → §8 |
| SSG | **Astro** | 마크다운 → 블로그가 기본기, 커스터마이즈 여지 → §8 |
| 매일 트리거 | **GitHub Actions cron** | 서버 상주 불필요, 러너 무료 (LLM 호출만 유료) |
| Pages 배포 방식 | **GitHub Actions 소스** (Deploy from branch ❌) | 서버 코드와 블로그를 한 레포에 둬도 안 꼬임 → §9 |

---

## 1. 핵심 개념 — "MCP 서버 자체는 돈을 쓰지 않는다"

MCP(Model Context Protocol)는 **LLM에게 도구/컨텍스트를 노출하는 프로토콜**이다.
MCP 서버는 "이런 도구를 쓸 수 있어" 하고 기능을 제공할 뿐, **스스로 깨어나서 글을 쓰지 않는다.**

그래서 이 프로젝트는 실제로 **세 조각**으로 나뉘고, **돈을 쓰는 건 딱 하나뿐이다.**

| 조각 | 역할 | LLM 호출? | 비용 |
|---|---|---|---|
| **트리거** | 매일 1회 실행 | ❌ | 무료 (GitHub Actions cron) |
| **오케스트레이터** | 글을 실제로 "쓰는" LLM 루프 | ⭕ **여기만 Claude 호출** | **유료 (API 요율)** 💸 |
| **MCP 서버** | 도구·리소스 제공 (주제 선정, 발행 등) | ❌ **그냥 함수 실행** | **무료** ✅ ← 학습의 핵심 |

**핵심 통찰**: MCP 서버는 그냥 `publish_post()` 같은 함수를 노출하고 파일을 커밋하는 평범한 Node 프로그램이다. Claude에게 아무것도 묻지 않으니 **토큰을 안 쓰고, 따라서 API 키도 필요 없다.**
→ **MCP를 만들고 배우는 과정(이 프로젝트의 진짜 목적)은 전부 무료다.** 돈은 마지막에 "매일 무인 자동화"를 붙일 때만 든다.

---

## 2. ⭐ 진행 로드맵 — 3단계 (무료 → 무료 → 유료)

이 프로젝트의 척추. 각 단계는 앞 단계가 **동작하는 걸 눈으로 확인한 뒤** 넘어간다.

### Phase 1 — MCP 서버 만들기  🆓 무료
> 목표: `publish_post` / `suggest_topic` 도구와 `blog://posts` 리소스를 갖춘 **stdio MCP 서버**를 만든다.

- `@modelcontextprotocol/sdk`로 stdio 서버 부트스트랩
- **Tool** `publish_post(title, body, tags, date)` → 마크다운 파일 생성 (+ 커밋)
- **Tool** `suggest_topic()` → 지난 글 보고 안 겹치는 주제 제안
- **Resource** `blog://posts` → 발행된 글 목록
- API 키 불필요. Claude 호출 없음. 순수 코드.

**완료 기준**: 서버가 뜨고, MCP Inspector나 로그로 도구 목록이 보인다.

### Phase 2 — 이 Claude Code에 붙여서 대화형 테스트  🆓 무료 (★ 학습의 90%)
> 목표: 내가 만든 MCP 서버를 **지금 쓰는 Claude Code에 등록**하고, 대화로 도구를 굴려본다.

```bash
# 내 MCP 서버를 Claude Code에 등록
claude mcp add blog-mcp -- node /경로/server/dist/index.js

# 그 다음 대화창에서:
#  "blog://posts 리소스 읽어서 지금까지 쓴 글 목록 보여줘"
#  "suggest_topic 도구로 다음 주제 하나 제안해봐"
#  "publish_post 도구로 테스트 글 하나 발행해봐"
```

- 이건 **대화형(interactive) 사용** → **구독으로 커버되어 무료**.
- 도구가 잘 붙는지, 스키마가 맞는지, 리소스가 잘 읽히는지 전부 **여기서 공짜로 디버깅**.
- Tools / Resources / Prompts 세 primitive의 감을 잡는 곳 → §5.

**완료 기준**: Claude Code가 내 도구를 호출해 실제로 `.md` 파일을 만들고, 리소스로 지난 글을 읽어 중복을 피한다.

### Phase 3 — 오케스트레이터 + cron 자동화  💸 여기서만 API 키 필요
> 목표: 사람 없이 매일 1회 글이 발행되게 한다.

- **오케스트레이터**(`orchestrator/run.ts`): Agent SDK가 MCP를 서브프로세스로 붙이고 LLM 루프를 돌림 → §8
- **cron**: GitHub Actions `schedule`이 매일 오케스트레이터 실행 → §9
- **SSG + Pages**: 커밋된 `.md`를 Astro가 렌더링해 배포 → §3, §9
- 이때 처음으로 `ANTHROPIC_API_KEY`(또는 Agent SDK 크레딧)가 필요 → §10

**완료 기준**: 아무것도 안 했는데 다음 날 아침 블로그에 새 글이 올라와 있다.

> **왜 이 순서인가**: Phase 1·2에서 MCP의 모든 개념을 **무료로** 배우고 검증한 뒤, 검증된 서버를 Phase 3에서 자동화로 감싼다. 돈은 "이미 잘 도는 걸 무인화"할 때만 쓴다. cron 안에서 처음부터 디버깅하는 지옥을 피한다.

---

## 3. 발행 대상: "블로그를 구현하느냐" 3단계 스펙트럼

마크다운 `.md`는 그 자체로 웹페이지가 아니다. 누군가 그걸 **HTML로 렌더링해 보여주는 블로그**가 있어야 한다(= SSG, Static Site Generator). "블로그를 구현한다"에는 세 단계가 있고, 어디를 고르냐에 따라 `publish_post`가 하는 일이 달라진다.

| 방식 | 블로그를 "구현"? | MCP가 하는 일 | 노력 |
|---|---|---|---|
| **① 외부 블로그 앱** (Tistory/Velog/Medium) | ❌ 전혀 안 함 | 그쪽 API로 글 POST | 블로그 0, 근데 OAuth 토큰 골치 |
| **② GitHub Pages + SSG** (Jekyll/Hugo/Astro) | △ SSG 얹기 | `.md` 파일 커밋 | 렌더링은 생성기가 해줌, 직접 코딩 거의 없음 |
| **③ 직접 구현** (hogwarts처럼 손으로) | ⭕ 렌더링까지 다 | `.md` 커밋 | 블로그 자체가 또 하나의 프로젝트 |

### 추천: ② GitHub Pages + SSG(Astro)

**MCP 학습이 목적**이므로 발행 파이프라인은 최대한 단순해야 한다. ③은 블로그 만드느라 정작 MCP가 뒷전이 되니 비추.

- **무료 + 인증 토큰 불필요** — ①의 OAuth 관리가 골치인 반면, ②는 `git commit` 한 번이면 끝.
- **SSG가 렌더링 대행** — Astro가 `.md`(프론트매터 포함)를 HTML 블로그로 자동 렌더링. 직접 짜는 코드는 설정 수준.
- **이미 익숙한 워크플로** — hogwarts의 "main에 푸시 → 자동 배포" 그대로.
- **나중에 교체 쉬움** — ①로 바꾸려면 `publish_post` 도구 **하나만** 갈아끼우면 됨. 인터페이스는 그대로.

---

## 4. 전체 아키텍처 (Phase 3 완성형)

```
매일 09:00 KST (GitHub Actions cron)          ← Phase 3
        │
        ▼
┌─────────────────────────────────────┐
│  오케스트레이터 (Agent SDK)          │  💸 LLM 호출 = 여기서만 과금
│   LLM 루프가 MCP 서버를 호출:         │
│    1. blog://posts 읽기 ← 중복 방지   │  ← Phase 1에서 만든 것
│    2. suggest_topic()   ← 다음 주제   │  ← Phase 1에서 만든 것
│    3. (본문 생성 = LLM이 직접)        │
│    4. publish_post(...)  ← .md 커밋   │  ← Phase 1에서 만든 것
└─────────────────────────────────────┘
        │ MCP 서버 = stdio 서브프로세스 (무료)
        ▼
   레포에 site/src/content/blog/2026-07-14-xxx.md 커밋
        │
        ▼
   Astro build → GitHub Pages 자동 재배포
```

> Phase 2에서는 이 그림의 "오케스트레이터" 자리에 **내가 쓰는 Claude Code**가 앉아 같은 MCP 서버를 대화로 호출한다(무료).

---

## 5. MCP 서버 설계 — 3대 primitive를 골고루

학습이 목적이므로 MCP의 세 가지 primitive를 모두 만져보게 설계한다. 구분 기준은 **"누가 주도하나"**.

### Tools — LLM이 능동 호출 (부수효과 O)
- `suggest_topic()` — 지난 글 목록을 보고 안 겹치는 다음 주제를 제안
- `publish_post(title, body, tags, date)` — 마크다운 파일 생성 + 커밋(또는 PR)

### Resources — LLM이 읽는 컨텍스트 (읽기 전용, `blog://` URI)
- `blog://posts` — 발행된 글 목록
- `blog://posts/{slug}` — 특정 글 본문
- → LLM이 "지난 글"을 읽어 중복 회피·시리즈 연결

### Prompts — 재사용 워크플로 템플릿 (사용자/오케스트레이터가 선택)
- `write_daily_post` — "지난 글 참고 → 안 겹치는 주제로 한국어 기술 블로그 1편(코드 예제 포함) → publish_post" 라는 오늘의 글쓰기 지침 전체를 패키징
- → Phase 2에서 Claude Code 슬래시 명령처럼 골라 실행해보며 배움

### Transport — stdio
- 서버를 서브프로세스로 띄우고 표준입출력으로 대화. 원격 상주 HTTP 서버가 불필요해 cron·로컬 테스트 양쪽에 딱 맞음.

> Tools 2개만으로도 자동화는 돌아간다. Resources·Prompts는 **"MCP 전체를 배우기 위해" 일부러** 넣는다(§0 목적과 정합).

---

## 6. 권장 레포 구조 (단일 레포)

학습용이면 MCP 서버 + 블로그 글 + cron을 한 레포에 두는 게 편하다.

```
blog-mcp/                    # 단일 레포 (pnpm workspace)
├── server/                  # ★ MCP 서버 (Phase 1·2의 핵심 학습 대상)
│   ├── src/
│   │   ├── index.ts         # stdio 서버 부트스트랩
│   │   ├── tools.ts         # suggest_topic, publish_post (zod 스키마)
│   │   ├── resources.ts     # blog://posts 리소스
│   │   └── prompts.ts       # write_daily_post 프롬프트
│   └── package.json
├── orchestrator/            # Phase 3: 매일 도는 LLM 루프
│   └── run.ts               # Agent SDK로 MCP 붙이고 → 도구 호출 → 글 생성
├── site/                    # Astro 블로그
│   ├── src/content/blog/    # ← publish_post가 .md를 여기에 저장 (프론트매터 포함)
│   │   └── 2026-07-14-first.md
│   └── astro.config.mjs
├── .github/workflows/       # Phase 3
│   ├── daily-post.yml       # cron → 글 생성 + 커밋
│   └── deploy-pages.yml     # push(content/**) → Astro 빌드 + Pages 배포
├── pnpm-workspace.yaml
└── README.md
```

> **저장 폴더는 하나로 통일**: `publish_post`가 Astro가 읽는 폴더(`site/src/content/blog/`)에 바로 쓰게 한다. 별도 `posts/`를 두면 관리 폴더/렌더 폴더 동기화 이슈가 생기니 학습 단계에선 한 곳으로.

---

## 7. 기술 스택

| 레이어 | 선택 | 이유 | 어느 Phase |
|---|---|---|---|
| **MCP 서버 언어** | TypeScript (Node ≥ 20) | 공식 SDK가 가장 성숙, 예제/타입 풍부 | 1 |
| **MCP SDK** | `@modelcontextprotocol/sdk` | Tools/Resources/Prompts + stdio transport 내장 | 1 |
| **런타임 검증** | zod | 도구 입력 스키마를 zod로 → SDK가 JSON Schema 자동 변환 | 1 |
| **날짜/슬러그** | `date-fns` + 간단 slugify | 파일명 `YYYY-MM-DD-slug.md` 규칙 | 1 |
| **테스트 클라이언트** | **이 Claude Code** (`claude mcp add`) | 대화형 = 무료로 도구 검증 | 2 |
| **오케스트레이터** | `@anthropic-ai/claude-agent-sdk` | MCP를 서브프로세스로 붙이고 도구 루프 대행. `claude-haiku-4-5`(저렴) → `claude-opus-4-8`(품질) | 3 |
| **SSG (블로그 렌더링)** | Astro | `src/content/` 마크다운 → 정적 블로그 기본 제공. `@astrojs/rss`로 RSS도 공짜 | 3 |
| **패키지 매니저** | pnpm (또는 npm) | 모노레포 워크스페이스 깔끔 | 1 |

### 왜 Astro인가 (vs Jekyll)
- GitHub Pages 기본은 Jekyll(Ruby)이지만, 이미 TS 생태계이므로 언어를 하나로 유지하는 게 유리.
- Astro는 프론트매터(`title`, `date`, `tags`)를 그대로 읽어 목록/상세 페이지 생성 → `publish_post`의 프론트매터 스키마와 자연스럽게 맞물림.
- 정적 산출물이라 Pages에 그대로 얹힘. 나중에 Vercel/Netlify로 옮겨도 동일.

---

## 8. 오케스트레이터 (Phase 3)

cron이 매일 실행하는, 글을 실제로 "쓰는" LLM 루프. `@anthropic-ai/claude-agent-sdk` 사용.

```
orchestrator/run.ts
  1. Agent SDK 시작 (MCP 서버를 stdio 서브프로세스로 spawn)
  2. write_daily_post 프롬프트 로드
  3. LLM 루프:
       - blog://posts 읽어 지난 글 파악
       - suggest_topic()로 주제 결정
       - 본문 생성
       - publish_post(...)로 .md 커밋
  4. 종료
```

- 모델: 개발·디버깅은 `claude-haiku-4-5`(저렴), 품질 필요 시 `claude-opus-4-8`로 승격. **설정 한 줄만 교체.**
- 인증: `ANTHROPIC_API_KEY` 환경변수. → §10

---

## 9. 인프라 (Phase 3)

```
┌───────────────────────────────────────────────────────────┐
│ GitHub (단일 레포: blog-mcp)                                │
│                                                           │
│  ┌─────────────────┐   schedule: cron (UTC 00:00)         │
│  │ Actions Runner  │◀──────────────────────────────────── │
│  │ (ubuntu-latest) │                                       │
│  │                 │  1. pnpm install                      │
│  │  오케스트레이터  │  2. node orchestrator/run.js  💸      │
│  │      │          │     └ stdio로 MCP 서버 spawn (무료)   │
│  │      ▼          │  3. git commit content/*.md           │
│  │   MCP 서버      │     (bot 커밋)                        │
│  └─────────────────┘                                       │
│         │ commit → push                                    │
│         ▼                                                  │
│  ┌─────────────────┐   on: push (content/**)               │
│  │ Pages Build     │  Astro build → dist/ → Pages 배포     │
│  │ (Actions 소스)  │                                       │
│  └─────────────────┘                                       │
└───────────────────────────────────────────────────────────┘
         │
         ▼
   https://<user>.github.io/blog-mcp  (정적 블로그)
```

### 구성 요소
| 요소 | 무엇 | 설정 |
|---|---|---|
| **트리거** | GitHub Actions `schedule` | `cron: "0 0 * * *"` (= KST 09:00; cron은 UTC 기준) |
| **실행 환경** | `ubuntu-latest` 러너 | 무료 분(공개 레포 무제한 / 사설 월 2000분) |
| **비밀값** | `ANTHROPIC_API_KEY` | 레포 Settings → Secrets |
| **커밋 권한** | 기본 `GITHUB_TOKEN` | 워크플로 `permissions: contents: write` |
| **호스팅** | GitHub Pages (Actions 소스) | Settings → Pages → Source: GitHub Actions |
| **도메인** | `*.github.io` 무료 | 커스텀 도메인은 나중에 |

### 워크플로 2개로 분리 (권장)
1. `daily-post.yml` — `schedule` 트리거. 글 생성 + 커밋만. **Pages 빌드 안 함.**
2. `deploy-pages.yml` — `on: push: paths: ['site/src/content/**']` 트리거. Astro 빌드 + 배포.

이렇게 나누면 "봇 커밋이 무한 재배포 루프를 만드는" 함정을 구조적으로 차단한다. 생성 job과 배포 job의 관심사가 분리되어 디버깅도 쉬움.

### 대안: 로컬 PC cron
GitHub Actions 대신 켜져 있는 로컬 PC로 돌려도 된다. 단 **과금 방식은 동일**(자동화 = headless 호출 = API 요율). 로컬은 이미 로그인된 세션을 써서 키 관리가 조금 편하지만, **트리거 시각에 PC가 켜져(잠자기 아님) 있어야** 한다. macOS는 `cron`보다 `launchd`(`StartCalendarInterval`) 권장. → 자동화 신뢰성은 GitHub Actions가 우위.

---

## 10. 비용 & 인증 (Phase 3에서만)

**중요**: Phase 1·2는 **완전 무료**다(§1, §2). 아래는 Phase 3 자동화에만 해당.

| 항목 | 비용 |
|---|---|
| GitHub Actions / Pages | **무료** (공개 레포 기준) |
| MCP 서버 실행 | **무료** (LLM 호출 없음) |
| **오케스트레이터의 Claude 호출** | **유료 (소액)** — 글 1편 ≈ 입력 수천 + 출력 ~2천 토큰. Haiku면 하루 1편 ≈ 월 몇백 원, Opus여도 월 몇천 원 |

### 인증 — 구독으로는 안 된다
- **Claude 구독(Pro/Max) ≠ API 크레딧.** 둘은 별개 상품이라 구독료에 API 사용량이 포함되지 않는다.
- **2026-06-15부터** 프로그램적/headless 사용(Agent SDK, `claude -p`, GitHub Actions)은 구독 풀과 **분리되어 별도 크레딧에서 API 요율로** 과금된다. → cron 자동화는 구독으로 "공짜"가 안 됨.
- 특히 **Agent SDK는 구독 토큰을 안 받고 API 키만 받는다.** 우리 오케스트레이터가 Agent SDK이므로 → **`ANTHROPIC_API_KEY` 필요.**

### Phase 3 준비물 (딱 이 시점에)
1. console.anthropic.com 가입 → 결제수단 등록 → **API 키 발급**
2. 레포 Settings → Secrets에 `ANTHROPIC_API_KEY` 저장
3. 로컬에서 같은 키로 오케스트레이터 먼저 손 실행 → 되면 cron 연결

> 비용 통제: 개발은 `claude-haiku-4-5`, 품질 필요 시 `claude-opus-4-8`. 설정 한 줄 교체.

---

## 11. 짚어둘 함정

1. **"MCP 서버 = 유료"라는 오해** — MCP 서버는 LLM을 안 부른다. 무료. 돈은 오케스트레이터(LLM)에서만 든다. → §1
2. **구독으로 자동화 공짜 오해** — cron 자동화는 프로그램적 사용이라 API 요율 과금. 로컬로 옮겨도 동일. → §10
3. **cron 시각** — GitHub Actions cron은 UTC 기준. KST 09:00 = UTC 00:00.
4. **봇 커밋 재배포 루프** — 생성/배포 워크플로를 분리하고 트리거를 좁혀 차단. → §9
5. **저장 폴더 이원화** — 관리 폴더와 렌더 폴더를 나누지 말고 한 곳으로. → §6

---

## 12. 다음 액션

**→ Phase 1 시작: 최소 MCP 서버 스캐폴딩.**
`publish_post` 하나만 있는 stdio 서버를 만들고, 곧바로 §2 Phase 2대로 이 Claude Code에 붙여 무료로 테스트한다. (돌아가는 뼈대를 만지며 배우는 게 가장 빠름 + 돈 안 듦.)

이후: Resource/Prompt 추가 → 검증 → Phase 3(오케스트레이터 + cron) 순으로 확장.
