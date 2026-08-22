---
title: th.neva.beauty
kind: >-
  Website · Tilda migration
summary: >-
  A beauty salon on Koh Samui left Tilda for its own generator — 25 pages rebuilt, 204
  prices pulled into a single source, and 85 automated tests that keep a wrong figure
  out of production.
metrics:
  - 204 prices
  - 85 auto tests
  - −70% page code
linkNote: >-
  Demo closed by the salon owner
logLine: >-
  25 pages rebuilt off Tilda, 204 prices in one source, 85 automated tests.
body:
  task: >-
    The salon sat on Tilda: 25 pages and 204 prices scattered across builder blocks.
    The same figure lived in several places at once — the price table, the service
    description, the FAQ answers — and editing a price turned into hunting down every
    copy of it. Miss one, and the site started arguing with itself.
  did: >-
    I rebuilt all 25 pages with my own generator in Python and Jinja2: content is
    described in YAML, prices live in a single `prices.json`, and the texts hold
    a placeholder instead of a figure. After the build, `check_prices.py` parses the
    finished HTML and checks the number, the price section, the item label and the
    promo tag against the reference; `check_content.py` walks all 25 pages and fails
    the deploy on a broken link, duplicate meta tags, invalid JSON-LD or a broken
    heading hierarchy.
  result: >-
    Page code — markup, styles and scripts — got 70% lighter raw and 75% lighter over
    the wire: the median across nineteen matching pages. Eleven script files weighing
    189 KB became four weighing 6 KB, and requests per page dropped from 20 to 14.
    Lighthouse on the live domain: Accessibility 100, SEO 100, Performance 93–99, CLS 0.
screenshots: []
---

The weight measurement was taken on 22.08.2026 from a saved export of the Tilda
predecessor. We counted the way a browser downloads: Tilda's `nomodule` polyfill
is never fetched by a modern browser, the site icon is cached for the whole visit,
and only one file from a `srcset` counts. Without those corrections the "before"
figure doubles.

It is the **code** that got lighter. The full page is heavier than before in some
sections, because the new pages carry photographs the Tilda site never had — the old
service pages were plain text.
