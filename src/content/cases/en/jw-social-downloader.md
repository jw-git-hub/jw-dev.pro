---
title: jw_social_downloader
kind: >-
  Bot · Product
summary: >-
  A public downloader bot for five social networks with a freemium model, an admin
  panel and Docker deployment: open the link, send an address, and it answers right now.
metrics:
  - 5 platforms
  - 3 currencies
  - Freemium + admin
logLine: >-
  A downloader for five networks: freemium, admin panel, Docker. Live right now.
body:
  task: >-
    This is my own product, not a client project: a public bot used by strangers who
    press every button there is. So it has to survive load, the moods of five platforms
    at once and Telegram's limits — and still explain to a person what went wrong,
    without a raw traceback.
  did: >-
    I wrote an asynchronous bot on aiogram 3 with a freemium model: three free
    downloads, then a 30-day subscription paid in USDT, dong or baht. Under the hood
    it picks formats per platform separately, falls back to `gallery-dl` where `yt-dlp`
    fundamentally cannot cope, caps concurrency with a semaphore of three and throttles
    flooding with middleware.
  result: >-
    The bot is live: open the link, send a post address, and it returns the media.
    It has an admin panel with manual subscription grants, human-readable error
    messages instead of tracebacks, and a single-command start through docker-compose.
screenshots: []
---

The real engineering here is not downloading but handing the file over so Telegram will
play it. Facebook gets H.264 prioritised over AV1, otherwise the player on many clients
shows sound with no picture; YouTube cycles through the `web_safari`, `android_vr` and
`tv` clients for H.264 streams; TikTok's transient WAF challenge is retried, because
the platform flaps rather than bans.

The `host-network` mode in docker-compose is deliberate: Docker's NAT network drops
large uploads to Telegram over path MTU problems.
