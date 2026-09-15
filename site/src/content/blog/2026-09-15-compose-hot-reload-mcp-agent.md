---
title: "에이전트가 자기가 고친 UI를 직접 본다 — Compose Hot Reload의 MCP 서버"
pubDate: 2026-09-15T10:15:20Z
section: "mcp"
tags: ["mcp", "compose-hot-reload", "jetbrains", "kotlin", "coding-agent"]
area: "T"
description: "JetBrains가 Compose Multiplatform 1.12.0에서 Compose Hot Reload에 얹은 실험적 MCP 서버를 다룬다. 스크린샷·시맨틱 트리·로그로 보고, 리로드·클릭·입력으로 조작하는 도구 구성이 왜 에이전트의 자기검증 루프를 닫는지, 연결 방법과 제약, 그리고 이 설계를 자신의 개발 도구에 적용할 때의 체크포인트를 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://blog.jetbrains.com/kotlin/2026/08/compose-multiplatform-1-12-0"
    title: "Compose Multiplatform 1.12.0 Released"
  - url: "https://kotlinlang.org/docs/multiplatform/compose-hot-reload.html"
    title: "Compose Hot Reload | Kotlin Multiplatform Documentation"
  - url: "https://github.com/jetbrains/compose-hot-reload"
    title: "JetBrains/compose-hot-reload"
---

## 코드를 고친 에이전트는 결과를 어떻게 확인했나

AI 코딩 에이전트가 UI 코드를 수정한 뒤 제대로 렌더링됐는지 확인하려면, 지금까지는 사람이 화면을 보고 말로 전달해야 했다. 에이전트는 소스 코드는 편집할 수 있어도 그 코드가 실제로 그려낸 화면은 볼 수 없었다.

JetBrains가 2026년 8월 하순 공개한 Compose Multiplatform 1.12.0은 이 틈을 MCP 서버로 메웠다. Kotlin UI 코드를 재시작 없이 즉시 반영하는 Compose Hot Reload에, 실행 중인 애플리케이션을 AI 에이전트가 직접 조작하고 관찰할 수 있는 실험적 MCP 서버(`hot-reload-mcp` 모듈)를 얹은 것이다. 공식 블로그와 Kotlin 공식 문서 모두 이 기능을 "에이전트가 직접 결과를 확인하는 피드백 루프를 닫는다"는 말로 설명한다.

## 지각 도구와 행동 도구로 나눠보면

공식 문서가 공개한 도구 목록을 "무엇이 보이는가"와 "무엇을 할 수 있는가"로 나눠보면 이 서버의 설계 의도가 뚜렷해진다.

| 구분 | 도구 | 역할 |
|---|---|---|
| 상태 확인 | `status` | 애플리케이션 실행 여부 확인 |
| 지각 | `take_screenshot` | 창 화면 캡처 |
| 지각 | `get_semantic_tree` | Compose 시맨틱 트리(접근성 정보) 조회 |
| 지각 | `get_logs` | 런타임 로그·예외 조회 |
| 행동 | `reload` | 재컴파일 후 핫 리로드 적용 |
| 행동 | `click`, `type_text`, `scroll` | 사용자 입력 시뮬레이션 |

에이전트는 `reload`로 코드를 반영하고, `take_screenshot`과 `get_semantic_tree`로 결과를 확인하고, `get_logs`로 예외를 잡아낸다. 사람이 화면을 설명해줄 필요 없이 편집·확인·재편집 루프를 혼자 돌릴 수 있다는 뜻이다.

## 연결 방법과 제약

에이전트의 MCP 클라이언트 설정에서 Gradle 태스크를 가리키기만 하면 된다:

```json
{
  "mcpServers": {
    "compose-hot-reload": {
      "command": "./gradlew",
      "args": ["--no-daemon", "--quiet", "--console=plain", "hotMcpServer"]
    }
  }
}
```

에이전트가 이 설정을 통해 서버를 직접 켜고 끈다. 다만 전제 조건이 있다: Kotlin 2.1.20 이상, Compose Multiplatform 1.10.0 이상, Java 21 이하를 타깃으로 하는 JVM 데스크톱 타깃이 필요하고 JetBrains Runtime(JBR) 실행 환경이 있어야 한다. 이 MCP 서버 자체는 Compose Hot Reload 1.2.0-alpha01부터 실험적 상태로 제공된다는 점도 GitHub 저장소 문서에 명시돼 있다 — 프로덕션 빌드가 아니라 로컬 개발 루프에 한정된 기능이라는 뜻이다.

## 이 패턴이 시사하는 것

이 설계는 Compose Multiplatform에만 한정되지 않는다. 코드를 고치는 행동 도구만 MCP로 노출하면 에이전트는 결과를 추측할 수밖에 없다. 반면 스크린샷·구조 트리·로그처럼 관찰 도구를 함께 열어주면 에이전트가 스스로 검증하는 루프를 만들 수 있다. 자신의 개발 도구에 비슷한 MCP 서버를 얹으려는 개발자라면, 행동 도구 하나마다 그 결과를 확인할 지각 도구가 짝을 이루는지부터 점검해볼 만하다. 지금 당장은 실험적 기능이라 사이드 프로젝트에서 먼저 써보고 안정화를 지켜볼 시점이다.
