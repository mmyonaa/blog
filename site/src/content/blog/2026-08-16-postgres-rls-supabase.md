---
title: "RLS(Row Level Security) — 테이블이 아니라 행에 거는 권한"
pubDate: 2026-08-16T08:40:13Z
section: "web"
tags: ["rls", "supabase", "postgresql", "security-definer"]
description: "RLS는 PostgreSQL이 행 단위로 접근을 제어하는 장치다. GRANT와 무엇이 다른지, 정책이 조건식으로 동작하는 방식, 그리고 \"정책 없는 RLS\"가 테이블 전체를 잠그는 자물쇠가 되는 원리까지 — 브라우저가 DB를 직접 호출하는 Supabase에서 RLS가 유일한 방어선인 이유를 이 블로그의 조회수 구현으로 정리한다."
---

데이터베이스 권한이라 하면 보통 GRANT를 떠올린다. "이 유저는 이 테이블을 읽을 수 있다"는 식으로, 권한의 단위가 테이블 통째다. RLS(Row Level Security)는 PostgreSQL이 제공하는 한 단계 더 세밀한 장치로, 같은 테이블 안에서도 **어떤 행에 접근할 수 있는지**를 조건식으로 제어한다.

## 정책 — 행마다 평가되는 조건식

RLS를 켠 테이블에는 정책(policy)을 붙일 수 있다. 예를 들어 "자기가 쓴 글만 보인다"는 규칙은 이렇게 된다.

```sql
alter table posts enable row level security;

create policy "own rows only" on posts
  for select using (author_id = auth.uid());
```

이 정책이 있으면 같은 `select * from posts`를 실행해도 유저마다 다른 결과를 받는다. 각 행에 대해 `using` 절의 조건식이 평가되고, 참인 행만 결과에 포함되기 때문이다. 핵심은 이 필터가 애플리케이션 코드가 아니라 **DB 엔진 안에서 강제**된다는 점이다. 앱에 버그가 있어도, 누가 SQL을 직접 날려도 정책은 우회되지 않는다.

## 정책 없는 RLS — 전부 잠긴다

RLS의 기본 동작에는 눈여겨볼 성질이 있다. RLS를 켜는 순간 접근 방식이 "정책에 허용된 행만 가능"으로 바뀌는데, 정책이 하나도 없으면 허용된 행도 0개다. 즉 **RLS만 켜고 정책을 만들지 않으면 테이블 전체가 잠긴다.**

```sql
create table post_views (
  slug  text primary key,
  count bigint not null default 0
);
alter table post_views enable row level security;
-- 정책을 만들지 않는다 → 외부에서 조회·수정·삭제 전부 불가
```

이때 바깥에서 `select`를 날리면 에러가 아니라 빈 결과가 돌아온다. "권한 없음"으로 거절되는 게 아니라 "보이는 행이 0개"인 것이다. 이 성질을 역으로 이용하면 RLS는 세밀한 필터가 아니라 **자물쇠**로 쓸 수 있다.

## 잠긴 표를 여는 좁은 문 — security definer

전부 잠갔다면 쓰기는 어떻게 하나. PostgreSQL 함수에 `security definer`를 붙이면 그 함수는 호출자가 아니라 **함수를 만든 소유자의 권한으로 실행**된다. 잠긴 표에 접근할 수 있지만, 할 수 있는 일은 함수 본문에 적힌 것뿐이다.

```sql
create function increment_view(post_slug text)
returns bigint language plpgsql security definer as $$
declare v bigint;
begin
  insert into post_views (slug, count) values (post_slug, 1)
  on conflict (slug) do update set count = post_views.count + 1
  returning count into v;
  return v;
end $$;

grant execute on function increment_view(text) to anon;
```

익명 역할(anon)에게는 테이블 권한 없이 이 함수의 실행 권한만 준다. 그러면 외부에서 가능한 일은 "해당 slug의 조회수를 1 올리는 것"으로 고정된다. 임의 값 조작, 다른 행 열람, 삭제는 어떤 방법으로도 불가능하다. 잠긴 표 + 좁게 열린 함수 — 이 조합이 권한 설계의 골격이 된다.

## Supabase에서 RLS가 유일한 방어선인 이유

이 설계가 특히 중요해지는 곳이 Supabase다. Supabase는 서버 코드 없이 **브라우저가 DB의 REST API를 직접 호출**하는 구조라, 전통적인 웹 서비스에서 "서버가 중간에서 요청을 검사하고 막아주는" 층이 없다. 접속용 anon 키는 자바스크립트 번들에 그대로 노출되고, 그 키로 무엇이 가능한지를 정하는 것은 오직 DB 자신 — 즉 RLS와 GRANT뿐이다.

이 블로그의 조회수 기능이 정확히 위 코드다. 조회수 표는 정책 없는 RLS로 잠그고, anon에게는 "1 올리기"와 "읽기" 함수만 열었다. 그래서 anon 키가 공개 저장소와 번들에 그대로 노출되어 있어도 무해하다 — 키를 가져가 봤자 할 수 있는 최대치가 조회수를 반복해서 올리는 것이다.

거꾸로 말하면, RLS 없이 만든 테이블은 anon 키를 가진 전 세계 누구나 읽고 쓸 수 있는 상태가 된다. Supabase를 쓰는 프로젝트에서 가장 흔한 사고 유형이 바로 RLS를 빠뜨린 테이블이고, 그래서 운영 수칙은 한 줄로 요약된다 — **테이블을 새로 만들면 무조건 RLS부터 켠다.** 열어줄 것은 그다음에, 정책이나 함수로 필요한 만큼만 연다.
