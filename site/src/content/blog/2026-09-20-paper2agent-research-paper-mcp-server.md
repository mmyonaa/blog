---
title: "Paper2Agent — 연구 논문을 재현 가능한 MCP 서버로 바꾸는 법"
pubDate: 2026-09-20T09:57:50Z
section: "mcp"
tags: ["mcp", "paper2agent", "claude code", "agent-skills", "stanford"]
area: "T"
description: "스탠퍼드 연구팀이 Nature에 발표한 Paper2Agent가 논문과 코드 저장소를 검증된 MCP 서버로 자동 변환하는 과정을, GitHub 저장소와 보도를 교차검증해 정리한다. 검증 방식, 에이전트 간 협업 사례, 그리고 이 패턴을 개발자가 자신의 프로젝트에 적용할 때 무엇을 챙겨야 하는지도 짚는다."
generated: "research-synthesis"
sources:
  - url: "https://github.com/jmiao24/Paper2Agent"
    title: "Paper2Agent: Reimagining Papers As AI Agents"
  - url: "https://www.marktechpost.com/2026/09/16/stanford-researchers-release-paper2agent-turning-research-papers-into-ai-agents-that-reproduce-results-and-run-on-new-data"
    title: "Stanford Researchers Release Paper2Agent"
  - url: "https://med.stanford.edu/news/all-news/2026/09/ai-agents-talk.html"
    title: "Manuscripts-turned AI agents can now 'talk' to each other, make new discoveries"
---

## 논문 한 편이 서버가 되는 방식

2026년 9월 16일 Nature에 게재된 Paper2Agent는 스탠퍼드 의과대학의 Jiacheng Miao와 James Zou 연구팀이 만든 시스템이다. 문제의식은 단순하다. 계산과학 논문은 코드와 함께 배포되지만, 그 코드를 실제로 돌려보려면 독자가 저장소를 내려받고 환경을 맞추고 디버깅까지 해야 한다는 장벽이 늘 있었다. Paper2Agent는 이 과정을 자동화해 논문과 코드 저장소를 통째로 하나의 Model Context Protocol(MCP) 서버로 바꾼다. Claude Code 같은 MCP 호환 에이전트가 이 서버에 붙으면, 자연어로 논문의 분석 방법을 그대로 실행할 수 있다.

GitHub 저장소(jmiao24/Paper2Agent)를 확인하면, 이 시스템은 하나의 조정자(orchestrator)가 여러 전문 서브에이전트를 순차적으로 부리는 구조다. MarkTechPost가 정리한 여섯 단계에 따르면 코드 저장소를 찾아 내려받고, 격리된 실행 환경을 만들고, 쓸 만한 튜토리얼을 찾아 실제로 끝까지 실행해 본 뒤, 그 결과를 검증된 MCP 도구로 바꾸고, 마지막에 하나의 MCP 서버로 조립한다. 완성된 서버는 MCP의 세 요소를 모두 쓴다 — 논문의 방법론을 실행 함수로 감싼 tools, 원문·데이터·그림을 담은 resources, 여러 단계로 이어지는 표준 분석 절차(예: Scanpy 전처리 순서)를 인코딩한 prompts다.

## 검증은 사람이 아니라 재현으로 한다

이 시스템이 "논문 요약 챗봇"과 다른 지점은 검증 방식이다. MarkTechPost 보도에 따르면 Paper2Agent는 튜토리얼을 실제로 끝까지 실행해 원본 결과를 기록한 뒤, 도구로 변환한 코드가 그 결과를 오차 3% 이내로, 그림은 지각적 해시 기준으로 근접하게 재현하는지 검사한다. 검증을 통과하지 못하는 함수는 최대 6번까지 재시도되고, 그래도 실패하면 최종 서버에서 제외된다. 배포되는 도구는 최소한 한 번은 원 논문의 수치를 스스로 재현한 것들만 남는 셈이다.

