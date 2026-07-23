---
title: "zod는 검증기가 아니라 파서다"
pubDate: 2026-07-18T15:04:01Z
section: "web"
tags: ["zod", "typescript", "validation"]
area: "B"
description: "zod를 '값이 맞는지 확인하는 도구'로만 쓰면 절반만 쓰는 것이다. coerce·transform·refine으로 입력을 원하는 모양으로 바꿔 내보내고, safeParse로 에러를 값처럼 다루고, 스키마를 조합해 재사용하는 법을 정리한다."
---

zod를 처음 쓰면 대개 이렇게 쓴다. 값을 받고, 맞는지 확인하고, 통과하면 원래 값을 계속 쓴다.

```ts
const schema = z.object({ count: z.number() });
schema.parse(input);       // 확인만 하고
doSomething(input);        // 원래 값을 쓴다
```

동작은 한다. 하지만 이건 zod를 **검증기(validator)** 로만 쓰는 것이고, 절반만 쓰는 것이다. zod의 함수 이름이 `validate`가 아니라 `parse`인 데는 이유가 있다. 검증은 "맞는지 묻는" 일이고, 파싱은 "믿을 수 없는 입력을 믿을 수 있는 값으로 **바꿔 내보내는**" 일이다.

## `parse`가 돌려주는 값을 써라

핵심 습관 하나로 요약된다. **`parse`의 반환값을 받아서 그걸 쓴다.** 입력 변수는 그 뒤로 다시 쳐다보지 않는다.

```ts
const parsed = schema.parse(input);   // ← 이 값을 쓴다
doSomething(parsed);
```

차이가 사소해 보이지만 타입이 달라진다. `input`은 보통 `unknown`이나 `any`인데 `parsed`는 스키마에서 추론된 정확한 타입이다. 그리고 무엇보다, 아래에서 볼 변환들이 적용된 값은 **오직 반환값에만** 담겨 있다. 입력 변수를 계속 쓰면 그 변환들이 전부 증발한다.

이 사고방식에는 "Parse, don't validate"라는 이름이 붙어 있다. 경계에서 한 번 파싱해 신뢰할 수 있는 타입으로 바꾸면, 그 안쪽 코드는 방어 코드를 쓸 필요가 없어진다.

## `coerce` — 들어오는 모양을 강제로 맞추기

경계에서 만나는 데이터는 거의 항상 문자열이다. URL 쿼리스트링, 환경변수, 폼 데이터, YAML 프론트매터. 여기에 `z.number()`를 들이대면 당연히 실패한다.

```ts
z.number().parse("42");           // ✗ 에러
z.coerce.number().parse("42");    // ✓ 42 (숫자)
z.coerce.date().parse("2026-07-19"); // ✓ Date 객체
```

`coerce`는 검증 전에 `Number()`, `Date()`, `String()` 같은 생성자를 한 번 통과시킨다. 덕분에 "문자열로 들어오지만 숫자로 다루고 싶은" 흔한 상황이 한 줄로 풀린다.

다만 강제 변환은 관대하다는 뜻이기도 하다. `z.coerce.number().parse("")`는 `0`이 되고 `parse(null)`도 `0`이 된다(`Number("")`가 `0`이니까). 사용자가 빈 칸을 남긴 것과 0을 적은 것을 구분해야 한다면 `coerce`는 위험하다. **입력 형식이 문자열로 고정된 경계에서만** 쓰고, 그 외에는 명시적으로 다루는 편이 안전하다.

## `transform` — 검증 다음에 모양 바꾸기

`transform`은 검증을 통과한 값을 원하는 형태로 가공한다. 파싱의 출력 타입 자체가 바뀐다.

```ts
const tagsSchema = z
  .string()
  .transform((s) => s.split(",").map((t) => t.trim()))
  .pipe(z.array(z.string().min(1)));

tagsSchema.parse(" astro, zod , mcp ");
// → ["astro", "zod", "mcp"]
```

입력 타입은 `string`인데 출력 타입은 `string[]`이다. `pipe`를 붙이면 변환 **결과**를 다시 검증할 수 있어서, 위 예시는 빈 태그가 섞이는 걸 막는다.

이게 왜 중요하냐면, 정규화를 스키마 안으로 밀어넣을 수 있기 때문이다. 문자열 trim, 소문자 변환, 기본값 채우기 같은 걸 비즈니스 로직 여기저기에 흩어놓는 대신 경계 한 곳에 모은다.

```ts
const emailSchema = z.string().trim().toLowerCase().email();
```

이렇게 두면 `parse`를 통과한 이메일은 이미 정규화되어 있다. 안쪽 코드가 `email.toLowerCase()`를 또 부를 필요가 없다.

## `refine` — 타입으로 표현 못 하는 규칙

타입 시스템이 잡아줄 수 없는 규칙은 `refine`으로 붙인다. "끝 날짜가 시작 날짜보다 뒤여야 한다" 같은 **필드 사이의 관계**가 대표적이다.

