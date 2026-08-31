---
title: psy-aleksander
kind: >-
  Landing · Quiz funnel
summary: >-
  A family psychologist's landing page where the contact form was replaced by a quiz:
  the visitor answers three questions and gets a ready-made Telegram message instead
  of an empty input field.
metrics:
  - 3-question quiz
  - A11y 100 · SEO 100
  - llms.txt for AI
logLine: >-
  The contact form replaced by a three-question quiz with ready-made text.
body:
  task: >-
    The psychologist needed enquiries, but an ordinary form on a landing page is an
    empty field people stare at before closing the tab. Writing a stranger a first
    message about your own family is hard, and that is exactly where the funnel ended.
  did: >-
    I replaced the form with a three-question quiz: the visitor picks answers, gets
    a recommended format and a "copy" button — the answers are assembled into a ready
    Telegram message. Alongside it sit a diploma gallery with a lightbox, a price list
    in two currencies and a ten-question FAQ. Everything is plain HTML, CSS and JS with
    no build step, so editing a price takes minutes and nothing rots over time.
  result: >-
    People arrive in the inbox with a structured request rather than a blank page, and
    the specialist immediately sees what they are dealing with. Measured on the live
    domain: Accessibility 100, SEO 100, CLS 0, and the schema.org validator accepts
    a thirteen-node graph with no errors and no warnings.
screenshots:
  - role: card
    alt: >-
      Aleksandr Krasnogor's landing page: a heading about working with couples, three promises and the buttons to write on Telegram or pick a format
  - role: cover
    alt: >-
      The full first screen of the landing page: seven-section navigation, the therapist's photo and the entry into the one-minute format quiz
---

A separate requirement from the client: the exact address of in-person sessions is
published nowhere — not in the text, not in the markup, only the island. That is
guarded by an automated check looking for `streetAddress`, coordinates and
`GeoCoordinates`, so the address cannot slip onto the site during future edits.

Lighthouse 12.8.2, measured 22.08.2026, mobile profile, median of three runs:
Performance 87 — the points go to six font files weighing 203 KB declared without
`unicode-range`. That is why Performance is not one of this case's metrics.
