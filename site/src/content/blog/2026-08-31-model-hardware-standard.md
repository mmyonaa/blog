---
title: "에이전트가 로봇팔을 쥔다 — Anthropic Model Hardware Standard 뜯어보기"
pubDate: 2026-08-31T11:33:19Z
section: "mcp"
tags: ["mcp", "model-hardware-standard", "anthropic", "robotics"]
area: "T"
description: "Anthropic이 2026년 8월 27일 공개한 Model Hardware Standard(MHS)는 AI 에이전트가 현미경·로봇팔 같은 물리 장비를 발견·조작·복구하게 하는 공유 규격이다. MCP·CLI·코드 파일 세 제어 경로가 어떻게 나뉘는지, Genentech·QuEra 등 초기 파트너 사례, 그리고 리서치 프리뷰 단계의 한계까지 1차 발표문과 교차검증해 정리한다."
generated: "research-synthesis"
sources:
  - url: "https://www.anthropic.com/news/model-hardware-standard-research-preview"
    title: "Previewing the Model Hardware Standard"
  - url: "https://arstechnica.com/ai/2026/08/anthropics-new-hardware-standard-lets-ai-agents-control-the-physical-world"
    title: "Anthropic's new hardware standard lets AI agents control the physical world"
  - url: "https://www.cnbc.com/2026/08/27/anthropic-pushes-into-physical-world-with-new-standard-to-help-ai-agents-operate-machines.html"
    title: "Anthropic pushes into physical world with new standard to help AI agents operate machines"
---

지금까지 AI 에이전트가 다루는 세계는 화면 안쪽이었다. 텍스트를 읽고, 코드를 고치고, API를 호출하는 데까지가 한계였다. Anthropic이 2026년 8월 27일 공개한 Model Hardware Standard(MHS)는 그 경계를 물리 장비 쪽으로 밀어낸다. 현미경, 로봇팔, 액체 핸들러처럼 프로그래밍 인터페이스가 있는 장비라면 에이전트가 직접 발견하고, 조작하고, 오류를 복구하게 하는 공유 규격이다.

## 문제는 배관이다

실험실이나 제조 현장의 장비는 대부분 제조사마다 다른 인터페이스를 쓴다. 두 장비를 붙이려면 그때마다 전문가가 번역 프로그램을 새로 짜야 했고, Anthropic에 따르면 이 통합 작업에는 보통 몇 주에서 몇 달이 걸렸다. MHS는 이 과정을 표준화된 드라이버 하나로 압축한다. 드라이버는 "온도를 읽어라", "온도를 30도로 맞춰라" 같은 read·write 명령 두 종류만으로 어떤 장비든 다루게 하고, 로봇팔의 무게처럼 코드만 봐서는 알 수 없는 물리적 제약은 자연어 태그로 적어 두면 자동으로 참조 파일로 정리된다.

## MCP를 대체하지 않고 얹는다

MHS 자체는 모델과 무관하다. Anthropic 공식 발표에 따르면 에이전트가 이 드라이버를 실제로 제어하는 경로는 MCP, 커맨드라인, 코드 파일(API) 세 가지이며, 이 셋이 함께 여러 장비를 한 줄의 명령으로 오케스트레이션한다. MCP는 그중 자연어로 대화하며 실시간으로 판단해야 하는 구간을 맡는다. 반대로 반복되는 절차는 에이전트가 한 번 탐색해 보고 결정론적인 스크립트로 코드 파일에 굳혀, 매번 추론하지 않고 그대로 실행한다. Ars Technica는 Anthropic이 레이저를 조정하고 카메라로 결과를 확인한 뒤 다시 조정하는 과정을 반복하다가, 그 절차를 스크립트 하나로 굳히는 사례를 공개 영상에서 보여줬다고 전했다.

## 초기 파트너들이 보여준 것

| 파트너 | 분야 | 무엇을 했나 |
|---|---|---|
| Genentech | 신약개발 | 액체 핸들러·로봇팔·플레이트 리더를 엮어 단백질 정량 검사 자동화 |
| Carnegie Mellon | 화학 | 용량-반응 곡선 실험을 기존보다 약 3배 빠르게 반복 |
| QuEra | 양자컴퓨팅 | 레이저 "락"을 사람 개입 없이 99.3% 복구하는 컨트롤러 개발 |
| HHMI Janelia | 신경과학 | 서로 다른 벤더 프로그램 7개로 나뉘어 있던 현미경 리그를 하나로 통합 |

AWS는 Strands Robots에, Hugging Face는 LeRobot에 MHS를 얹고 있고, Raspberry Pi·Universal Robots·Tecan 같은 하드웨어 업체도 자체 드라이버를 준비 중이다. CNBC와의 인터뷰에서 Anthropic의 Elizabeth Kelly는 MHS를 "USB-C 케이블"에 비유했다 — 어떤 장비든 꽂으면 통하는 공통 규격이라는 뜻이다.

## 아직은 리서치 프리뷰

지금은 과학·로보틱스·제조 분야 일부 파트너에게만 열린 리서치 프리뷰 단계이고, 오픈소스 공개 시점은 정해지지 않았다. Anthropic도 한계를 명시한다 — Claude는 텍스트와 이미지로 물리 세계를 배운 모델이라 공간·물리 추론에 한계가 있고, Genentech 사례에서는 샘플 거품을 소프트웨어 오류가 아니라 물리적 실패로 인식시키는 데 사람의 개입이 필요했다고 한다. 프로그래밍 인터페이스가 없는 구형 장비도 아직 지원 밖이다.

MCP가 에이전트와 소프트웨어 도구 사이의 공통 규격이었다면, MHS는 그 규격을 물리 장비까지 늘리려는 시도다. 다만 지금 단계에서 개발자가 할 수 있는 건 대기자 명단에 이름을 올리는 것과, 자신의 에이전트가 MCP·CLI·코드 파일이라는 세 경로를 어떻게 나눠 쓰는지 미리 눈여겨보는 정도다.
