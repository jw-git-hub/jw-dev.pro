---
title: vn.neva.beauty
kind: >-
  Website · Own generator
summary: >-
  A beauty centre in Da Nang where 16 pages and 112 prices are assembled in one
  generator pass from YAML and JSON, with a price parity test and a heading check
  wired into the deploy.
metrics:
  - 16 pages
  - 112 prices
  - Lighthouse 96
logLine: >-
  16 pages and 112 prices from one source, Lighthouse 96 on mobile.
body:
  task: >-
    The centre needed a site that would survive a price edit. Prices here live across
    four categories and ten services, they move with the dong exchange rate, and any
    system where a figure is typed twice by hand starts lying in its second week.
  did: >-
    I built the site with my own Python and Jinja2 generator: the category taxonomy is
    declared once in `content.yml` and drives navigation, breadcrumbs and cross-links,
    while `prices.json` stays the single source of prices. After the build,
    `check_prices.py` verifies the figure, the section, the description and the
    currency against the reference, and `check_headings.py` checks the heading
    hierarchy; both steps sit inside the deploy.
  result: >-
    Lighthouse on the live domain, mobile profile, median of three runs: Performance
    96, Accessibility 100, SEO 100, CLS 0. Removing render-blocking lifted Performance
    from 75 to 98, and subsetting variable fonts cut six requests and 115 KB. Adding
    a service takes one entry in one file.
screenshots:
  - role: card
    alt: >-
      Neva Beauty Da Nang home page: the beauty centre heading, the treatment menu and a booking button
  - role: cover
    alt: >-
      The full first screen of the Neva Beauty site: navigation across four treatment areas, a booking call to action and a contact bar
---

The Lighthouse 12.8.2 measurement was taken on 22.08.2026 on the live domain: mobile
profile, simulated throttling, three runs — 96, 98, 95. Best Practices 96.

The centre did have a Tilda site, but no copy of it survived. So this case carries no
migration figure: there is nothing to compare against, and borrowing a "before" from
a neighbouring project would be dishonest.
