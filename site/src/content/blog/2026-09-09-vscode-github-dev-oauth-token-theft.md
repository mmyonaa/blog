---
title: "github.dev, 링크 클릭 한 번으로 GitHub 토큰이 넘어간 이유"
pubDate: 2026-09-09T09:57:38Z
section: "security"
tags: ["VS Code", "github.dev", "OAuth", "webview"]
description: "VS Code를 브라우저에서 그대로 쓰게 해주는 github.dev가 발급하는 OAuth 토큰이 왜 저장소 전체에 걸쳐 있는지, 웹뷰 메시지 체계와 워크스페이스 확장 신뢰 우회를 엮은 공격 체인이 어떻게 링크 클릭 하나로 토큰을 훔쳤는지, 그리고 이 공개가 마이크로소프트의 취약점 대응 방식을 둘러싼 논쟁과 어떻게 맞물렸는지 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://blog.ammaraskar.com/github-token-stealing"
    title: "1-Click GitHub Token Stealing via a VSCode Bug"
  - url: "https://thehackernews.com/2026/06/one-click-github-dev-attack-lets.html"
    title: "Microsoft Fixes One-Click GitHub Dev Attack That Let Attackers Steal OAuth Tokens"
  - url: "https://therecord.media/researcher-publishes-github-token-stealing-exploit-microsoft"
    title: "Researcher publishes GitHub token-stealing exploit, blames Microsoft's disclosure process"
---

## 링크 한 번, 저장소 전체

VS Code를 웹 브라우저에서 그대로 쓰게 해주는 github.dev는 개발자에게 익숙한 편의 기능이다. 저장소 URL의 github.com을 github.dev로 바꾸거나 메뉴에서 클릭 한 번만 하면, 파일을 보고 커밋하고 PR까지 낼 수 있는 VS Code 웹 인스턴스가 뜬다. 그런데 보안 연구자 Ammar Askar가 2026년 6월 2일 공개한 취약점은 바로 이 편의성이 공격 표면이 된다는 사실을 보여준다. 그의 원문 공개 글과 이를 다룬 The Hacker News, The Record 보도를 교차검증해 정리한다.

## 토큰이 저장소 하나에 묶이지 않는다

github.dev로 들어가면 github.com이 OAuth 토큰을 자동으로 발급해 넘겨준다. 문제는 이 토큰이 방금 연 저장소 하나에만 묶이지 않고, 사용자가 접근할 수 있는 모든 저장소(비공개 포함)에 읽기·쓰기 권한을 갖는다는 점이다. Askar는 이 토큰과, 백만 줄이 넘는 VS Code TypeScript 코드베이스가 브라우저 안에서 그대로 돌아간다는 사실이 맞물려 매력적인 공격 표면을 만든다고 짚었다.

## 공격 체인: 웹뷰에서 확장 설치까지

VS Code는 데스크톱에서든 브라우저에서든 마크다운 미리보기나 Jupyter 노트북처럼 신뢰할 수 없는 콘텐츠를 웹뷰라는 샌드박스에 격리한다. Askar가 찾은 문제는 이 웹뷰가 메인 편집기 창과 주고받는 메시지(postMessage) 체계에 있었다. 악성 웹뷰 안의 JavaScript가 키 입력 이벤트를 흉내 내 Ctrl+Shift+P로 명령 팔레트를 열고, 확장을 설치하는 명령을 실행시킬 수 있었다.

보통 출처가 불분명한 확장을 설치하려면 게시자 신뢰 확인 대화상자를 거쳐야 한다. 하지만 워크스페이스의 .vscode/extensions 폴더에 직접 넣는 "로컬 워크스페이스 확장"은 이 확인을 건너뛴다. github.dev로 여는 저장소 자체가 신뢰된 환경으로 취급되기 때문이다. 여기에 확장이 package.json으로 자체 키바인딩을 등록할 수 있다는 점을 더하면, 공격자는 신뢰 확인을 우회하는 키바인딩을 만들어 시뮬레이션한 키 입력으로 그대로 실행시킬 수 있다. 설치된 확장은 github.dev에 넘어온 OAuth 토큰을 읽어 GitHub API로 접근 가능한 비공개 저장소 목록까지 뽑아낸다. 결과적으로 악성 저장소를 담은 github.dev 링크를 클릭하는 것만으로 공격이 끝난다.

## 타임라인과 남은 의문

| 시점 | 내용 |
|---|---|
| 6월 2일 | Askar가 GitHub 보안 담당자에게 통보한 지 약 1시간 만에 기술 세부사항과 PoC를 블로그에 공개 |
| 6월 3일 오전(태평양시간) | 마이크로소프트가 github.dev 서비스 측 완화 조치 완료를 The Hacker News에 확인 |

마이크로소프트의 Alexandru Dima는 이 문제가 데스크톱판 VS Code에는 해당하지 않는다고 밝혔다. 서비스 쪽 패치였으므로 사용자가 따로 업데이트할 필요는 없었다는 뜻이다. 다만 The Record 보도에 따르면 마이크로소프트는 이번 건에 CVE 번호를 배정했는지, Askar에게 공로를 인정했는지에 대한 질의에는 응답하지 않았다.

Askar가 사전 통보를 1시간으로 줄인 이유도 짚을 만하다. 그는 과거 VS Code 원격 코드 실행 버그를 제보했을 때 마이크로소프트가 공로 표시 없이 "조용히" 패치만 했던 경험을 언급하며, 앞으로 VS Code 관련 버그는 이런 방식으로 공개하겠다고 밝혔다. The Record는 이 사건을, 취약점 대응 방식에 불만을 품은 연구자들이 조율 없는 공개로 돌아서는 흐름의 연장선으로 짚었다. 같은 시기 다른 연구자가 공개한 윈도우 제로데이를 두고 마이크로소프트가 "결코 정당화될 수 없다"는 강경 발언을 냈다가 며칠 뒤 "조치를 취할 의도가 없다"고 물러선 일도 함께 다뤘다.

## 개발자가 지금 확인할 것

- github.dev로 비공개 저장소를 자주 여는지 확인하고, 민감한 작업은 데스크톱 VS Code로 옮긴다.
- 조직의 확장 설치 정책에서 워크스페이스에 포함된 확장(.vscode/extensions)도 검토 대상에 넣는다 — 신뢰 대화상자를 건너뛴다는 점을 팀과 공유한다.
- 브라우저 기반 개발 환경에 발급되는 토큰의 권한 범위를 organization 설정에서 점검하고, 저장소 단위로 좁힐 수 있는 옵션이 있다면 우선한다.
- "신뢰된 워크스페이스"라는 표시가 실제 코드 실행 권한과 얼마나 가까운지는 도구마다 다르다. 새 편집기 확장 기능을 쓸 때마다 이 경계를 다시 확인하는 습관이 필요하다.
