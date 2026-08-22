---
title: >-
  203 KB of fonts and Performance 87
summary: >-
  Six font files arrive on every page because the declaration is missing unicode-range.
  That is two thirds of the page weight and nine Lighthouse points.
---

A measurement of the psychologist's landing page on its live domain, Lighthouse 12.8.2, mobile
profile, median of three runs: Accessibility 100, SEO 100, CLS 0 — and Performance 87.
The points are eaten by one forgotten line of CSS.

## What happens

Six font files at 203 KB out of the page's total 291 KB are declared without `unicode-range`.
The browser does not know which characters live in which file, so it downloads every file
mentioned for the weights in use. The page is in Russian — and Latin, extended Cyrillic and
Greek arrive along with it.

## What to do

`unicode-range` tells the browser which characters a file covers. The font is fetched only if
a character from that range appears on the page.

```css
@font-face {
  font-family: 'Onest Variable';
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/onest-cyrillic.woff2') format('woff2');
  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}

@font-face {
  font-family: 'Onest Variable';
  font-weight: 100 900;
  font-display: swap;
  src: url('/fonts/onest-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+2000-206F, U+20AC, U+2122, U+FEFF, U+FFFD;
}
```

This is the declaration from this very site. There are exactly two subsets — Cyrillic and Latin.
The extended sets `cyrillic-ext` and `latin-ext` are left out: they cover languages this site
will not have, and that is another 18 KB.

## Two things that belong next to it

One line is not enough when there are many weights. A variable font with a single `wght` axis
covers the whole range from one file: 520 for navigation items and 700 for a heading arrive
from the same file as body text.

And `preload` — for the subset of the current language, with a mandatory `crossorigin`. Fonts
are fetched in CORS mode, and without the attribute the preload does not count: the file is
downloaded twice.

The 87 is not quoted in the landing page's case study — fixing someone else's site was not part
of the job, and showing a Performance score while knowing its cause would be dishonest.
