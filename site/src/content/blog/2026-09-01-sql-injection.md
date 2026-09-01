---
title: "SQL 인젝션 — 원리와 근본 방어"
pubDate: 2026-09-01T10:17:03Z
section: "boangisa"
tags: ["정보보안기사", "애플리케이션보안", "sql인젝션", "prepared-statement"]
area: "APPSEC"
topicId: "sql-injection"
description: "SQL 인젝션이 왜 여전히 OWASP Top 10 단골인지, 로그인 우회 예시로 원리를 짚고 In-band·Blind·Out-of-band 기법 분류와 Prepared Statement가 왜 근본 방어인지 정보보안기사 필기 관점으로 정리한다."
---

SQL 인젝션은 사용자 입력이 SQL 쿼리 문자열에 그대로 이어붙여질 때, 입력값을 데이터가 아니라 쿼리의 일부로 해석시켜 애플리케이션의 의도와 다른 동작을 끌어내는 공격이다. OWASP Top 10에 매번 상위권으로 오르는 이유는 단순하다. 원인이 되는 패턴(문자열 결합으로 쿼리 생성)이 여전히 흔하고, 성공하면 인증 우회부터 데이터베이스 전체 덤프까지 파급 범위가 크기 때문이다.

## 원리

다음과 같은 로그인 쿼리를 생각해보자.

```
SELECT * FROM users WHERE id = '입력값' AND pw = '입력값2';
```

아이디 입력란에 admin' -- 를 넣으면 쿼리는 다음처럼 바뀐다.

```
SELECT * FROM users WHERE id = 'admin' -- ' AND pw = '아무값';
```

-- 뒤는 주석 처리되어 비밀번호 검사 자체가 사라진다. 핵심은 애플리케이션이 "이 문자열은 데이터"라고 생각한 부분을, 데이터베이스는 "이 문자열은 코드"로 해석한다는 불일치다.

## 공격 기법 분류

- In-band: 공격자가 응답 화면에서 직접 결과를 확인한다. UNION SELECT로 다른 테이블 값을 결과에 끼워 넣는 Union 기반, 에러 메시지에 데이터를 흘리는 오류 기반이 있다.
- Blind: 화면에 결과가 안 보일 때 참/거짓 조건으로 한 비트씩 정보를 알아낸다. 조건에 따라 페이지 내용이 달라지는지 보는 Boolean 기반, 조건에 따라 응답 지연을 넣어 시간 차로 판별하는 Time 기반(예: AND IF(1=1, SLEEP(5), 0))으로 나뉜다.
- Out-of-band: DB 서버가 DNS나 HTTP 요청 같은 별도 채널로 데이터를 공격자에게 보내게 만드는 방식이다. 다른 두 방식이 막혀 있을 때 쓰인다.

## 근본 방어: Prepared Statement

가장 확실한 방어는 쿼리 구조와 데이터를 애초에 분리하는 것이다. Prepared Statement(매개변수화 쿼리)는 쿼리 틀을 먼저 DB에 전달해 컴파일하고, 값은 나중에 파라미터로만 바인딩한다. 파라미터는 절대 쿼리 문법으로 해석되지 않는다.

```python
# 취약: 문자열 결합
cursor.execute("SELECT * FROM users WHERE id = '" + user_id + "'")

# 안전: 파라미터 바인딩
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

입력값 이스케이핑이나 특수문자 필터링도 보조 수단으로 쓰이지만, 인코딩 우회나 필터 누락 사례가 꾸준히 나오므로 근본 대책은 아니다. 여기에 DB 계정에 최소 권한만 부여하고, 에러 메시지에 쿼리나 스택 트레이스를 노출하지 않는 조치를 더한다. WAF의 패턴 기반 차단은 우회 기법이 계속 나오는 만큼 보조 계층으로만 취급한다.

## 시험에 자주 나오는 포인트

- Prepared Statement와 Stored Procedure는 둘 다 방어에 도움이 되지만, Stored Procedure 안에서도 동적 SQL을 문자열 결합으로 짜면 여전히 취약하다. "저장 프로시저 = 안전"이 아니라 "파라미터 바인딩 = 안전"이 핵심이다.
- Blind SQL Injection에서 Boolean 기반과 Time 기반의 구분: 화면 차이로 판별하면 Boolean, 응답 시간 차이로 판별하면 Time이다.
- 입력값 검증(화이트리스트, 타입 검사)은 방어 계층 중 하나로 언급되지만 단독 대책으로는 부족하다는 점이 자주 출제된다.
- UNION 기반 공격이 성립하려면 원래 쿼리와 UNION으로 붙이는 쿼리의 컬럼 수와 데이터 타입이 맞아야 한다는 조건도 종종 다뤄진다.
