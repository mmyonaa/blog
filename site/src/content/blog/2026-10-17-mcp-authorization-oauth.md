---
title: "MCP 서버에 인증 붙이기 — 401 한 번에서 토큰까지 가는 길"
pubDate: 2026-10-17T01:54:03Z
section: "mcp"
tags: ["mcp", "oauth", "authorization", "resource-indicator", "scope"]
related: ["2026-08-16-mcp-2026-07-28-stateless-spec", "2026-07-15-mcp-transport-stdio-vs-http"]
description: "HTTP로 연 MCP 서버의 인증 흐름을, 401이 돌려주는 메타데이터 경로부터 resource 파라미터로 토큰에 수신인을 박는 이유, scope가 모자랄 때의 403 처리까지 정리한다."
---

stdio로 띄우는 MCP 서버는 인증을 따로 고민할 일이 적다. 프로세스를 띄우는 쪽이 이미 신뢰 관계 안에 있고 자격 증명은 환경변수로 넘기면 된다. 스펙도 stdio에서는 이 규격을 따르지 말라고(SHOULD NOT) 못 박는다. 문제는 HTTP로 서버를 열 때다. 아무나 호출할 수 있는 주소가 생기는 순간 요청을 누가 보냈는지 가려야 한다. MCP의 인증은 새 방식을 만들지 않고 OAuth 2.1의 부분집합을 골라 쓴다.

## 역할이 셋으로 나뉜다

- **MCP 서버**는 resource server다. 토큰을 받아 검증하고 자원을 내준다.
- **MCP 클라이언트**는 OAuth client다. 사용자를 대신해 토큰을 얻어 요청에 싣는다.
- **authorization server**는 토큰을 발급한다. MCP 서버와 같은 곳에 있어도 되고 분리돼 있어도 된다.

토큰 발급이 서버 몫이 아니라는 점이 중요하다. MCP 서버는 받은 토큰이 자기 것인지 판정만 한다.

## 401 한 번이 길잡이가 된다

클라이언트는 처음에 토큰 없이 그냥 요청한다. 서버는 401을 돌려주면서 어디로 가야 하는지를 헤더에 적어 준다.

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource",
                         scope="files:read"
```

`resource_metadata`를 따라가면 Protected Resource Metadata 문서가 나오고, 거기 이 서버가 쓰는 authorization server가 적혀 있다. 클라이언트는 그 주소에서 메타데이터를 다시 읽어 authorize·token 엔드포인트를 알아낸다. 사전 설정 없이 401 하나에서 전체 경로가 풀린다. `scope`는 지금 이 요청에 필요한 권한이고, 없으면 메타데이터의 `scopes_supported`를 쓴다.

## 토큰에 수신인을 적는다

클라이언트는 authorize 요청과 token 요청 양쪽에 `resource` 파라미터로 대상 서버의 정규 URI를 넣어야 한다.

```text
&resource=https%3A%2F%2Fmcp.example.com
```

이게 있어야 발급된 토큰에 어느 서버용인지가 박힌다. 서버 쪽에는 짝이 되는 의무가 걸린다. 자기가 수신인인 토큰만 받아들이고, 다른 토큰은 받지도 중계하지도 않아야 한다.

이 두 줄이 막는 것은 토큰 전달이다. A 서버가 받은 토큰을 그대로 B 서버에 끼워 쓰면, 사용자가 A에게만 준 권한이 B까지 흘러간다.

## 권한이 모자랄 때는 403

토큰은 유효한데 권한이 부족하면 401이 아니라 403이다.

| 코드 | 언제 |
| --- | --- |
| 401 | 토큰이 없거나 유효하지 않음 |
| 403 | 토큰은 유효하지만 scope 부족 |
| 400 | 요청 자체가 잘못됨 |

403일 때 서버는 `error="insufficient_scope"`와 함께 필요한 scope를 알려준다. 이때 필요한 권한은 한 번에 다 적어야 한다. 하나씩 흘리면 재인증이 여러 번 돌고 사용자는 동의 화면을 반복해 본다. 클라이언트도 새로 요청할 scope를 이전에 받은 것과 합집합으로 만들어야 한다. 챌린지에 적힌 것만 요청하면 기존 권한을 잃는다.
