---
title: "GitHub Actions cron으로 매일 도는 자동화 짜기"
pubDate: 2026-07-27T13:01:31Z
section: "mcp"
tags: ["github-actions", "cron", "workflow-dispatch", "자동발행"]
area: "A"
topicId: "github-actions-cron"
description: "매일 글을 자동 발행하려면 스케줄러가 필요하다. 서버에 crontab을 거는 대신 GitHub Actions의 schedule 트리거로 매일 도는 워크플로를 만든다. UTC 시차, 정시 지연, 60일 비활성화 같은 함정과 workflow_dispatch를 함께 두는 이유까지, 그대로 쓸 수 있는 워크플로 파일로 정리한다."
---

블로그 글을 매일 자동으로 발행하려면 두 가지가 필요하다. 글을 만드는 스크립트, 그리고 그걸 정해진 시각마다 실행해 주는 스케줄러다. 스케줄러라고 하면 서버에 crontab부터 떠올리기 쉽지만, 코드가 이미 GitHub에 있다면 서버 없이도 된다. GitHub Actions의 `schedule` 트리거가 그 자리를 대신한다.

## schedule 트리거의 기본

워크플로 파일에 `on.schedule`을 선언하면 GitHub가 정해진 주기로 워크플로를 실행한다.

```yaml
on:
  schedule:
    - cron: "0 22 * * *"
```

cron 표현식은 왼쪽부터 분·시·일·월·요일 다섯 칸이다. `0 22 * * *`는 "매일 22시 0분". 여기서 가장 많이 틀리는 부분이 시간대다. **GitHub Actions의 cron은 UTC 기준**이라, 한국 시간(KST, UTC+9)으로 아침 7시에 돌리고 싶다면 전날 22시 UTC로 적어야 한다. 최소 간격은 5분이고, 실행 시점에는 기본 브랜치의 최신 커밋이 체크아웃된다.

## 그대로 쓸 수 있는 워크플로

매일 글을 만들어 커밋까지 하는 뼈대는 이렇다. `.github/workflows/daily-post.yml`:

```yaml
name: daily-post
on:
  schedule:
    - cron: "17 22 * * *"   # 07:17 KST
  workflow_dispatch:        # 수동 실행 버튼

permissions:
  contents: write           # GITHUB_TOKEN으로 push하기 위해 필요

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: generate post
        run: ./scripts/generate-post.sh   # 글을 만드는 스크립트 (프로젝트마다 다름)
      - name: commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add site/src/content/blog
          git diff --cached --quiet || git commit -m "post: daily auto publish"
          git push
```

짚어둘 디테일이 두 가지 있다. `permissions: contents: write`는 워크플로의 기본 토큰(GITHUB_TOKEN)에 push 권한을 주는 선언이다. 리포 설정에 따라 기본 토큰이 읽기 전용일 수 있으니 명시해 두는 편이 안전하다. 그리고 마지막 줄의 `git diff --cached --quiet ||`는 변경이 없는 날 커밋 명령이 실패해 워크플로 전체가 빨간불이 되는 걸 막는다.

## cron이 약속하지 않는 것

schedule 트리거에는 미리 알아둬야 할 성질이 몇 가지 있다.

- **정시 실행은 보장되지 않는다.** 러너가 붐비면 예약 시각보다 몇 분에서 수십 분 늦게 시작하고, 심하면 그 회차가 건너뛰어질 수도 있다. 특히 매시 0분은 전 세계 워크플로가 몰리는 시간이라, 위 예제처럼 어중간한 분(17분)을 고르는 게 요령이다.
- **방치된 공개 리포에선 꺼진다.** 리포에 일정 기간(60일) 활동이 없으면 GitHub가 스케줄 워크플로를 자동으로 비활성화한다. 매일 커밋이 쌓이는 블로그라면 해당 없지만, 알아두면 "어느 날 갑자기 멈췄다"의 원인을 빨리 찾을 수 있다.
- **디버깅 경로를 따로 둬야 한다.** cron만 있으면 테스트하려고 다음 실행 시각까지 기다려야 한다. `workflow_dispatch`를 함께 선언하면 Actions 탭에서 버튼으로 즉시 실행할 수 있어, 스케줄과 무관하게 파이프라인을 검증할 수 있다.

## 스케줄러는 이미 공짜로 있다

매일 도는 자동화를 만들 때 스케줄러 때문에 서버를 빌릴 필요는 없다. 코드가 GitHub에 있다면 트리거(schedule)·실행 환경(러너)·커밋 권한(GITHUB_TOKEN)까지 한 세트로 갖춰져 있고, 공개 리포에서는 무료다. 남는 일은 "실행될 스크립트"를 만드는 것뿐이고, 그건 스케줄러와 분리해 로컬에서 먼저 완성하면 된다. 이 블로그의 자동 발행도 같은 구조 위에 올라간다 — 글을 만드는 쪽은 로컬에서 검증하고, cron은 그걸 매일 호출하는 방아쇠로만 쓴다.
