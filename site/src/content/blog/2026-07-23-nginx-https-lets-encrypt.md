---
title: "nginx에 HTTPS 붙이기 — Let's Encrypt로 무료 인증서와 SSL 종료"
pubDate: 2026-07-23T07:06:19Z
section: "web"
tags: ["nginx", "https", "lets-encrypt", "certbot", "ssl"]
area: "OPS"
follows: "2026-07-23-what-is-nginx"
description: "nginx를 앞단에 두면 HTTPS 처리를 거기서 끝낼 수 있다(SSL 종료). Let's Encrypt와 certbot으로 무료 인증서를 발급·자동 갱신하고, 80→443 리다이렉트까지 실제 설정으로 붙여본다."
---

앞서 nginx가 앞단에서 **HTTPS 처리(SSL 종료)** 를 떠맡는다고 했다. 이 글은 그 말을 실제 설정으로 옮긴다. 자물쇠(🔒)가 붙은 주소를 만드는 과정이다.

## SSL 종료가 뭐였나

브라우저와 nginx 사이는 암호화된 HTTPS로 오가고, nginx가 그 암호를 **풀어서(복호화)** 뒤쪽 앱에는 평범한 HTTP로 넘긴다. 암호화가 nginx에서 끝난다고 해서 **SSL 종료(SSL termination)** 라 부른다.

덕분에 뒤에 있는 Node 앱은 인증서를 신경 쓸 필요가 없다. 인증서 관리라는 번거로운 일을 앞단 한 곳에 몰아두는 것이다.

## HTTPS에 필요한 것 — 인증서

HTTPS를 켜려면 **TLS 인증서**가 있어야 한다. 예전엔 돈 주고 사야 했지만, 지금은 **Let's Encrypt**가 무료로 발급해 준다. 발급·설치·갱신을 자동으로 해주는 도구가 **certbot**이다.

우분투 기준 설치는 이렇다.

```bash
sudo apt install certbot python3-certbot-nginx
```

`python3-certbot-nginx`는 certbot이 nginx 설정을 직접 읽고 고쳐주게 하는 플러그인이다.

## 인증서 발급 — 명령 한 줄

nginx가 이미 도메인(`example.com`)으로 80번 포트에서 응답하고 있다면, 발급은 한 줄이다.

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

certbot이 하는 일:

1. Let's Encrypt에 "이 도메인이 정말 네 것이냐"를 증명(도메인 소유 검증).
2. 인증서를 발급받아 `/etc/letsencrypt/`에 저장.
3. **nginx 설정을 자동으로 고쳐** 443 포트(HTTPS)를 열고 인증서를 연결.
4. 원하면 80→443 리다이렉트까지 추가.

끝나면 `https://example.com`이 자물쇠와 함께 뜬다.

## 설정은 어떻게 바뀌나

certbot이 자동으로 넣는 내용을 직접 쓰면 이런 모양이다. 무엇이 붙는지 알아두면 문제 생겼을 때 읽을 수 있다.

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;   # 뒤쪽 앱에는 평문 HTTP로
    }
}

# 80으로 들어오면 443으로 돌려보낸다
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

핵심은 두 가지다. **443에 `ssl`을 켜고 인증서 두 파일**(공개 인증서·개인키)을 가리키는 것, 그리고 **80으로 온 요청을 301로 443에 넘기는** 것. 리다이렉트가 있어야 `http://`로 들어온 사람도 자동으로 암호화된 주소로 옮겨진다.

## 자동 갱신을 잊지 말자

Let's Encrypt 인증서는 **90일**짜리다. 짧은 대신 자동 갱신이 전제다. certbot을 설치하면 보통 갱신 타이머(systemd timer나 cron)가 함께 깔린다. 잘 도는지 이렇게 확인한다.

```bash
sudo certbot renew --dry-run   # 갱신을 실제처럼 시험만 해본다
```

성공하면 실제 갱신도 자동으로 된다. 갱신 뒤 nginx가 새 인증서를 다시 읽도록 reload하는 훅까지 certbot이 넣어준다. 그래서 한 번 설정하면 손댈 일이 거의 없다.

## 정리

- **SSL 종료**: 브라우저↔nginx는 HTTPS, nginx↔앱은 HTTP. 인증서 관리를 앞단에 몰아둔다.
- **Let's Encrypt + certbot**: 무료 인증서를 발급·설치·갱신까지 자동화.
- `certbot --nginx -d 도메인` 한 줄이면 443 개통과 80→443 리다이렉트까지 끝난다.
- 인증서는 90일. `certbot renew`의 자동 갱신이 도는지만 확인해 두면 된다.

이제 앞단(nginx)은 HTTPS까지 갖췄다. 뒤에서 도는 앱을 **재배포할 때 서비스가 끊기지 않게** 하는 건 pm2 쪽 몫이다.