같은 보도에 따르면 유전체 해석 모델 AlphaGenome을 22개 도구로 변환하는 데 걸린 시간은 약 45분, 비용은 14달러였다. 100건의 bioRxiv 계산생물학 논문에 같은 파이프라인을 적용했을 때는 74건이 에이전트화됐고, 제안된 도구 599개 중 593개가 검증을 통과했다는 수치도 나왔다. 다만 이 구체적인 숫자들은 지금까지 MarkTechPost 보도로만 확인되며, 다른 출처에서 같은 수치를 직접 대조하지는 못했다.

## 표로 보는 비교, 그리고 에이전트끼리의 협업

| 구분 | Paper2Agent | Claude + 저장소 | Biomni |
|---|---|---|---|
| 튜토리얼 기반 질의 | 98.7% | 82.7% | 37.3% |
| 새로운 질의 | 100% | 78.7% | 56.0% |
| 개방형 질의 | 82.7% | 56.7% | 72.2% |

(MarkTechPost가 보도한 수치이며, 다른 매체와 교차확인되지는 않았다)

Paper2Agent로 만든 에이전트끼리 서로 대화하게 만든 실험은 두 출처가 함께 언급한다. Stanford Medicine 뉴스와 MarkTechPost 모두, 유전체 변이 예측 모델 AlphaGenome 에이전트와 ADHD 유전체 연관 연구(GWAS) 에이전트를 연결했더니 새로운 후보가 드러났다고 전한다. 다만 세부 서술은 다르다. Stanford Medicine은 MPHOSPH9 유전자 인근 변이를 짚었다고 설명하고, MarkTechPost는 rs1626703이라는 변이를 209개 후보 중에서 골라냈다고 전한다. 같은 결과를 다른 해상도로 설명했을 가능성이 높지만, 두 보도 어느 쪽도 이 둘을 명시적으로 연결하지는 않는다.

성능 좋은 사례만 있는 것은 아니다. MarkTechPost에 따르면 AlphaGenome 에이전트가 LDL 콜레스테롤 관련 변이(chr1:109274968:G>T)를 재검토했을 때는 SORT1을 원인 유전자로 지목했는데, 원래 논문은 CELSR2와 PSRC1을 강조했다. 연구팀은 이 사례를 원인 유전자를 특정하는 일이 그 자체로 얼마나 어려운지 보여주는 예로 정리했다고 한다.

## 저장소가 말해주는 것: CLI에서 Skill로

GitHub 커밋 기록을 직접 보면 흥미로운 지점이 있다. Nature 게재 당일인 9월 16일, 저장소에는 "CLI 파이프라인을 병렬 스페셜리스트와 독립 검증, MCP ZIP 배포를 갖춘 자기완결형 Skill로 교체한다"는 커밋이 올라왔고, 예전 파이프라인은 legacy-cli 태그로 남겨졌다. 즉 Paper2Agent는 명령줄 도구에서 Claude Code나 Codex에 설치하는 "스킬" 형태로 배포 방식을 바꿨다. MCP가 도구 연결 표준을 맡고 Skill이 그 도구를 언제 어떻게 쓸지의 절차를 맡는 분업 구도가 여기서도 반복된다.

## 개발자에게 남는 것

Paper2Agent 자체를 오늘 당장 쓸 일은 많지 않을 수 있다. 하지만 이 패턴은 재사용할 만하다. 자신의 프로젝트에도 "재현 가능한 튜토리얼을 실행 함수로 변환하고, 그 결과를 자동으로 검증한다"는 삼단계를 적용하면, 문서를 읽고 손으로 따라 하던 온보딩 과정을 MCP 서버 하나로 압축할 수 있다. 다만 이 사례가 함께 보여주듯 검증 기준(오차 허용치, 재시도 횟수, 실패 시 배제 여부)을 명시적으로 정의하지 않으면, 에이전트가 그럴듯하지만 틀린 결과를 자신 있게 내놓을 위험은 그대로 남는다. 자동화가 검증을 대체하는 것이 아니라, 검증을 자동화하는 것이라는 구분이 이 사례의 핵심이다.
