---
title: "시스템 로그와 감사 — syslog·utmp·wtmp·btmp는 무엇을 기록하는가"
pubDate: 2026-11-15T12:51:45Z
section: "boangisa"
tags: ["정보보안기사", "syslog", "utmp", "wtmp", "로그"]
area: "SYS"
topicId: "system-log-audit"
description: "유닉스·리눅스의 로그 체계를 정리한다. 접속 기록 파일 utmp·wtmp·btmp·lastlog의 차이와 syslog의 facility·priority 구조, 시험 포인트를 다룬다."
---

침해 사고가 나면 가장 먼저 보는 것은 로그다. 누가 언제 접속했고, 어떤 인증이 실패했으며, 어떤 명령이 실행됐는지를 사후에 추적하려면 로그가 남아 있고 위조되지 않았어야 한다. 정보보안기사에서는 유닉스·리눅스의 접속 기록 파일과 syslog 구조를 구분하는 문제가 자주 나온다.

## 접속 기록 파일: utmp·wtmp·btmp·lastlog

네 파일은 모두 바이너리 형식이라 `cat`으로 읽을 수 없고, 전용 명령으로 조회한다.

| 파일 | 기록 내용 | 조회 명령 |
|---|---|---|
| utmp | 현재 로그인 중인 사용자 | `who`, `w`, `users` |
| wtmp | 로그인·로그아웃, 재부팅의 누적 이력 | `last` |
| btmp | 로그인 실패 기록 | `lastb` |
| lastlog | 사용자별 마지막 로그인 시각 | `lastlog` |

경로는 배포판마다 조금 다르지만, 대개 utmp는 `/var/run/utmp`, wtmp·btmp·lastlog는 `/var/log/` 아래에 있다. utmp는 "지금", wtmp는 "과거 전체", btmp는 "실패"로 외우면 된다.

활용 예로, `lastb`에서 짧은 시간에 같은 출발지의 실패가 반복되면 무차별 대입 공격을 의심할 수 있다. 반대로 `last`에 평소 쓰지 않는 시간대나 낯선 IP의 성공 기록이 있으면 계정 탈취 가능성을 확인한다.

## syslog 구조

syslog는 프로그램이 남기는 메시지를 모아 분류하고 파일이나 원격 서버로 보내는 로깅 표준이다. 메시지는 **facility(출처)와 priority(심각도)** 두 값으로 분류된다.

- facility: `auth`, `authpriv`, `cron`, `daemon`, `kern`, `mail`, `user`, `local0`~`local7` 등
- priority: 심각한 순으로 `emerg` > `alert` > `crit` > `err` > `warning` > `notice` > `info` > `debug`

설정 파일은 전통적으로 `/etc/syslog.conf`이고, rsyslog를 쓰는 환경에서는 `/etc/rsyslog.conf`를 쓴다. 규칙은 "선택자 동작" 형태다.

```text
authpriv.*          /var/log/secure
*.info;mail.none    /var/log/messages
*.emerg             *
```

첫 줄은 authpriv 출처의 모든 메시지를 파일에 기록한다. 둘째 줄은 info 이상의 메시지를 기록하되 mail은 제외한다. 셋째 줄은 emerg 메시지를 로그인한 모든 사용자 터미널에 보낸다. priority를 지정하면 그 단계 이상이 대상이 된다는 점이 핵심이다.

원격 로그 서버로 전송할 때는 전통적으로 UDP 514를 쓴다. UDP는 전달 보장이 없고 평문이므로, 중요한 환경에서는 TCP나 TLS 전송을 쓰는 rsyslog 같은 구현을 고려한다.

## 그 밖의 주요 로그

- 인증 로그: `/var/log/secure`(RHEL 계열), `/var/log/auth.log`(Debian 계열) — 로그인·`su`·`sudo` 기록
- `/var/log/messages`: 시스템 전반의 일반 메시지
- `/var/log/cron`: 예약 작업 실행 기록
- `sulog`: `su` 사용 기록(유닉스 계열에서 쓰임)
- `xferlog`: FTP 전송 기록
- `pacct`: 프로세스 어카운팅(실행된 명령 기록), `lastcomm`으로 조회
- 셸 히스토리: `~/.bash_history` — 사용자가 직접 지울 수 있어 증거 신뢰도가 낮다

## 로그 관리 원칙

공격자는 침입 후 흔적을 지우려 로그를 수정하거나 삭제한다. 그래서 로그는 생성보다 **보호**가 중요하다.

- 로그 파일 권한을 제한하고 root만 쓰도록 한다.
- 별도의 원격 로그 서버에 실시간으로 복제해 원본이 지워져도 남게 한다.
- logrotate 등으로 주기적으로 보관·압축하되, 법적 요구나 내부 정책의 보관 기간을 지킨다.
- 시간 동기화(NTP)를 맞춰 여러 장비의 로그를 시간순으로 대조할 수 있게 한다.

## 시험 포인트

1. utmp는 현재 접속자, wtmp는 누적 접속 이력, btmp는 실패 기록, lastlog는 마지막 로그인이다. 조회 명령은 각각 `who`, `last`, `lastb`, `lastlog`다.
2. 네 파일은 바이너리이므로 텍스트 편집기나 `cat`으로 확인하지 않는다.
3. syslog는 facility와 priority로 분류하며, priority는 지정한 단계 이상을 포함한다.
4. 로그 위변조 대응의 기본은 원격 백업과 접근 통제다.