```ts
const rangeSchema = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })
  .refine((v) => v.start <= v.end, {
    message: "종료일은 시작일보다 앞설 수 없습니다",
    path: ["end"],
  });
```

`path`를 지정하는 게 요령이다. 이걸 빼면 에러가 객체 전체에 붙어서, 폼 UI에서 어느 입력칸에 빨간 줄을 그을지 알 수 없다.

`transform`과 `refine`은 순서가 중요하다. 둘 다 위에서 아래로 순서대로 적용되므로, 변환된 값에 규칙을 걸고 싶으면 `transform` **뒤에** `refine`을 놓아야 한다.

## `safeParse` — 에러를 예외 대신 값으로

`parse`는 실패하면 예외를 던진다. 서버 경계나 도구 핸들러처럼 "실패도 정상적인 결과 중 하나"인 곳에서는 `safeParse`가 낫다.

```ts
const result = schema.safeParse(input);

if (!result.success) {
  return { ok: false, errors: z.treeifyError(result.error) };
}

// 여기서부터 result.data는 완전히 타입이 좁혀져 있다
use(result.data);
```

`safeParse`는 `{ success: true, data }` 또는 `{ success: false, error }`를 돌려준다. try/catch 없이 분기할 수 있고, 판별 유니온이라 `success` 검사만으로 타입이 좁혀진다.

에러 객체는 실패한 모든 이슈를 담고 있다 — 첫 실패에서 멈추지 않는다. 폼 전체의 오류를 한 번에 보여줘야 할 때 유용하다. 필드별로 묶어 보려면 `z.treeifyError(error)`를, 사람이 읽을 한 줄이 필요하면 `z.prettifyError(error)`를 쓴다. (zod 3에서 쓰던 `error.format()` / `error.flatten()`은 zod 4에서 이 함수들로 대체됐다.)

## 스키마를 조합하기

스키마는 값이다. 그래서 조립할 수 있고, 이게 실전에서 가장 많이 쓰는 능력이다.

```ts
const basePost = z.object({
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

// 발행할 땐 날짜가 필수
const publishInput = basePost.extend({
  pubDate: z.coerce.date(),
});

// 수정할 땐 전부 선택
const patchInput = publishInput.partial();

// 목록에 뿌릴 땐 일부만
const listItem = publishInput.pick({ title: true, pubDate: true });
```

`extend` · `partial` · `pick` · `omit` · `merge`로 스키마 하나에서 여러 변종을 만들어낸다. 필드가 하나 추가되면 `basePost`만 고치면 파생된 것들이 전부 따라온다. 스키마를 복사·붙여넣기 하기 시작하면 그때부터 어긋나기 시작한다.

타입도 여기서 뽑아 쓴다. 인터페이스를 따로 손으로 쓰지 않는다.

```ts
type PublishInput = z.infer<typeof publishInput>;
```

`transform`이 있는 스키마라면 입력과 출력 타입이 다르다는 점을 기억하자. `z.input<typeof s>`와 `z.output<typeof s>`(= `z.infer`)로 각각 꺼낸다.

## `discriminatedUnion` — 여러 모양 중 하나

종류에 따라 필드가 달라지는 입력은 `discriminatedUnion`으로 다룬다.

```ts
const event = z.discriminatedUnion("type", [
  z.object({ type: z.literal("click"), x: z.number(), y: z.number() }),
  z.object({ type: z.literal("keypress"), key: z.string() }),
]);
```

그냥 `z.union`을 써도 되지만, 판별 필드를 알려주면 zod가 후보를 하나로 좁힌 뒤 검사한다. 그래서 더 빠르고, 무엇보다 **에러 메시지가 훨씬 쓸모 있다.** 일반 유니온은 "모든 후보에 실패했다"며 전부 나열하는 반면, 판별 유니온은 `type: "click"`인 걸 알고 "x가 없다"고 정확히 짚어준다.

## 정리

zod를 파서로 보기 시작하면 코드에서 방어 코드가 사라진다. 경계에서 `parse`를 한 번 통과시키고 **그 반환값만** 쓰면, 안쪽에서는 값의 모양을 다시 의심할 필요가 없다.

- 입력이 문자열로 고정된 경계에서는 `coerce`로 받는다.
- 정규화는 `transform`으로 스키마 안에 넣어 한 곳에 모은다.
- 필드 간 규칙은 `path`를 붙인 `refine`으로 표현한다.
- 실패가 정상 흐름인 곳은 `safeParse`로 값처럼 다룬다.
- 스키마는 복사하지 말고 `extend` · `pick` · `partial`로 파생시킨다.

검증만 하면 "이 값이 맞나?"를 계속 되묻게 되지만, 파싱을 하면 그 질문이 경계에서 한 번으로 끝난다.
