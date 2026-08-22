---
title: psy-aleksander-tg-auto-posts-bot
kind: >-
  Bot · Autoposting
summary: >-
  A content engine for a Telegram channel: 31 sources, four levels of deduplication
  and Claude rewriting, publishing two posts a day without a single human review.
metrics:
  - 31 sources
  - 4-level dedup
  - 2 posts a day
logLine: >-
  31 sources, four levels of deduplication, Claude rewriting twice a day.
body:
  task: >-
    The psychologist's channel had to publish every day, and the owner had no intention
    of reading 31 sources by hand. Every post means finding an article, checking its
    date, translating it, rewriting it for the audience and formatting it. All of that
    goes out without review, so the system itself has to answer for what reaches
    subscribers.
  did: >-
    I built a pipeline that starts from the content plan rather than from an article:
    first a topic out of eighty in rotation, then a candidate pool from 31 sources,
    then a relevance score through Claude Haiku with a threshold of 7, then a rewrite
    in the expert's voice. If nothing fits the topic, the bot moves to the next one
    instead of publishing whatever it found. All external text is wrapped in
    `untrusted_article_content` with an explicit ban on executing instructions found
    inside it.
  result: >-
    The channel runs without a human, and a repeat cannot get through. Deduplication
    works on four levels: an exact URL, Jaccard similarity over headlines, a fingerprint
    of key entities, and a semantic check against the last forty headlines plus MinHash
    over the already rewritten text.
screenshots: []
---

The pipeline was inverted after a real bug: a post titled "The role of boundaries in
a family" went out with an image from a joke roundup, because matching an article to
a topic fired on a weak semantic overlap. Now the topic comes first and the article
is picked to fit it.

Fetching third-party pages goes through an SSRF filter: non-http(s) schemes, `.local`
and `.internal` are rejected, the host is resolved to cut off private and loopback
addresses, and redirects are followed manually — every hop is re-checked, three at most.
