---
title: "정처기 실기 Java 코딩 문제 — 상속과 오버라이딩 출력의 함정"
pubDate: 2026-07-20T07:05:14Z
section: "jeongcheogi"
tags: ["정처기", "Java", "상속", "오버라이딩", "실기"]
description: "정처기 실기 Java 문제는 상속·오버라이딩·다형성으로 출력을 헷갈리게 만든다. 필드는 정적 바인딩, 메서드는 동적 바인딩이라는 한 가지 규칙과 super·생성자 호출 순서를 대표 코드로 추적한다."
---

정보처리기사 실기의 Java 코딩 문제는 문법을 짜라는 게 아니라 **다형성(polymorphism)의 동작을 아느냐**를 묻는다. 상속·오버라이딩·생성자 호출 순서를 섞어 "출력이 뭐냐"를 물으면, 규칙 하나만 알면 대부분 풀린다.

## 핵심 규칙 — 필드는 정적, 메서드는 동적

부모 타입 참조가 자식 객체를 가리킬 때(`A obj = new B();`), **필드**와 **메서드**의 접근 기준이 다르다.

- **필드**: 참조 변수의 **선언 타입**을 따른다(정적 바인딩).
- **메서드**: 실제로 생성된 **객체의 타입**을 따른다(동적 바인딩, 오버라이딩 적용).

이 한 문장이 Java 출력 문제의 90%다.

```java
class A {
    int x = 10;
    int get() { return x; }
}
class B extends A {
    int x = 20;
    int get() { return x; }
}
public class Main {
    public static void main(String[] args) {
        A obj = new B();
        System.out.println(obj.x);       // ①
        System.out.println(obj.get());   // ②
    }
}
```

- ① `obj.x` — 필드는 참조 타입 A 기준이라 **10**.
- ② `obj.get()` — 메서드는 실제 객체 B의 것이 호출되고, 그 안의 `x`는 B의 x라 **20**.

같은 `obj`인데 필드는 10, 메서드는 20이 나온다. 이 어긋남이 출제 포인트다.

## 오버라이딩 vs 오버로딩

- **오버라이딩(overriding)**: 부모 메서드를 자식이 **같은 시그니처로 재정의**. 실행 시점에 객체 기준으로 선택된다.
- **오버로딩(overloading)**: 같은 이름에 **매개변수가 다른** 메서드를 여러 개. 컴파일 시점에 인자로 선택된다.

시험은 "이건 오버라이딩인가 오버로딩인가"를 묻거나, 매개변수 타입만 살짝 바꿔 오버로딩으로 함정을 판다.

## 생성자 호출 순서 — super가 먼저

```java
class A {
    A() { System.out.println("A 생성자"); }
}
class B extends A {
    B() { System.out.println("B 생성자"); }
}
// new B() 실행 시 출력:
// A 생성자
// B 생성자
```

자식 생성자는 실행 첫 줄에 **암묵적으로 `super()`를 호출**한다. 그래서 부모 생성자가 먼저 끝나고 자식 생성자가 이어진다. 출력 순서를 물으면 "부모 → 자식"이 기본이다.

## super로 부모 멤버 부르기

```java
class A {
    void hello() { System.out.println("A"); }
}
class B extends A {
    void hello() {
        super.hello();                 // 부모 것 먼저
        System.out.println("B");
    }
}
// new B().hello() → A 다음 줄에 B
```

오버라이딩으로 가려진 부모 메서드는 `super.`로 다시 부를 수 있다. 이걸 넣어 출력 줄 수를 늘리는 문제가 자주 나온다.

## 시험에서 실수하는 지점

- **필드에는 오버라이딩이 없다** — 자식이 같은 이름 필드를 선언하면 "숨김(shadowing)"이지 재정의가 아니다. 그래서 참조 타입 기준으로 갈린다.
- **static 메서드도 동적 바인딩 안 됨** — static은 클래스 소속이라 참조 타입 기준으로 호출된다.
- **`instanceof`와 형변환** — `A obj = new B();`에서 `obj instanceof B`는 true. 실제 객체가 B이기 때문이다.

Java 문제는 결국 "지금 참조 타입을 보는가, 실제 객체를 보는가"를 매 줄 판단하는 일이다. 필드면 선언 타입, 메서드면 객체 타입 — 이 기준을 붙잡고 한 줄씩 읽으면 출력이 예측된다.
