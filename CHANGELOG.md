# Changelog

All notable changes to this package. Versions follow [Semantic Versioning](https://semver.org/):
while the version is `0.x`, a minor release (`0.2.0`) may change the API and a patch release
(`0.1.2`) does not.

## [Unreleased]

## [0.1.1]

- **Multi-account order → Close Positions:** closes the position each filled account opened, every
  account at once, and outputs a result per account (`closed`, `not_found`, `rejected`,
  `unresolved` or `skipped`). Needs an idempotency key; **Account IDs** closes only some accounts.
- **Multi-account order → Retry:** places a new multi-account order for the accounts that were
  `skipped`, or also `rejected` with **Include**, linked to the original by `retryOf` and
  `retriedBy`. Needs an idempotency key; **Barrier Policy**, **Execute At** and **Expires At** are
  optional.
- The new `wave.updated` event, sent when an unresolved account of a settled multi-account order is
  confirmed with the broker, is offered by the **fxapis Trigger**, **Webhook → Create / Update**, and
  the event filters of **Event → Get Many** and **Webhook → Get Many Deliveries**.
- **Multi-account order → Get** describes the per-account results as the API now reports them:
  `rejected` means only that the broker refused; an account whose order was never sent is
  `skipped`. Accounts carry `filledVolume` and `partiallyFilled`, and the summary counts
  `partiallyFilled`.
- Errors: `WAVE_NOT_ENDED` says to wait until the multi-account order has ended and send again with
  the same key; `NOTHING_TO_RETRY` and `WAVE_ALREADY_RELEASING` are never marked retryable.
- **README:** rewritten to be complete and checked against the code: installing from the n8n UI and
  by hand, compatibility, both credentials and how to get an API key, the scopes each operation
  needs, every resource and operation, resource locators, pagination and Return All, idempotency
  keys, multi-account orders, every trigger event with signature verification and duplicate
  deliveries, errors, retries and rate limits, AI agents, the example workflows, links and the
  version history. A test now fails if an operation or trigger event is missing from it.

## [0.1.0]

The first release of the fxapis n8n community node and its webhook trigger.

- **Accounts:** get many, get, connect, status, figures, activity, bring online (one or many), take
  offline, restart, reconcile, change mode, update password, change server, calculate margin or
  profit, disconnect and delete.
- **Trading:** market and pending orders, modify and cancel pending orders, close (whole or partial)
  and modify positions, remove a stop loss or take profit, multi-account orders, order and account
  deals.
- **Market data:** quotes, price history (candles), market hours, broker symbols and symbol sync,
  instrument mapping, instruments, broker server search.
- **Events and webhooks:** the event log with catch-up after an event ID, and full webhook
  management including deliveries, redelivery and replay.
- **Copy trading** (coming soon), **billing** reads and **workspace**.
- Two credentials: **fxapis API** for the key, and **fxapis MT5 Login** for the broker login, so the
  trading password is never a node parameter.
- *Get Many* operations output one item per record, with **Return All** and **Limit**.
- Optional fields are sent only when added. Accounts, orders, positions, webhooks, strategies,
  subscriptions, multi-account orders and invoices can be picked from a list.
- Orders that open or close exposure require an idempotency key. A new key is a new order.
- Errors carry the API's code, guidance and request ID; with Continue On Fail they come out as
  `{ error: { code, message, status, requestId, retryable, retryAfter } }`.
- **fxapis Trigger:** registers its webhook on activation, checks that it still exists and matches on
  every activation, verifies each delivery's signature, and removes the endpoint on deactivation.
- Usable as a tool by n8n AI agents.
- Example workflows in `examples/`.
