---
title: "pm2로 무중단 배포하기 — restart 말고 reload"
pubDate: 2026-07-23T07:06:56Z
section: "web"
tags: ["pm2", "무중단배포", "reload", "클러스터", "graceful-shutdown"]
area: "OPS"
follows: "2026-07-23-what-is-pm2"
description: "pm2 restart는 프로세스를 한꺼번에 죽였다 살려 그 사이 요청이 끊긴다. 클러스터 모드에서 reload는 프로세스를 하나씩 교체해 다운타임 없이 배포한다. restart와 reload의 차이, graceful shutdown 처리, 배포 흐름을 정리한다."
---

앞선 글에서 pm2로 Node 앱을 죽지 않게 굴리는 법을 봤다. 그런데 **새 코드를 배포할 때**는 결국 앱을 다시 띄워야 한다. 이때 `pm2 restart`를 쓰면 그 짧은 순간 서비스가 끊긴다. 이 글은 그 끊김을 없애는 `pm2 reload` 이야기다.

## restart의 문제 — 끊기는 순간

`pm2 restart`는 이름 그대로다. **돌던 프로세스를 죽이고(kill), 새로 띄운다(start).** 그 사이에는 요청을 받을 프로세스가 없다. 앱이 뜨는 데 2~3초가 걸린다면, 그 2~3초 동안 들어온 요청은 502 에러를 만난다.

배포가 하루에 몇 번씩이면, 그때마다 사용자가 에러를 볼 수 있다는 뜻이다.

## reload — 하나씩 갈아끼운다

[클러스터 모드](/blog/2026-07-23-what-is-pm2/)로 앱을 여러 프로세스 띄웠다면, `pm2 reload`가 답이다. reload는 **프로세스를 전부 죽이지 않고, 한 개씩 순서대로 교체**한다.

```bash
pm2 reload blog-api   # 또는 pm2 reload ecosystem.config.js
```

동작은 이렇다.

1. 새 프로세스 1개를 띄운다.
2. 그게 요청 받을 준비가 되면, 낡은 프로세스 1개를 내린다.
3. 다음 프로세스로 넘어가 2~3을 반복한다.

교체가 도는 내내 **항상 요청을 받을 수 있는 프로세스가 남아 있다.** 그래서 사용자 입장에서는 끊김이 없다. 이걸 롤링 재시작(rolling restart)이라 부른다.

| | restart | reload |
| --- | --- | --- |
| 방식 | 전부 죽였다 새로 | 하나씩 교체 |
| 다운타임 | 있음 | 없음 |
| 전제 | 아무 모드나 | 클러스터 모드 권장 |

> reload는 클러스터 모드(`-i`)에서 진가를 낸다. 인스턴스가 1개뿐이면 교체할 여유분이 없어 사실상 restart에 가까워진다.

## 진짜 무중단이 되려면 — graceful shutdown

reload가 낡은 프로세스에 "이제 그만"을 알릴 때, 그 프로세스가 **처리 중이던 요청을 마저 끝내고** 나가야 한다. 처리 도중에 그냥 죽으면 그 요청은 실패한다. 이걸 우아한 종료(graceful shutdown)라 한다.

앱에서 종료 신호(SIGINT)를 받아 서버를 정리하는 코드를 넣어두자.

```js
const server = app.listen(3000, () => {
  process.send && process.send("ready");   // pm2에 "준비됐다" 통보
});

process.on("SIGINT", () => {
  server.close(() => {   // 새 요청은 그만 받고, 진행 중 요청은 마저 끝냄
    process.exit(0);
  });
});
```

그리고 pm2에는 "프로세스가 스스로 `ready`를 보낼 때까지 기다렸다가 다음으로 넘어가라"고 알려준다.

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: "blog-api",
    script: "./app.js",
    instances: "max",
    wait_ready: true,       // process.send('ready')를 기다림
    listen_timeout: 5000,   // 그 안에 준비 못 하면 타임아웃
    kill_timeout: 5000,     // 종료도 이만큼 기다려 줌
  }],
};
```

`wait_ready`가 있으면 pm2는 새 프로세스가 진짜 요청 받을 준비가 됐다는 신호를 확인한 **뒤에야** 낡은 프로세스를 내린다. 이게 없으면 "떴다"와 "받을 준비 됐다" 사이의 틈에서 요청이 샐 수 있다.

## 배포 흐름

무중단 배포의 실제 순서는 대개 이렇다.

```bash
git pull                    # 새 코드 받기
npm install --production    # 의존성 갱신
pm2 reload ecosystem.config.js   # 끊김 없이 교체
```

앞단의 [nginx](/blog/2026-07-23-what-is-nginx/)는 그대로 두고, 뒤쪽 Node 프로세스만 reload로 갈아끼우면 된다. nginx는 살아 있는 프로세스로 계속 요청을 넘기므로, 사용자는 배포가 일어난 줄도 모른다.

## 정리

- `pm2 restart`는 전부 죽였다 살려 **다운타임이 생긴다.**
- `pm2 reload`는 프로세스를 **하나씩 교체**해 끊김 없이 배포한다(클러스터 모드에서 진가).
- 진짜 무중단은 앱의 **graceful shutdown** + pm2의 `wait_ready`가 받쳐줘야 완성된다.
- 배포는 `git pull → install → pm2 reload` 흐름. nginx 앞단은 손대지 않는다.
