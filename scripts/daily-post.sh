#!/bin/bash
# daily-post.sh — 매일 자동 발행의 바깥 오케스트레이터 (#10)
# 설계: docs/phase3-headless-harness.md (로컬 문서)
#
# 오케스트레이션의 뼈대(루프·성공 판정·재시도·커밋)는 이 스크립트가 소유하고,
# 지능이 필요한 속살(글쓰기 에이전트 루프)만 claude -p에 위임한다.
# 성공 판정은 모델의 응답 문구가 아니라 파일시스템(새 .md 실존)으로 한다.
#
# 사용법:
#   bash scripts/daily-post.sh [section]
#     section 생략 시 날짜(연중일) 기반 로테이션: mcp → jeongcheogi → security
#   SKIP_PUSH=1 bash scripts/daily-post.sh   # 커밋까지만, push 생략(로컬 테스트)
set -euo pipefail
cd "$(dirname "$0")/.."

CONTENT_DIR="site/src/content/blog"
RESULT_JSON="${TMPDIR:-/tmp}/daily-post-result.json"
MAX_ATTEMPTS=3

# 섹션 로테이션 — 연중일 % 3. 결정론이라 같은 날 재실행해도 같은 섹션(재시도 안전).
SECTIONS=(mcp jeongcheogi security)
idx=$(( 10#$(date +%j) % ${#SECTIONS[@]} ))
SECTION="${1:-${SECTIONS[$idx]}}"

# 등록된 것은 빌드 산출물(dist/) — 없으면 빌드부터.
[ -f server/dist/index.js ] || pnpm --filter @blog-mcp/server build

new_post=""
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo "[$attempt/$MAX_ATTEMPTS] section=$SECTION 발행 시도"
  before=$(git status --porcelain "$CONTENT_DIR" | awk '/^\?\?/{print $2}' | sort)

  # 프롬프트는 서버의 buildWriteDailyPostText가 단일 출처 — print-prompt CLI로 뽑아 주입.
  # (MCP 슬래시 프롬프트는 헤드리스에서 "Unknown command"로 발동 불가 — 2026-08-10 판가름)
  PROMPT=$(node server/dist/print-prompt.js "$SECTION")
  claude -p "$PROMPT" \
    --mcp-config .mcp.json \
    --allowedTools "mcp__blog-mcp__suggest_topic,mcp__blog-mcp__publish_post,ReadMcpResourceTool,ListMcpResourcesTool" \
    --max-turns 30 \
    --output-format json >"$RESULT_JSON" || true

  after=$(git status --porcelain "$CONTENT_DIR" | awk '/^\?\?/{print $2}' | sort)
  new_post=$(comm -13 <(echo "$before") <(echo "$after") | head -1)
  [ -n "$new_post" ] && break
  echo "실패 — 새 글 파일이 생기지 않음"
done

# 학습 기록(#43) — 실행 관측치를 한 줄 누적. 몇 주치가 프롬프트·훅 규칙 개선의 근거가 된다.
LEARN_FILE="docs/orchestrator-learnings.md"
cost="?"; turns="?"; dur="?"; denials="?"
if command -v jq >/dev/null 2>&1 && [ -s "$RESULT_JSON" ]; then
  read -r cost turns dur denials < <(
    jq -r '[(.total_cost_usd // "?"), (.num_turns // "?"), (.duration_ms // "?"), ((.permission_denials // []) | length)] | @tsv' \
      "$RESULT_JSON" 2>/dev/null || echo "? ? ? ?"
  )
fi
record_learning() { # $1=결과 $2=파일명
  [ -f "$LEARN_FILE" ] || return 0 # 기록 파일이 없으면(로컬 특수 상황) 조용히 생략
  printf '| %s | %s | %s | %s/%s | %s | %s | %s | %s | %s |\n' \
    "$(date +%Y-%m-%d)" "$1" "$SECTION" "$attempt" "$MAX_ATTEMPTS" \
    "$cost" "$turns" "$dur" "$denials" "$2" >>"$LEARN_FILE"
}

if [ -z "$new_post" ]; then
  record_learning "실패" "-"
  git add "$LEARN_FILE" 2>/dev/null && git commit -m "chore(learnings): 자동 발행 실패 기록 $(date +%Y-%m-%d)" >/dev/null 2>&1 || true
  [ "${SKIP_PUSH:-0}" = "1" ] || git push || true
  echo "::error::발행 실패 — ${MAX_ATTEMPTS}회 시도 모두 새 글이 생기지 않음"
  exit 1
fi

record_learning "성공" "$(basename "$new_post")"
echo "관측: 비용 \$${cost} · ${turns}턴 · ${dur}ms · 도구거부 ${denials}건"

# 커밋 — 프론트매터에서 섹션·제목을 뽑아 기존 관례(post(section): 제목)를 따른다.
title=$(sed -n 's/^title: *"\{0,1\}\(.*\)"\{0,1\}$/\1/p' "$new_post" | head -1 | sed 's/"$//')
sec=$(sed -n 's/^section: *"\{0,1\}\([a-z]*\).*/\1/p' "$new_post" | head -1)
git add "$new_post"
[ -f "$LEARN_FILE" ] && git add "$LEARN_FILE"
git commit -m "post(${sec:-$SECTION}): ${title:-자동 발행} — 자동 발행 $(date +%Y-%m-%d)"
[ "${SKIP_PUSH:-0}" = "1" ] || git push
echo "발행 완료: $new_post"
