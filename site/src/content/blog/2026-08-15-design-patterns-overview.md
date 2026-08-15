---
title: "디자인 패턴 개요 — 생성·구조·행위"
pubDate: 2026-08-15T07:27:52Z
section: "jeongcheogi"
tags: ["정처기", "소프트웨어공학", "디자인패턴", "GoF", "싱글턴"]
area: "SE"
topicId: "design-patterns-overview"
follows: "2026-07-29-blackbox-whitebox"
related: ["2026-07-17-coupling-cohesion"]
description: "GoF 디자인 패턴 23개는 생성·구조·행위 세 갈래로 나뉜다. 분류 기준(만드는 문제인가, 조립하는 문제인가, 협력하는 문제인가)을 잡고, Singleton·Factory Method·Adapter·Proxy·Observer·Strategy 등 시험에 자주 나오는 대표 패턴의 한 줄 정의와 매칭 요령을 정처기 필기 관점에서 정리한다."
---

## 정의 — 반복되는 설계 문제의 표준 해법

디자인 패턴은 객체지향 설계에서 **반복해서 나타나는 문제에 대한 검증된 해결 방법에 이름을 붙인 것**이다. GoF(Gang of Four, 네 명의 저자)가 정리한 23개 패턴이 표준으로 통하며, 정처기에서 "디자인 패턴"이라 하면 이 GoF 패턴을 가리킨다. 패턴을 쓰면 설계를 재사용할 수 있고, "여기는 Observer로 갑시다"처럼 **설계 의도를 한 단어로 소통**할 수 있다.

## 세 갈래 분류 — 무엇에 관한 문제인가

GoF 23개는 다루는 문제의 성격에 따라 세 범주로 나뉜다. 분류 기준부터 잡으면 암기가 쉬워진다.

- **생성(Creational) 패턴 5개** — 객체를 **만드는** 방식의 문제. 생성 과정을 캡슐화해 코드가 구체 클래스에 덜 묶이게 한다.
- **구조(Structural) 패턴 7개** — 클래스·객체를 **조립**하는 문제. 더 큰 구조를 유연하게 구성한다.
- **행위(Behavioral) 패턴 11개** — 객체들이 **협력하고 책임을 나누는** 문제. 알고리즘과 상호작용을 다룬다.

## 범주별 대표 패턴

**생성 (5개: Singleton, Factory Method, Abstract Factory, Builder, Prototype)**

- **Singleton**: 인스턴스가 **오직 하나**만 존재하도록 보장하고 전역 접근점을 제공.
- **Factory Method**: 객체 생성을 서브클래스에 위임 — 어떤 클래스를 만들지 하위에서 결정.
- **Abstract Factory**: 관련 객체들의 **묶음(제품군)**을 일관되게 생성.
- **Builder**: 복잡한 객체의 생성 절차와 표현을 분리해 단계적으로 조립.
- **Prototype**: 기존 객체를 **복제(clone)**해서 새 객체를 만든다.

**구조 (7개: Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy)**

- **Adapter**: 호환되지 않는 **인터페이스를 변환**해 함께 쓰게 한다(돼지코 변환 어댑터).
- **Composite**: 부분-전체를 **트리 구조**로 묶어 단일 객체와 복합 객체를 동일하게 다룬다.
- **Decorator**: 상속 없이 객체에 **기능을 동적으로 덧붙인다**.
- **Facade**: 복잡한 서브시스템에 **단순한 통합 창구** 하나를 제공.
- **Proxy**: 실제 객체를 **대리인**이 대신 받아 접근 제어·지연 로딩을 수행.

**행위 (11개: Observer, Strategy, Template Method, Command, State, Iterator, Mediator, Memento, Visitor, Chain of Responsibility, Interpreter)**

- **Observer**: 한 객체의 **상태 변화를 구독자들에게 자동 통지**(발행-구독).
- **Strategy**: 알고리즘 군을 캡슐화해 **런타임에 교체** 가능하게 한다.
- **Template Method**: 알고리즘의 **뼈대는 상위 클래스에**, 세부 단계는 하위 클래스가 재정의.
- **Command**: 요청 자체를 객체로 캡슐화해 저장·취소(undo)·큐잉을 가능하게.
- **State**: 객체의 상태에 따라 행동이 바뀌는 것을 상태 객체로 분리.

Singleton의 뼈대만 코드로 보면 이렇다(Java).

```java
public class Config {
    private static final Config INSTANCE = new Config();
    private Config() {}                       // 외부 생성 차단
    public static Config getInstance() {      // 유일한 접근점
        return INSTANCE;
    }
}
```

## 시험에 자주 나오는 포인트

- **분류 매칭이 최빈출**: "다음 중 생성 패턴이 아닌 것은?" 유형. 생성 5개(Singleton·Factory Method·Abstract Factory·Builder·Prototype)를 통째로 외우면, 나머지는 구조 아니면 행위라 소거가 된다. 구조는 "Adapter·Bridge·Composite·Decorator·Facade·Flyweight·Proxy" 7개.
- **설명 → 패턴 이름 매칭**: "인스턴스를 하나만" = Singleton, "인터페이스 변환" = Adapter, "상태 변화를 통지" = Observer, "알고리즘을 갈아 끼움" = Strategy, "복제로 생성" = Prototype, "대리 객체" = Proxy. 위 한 줄 정의들이 그대로 답이 된다.
- **혼동 함정**: Factory Method(하나의 제품 생성을 위임) vs Abstract Factory(제품군 묶음 생성), Decorator(기능 추가) vs Proxy(접근 제어) — 목적의 차이를 묻는다.
- 패턴은 **클래스를 새로 발명하는 게 아니라 검증된 설계의 재사용**이라는 정의 자체도 지문으로 나온다.
