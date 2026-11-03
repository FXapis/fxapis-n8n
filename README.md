<div align="center">

<img src="https://fxapis.com/logo.png" alt="" width="72" height="72">

# fxapis

**The official n8n node for fxapis — the hosted MetaTrader 5 REST API**

[Website](https://fxapis.com) · [Docs](https://docs.fxapis.com) · [API Reference](https://docs.fxapis.com/api-reference) · [Changelog](CHANGELOG.md) · [Status](https://status.fxapis.com) · [Support](mailto:support@fxapis.com)

[![License: MIT](https://img.shields.io/badge/license-MIT-22D3D6?style=flat-square)](LICENSE)
[![ci](https://img.shields.io/github/actions/workflow/status/FXapis/fxapis-n8n/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/FXapis/fxapis-n8n/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/n8n-nodes-fxapis?style=flat-square&color=22D3D6)](https://www.npmjs.com/package/n8n-nodes-fxapis)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A520.19-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![fxapis status](https://status.fxapis.com/badge.svg)](https://status.fxapis.com)

</div>

---

Trade MetaTrader 5 accounts from n8n. Connect an MT5 account once, then place market and pending orders, close and modify positions, send one trade to many accounts and close or retry it, read prices, history and account figures, manage webhooks, and start workflows from signed fxapis webhooks.

You run **no MetaTrader terminal, no Windows VPS and no EA**: fxapis runs the MT5 connection for you. This package is an n8n community node with two nodes, **fxapis** and **fxapis Trigger**. It is not built by n8n, and it has not yet been submitted for n8n verification.

MT5 only (MT4 is not supported).

> [!WARNING]
> **Test keys reach real brokers.** An `fx_test_` key is a label for your configuration, not a sandbox. Build and test with a **broker demo account**.

## Table of contents

- [Installation](#installation)
- [Compatibility](#compatibility)
- [Credentials](#credentials)
- [Quickstart](#quickstart)
- [Operations](#operations)
- [Picking records: resource locators](#picking-records-resource-locators)
- [Lists, pagination and Return All](#lists-pagination-and-return-all)
- [Optional fields](#optional-fields)
- [Idempotency keys](#idempotency-keys)
- [Multi-account orders](#multi-account-orders)
- [Trigger](#trigger)
- [Errors, retries and rate limits](#errors-retries-and-rate-limits)
- [Using fxapis with AI agents](#using-fxapis-with-ai-agents)
- [Copy trading](#copy-trading)
- [Example workflows](#example-workflows)
- [Version history](#version-history)
- [Links](#links)
- [Related fxapis repositories](#related-fxapis-repositories)
- [Contributing](#contributing)
- [License](#license)

## Installation

The package is [`n8n-nodes-fxapis`](https://www.npmjs.com/package/n8n-nodes-fxapis) on npm.

### In the n8n UI (Community Nodes)

On a self-hosted n8n, as an owner or admin:

1. Open **Settings → Community Nodes** and choose **Install**.
2. Enter `n8n-nodes-fxapis`, confirm that you understand the risks of installing unverified code, and choose **Install**.
3. Search the node panel for **fxapis**. You get the **fxapis** node and the **fxapis Trigger**.

To update later, use the same page. See n8n's guide to [installing community nodes](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/).

n8n Cloud installs only community nodes that n8n has verified. This one has not been verified yet, so on n8n Cloud it is not available until it is.

### Self-hosted, from the command line

For an n8n where the UI install is switched off, or in a container you build yourself, install the package into n8n's nodes folder and restart n8n:

```bash
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install n8n-nodes-fxapis
# then restart n8n
```

In Docker, run the same commands inside the container (for example `docker exec -it <container> sh`) in the n8n user's `~/.n8n/nodes`, with that folder on a persistent volume, then restart the container. See n8n's guide to [manual installation](https://docs.n8n.io/integrations/community-nodes/installation/manual-install/).

The node has no runtime dependencies, reads no environment variables and writes no files.

## Compatibility

| | |
|---|---|
| n8n | n8n 1.x and 2.x. Built with n8n's node tooling against `n8n-workflow` 2.x, community nodes API version 1. |
| Node.js | 20.19 or newer, as n8n itself requires |
| fxapis API | `https://api.fxapis.com/v1` |
| Platforms | MetaTrader 5 only |

## Credentials

The node uses two credential types. n8n stores both encrypted, never in the workflow itself.

| Credential (as n8n shows it) | Fields | Used by |
|---|---|---|
| **Fxapis API** | API key, API base URL | Every operation of the **fxapis** node, and the **fxapis Trigger** |
| **Fxapis MT5 Login API** | Login, server, trading password | Only **Account → Connect** and **Account → Update Password** |

### Fxapis API

**Getting a key.** Sign in at [fxapis.com](https://fxapis.com), open **API keys** in the console, create a key with the scopes your workflows need, and copy it: the key is shown once. Keys start with `fx_live_` or `fx_test_`; both reach real brokers. See [Authentication](https://docs.fxapis.com/authentication).

**In n8n.** Paste the key into **API Key**. Leave **API Base URL** as `https://api.fxapis.com`. The base URL must be HTTPS with no user name or password in it, and a private or local host is refused before the key is sent.

Saving the credential tests it with `GET /v1/workspace`: a wrong or revoked key shows `UNAUTHENTICATED`, and a key that cannot read the workspace shows `MISSING_SCOPE` (give it `accounts:read`).

Give the key only the [scopes](https://docs.fxapis.com/authentication#scopes) your workflows need:

| You want to | Scope |
|---|---|
| Read accounts, status, figures, activity, broker symbols, market hours, instrument mapping and the workspace | `accounts:read` |
| Connect, bring online, take offline, restart, disconnect, delete, change mode, password or server, sync symbols | `accounts:write` |
| Read orders, positions, multi-account orders and copy trading; quotes and price history; calculate margin or profit; reconcile | `trading:read` |
| Close positions, move or remove their stops, cancel pending orders and multi-account orders, close the positions of a multi-account order, and nothing that opens | `trading:reduce` |
| Place market and pending orders, modify a pending order, create and retry multi-account orders, and manage copy trading | `trading:execute` |
| Read deals and the event log | `history:read` |
| Read invoices, the billing subscription and daily usage | `billing:read` |
| Manage webhooks, and use the **fxapis Trigger** | `webhooks:write` |

### Fxapis MT5 Login API

Your broker login (the MT5 account number), the server name exactly as MetaTrader shows it, and the **trading** password (not the investor password). It is a credential rather than a node parameter so that the password never sits in clear in the workflow JSON, in exports or in version history; no node parameter holds a password. fxapis encrypts the password on arrival and never returns it.

Saving this credential only checks that the login is digits and the server and password are filled in. The broker checks the login when the account connects.

## Quickstart

1. Add an **Fxapis API** credential with your API key.
2. **Account → Connect**: choose an **Fxapis MT5 Login API** credential and a mode (**On Demand** suits most workflows).
3. **Account → Bring Online**, then **Account → Get Status** until `state` is `ready`.
4. **Order → Place Market Order**: pick the account from the list, name the market by broker symbol (`EURUSD`), send the volume as `0.01`, and set an idempotency key you can reuse, such as `{{ $json.signalId }}`.

## Operations

The **fxapis** node has 15 resources and 79 operations. Each operation calls the [fxapis API](https://docs.fxapis.com/api-reference) and outputs its answer: a single record is one item, and a list is one item per record.

### Account

| Operation | What it does |
|---|---|
| Get Many | List the MT5 accounts in the workspace |
| Get | Retrieve an account with its last balance and equity |
| Connect | Connect an MT5 account with the login, server and trading password from an fxapis MT5 Login credential |
| Get Status | Read the account state. Poll until it is ready before sending an order. |
| Get Figures | Balance, equity and margin of an account |
| Get Activity | What happened to an account, newest first: added, logging in, refused by the broker, online, taken offline |
| Bring Online | Start the account and return at once. Poll its status until it is ready. |
| Bring Many Online | Start every listed account and return at once. Poll each status until it is ready. |
| Take Offline | Stop the account's connection. Refused while an order is in flight. |
| Restart | For an online account that misbehaves: degraded, stale quotes, a stuck sync. Poll its status until it is ready. |
| Reconcile | Confirm every order still in unknown on this account and bring deals and positions up to date. Safe to call twice. |
| Change Mode | Change when the account stays connected. Takes effect the next time it comes online. |
| Update Password | Send a new trading password and server from an fxapis MT5 Login credential. The account is taken offline first. |
| Change Server | For a login added under the wrong server name. The stored password is kept and tried on the new server. |
| Calculate | Margin an order needs, or profit at a price, from the broker. Opens nothing. The account must be online. |
| Disconnect | Erase the stored password. The history stays. |
| Delete | Delete the account with its orders, deals and positions permanently. Disconnect instead to keep the history. |

### Order

| Operation | What it does |
|---|---|
| Get Many | Orders in this workspace, newest first. Filter by state to find unknown outcomes. |
| Get | Retrieve an order, including an unknown outcome |
| Place Market Order | Send a market order and wait for the broker. Reuse the idempotency key on retry. *Idempotency key required.* |
| Place Pending Order | Place a limit, stop or stop-limit order. Reuse the idempotency key on retry. *Idempotency key required.* |
| Modify | Move a working pending order's price, stops or expiry and keep its ticket |
| Cancel | Cancel a pending order that has not filled |
| Get Deals | The broker deals one order produced. A partial fill leaves more than one. |

### Position

| Operation | What it does |
|---|---|
| Get Many | Open positions on an account |
| Close | Close a position in whole, or in part with a volume. A retry with a new key can open the other side. *Idempotency key required.* |
| Modify | Move or remove the stop loss or take profit. This opens nothing. |

### Deal

| Operation | What it does |
|---|---|
| Get Many | An account's deal history from the broker, newest first |

### Multi-Account Order

| Operation | What it does |
|---|---|
| Create | One market order on each listed account. Reuse the idempotency key on retry. *Idempotency key required.* |
| Get Many | Multi-account orders in this workspace, newest first |
| Get | Retrieve a multi-account order with its per-account results: filled (fully or in part), rejected by the broker, skipped (never sent) or unresolved |
| Cancel | Cancel a multi-account order whose orders have not started going out |
| Close Positions | Close the position each filled account opened, every account at once, with a result per account. Reuse the idempotency key on retry. *Idempotency key required.* |
| Retry | Place a new multi-account order for the accounts that were skipped, linked by retryOf. Reuse the idempotency key on retry. *Idempotency key required.* |

### Market Data

| Operation | What it does |
|---|---|
| Get Quotes | Bid and ask from the account's broker, up to 20 names. The account must be online. |
| Get Price History | Candles from the account's broker, oldest first. The last one is still forming. The account must be online. |
| Get Market Hours | Trading and quote sessions for a symbol from the account's broker, and whether it is open now |
| Get Many Symbols | The symbols the account's broker offers |
| Sync Symbols | Read the broker's symbol list again, for when the broker has added symbols. The account must be online. |
| Get Instrument Mapping | For every instrument, the symbol an order naming it trades on this account, or why it cannot |

### Instrument

| Operation | What it does |
|---|---|
| Get Many | The markets an order can name as an instrument, such as EURUSD and XAUUSD |

### Broker Server

| Operation | What it does |
|---|---|
| Search | MT5 servers matching a broker or server name, for finding the exact server name |

### Event

| Operation | What it does |
|---|---|
| Get Many | Every event this workspace recorded, as webhooks deliver it. Use After to catch up oldest first. |
| Get | Retrieve one event |

### Webhook

| Operation | What it does |
|---|---|
| Get Many | Webhook endpoints, newest first. Secrets are not returned. |
| Create | Register a public HTTPS URL on port 443. The signing secret is returned once. |
| Get | Retrieve an endpoint, including its last delivery and why it was switched off |
| Update | Change the URL, events or description. The secret stays the same. |
| Delete | Delete an endpoint permanently, including retries already waiting |
| Enable | Send events again from the next one. Missed events are sent only if you replay them. |
| Disable | Stop sending until it is enabled again. Waiting deliveries are kept. |
| Rotate Secret | Issue a new secret, returned once. For 24 hours deliveries are signed with both secrets. |
| Send Test | Send webhook.test to this endpoint only. The delivery log has the result. |
| Get Many Deliveries | Delivery attempts to an endpoint, newest first, kept 30 days |
| Get Delivery | One delivery attempt, with the request sent and the start of the answer |
| Redeliver | Queue one event to this endpoint again, with the same event ID |
| Replay | Queue a window of events. By default only those this endpoint did not receive, so a repeat sends nothing twice. |

### Copy Strategy

| Operation | What it does |
|---|---|
| Get Many | Copy-trading strategies in this workspace, newest first |
| Create | Make an always-on hedging account a strategy. Copy trading is coming soon: until then the API answers 503 COPY_TRADING_PAUSED. |
| Get | Retrieve a strategy |
| Update | Rename, pause or resume a strategy. A paused strategy is not copied. |
| Archive | Archive a strategy no subscription copies. The account can become a strategy again. |

### Copy Subscription

| Operation | What it does |
|---|---|
| Get Many | Followers, newest first, with status, settings and the last execution |
| Create | Subscribe a follower account to a strategy. Copy trading is coming soon: until then the API answers 503 COPY_TRADING_PAUSED. |
| Get | Retrieve a subscription |
| Update | Change settings or status. Settings merge into what is there; lists replace. |
| Delete | Delete a subscription, and close its positions or leave them open as the account's own |
| Reset | Bring a subscription a risk limit stopped back to active or paused. Copy trading is coming soon: until then the API answers 503 COPY_TRADING_PAUSED. |
| Get Many Links | Which follower position copies which master position |

### Copy Trading

| Operation | What it does |
|---|---|
| Get Status | Whether copy trading is paused. While paused, nothing that starts copying is accepted. |
| Get Many Executions | What each master change did on each follower, newest first |

### Billing

| Operation | What it does |
|---|---|
| Get Usage | This month's usage and what it would cost. Closing is never refused for billing. |
| Get Daily Usage | Usage by day, for a chart or for checking an invoice line |
| Get Subscription | The plan being paid for, or null when nothing is |
| Get Plans | The plans and what each includes |
| Get Many Invoices | Invoices, newest first. Amounts are in minor units. |
| Get Invoice | One invoice, with its lines, payment status and refunds |
| Get Coins | Coins accepted for crypto payment, each with the network to send it on |

### Workspace

| Operation | What it does |
|---|---|
| Get | The workspace name, plan, and whether trading is switched off |

## Picking records: resource locators

Every account, order, position, multi-account order, webhook, copy strategy, copy subscription and invoice field can be set **From List** or **By ID**.

- **From List** searches as you type, on the name and the ID. Accounts show their label or login, server and state; orders show side, volume, symbol, type, state and time; multi-account orders show their label (or side and market), state and time; webhooks show their description or URL.
- **Position** lists the open positions of the account chosen above it, by broker ticket.
- **By ID** takes the ID, or an expression such as `{{ $json.orderId }}`.

## Lists, pagination and Return All

Every *Get Many* operation (and **Broker Server → Search**, **Account → Get Activity**, **Webhook → Get Many Deliveries**, **Copy Subscription → Get Many Links**) outputs **one n8n item per record**.

- **Return All** on: the node follows the API's pages to the end, asking for the largest page the API allows.
- **Return All** off: **Limit** (default 50) stops after that many records.
- **Event → Get Many** with **After Event ID** pages oldest first from that event, so you can catch up after downtime: set it to the last event you processed and turn on **Return All**.

## Optional fields

Required fields are on the node. Everything else is under **Additional Fields**, **Update Fields**, **Filters** or **Options**, and is sent only when you add it. For example, a market order sends no slippage limit unless you add **Deviation Points**, so the broker's own default applies.

- **Volumes and prices** are text, such as `0.01` or `1.08450`, so no rounding reaches the broker.
- **Lists** such as **Account IDs** are comma-separated; **Weights** and copy settings are JSON.
- **Removing a stop.** On **Position → Modify** and **Order → Modify**, add **Remove Stop Loss** or **Remove Take Profit** to clear it. Leaving a field out keeps what is there; setting a value and removing it at once is refused.

## Idempotency keys

These operations refuse to run without an **Idempotency Key**, and the node never invents one:

- **Order → Place Market Order** and **Place Pending Order**
- **Position → Close**
- **Multi-Account Order → Create**, **Close Positions** and **Retry**

The key is sent as the `Idempotency-Key` header. The same key returns the first answer instead of placing a second order. A new key is a new order, and a close retried with a new key can open the other side.

Derive the key from what caused the trade, such as a signal or alert ID (`{{ $json.signalId }}`), never from the current time, and use a different key for each kind of action (for example `wave:<signal>`, `close:<signal>`, `retry:<signal>`). Then n8n's **Retry On Fail**, or running the workflow again, cannot trade twice. See [Idempotency](https://docs.fxapis.com/guides/idempotency).

## Multi-account orders

A multi-account order places one market order on many accounts at once (in the API, an *execution wave*). See [Multi-account orders](https://docs.fxapis.com/guides/multi-account-orders).

1. **Create** with the account IDs, the market, side and volume, and optionally per-account **Weights**, stops, a **Barrier Policy** for accounts that are not online in time, and **Execute At** / **Expires At**. It answers at once with state `planned`.
2. **Get** (or the `wave.settled` event) until `state` is `settled`, `cancelled` or `abandoned`. Each account in `legs` has its own result:
   - `filled`: its order filled, fully or in part. `filledVolume` says how much, and `partiallyFilled` is `true` when only in part; `summary.partiallyFilled` counts them.
   - `rejected`: the broker refused it. `stateDetail` says why.
   - `skipped`: it never reached the broker (not online in time, trading switched off, no price, and so on). `stateDetail` says why.
   - `unresolved`: not known yet. **Do not resend.** It moves to `filled`, `rejected` or `skipped` once confirmed with the broker, and a `wave.updated` event says so.
3. **Cancel** works only before any order has gone out.
4. **Close Positions** closes the position each filled account opened, every account at once, and outputs one item with a `summary` and a result per account: `closed`, `not_found` (already closed), `rejected`, `unresolved` (do not resend; poll the close order) or `skipped` (nothing sent). Add **Account IDs** to close only some accounts.
5. **Retry** places a **new** multi-account order for the accounts that were `skipped`, with the same market, side, per-account volumes, stops and comment. Add `rejected` to **Include** to retry those too, and narrow it with **Account IDs**. A cancelled or abandoned order sent nothing, so every account is retried; an `unresolved` account never is. The new order's `retryOf` is the original, and the original's `retriedBy` lists it.

**Close Positions** and **Retry** work only once the order has ended; before that the API answers `WAVE_NOT_ENDED`. **Retry** answers `NOTHING_TO_RETRY` when no account matches.

## Trigger

**fxapis Trigger** starts a workflow when fxapis sends a webhook. Choose the **Events** it should receive, or leave it empty to receive every event.

| Event | When |
|---|---|
| `order.filled` | An order filled, fully or in part |
| `order.rejected` | The broker refused an order |
| `order.unresolved` | An order was sent and no answer came back |
| `order.resolved` | An unresolved order's outcome was found |
| `order.cancelled` | A pending order was withdrawn |
| `position.opened` | A position appeared on the account |
| `position.closed` | A position is gone from the account, whatever closed it |
| `account.state_changed` | An account came online, went offline, or needs you (for example a wrong password) |
| `wave.settled` | A multi-account order finished: `settled`, `cancelled` or `abandoned` |
| `wave.updated` | After a multi-account order settled, an unresolved account's order was confirmed with the broker and the account is now `filled`, `rejected` or `skipped` |
| `copy.executed` | A copy reached a follower's broker |
| `copy.skipped` | A copy was not sent |
| `copy.failed` | A copy was sent and refused, or its result is unknown |
| `copy.subscription_stopped` | A copy subscription stopped |
| `copy.drift_corrected` | A follower was put right after drifting from its master |
| `copy.master_disconnected` | A strategy's master stopped answering |

Each execution outputs one item: the event as fxapis sent it, with `id`, `type`, `createdAt` and `data` (the order, position, account or multi-account order as the API returns it). A **Webhook → Send Test** to the trigger's endpoint arrives as a `webhook.test` event. See [Webhooks](https://docs.fxapis.com/guides/webhooks) for every event's `data`.

### Registration

When n8n activates the trigger, it registers its webhook URL with fxapis for the chosen events and keeps the endpoint's ID and signing secret in the workflow's static data. On every activation it checks that the endpoint still exists, is enabled, points at the current URL and has the chosen events; if not, it deletes the old endpoint and registers a new one. Deactivating the workflow deletes the endpoint.

- **Public HTTPS on port 443 only.** fxapis delivers only to a public host over HTTPS on port 443. n8n Cloud works as it is. A self-hosted n8n must be reachable at a public HTTPS address on port 443, for example behind a reverse proxy or a tunnel, and n8n must be configured to give out that address as its webhook URL.
- A workspace can have up to 10 webhook endpoints, and each active trigger uses one.

### Signature verification

Every delivery carries an `fxapis-signature` header of the form `t=<unix seconds>,v1=<hex>`. Before the workflow starts, the trigger computes HMAC-SHA256 over `<t>.<raw request body>` with the endpoint's secret and compares it, in constant time, with each `v1` value; it accepts the delivery only if one matches and `t` is within 5 minutes of now.

- A missing, malformed, stale or wrong signature is answered `401` and starts nothing.
- A delivery without a raw body, or a trigger with no stored secret, is answered `400`.
- While a secret is being rotated, deliveries carry a `v1` for each secret, and either matches.

If you rotate the trigger endpoint's secret yourself (**Webhook → Rotate Secret**), the trigger keeps the old one and starts refusing deliveries once the old secret stops being used. Deactivate and activate the workflow instead: that registers a new endpoint with a new secret.

### Duplicate and missed deliveries

- **At least once.** The same event can arrive more than once, for example after a timeout or a redelivery. Each event's `id` is the same every time: de-duplicate on it, for instance with n8n's **Remove Duplicates** node set to *Remove Items Processed in Previous Executions* on `{{ $json.id }}`.
- **Not in order.** Deliveries can arrive in any order. Use `createdAt`, or read the resource again, when order matters.
- **Catching up.** fxapis retries failed deliveries. After a longer outage, use **Event → Get Many** with **After Event ID** set to the last event you processed from a list, and turn on **Return All**; or **Webhook → Replay** to queue a window of events to the endpoint again.

## Errors, retries and rate limits

A failed request shows the API's `code` and message, what to do next, and the `requestId` that support can find. API keys, webhook secrets and passwords are redacted from error text.

With **On Error → Continue (using error output)** or **Continue**, a failed item comes out as:

```json
{ "error": { "code": "ORDER_UNRESOLVED", "message": "…", "status": 503, "requestId": "…", "retryable": false, "retryAfter": null } }
```

Match on `code`; `message` is for a person. A parameter problem found before anything is sent (an empty idempotency key, invalid JSON) has code `INVALID_PARAMETER` and status `null`; a network failure that got no answer has code `REQUEST_FAILED`.

| Code | What to do |
|---|---|
| `ORDER_UNRESOLVED` | Do not send the order again. Poll **Order → Get** until it leaves `unknown`, or run **Account → Reconcile**. |
| `SEND_FAILED`, `ACCOUNT_NOT_READY`, `NO_RUNTIME`, `IDEMPOTENCY_IN_FLIGHT` | Nothing was opened. Retry with the **same** idempotency key. |
| `ORDER_REJECTED` | The broker refused it. A retry needs a **new** key, and only if `retryable` is true. |
| `IDEMPOTENCY_KEY_REUSED` | That key was already used for a different request. Use a new key for a new decision. |
| `WAVE_NOT_ENDED` | The multi-account order has not ended. Wait until it is `settled`, `cancelled` or `abandoned`, then send again with the same key. |
| `NOTHING_TO_RETRY`, `WAVE_ALREADY_RELEASING` | Nothing to do as sent: no account matched, or the orders have already gone out (close them instead, once it has settled). |
| `RATE_LIMITED` | Wait `retryAfter` seconds, then retry with the same key. |
| `UNAUTHENTICATED`, `MISSING_SCOPE` | Fix the key or its scopes. |
| `COPY_TRADING_PAUSED` | Copy trading is coming soon. |

**Retries.** `retryable` follows the [error catalogue](https://docs.fxapis.com/errors): it is `true` only for answers that are safe to send again as they are. The node never retries by itself. n8n's **Retry On Fail** is safe on orders only because the idempotency key stays the same; set its wait to at least the `retryAfter` you expect.

**Rate limits.** The API limits requests per workspace and per class of work (trading, multi-account orders, reads, live reads, other writes). Over a limit it answers `429 RATE_LIMITED` with a `retry-after` header, which the node reports as `retryAfter` in seconds and in the error text. See [Rate limits](https://docs.fxapis.com/errors#rate-limits).

## Using fxapis with AI agents

The **fxapis** node is usable as a tool by n8n's **AI Agent**. Each tool node does the one operation you configured on it, with the parameters you fixed or left to the model; the agent cannot reach any other operation.

- **Trading tools place real orders.** An agent with **Place Market Order**, **Position → Close**, or **Multi-Account Order → Create**, **Close Positions** or **Retry** can trade. Connect only broker demo accounts until you trust the workflow.
- **Use a narrow key.** Give the agent's credential an API key with only the scopes it needs, for example `accounts:read` and `trading:read` for an agent that only reports, or `trading:reduce` for one that may close but never open. See [Credentials](#credentials).
- **Idempotency keys still apply.** Let the model supply one with `{{ $fromAI('idempotencyKey', 'A key unique to this trade decision; reuse it if you retry the same decision') }}`, or derive it from the incoming message ID so a retried run does not trade twice.
- **Multi-account results are per account.** Tell the agent to read `legs[].state` from **Multi-Account Order → Get**: `skipped` accounts can be retried, `unresolved` ones must not be.
- **Keep money changes out of reach.** There are no billing write operations in this node.

## Copy trading

Copy trading is **coming soon**. Until then the API answers `503 COPY_TRADING_PAUSED` to anything that starts copying (creating a strategy or subscription, resuming, resetting). Reading, pausing, changing settings and deleting work. **Copy Trading → Get Status** says whether it is paused.

## Example workflows

Import any of these with *Workflows → Import from File*. Each uses placeholders you replace and is meant for a broker demo account.

| File | What it does |
|---|---|
| [`examples/tradingview-to-market-order.json`](examples/tradingview-to-market-order.json) | A TradingView-style alert to an n8n Webhook node, checked against a shared secret, places a market order, with the alert ID as the idempotency key |
| [`examples/order-filled-notify.json`](examples/order-filled-notify.json) | **fxapis Trigger** on `order.filled`, de-duplicated on the event ID with **Remove Duplicates**, sends a notification |
| [`examples/scheduled-account-health.json`](examples/scheduled-account-health.json) | Every 15 minutes, gets every account and sends an alert for any that needs attention, has trading switched off, or has a margin level under 150% |

## Version history

| Version | Changes |
|---|---|
| 0.1.1 | Multi-account order **Close Positions** and **Retry**, the `wave.updated` event, per-account `filledVolume` and `partiallyFilled`, `rejected` meaning only a broker refusal, guidance for the new error codes, and this complete README |
| 0.1.0 | First release: the **fxapis** node and the **fxapis Trigger** |

Every change is in the [changelog](CHANGELOG.md). Releases are on [npm](https://www.npmjs.com/package/n8n-nodes-fxapis?activeTab=versions) and [GitHub](https://github.com/FXapis/fxapis-n8n/releases). For changes to the fxapis API itself, see the [API changelog](https://docs.fxapis.com/changelog).

## Links

- [fxapis docs](https://docs.fxapis.com) and [API reference](https://docs.fxapis.com/api-reference)
- [Authentication and scopes](https://docs.fxapis.com/authentication) · [Errors](https://docs.fxapis.com/errors) · [Webhooks](https://docs.fxapis.com/guides/webhooks) · [Idempotency](https://docs.fxapis.com/guides/idempotency) · [Multi-account orders](https://docs.fxapis.com/guides/multi-account-orders)
- [Changelog of this node](CHANGELOG.md) · [API changelog](https://docs.fxapis.com/changelog)
- Support: [support@fxapis.com](mailto:support@fxapis.com) · Status: [status.fxapis.com](https://status.fxapis.com) · Bugs in the node: [GitHub issues](https://github.com/FXapis/fxapis-n8n/issues)

## Related fxapis repositories

| Repository | What it is |
|---|---|
| [`fxapis-typescript`](https://github.com/FXapis/fxapis-typescript) | The official TypeScript SDK |
| [`fxapis-python`](https://github.com/FXapis/fxapis-python) | The official Python SDK |
| [`fxapis-examples`](https://github.com/FXapis/fxapis-examples) | Runnable examples |
| [`fxapis-integrations`](https://github.com/FXapis/fxapis-integrations) | Postman collection, TradingView payloads, n8n HTTP Request templates |
| [`fxapis-mcp-examples`](https://github.com/FXapis/fxapis-mcp-examples) | AI agents over MCP |
| [`fxapis-nextjs-starter`](https://github.com/FXapis/fxapis-nextjs-starter) | A small Next.js app |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New endpoints belong in `nodes/Fxapis/catalog.ts`, not in a second node; the tests check that this README lists every operation and every trigger event.

## License

[MIT](LICENSE) © 2026 El Wizard
