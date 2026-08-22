---
title: jw_danang_group_bot
kind: >-
  Bot · Community
summary: >-
  Five content streams run an expat Telegram group with no human involved, and
  cross-language deduplication stops one piece of news arriving twice — once in
  English and once in Russian.
metrics:
  - 5 streams
  - 28 posts a week
  - 5,700 duplicates
logLine: >-
  Five content streams and cross-language dedup: 5,700 duplicates rejected.
body:
  task: >-
    A topic group dies of irregularity, not of bad content: the owner posts for two
    weeks, then every three days, then runs out of time. A hired SMM manager costs
    money every month and leaves too. And the same story arrives from five aggregators
    under different headlines, so a week later nobody remembers whether it was posted.
  did: >-
    I split the feed into five independent streams, each on its own schedule: a morning
    digest with weather, air quality and exchange rates, two news editions, a Vietnamese
    lesson from a 365-day course, and a Sunday expat guide. Translation and rewriting go
    through Claude CLI on the server. If one stream falls over the rest go out as usual,
    and a failing source does not break a post: a section without data simply disappears.
  result: >-
    The group fills seven days a week, 28 posts, and the only cost is the VPS — every
    data source is free. Project logs show deduplication rejected around 5,700
    candidates across three levels, 1,279 of them on the cross-language one that
    recognises yesterday's Russian story inside today's English wire.
screenshots: []
---

The third deduplication level works on tokens that survive translation: numbers, Latin
words and key fragments of the URL slug. `20 million`, `SKYTRAX` and `2030` look the
same in an English headline and in a Russian post.

A separate process reads the real topic history once a day through a user account and
pulls into memory the posts the owner published by hand — the bot will not repeat news
its owner beat it to. That account is used for reading only; publishing is always
the bot.
