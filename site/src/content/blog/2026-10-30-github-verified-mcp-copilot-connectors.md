---
title: "GitHub-verified MCP 서버(Copilot connectors): MCP 설정을 플랫폼이 대신 맡을 때"
pubDate: 2026-10-30T11:29:47Z
section: "mcp"
tags: ["github-copilot", "mcp", "copilot-connectors", "vs-code", "mcp-allowlist"]
area: "T"
description: "2026년 10월 28일 GitHub가 공개 프리뷰로 내놓은 GitHub-verified MCP 서버(connectors)의 동작 방식, 지원 범위, 조직 정책 조건을 공식 문서 세 건을 교차 확인해 정리했다."
generated: "research-synthesis"
sources:
  - url: "https://github.blog/changelog/2026-10-28-connect-your-tools-to-copilot-without-all-the-setup"
    title: "Connect your tools to Copilot without all the setup - GitHub Changelog"
  - url: "https://github.blog/changelog/2026-10-28-github-copilot-in-vs-code-universe-releases"
    title: "GitHub Copilot in VS Code, Universe releases - GitHub Changelog"
  - url: "https://docs.github.com/copilot/concepts/customizations/copilot-connectors"
    title: "Copilot connectors - GitHub Docs"
  - url: "https://code.visualstudio.com/docs/agent-customization/copilot-connectors"
    title: "Connect services with Copilot connectors in VS Code"
---

## 무슨 일이 있었나

GitHub는 2026년 10월 28일 Universe 발표의 일부로 GitHub-verified MCP 서버, 줄여서 connectors를 공개 프리뷰로 내놓았다. 지금까지 에이전트에 Slack 스레드나 Sentry 오류 같은 외부 맥락을 주려면 MCP 서버를 찾아 설치하고, 로그인을 설정하고, 도구마다 이를 반복해야 했다. connectors는 이 과정을 GitHub가 대신 맡는다. 서비스를 한 번 연결하면 서버 설정과 인증을 GitHub가 관리하고, 같은 계정으로 로그인한 Copilot 클라이언트에서 연결이 재사용된다.

## 개발자 관점에서 바뀌는 것

MCP를 직접 다뤄 본 사람이라면 `mcp.json` 같은 로컬 설정 파일과 토큰 관리가 사라진다는 점이 핵심이다. 대신 서버 구성은 블랙박스가 된다. VS Code 문서에 따르면 연결된 서비스는 MCP Servers 목록에 `Connector:` 라벨로 나타나고, 설정 파일이 아니라 GitHub가 연결을 관리한다. 제거도 Uninstall이 아니라 Disconnect로 한다.

| 항목 | 내용 |
| --- | --- |
| 출시 시점 서비스 수 | 26개 (변경 기록 기준, Slack·Figma·Notion·Sentry·Linear·Atlassian Rovo·Cloudflare·Vercel 등) |
| 사용 가능한 곳 | Copilot 앱, Copilot CLI, VS Code, 클라우드의 Copilot, GitHub Mobile |
| 연결 위치 | CLI는 `/mcp`의 Connectors 탭, VS Code는 Agents 창의 Customizations |
| 미지원 | GitHub Actions에서 도는 세션(이슈를 Copilot에 할당하는 경우) |
| VS Code 전제 | Session Target을 Copilot으로 지정. Local harness 세션에는 도구가 제공되지 않음 |

## 도입 전 점검 체크리스트

개인 계정은 바로 쓸 수 있지만 Business·Enterprise는 관리자 설정이 먼저다. GitHub 문서가 요구하는 조건을 정리하면 다음과 같다.

1. `Editor preview features` 정책을 켠다. 프리뷰 기능이라 꺼져 있으면 VS Code의 관련 설정도 강제로 꺼진다.
2. MCP servers in Copilot 정책을 켠다. 꺼져 있으면 connectors도 못 쓴다.
3. `Restrict MCP access to registry servers`가 Registry only이면 connectors가 막힌다. 이를 적용하는 클라이언트에서는 Allow all이어야 한다.
4. `allowedMcpServers` 허용 목록을 쓴다면 각 connector의 URL 또는 이를 포괄하는 와일드카드를 넣는다. `deniedMcpServers`에 걸리면 허용 목록에 있어도 차단된다.
5. 서비스 쪽 승인도 필요할 수 있다. 예를 들어 Slack은 관리자가 MCP 접근을 허용해야 한다.

## 출처 간 어긋나는 지점

GitHub 문서는 사용자가 서비스 이름을 말하지 않아도 관련 있을 때 Copilot이 connector의 도구를 쓸 수 있다고 설명한다. 반면 VS Code 문서의 문제 해결 표는 연결됐는데 도구가 호출되지 않으면 프롬프트에 서비스를 명시하라고 안내한다. 둘은 모순이라기보다 기대치의 차이로 보인다. 자동 선택은 보장이 아니므로, 답이 그럴듯하다고 믿지 말고 도구 호출 내역을 펼쳐 실제로 connector가 쓰였는지 확인하는 습관이 필요하다. 이 점은 VS Code 문서도 권한다.

## 정리

connectors는 MCP 프로토콜을 바꾸는 소식이 아니라, MCP 서버의 배포와 인증을 플랫폼이 흡수하는 운영 방식의 변화다. 직접 만든 서버나 목록에 없는 서비스는 여전히 서버 URL이나 실행 명령으로 따로 추가해야 한다. 프리뷰 단계라 동작과 지원 범위가 바뀔 수 있다는 점은 감안해야 한다.
