---
title: >-
  Page weight after Tilda: three corrections
summary: >-
  The first count overstated the win twofold. Three corrections to the method, after which
  the number matched what the browser actually downloads.
---

The write-up of the salon's move off Tilda claimed "−51…−60% page weight". That number came
from a deck, not from a measurement, and there was nothing left to verify it against: the old
site is gone. An export of its predecessor survived — and that made an honest count possible.

## Page weight and code weight are different numbers

At first I counted everything sitting in the saved page. That is the wrong way: half of those
files never reach the browser. After three corrections the "before" stopped being twice too
heavy, and the "after" five times.

**The polyfill does not count.** Tilda ships 181 KB of compatibility code marked `nomodule`.
A browser that understands modules never requests that file. It sits in the saved folder and
weighs something; over the network it does not exist.

**The favicon does not count.** On the old site it was a 2.3 MB SVG. It is fetched once per
visit and cached, rather than arriving with every page. It has no place in the weight of a
single page — otherwise the first screen looks four times heavier than it is.

**Only one file comes out of `srcset`.** The browser picks one image from the set, not the whole
set. I counted the one in `src`, that is, the largest of the options — so the "after" is not
flattering itself.

## How to count it

The easiest way is not by folder but by HAR: it records exactly what went over the wire.

```bash
# Weight by resource type from a HAR — the way the browser downloads it
jq -r '
  .log.entries
  | map(select(.response.status == 200))
  | map({ type: .response.content.mimeType, bytes: .response.content.size })
  | group_by(.type)
  | map({ type: .[0].type, kb: (map(.bytes) | add / 1024 | floor) })
  | sort_by(-.kb)[]
  | "\(.kb) KB  \(.type)"
' page.har
```

## The result

Median across nineteen identical pages: page code — markup, styles and scripts — got 70%
lighter raw and 75% lighter over the network. Scripts went from eleven files at 189 KB to four
at 6 KB. Requests per page: 14 instead of 20.

## The caveat without which the number lies

What got lighter is the **code**. On some sections the whole page got heavier than before:
the new pages have photographs the Tilda ones never had — the old service pages were text and
nothing else. Comparing "a page with photos" against "a page without photos" by megabytes is
meaningless, which is why only the code medians made it into the case study.

Measured 22.08.2026 against the saved export of `doctor.cosmetolog.pro`. External hosts —
Google Fonts, GTM, CDNs — were counted on neither side: their size is not available, and only
the old site had them.
