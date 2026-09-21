---
title: "윈도우 인증 구조 — SAM과 LSA, NTLM은 어떻게 얽히는가"
pubDate: 2026-09-21T10:53:03Z
section: "boangisa"
tags: ["정보보안기사", "시스템보안", "Windows", "NTLM", "Pass-the-Hash"]
follows: "2026-08-30-linux-permission-setuid"
description: "윈도우 로컬 인증을 구성하는 SAM, LSA, NTLM 세 요소가 각각 어떤 역할을 맡는지 정리한다. SAM과 LM/NTLM 해시의 차이, lsass.exe가 인증을 처리하는 방식, NTLM의 challenge-response 구조와 Pass-the-Hash 공격의 원리, 그리고 Kerberos와의 관계까지 정보보안기사 필기 관점에서 짚는다.</description>
<parameter name=\"topicId\">windows-auth-sam-lsa"
---

윈도우 로그인 창에 비밀번호를 입력하는 순간, 화면 뒤에서는 세 개의 구성 요소가 순서대로 관여한다. SAM(Security Account Manager), LSA(Local Security Authority), 그리고 인증 프로토콜인 NTLM이다. 정보보안기사 시스템 보안 영역에서 자주 나오는 이 세 이름이 실제로 어떻게 얽히는지 정리한다.

## SAM — 계정과 해시가 저장되는 곳

SAM은 로컬 사용자 계정 정보와 비밀번호 해시를 담는 데이터베이스다. 파일 자체는 `%SystemRoot%\System32\config\SAM` 레지스트리 하이브로 존재하고, 시스템이 켜져 있는 동안에는 커널이 파일을 잠가 그대로 복사할 수 없다. 여기 저장되는 값은 평문 비밀번호가 아니라 해시다.

과거에는 LM(LAN Manager) 해시와 NTLM 해시가 함께 저장됐다. LM 해시는 비밀번호를 대문자로 바꾸고 고정 길이로 잘라 DES 기반으로 암호화하는 방식이라 대소문자를 구분하지 못하고 무차별 대입에 극히 약했다. 반면 NTLM 해시는 MD4 기반으로 대소문자를 구분해 상대적으로 안전하다. 최신 윈도우는 기본적으로 LM 해시 생성을 꺼두고 NTLM 해시만 남긴다.

## LSA — 인증을 실제로 처리하는 프로세스

LSA는 `lsass.exe` 프로세스로 동작하며, 로그인 시 자격 증명을 검증하고 성공하면 보안 토큰을 발급하는 주체다. SAM이 저장소라면 실제 비교·검증은 LSA가 맡는다. 이 구분 때문에 `lsass.exe`의 메모리는 공격자가 노리는 대표적인 지점이 된다. 로그인에 성공한 세션의 해시나 인증 정보가 그 프로세스 메모리에 상주하기 때문이다.

## NTLM — 해시로 증명하는 프로토콜

NTLM 인증은 challenge-response 방식으로 동작한다. 클라이언트는 평문 비밀번호를 서버로 보내지 않는다. 대신 서버가 보낸 난수(challenge)를 자신의 비밀번호 해시로 암호화해 되돌려 보내고, 서버는 자신이 알고 있는 해시로 같은 연산을 수행해 값이 일치하는지만 확인한다.

```text
서버 -> 클라이언트: challenge (난수)
클라이언트 -> 서버: response = Encrypt(challenge, NTLM_hash)
서버: 자신이 저장한 NTLM_hash로 같은 연산 -> response와 비교
```

여기서 중요한 함의가 생긴다. 인증이 성립하는 데 필요한 건 평문 비밀번호가 아니라 해시 그 자체다. 공격자가 평문 비밀번호를 몰라도 NTLM 해시만 탈취하면 그 해시를 그대로 이용해 인증을 통과할 수 있다. 이를 Pass-the-Hash 공격이라 부른다. 비밀번호를 크랙하는 과정을 건너뛴다는 점에서, 해시를 단순히 "암호화된 비밀번호" 정도로만 여기면 이 공격의 위험성을 놓치기 쉽다.

윈도우 도메인 환경에서는 Kerberos가 기본 인증 프로토콜이고, NTLM은 Kerberos를 쓸 수 없는 상황(IP 주소로 직접 접속하거나 도메인 없이 워크그룹으로 동작하는 경우 등)의 폴백으로 남아 있다.

## 시험 포인트

- SAM은 계정·해시를 담는 저장소, LSA는 인증을 처리하는 주체(lsass.exe) — 역할을 바꿔 묻는 문제가 잦다.
- LM 해시는 대소문자를 구분하지 못하고 DES 기반이라 취약, NTLM 해시는 MD4 기반으로 대소문자를 구분한다.
- Pass-the-Hash는 "인증에 평문 비밀번호가 아니라 해시만 있으면 된다"는 NTLM 프로토콜의 특성에서 비롯된다.
- 도메인 환경의 기본 인증은 Kerberos이고 NTLM은 폴백이라는 우선순위를 헷갈리지 않는다.
