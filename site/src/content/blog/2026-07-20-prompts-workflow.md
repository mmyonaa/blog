---
title: "MCP Prompt로 반복 워크플로 패키징하기"
pubDate: 2026-07-20T01:20:00Z
section: "mcp"
tags: ["mcp", "prompts", "typescript"]
area: "C"
follows: "2026-07-17-resources-context"
topicId: "prompts-workflow"
description: "MCP의 세 번째 primitive인 Prompt는 도구가 아니라 '재사용 가능한 대화 템플릿'이다. 매번 길게 풀어 쓰던 지시를 슬래시 명령 하나로 바꾸는 법을 실제 서버 코드로 정리한다."
---

MCP의 primitive는 셋이다. Tool은 LLM이 호출하는 함수, Resource는 LLM이 읽는 데이터, 그리고 **Prompt는 사용자가 고르는 대화 템플릿**이다. 앞의 둘은 자주 다뤄지지만 Prompt는 존재감이 옅다. 하지만 같은 지시를 매번 길게 타이핑하고 있다면, 그게 바로 Prompt로 묶을 자리다.

## Prompt는 누가 부르나

Tool과 Prompt의 결정적 차이는 **호출 주체**다. Tool은 모델이 필요하다고 판단해 스스로 부른다. Prompt는 반대로 사람이 명시적으로 고른다. Claude Code에서 `/mcp__server__name` 형태의 슬래시 명령으로 뜨는 것이 바로 서버가 노출한 Prompt다.

즉 Prompt는 "자주 쓰는 지시문에 이름을 붙여 버튼으로 만든 것"에 가깝다. 코드 리뷰 요청, 커밋 메시지 생성, 릴리스 노트 초안처럼 매번 형식이 똑같은 작업을 인자 몇 개만 채워 재사용한다.

## 서버에 Prompt 등록하기

TypeScript SDK에서는 `registerPrompt`로 등록한다. 인자 스키마를 zod로 선언하고, 그 인자로 실제 대화 메시지를 만들어 돌려주는 구조다.

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const server = new McpServer({ name: "review", version: "1.0.0" });

server.registerPrompt(
  "code-review",
  {
    title: "코드 리뷰 요청",
    description: "주어진 diff를 정해진 기준으로 리뷰한다",
    argsSchema: { diff: z.string(), focus: z.string().optional() },
  },
  ({ diff, focus }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `다음 diff를 리뷰하라.\n` +
            `- 버그와 엣지 케이스 우선\n` +
            `- ${focus ?? "가독성"} 관점도 함께\n\n` +
            "```diff\n" + diff + "\n```",
        },
      },
    ],
  })
);
```

핵심은 반환값이 **완성된 대화**라는 점이다. Prompt 함수는 아무 작업도 실행하지 않는다. 인자를 받아 `messages` 배열을 조립해 돌려줄 뿐이고, 그 메시지가 사용자의 입력인 것처럼 대화에 얹힌다.

## Tool과 섞어 쓰기

Prompt 하나가 여러 Tool 호출을 유도하도록 설계할 수도 있다. 예를 들어 "이 브랜치를 릴리스하라"는 Prompt의 메시지 본문에 "먼저 `run_tests` 도구로 검증하고, 통과하면 `create_tag`를 호출하라"고 적어두면, 사람은 Prompt 하나만 고르고 모델이 그 지시에 따라 Tool들을 순서대로 부른다. Prompt가 워크플로의 시나리오를, Tool이 실제 손발을 맡는 역할 분담이다.

## 정리

Prompt는 로직이 아니라 **입력의 재사용**을 다루는 primitive다. 반복되는 지시문을 서버에 이름 붙여 저장해두면, 사용자는 매번 풀어 쓰는 대신 슬래시 명령 하나로 같은 품질의 요청을 재현한다. 자주 치는 프롬프트가 있다면 그걸 먼저 Prompt로 옮겨보는 게 좋은 출발점이다.
