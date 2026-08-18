---
title: "SQL 명령어 분류 — DDL·DML·DCL"
pubDate: 2026-08-18T05:21:35Z
section: "jeongcheogi"
tags: ["정처기", "데이터베이스", "sql", "ddl", "dml"]
related: ["2026-08-14-db-keys", "2026-07-18-transaction-acid"]
description: "SQL 문장은 구조를 만지면 DDL, 데이터를 만지면 DML, 권한을 만지면 DCL로 나뉜다. CREATE·ALTER·DROP·TRUNCATE와 SELECT·INSERT·UPDATE·DELETE, GRANT·REVOKE의 소속을 예제로 구분하고, DELETE vs TRUNCATE vs DROP, TCL 분류 문제 등 정처기 필기 단골 함정을 정리한다."
---

SQL 문장은 무엇을 조작하느냐에 따라 DDL·DML·DCL 세 갈래로 나뉜다. 정처기 필기에서는 "다음 중 DDL이 아닌 것은?" 같은 분류 문제와, TRUNCATE·GRANT처럼 소속이 헷갈리는 명령을 묻는 문제가 단골이다. 기준은 하나다 — 구조(스키마)를 만지면 DDL, 데이터(행)를 만지면 DML, 권한을 만지면 DCL.

## DDL (Data Definition Language) — 구조 정의

테이블·인덱스·뷰 같은 객체의 구조를 정의하고 변경하고 삭제한다.

- CREATE(객체 생성), ALTER(구조 변경), DROP(객체 삭제), TRUNCATE(전체 행 삭제)
- 실행 즉시 반영되며(자동 커밋), ROLLBACK으로 되돌릴 수 없다.

## DML (Data Manipulation Language) — 데이터 조작

행 단위 데이터를 검색하고 넣고 바꾸고 지운다.

- SELECT(검색), INSERT(삽입), UPDATE(수정), DELETE(삭제)
- 트랜잭션의 대상이라 COMMIT 전에는 ROLLBACK으로 되돌릴 수 있다.
- SELECT를 검색 전용 DQL로 따로 분류하는 교재도 있지만, 보기에 별도 분류가 없으면 DML로 답한다.

## DCL (Data Control Language) — 권한 제어

사용자에게 객체 접근 권한을 주고 회수한다.

- GRANT(권한 부여), REVOKE(권한 회수)
- COMMIT·ROLLBACK·SAVEPOINT는 트랜잭션 제어어(TCL)로 따로 묶는 분류가 일반적이지만, 교재에 따라 DCL에 포함시키기도 한다. 보기에 TCL이 있으면 TCL을, 없으면 DCL을 고른다.

## 예시로 구분하기

```sql
ALTER TABLE student ADD email VARCHAR(50);        -- DDL: 구조 변경
UPDATE student SET name = '김철수' WHERE id = 1;   -- DML: 값 변경
GRANT SELECT ON student TO hong;                  -- DCL: 권한 부여
```

ALTER와 UPDATE는 둘 다 "변경"이지만 대상이 다르다. 열을 추가하거나 타입을 바꾸는 것은 구조 변경(DDL), 행에 든 값을 바꾸는 것은 데이터 변경(DML)이다.

## 시험에 자주 나오는 포인트

- DELETE vs TRUNCATE vs DROP: DELETE는 WHERE로 골라 지우는 DML이라 롤백이 되고, TRUNCATE는 구조만 남기고 전체 행을 즉시 지우는 DDL이라 롤백이 안 되며, DROP은 테이블 자체를 없앤다. "TRUNCATE는 DML이다"라는 진술은 틀린 보기다.
- GRANT와 REVOKE의 방향: 주는 것이 GRANT, 뺏는 것이 REVOKE. 둘을 바꿔 서술한 보기가 나온다.
- ALTER(DDL)와 UPDATE(DML)를 "변경"이라는 말로 묶어 헷갈리게 하는 문제 — 구조냐 값이냐로 가른다.
- 각 분류의 영문 풀네임(Definition·Manipulation·Control)을 묻는 문제도 있다. 이름 자체가 기준을 말해 준다.
