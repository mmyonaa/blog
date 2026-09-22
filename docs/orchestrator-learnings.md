# 오케스트레이터 학습 기록 (#43)

매 자동 발행 실행의 관측치를 래퍼(scripts/daily-post.sh)가 한 줄씩 누적한다.
목적: 몇 주치를 모아 프롬프트·훅 규칙 개선의 근거로 쓴다 (knowledge compounding).
비용은 구독 차감이라 실지출 0 — 상당액 표기다.
실패 실행의 사유는 Actions 로그에 한 줄로 찍힌다(결과 JSON의 `.result`). 전체 JSON은 아티팩트 참조.

## 사고 기록

- **2026-09-17 — OAuth 토큰 revoke로 발행 실패.** `CLAUDE_CODE_OAUTH_TOKEN`(2026-08-10 발급)이
  약 5주 만에 폐기돼 `claude -p`가 매 시도 ~2초 만에 401로 죽었다(비용 0 · 1턴). 당시 래퍼는
  사유를 삼키고 "새 글 파일이 생기지 않음"만 남겨서, 원인 판별에 결과 JSON 아티팩트 다운로드가
  필요했다. 재발급·시크릿 갱신 후 재실행으로 복구. 이후 래퍼가 (1) 실패 사유를 로그에 찍고
  (2) 401이면 남은 시도를 태우지 않고 즉시 중단하도록 고쳤다.

## 실행 기록

