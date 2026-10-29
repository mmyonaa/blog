---
title: "SQL 조인 — 내부·외부·교차 조인 구분하기"
pubDate: 2026-10-28T11:27:37Z
section: "jeongcheogi"
tags: ["정보처리기사", "데이터베이스", "sql", "조인", "외부 조인"]
area: "DB"
topicId: "sql-join-types"
follows: "2026-08-18-sql-ddl-dml-dcl"
description: "내부 조인, 외부 조인(LEFT·RIGHT·FULL), 교차 조인, 자연 조인의 정의와 결과 차이를 예제로 정리하고 시험 포인트를 짚는다."
---

## 조인이란

조인(JOIN)은 둘 이상의 테이블을 공통 컬럼의 값으로 연결해 하나의 결과 집합으로 만드는 연산이다. 관계대수의 조인 연산에 대응하며, 정규화로 쪼개진 테이블을 다시 합쳐 조회할 때 쓴다. 핵심은 "조건에 맞지 않는 행을 어떻게 처리하느냐"에 따라 종류가 갈린다는 점이다.

## 예제 테이블

```text
EMP(emp_id, name, dept_id)        DEPT(dept_id, dept_name)
1, 김, 10                         10, 개발
2, 이, 20                         20, 영업
3, 박, NULL                       30, 인사
```

박은 소속이 없고, 인사 부서(30)에는 사원이 없다. 이 두 행이 조인 종류별로 어떻게 다뤄지는지가 구분의 기준이다.

## 내부 조인 (INNER JOIN)

조인 조건을 만족하는 행만 결과에 포함한다. 양쪽에 짝이 없는 행은 사라진다.

```sql
SELECT e.name, d.dept_name
FROM EMP e
INNER JOIN DEPT d ON e.dept_id = d.dept_id;
```

결과는 (김, 개발), (이, 영업) 두 행이다. 박과 인사 부서는 제외된다.

## 외부 조인 (OUTER JOIN)

짝이 없는 행도 살려서 남기는 조인이다. 짝이 없는 쪽의 컬럼은 NULL로 채워진다.

| 종류 | 보존하는 쪽 | 예제 결과에 추가되는 행 |
|---|---|---|
| LEFT OUTER JOIN | 왼쪽 테이블 전체 | (박, NULL) |
| RIGHT OUTER JOIN | 오른쪽 테이블 전체 | (NULL, 인사) |
| FULL OUTER JOIN | 양쪽 전체 | 위 두 행 모두 |

```sql
SELECT e.name, d.dept_name
FROM EMP e
LEFT OUTER JOIN DEPT d ON e.dept_id = d.dept_id;
```

`OUTER` 키워드는 생략할 수 있어 `LEFT JOIN`만 써도 같은 의미다. FULL OUTER JOIN은 DBMS에 따라 지원하지 않을 수 있다(예: MySQL은 직접 지원하지 않아 LEFT와 RIGHT 결과를 UNION으로 합쳐 흉내 낸다).

## 교차 조인 (CROSS JOIN)

조인 조건 없이 두 테이블의 모든 행 조합을 만든다. 카티션 곱(Cartesian product)과 같다. 행이 각각 3개, 3개면 결과는 9행이다.

```sql
SELECT e.name, d.dept_name
FROM EMP e
CROSS JOIN DEPT d;
```

의도하지 않은 교차 조인은 보통 조인 조건을 빠뜨렸을 때 생기며, 결과가 폭발적으로 커진다.

## 자연 조인과 셀프 조인

- 자연 조인(NATURAL JOIN): 이름이 같은 컬럼을 자동으로 조건으로 삼고, 결과에서 중복 컬럼을 하나만 남긴다. 컬럼명이 바뀌면 결과가 조용히 달라지므로 실무에서는 조심해서 쓴다.
- 셀프 조인: 같은 테이블을 별칭으로 두 번 써서 자기 자신과 조인한다. 사원과 그 상급자를 한 행에 보여 줄 때 쓴다.

## 시험에 자주 나오는 포인트

- 내부 조인은 짝이 없는 행이 버려지고, 외부 조인은 보존된다. 결과 행 수를 묻는 문제가 자주 나온다.
- LEFT/RIGHT는 "FROM 절에서 먼저 쓴 쪽이 왼쪽"이라는 위치 기준이다. 테이블 순서를 바꾸면 LEFT와 RIGHT가 서로 바뀐다.
- 교차 조인의 결과 행 수는 두 테이블 행 수의 곱이다.
- 외부 조인에서 보존 대상이 아닌 쪽 컬럼에 WHERE 조건을 걸면 NULL 행이 걸러져 사실상 내부 조인이 된다. 조건은 ON 절에 두는지 WHERE 절에 두는지에 따라 결과가 달라진다.
- 등가 조인(=)은 동등 비교를 쓰는 조인이고, 비등가 조인은 `>`, `BETWEEN` 같은 다른 연산자를 쓴다.
