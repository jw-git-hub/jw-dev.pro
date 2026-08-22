---
title: neva-beauty-bot
kind: >-
  Bot · Shop and booking
summary: >-
  A Telegram bot for a salon: catalogue, cart, line-by-line order confirmation, Thai QR
  payment and procedure booking — with 204 prices pulled straight from the site's
  repository.
metrics:
  - 12 products
  - 204 prices synced
  - 25 tests
linkNote: >-
  The bot runs on a test environment, production launch is ahead
logLine: >-
  Shop, booking and Thai QR payment in one bot; prices come from the site repo.
body:
  task: >-
    The salon needed its own place inside Telegram: shop, services and booking together,
    on its own server, with payments taken directly and no payment gateways or banking
    APIs. The hard part is not the buttons: an item may be out of stock or made to
    order, so charging for a cart is not allowed.
  did: >-
    I made an order a request rather than a receipt: a total appears only after the
    admin has marked every line — in stock, to order, unavailable, replacement — and
    the client has accepted the result. Unconfirmed lines never enter the total. Service
    prices are not copied but assembled by a script from the site's `prices.json`:
    a second copy of the price list does not exist in this project.
  result: >-
    Ready today are the catalogue, cart, confirmation flow, a PromptPay QR with the
    amount filled in, one-tap slip acceptance, procedure booking that reveals the
    address only after confirmation, holds with automatic release, and a waiting list.
    The project is covered by 25 tests, and the QR generator is verified against the
    reference Thai library on five data sets.
screenshots: []
---

The bot runs on a test environment: the salon's live channel, group and account are
connected in a separate stage. Environment here is configuration, not code — the same
code runs with `--env test` or `--env prod`, and only chat IDs and the token differ.
Moving to production is a settings file, not a manual copy.