| 날짜 | 결과 | 섹션 | 시도 | 비용($) | 턴 | 시간(ms) | 거부 | 파일 |
|---|---|---|---|---|---|---|---|---|
| 2026-08-10 | 성공 | mcp | 1/3 | 3.449 | 17 | 241060 | 1 | 2026-08-10-agent-sdk-orchestrator.md |
| 2026-08-10 | 성공 | jeongcheogi | 1/3 | 0.6580125 | 9 | 130965 | 2 | 2026-08-10-page-replacement.md |
| 2026-08-11 | 성공 | jeongcheogi | 1/3 | 0.41827070000000005 | 6 | 48690 | 0 | 2026-08-11-hash-digital-signature.md |
| 2026-08-12 | 성공 | security | 1/3 | 0.47455059999999993 | 7 | 79263 | 0 | 2026-08-12-mcp-tool-command-injection.md |
| 2026-08-13 | 성공 | mcp | 1/3 | 1.3181676 | 29 | 211970 | 6 | 2026-08-13-mcp-sampling.md |
| 2026-08-14 | 성공 | jeongcheogi | 1/3 | 0.6281705999999999 | 9 | 106328 | 1 | 2026-08-14-db-keys.md |
| 2026-08-15 | 성공 | security | 1/3 | 0.6916110999999999 | 8 | 155355 | 3 | 2026-08-15-mcp-tool-ssrf.md |
| 2026-08-15 | 성공 | security | 1/3 | 1.3674793 | 19 | 267137 | 6 | 2026-08-15-react2shell-rsc-rce.md |
| 2026-08-16 | 성공 | mcp | 1/3 | 0.4900865 | 9 | 62655 | 0 | 2026-08-16-mcp-tool-annotations.md |
| 2026-08-16 | 성공 | mcp-trend | 1/3 | 1.3253842 | 17 | 231296 | 6 | 2026-08-16-mcp-2026-07-28-stateless-spec.md |
| 2026-08-17 | 성공 | jeongcheogi | 1/3 | 0.8619245999999999 | 13 | 149223 | 1 | 2026-08-17-http-status-codes.md |
| 2026-08-18 | 성공 | security | 1/3 | 1.0312062000000002 | 12 | 127767 | 0 | 2026-08-18-ghostapproval-symlink-ai-coding-agents.md |
| 2026-08-19 | 성공 | mcp-trend | 1/3 | 1.3557382 | 20 | 219491 | 2 | 2026-08-19-mcp-apps-interactive-ui.md |
| 2026-08-20 | 성공 | mcp | 1/3 | 1.0297361999999999 | 16 | 201999 | 8 | 2026-08-20-mcp-elicitation-server-user-input.md |
| 2026-08-21 | 성공 | jeongcheogi | 1/3 | 0.6087494 | 8 | 103538 | 1 | 2026-08-21-relational-algebra.md |
| 2026-08-22 | 성공 | security | 1/3 | 1.0412578 | 19 | 273772 | 4 | 2026-08-22-libssh2-cve-2026-55200.md |
| 2026-08-23 | 성공 | mcp-trend | 1/3 | 0.649709 | 11 | 151063 | 1 | 2026-08-23-dns-aid-mcp-agent-discovery.md |
| 2026-08-24 | 성공 | mcp | 1/3 | 0.7999538 | 25 | 171395 | 4 | 2026-08-24-mcp-logging-capability.md |
| 2026-08-25 | 성공 | jeongcheogi | 1/3 | 0.45742140000000003 | 8 | 118076 | 2 | 2026-08-25-sorting-algorithms-comparison.md |
| 2026-08-26 | 성공 | security | 1/3 | 0.9420052000000002 | 22 | 249253 | 7 | 2026-08-26-entra-id-cve-2026-69836.md |
| 2026-08-27 | 성공 | mcp-trend | 1/3 | 0.7660992 | 19 | 145108 | 1 | 2026-08-27-claude-skills-api-ga.md |
| 2026-08-28 | 성공 | mcp | 1/3 | 0.478737 | 9 | 125463 | 4 | 2026-08-28-mcp-tool-structured-output.md |
| 2026-08-29 | 성공 | jeongcheogi | 1/3 | 0.4685164 | 8 | 121426 | 2 | 2026-08-29-binary-tree-traversal.md |
| 2026-08-30 | 성공 | security | 1/3 | 0.655626 | 15 | 161995 | 3 | 2026-08-30-chaindrop-npm-supply-chain-worm.md |
| 2026-08-31 | 성공 | mcp-trend | 1/3 | 0.7236319999999999 | 21 | 201925 | 6 | 2026-08-31-model-hardware-standard.md |
| 2026-09-01 | 성공 | boangisa | 1/3 | 0.35455760000000003 | 13 | 130485 | 4 | 2026-09-01-sql-injection.md |
| 2026-09-02 | 성공 | mcp | 1/3 | 0.6006558000000001 | 16 | 222026 | 4 | 2026-09-02-mcp-resource-vs-tool.md |
| 2026-09-03 | 성공 | jeongcheogi | 1/3 | 0.5181376 | 20 | 206055 | 9 | 2026-09-03-graph-traversal-bfs-dfs.md |
| 2026-09-04 | 성공 | security | 1/3 | 0.47942019999999996 | 14 | 90118 | 1 | 2026-09-04-jfrog-artifactory-auth-bypass-cve-2026-82329.md |
| 2026-09-05 | 성공 | mcp-trend | 1/3 | 0.6928356 | 20 | 168044 | 2 | 2026-09-05-agent-plugins-1-0.md |
| 2026-09-06 | 성공 | boangisa | 1/3 | 0.3213344 | 11 | 119250 | 3 | 2026-09-06-block-cipher-modes.md |
| 2026-09-07 | 성공 | mcp | 3/3 | 0.505789 | 14 | 157619 | 5 | 2026-09-07-mcp-prompts.md |
| 2026-09-08 | 성공 | jeongcheogi | 1/3 | 0.625788 | 19 | 175329 | 6 | 2026-09-08-process-synchronization.md |
| 2026-09-09 | 성공 | security | 1/3 | 0.6461198000000001 | 15 | 164761 | 1 | 2026-09-09-vscode-github-dev-oauth-token-theft.md |
| 2026-09-10 | 성공 | mcp-trend | 1/3 | 1.0181772000000002 | 24 | 263046 | 6 | 2026-09-10-superpowers-claude-code-skill-growth.md |
| 2026-09-11 | 성공 | boangisa | 1/3 | 0.5098474000000001 | 15 | 114129 | 2 | 2026-09-11-risk-management.md |
| 2026-09-12 | 성공 | mcp | 1/3 | 0.6681846000000001 | 23 | 170655 | 3 | 2026-09-12-mcp-completions-capability.md |
| 2026-09-13 | 성공 | jeongcheogi | 1/3 | 0.6280926 | 21 | 194522 | 9 | 2026-09-13-uml-diagrams.md |
| 2026-09-14 | 성공 | security | 2/3 | 0.7812552000000001 | 17 | 206246 | 3 | 2026-09-14-patch-tuesday-september-2026-zero-days.md |
| 2026-09-15 | 성공 | mcp-trend | 1/3 | 0.8491746 | 25 | 204093 | 7 | 2026-09-15-compose-hot-reload-mcp-agent.md |
| 2026-09-16 | 성공 | boangisa | 1/3 | 0.28147700000000003 | 10 | 79152 | 2 | 2026-09-16-rsa-diffie-hellman.md |
| 2026-09-17 | 실패 | mcp | 3/3 | 0 | 1 | 1923 | 0 | - |
| 2026-09-17 | 성공 | mcp | 1/3 | 0.9649152000000002 | 31 | 310569 | 6 | 2026-09-17-mcp-pagination-cursor.md |
| 2026-09-18 | 성공 | jeongcheogi | 1/3 | 0.4048608 | 13 | 98445 | 4 | 2026-09-18-db-normalization.md |
| 2026-09-19 | 성공 | security | 1/3 | 1.5327969999999997 | 34 | 445302 | 3 | 2026-09-19-chrome-v8-zero-day-cve-2026-87491.md |
| 2026-09-20 | 성공 | mcp-trend | 1/3 | 0.7892608000000001 | 15 | 282567 | 3 | 2026-09-20-paper2agent-research-paper-mcp-server.md |
| 2026-09-21 | 성공 | boangisa | 1/3 | 0.3370248 | 8 | 76992 | 2 | 2026-09-21-windows-auth-sam-lsa.md |
| 2026-09-22 | 성공 | mcp | 1/3 | 0.9486340000000001 | 31 | 228673 | 9 | 2026-09-22-mcp-roots-workspace-boundary.md |
