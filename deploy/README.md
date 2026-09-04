# Прод-стенд

Сервер: Ubuntu 26.04, Docker, каталог `/srv/jw-dev.pro/`.

```
/srv/jw-dev.pro/
├── dist/     статика, приезжает из CI по rsync
├── server/   исходники приёмника: из них docker собирает contact-api
└── deploy/   копия этого каталога плюс .env и certbot-webroot/
```

`server/` в дереве не декоративный: `docker-compose.yml` собирает `contact-api`
из `../server/contact-api`, то есть из копии на сервере, а не из репозитория.
Правка в `server/contact-api/` сама туда не приезжает — выкат заливает один `dist/`.

## Что откуда берётся

`dist/` заливает GitHub Actions после зелёных ворот — руками его не трогают.

Всё остальное копируется на сервер вручную: файлы стенда меняются редко,
и держать их выкат в CI значило бы давать воркфлоу право менять конфигурацию
сервера. **После правки `nginx.conf`, `docker-compose.yml` или `snippets/`
копию на сервере надо обновить самому:**

```bash
rsync -az --inplace --delete --exclude .env --exclude certbot-webroot \
  deploy/ john_wick@165.232.168.160:/srv/jw-dev.pro/deploy/
ssh john_wick@165.232.168.160 \
  'cd /srv/jw-dev.pro/deploy && docker compose exec -T web nginx -t && docker compose exec -T web nginx -s reload'
```

**`--inplace` здесь обязателен.** Docker монтирует одиночный файл по inode,
а обычный rsync пишет во временный файл и переименовывает его — inode меняется,
и контейнер продолжает видеть старую копию. Коварство в том, что `nginx -t`
при этом проверяет старый конфиг и отвечает «всё в порядке», а перезагрузка
перечитывает его же: правка выглядит выкаченной и не работает.

Если inode всё-таки сменился — например, файл перезаписали не через rsync —
контейнер надо пересоздать, перезагрузки не хватит:

```bash
ssh john_wick@165.232.168.160 'cd /srv/jw-dev.pro/deploy && docker compose up -d --force-recreate web'
```

Пересоздание нужно и при правке самого `docker-compose.yml` — портов, томов,
healthcheck. Перезагрузка nginx его не читает вовсе.

## Проверка живости

Живость для docker отвечает на `http://127.0.0.1:8081/healthz` **внутри контейнера**.
Отдельный слушатель, а не адрес на 80 порту, и закрывает его не правило, а то, что
порт 8081 не опубликован в `docker-compose.yml`.

Так сделано после находки 30.08.2026: прежний блок стоял на 80 порту с
`allow 127.0.0.1; allow ::1; deny all;` — и отдавал «ok» всему интернету, выглядя
при этом закрытым. Причина не в опечатке: `return` — директива модуля rewrite,
а фаза rewrite идёт раньше фазы access, поэтому ответ уходит до того, как запрет
вообще прочитают. Проверено на nginx двумя опытами: `deny all` рядом с `return`
даёт 200, тот же `deny all` рядом с отдачей файла — 403.

Отсюда правило: **`allow`/`deny` в одном location с `return` не значат ничего.**
Закрывать адрес надо маршрутом, а не правилом.

Что адрес закрыт снаружи, проверяют ворота `npm run check:prod` в выкате.

## Обновление приёмника формы

Код `server/contact-api/` в CI не выкатывается — его копируют так же руками,
как и стенд, и после копии контейнер надо **пересобрать**, а не перезапустить:
образ собран из старых исходников, и `restart` поднимет ровно его.

```bash
rsync -az --inplace --delete --chmod=D755,F644 --exclude __pycache__ \
  server/contact-api/ john_wick@165.232.168.160:/srv/jw-dev.pro/server/contact-api/
ssh john_wick@165.232.168.160 \
  'cd /srv/jw-dev.pro/deploy && docker compose up -d --build contact-api'
```

**`--chmod=D755,F644` обязателен.** `rsync -a` переносит права как есть, а в рабочем
каталоге они могут быть `600`. Образ собирается из этих файлов и запускается не под
root — питон внутри контейнера просто не сможет прочитать `app.py`. Проверено 04.09.2026
собственной ошибкой: контейнер ушёл в бесконечный перезапуск с
`can't open file '/app/app.py': [Errno 13] Permission denied`, `/api/` отдавал 502.
Сайт при этом жил — статику раздаёт nginx, приёмник нужен одной форме.

Проверка, что приёмник живой после пересборки:

```bash
ssh john_wick@165.232.168.160 'docker inspect -f "{{.State.Health.Status}}" jw-dev-contact'
```

`.env` живёт только на сервере и лежит рядом с `docker-compose.yml`,
в `/srv/jw-dev.pro/deploy/.env`: `env_file` считается от файла компоуза,
а не от корня стенда. В нём токен бота и пароль почты, а репозиторий публичный.
Образец полей — `.env.example`.

Значения из `.env` читаются при старте контейнера, поэтому смена получателя
заявок пересборки не требует — хватит `docker compose up -d contact-api`.

## Сертификат

Выпускает и обновляет `certbot` на хосте. Контейнер nginx получает
`/etc/letsencrypt` и каталог подтверждения только на чтение и ничего
не выпускает сам.

Первый выпуск делается до запуска стенда, пока 80 порт свободен:

```bash
sudo certbot certonly --standalone \
  -d jw-dev.pro -d www.jw-dev.pro \
  --agree-tos -m <почта> --no-eff-email
```

После того как стенд поднят, режим проверки переводится на `webroot` —
иначе обновление уткнётся в занятый nginx-ом 80 порт:

```bash
sudo certbot certonly --webroot -w /srv/jw-dev.pro/deploy/certbot-webroot \
  -d jw-dev.pro -d www.jw-dev.pro --cert-name jw-dev.pro --keep-until-expiring
```

Обновление дальше идёт само: `certbot.timer` из пакета проверяет срок дважды
в сутки. Перезагрузку nginx после обновления делает хук:

```
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#!/bin/sh
docker exec jw-dev-web nginx -s reload
```

Проверить всю цепочку, ничего не выпуская:

```bash
sudo certbot renew --dry-run
```

## Стенд

```bash
cd /srv/jw-dev.pro/deploy
docker compose up -d        # поднять или применить правки
docker compose ps           # состояние и healthcheck
docker compose logs -f web  # логи nginx
docker compose exec web nginx -t   # проверить конфиг до перезагрузки
```
