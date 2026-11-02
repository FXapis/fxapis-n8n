<div align="center">

<img src="https://fxapis.com/logo.png" alt="" width="72" height="72">

# fxapis

**The official n8n node for fxapis — the hosted MetaTrader 5 REST API**

[Website](https://fxapis.com) · [Docs](https://docs.fxapis.com) · [API Reference](https://docs.fxapis.com/api-reference) · [Status](https://status.fxapis.com) · [Support](mailto:support@fxapis.com)

[![License: MIT](https://img.shields.io/badge/license-MIT-22D3D6?style=flat-square)](LICENSE)
[![ci](https://img.shields.io/github/actions/workflow/status/FXapis/fxapis-n8n/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/FXapis/fxapis-n8n/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/n8n-nodes-fxapis?style=flat-square&color=22D3D6)](https://www.npmjs.com/package/n8n-nodes-fxapis)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A520.19-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![fxapis status](https://status.fxapis.com/badge.svg)](https://status.fxapis.com)

</div>

---

Trade MetaTrader 5 accounts from n8n. Connect an MT5 account once, then place market and pending orders, close and modify positions, send one trade to many accounts, read prices, history and account figures, and start workflows from signed fxapis webhooks.

You run **no MetaTrader terminal, no Windows VPS and no EA**: fxapis runs the MT5 connection for you. This package is an n8n community node. It is not built by n8n, and it has not yet been submitted for n8n verification.

MT5 only (MT4 is not supported).

## Table of contents

- [Installation](#installation)
- [Credentials](#credentials)
- [Quickstart](#quickstart)
- [Orders and idempotency](#orders-and-idempotency)
- [What the node can do](#what-the-node-can-do)
- [Lists and optional fields](#lists-and-optional-fields)
- [Trigger](#trigger)
- [Using fxapis with AI agents](#using-fxapis-with-ai-agents)
- [Copy trading](#copy-trading)
- [Error handling](#error-handling)
- [Example workflows](#example-workflows)
- [Related fxapis repositories](#related-fxapis-repositories)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Installation

**From n8n:** *Settings → Community Nodes → Install*, enter `n8n-nodes-fxapis`, and confirm. Then search the node panel for **fxapis**. See n8n's guide to [installing community nodes](https://docs.n8n.io/integrations/community-nodes/installation/).

**Self-hosted, by hand:** install the package in your n8n custom folder (`~/.n8n/custom` by default) with `npm install n8n-nodes-fxapis`, then restart n8n.

The node works on n8n 1.x and 2.x. It has no runtime dependencies, reads no environment variables and touches no files.

> [!WARNING]
> **Test keys reach real brokers.** An `fx_test_` key is a label for your configuration, not a sandbox. Build and test with a **broker demo account**.

## Credentials

The node uses two credential types. Both are stored encrypted by n8n, never in the workflow itself.

| Credential | Fields | Used by |
|---|---|---|
| **fxapis API** | API key, API base URL | Every operation and the trigger |
| **fxapis MT5 Login** | MT5 login, server, trading password | Only **Account → Connect** and **Account → Update Password** |

**fxapis API.** Create an API key in the console at [fxapis.com](https://fxapis.com) and paste it in. Leave the base URL as `https://api.fxapis.com`; private and non-HTTPS hosts are refused. Saving the credential runs a test call to `GET /v1/workspace`, so a wrong key shows `UNAUTHENTICATED` straight away. Give the key only the [scopes](https://docs.fxapis.com/authentication#scopes) your workflows need:

| You want to | Scope |
|---|---|
| Read accounts, status, figures, prices, symbols and market hours | `accounts:read` |
| Connect, bring online, take offline, restart, disconnect, change mode or password | `accounts:write` |
| Read orders, positions and multi-account orders; calculate margin | `trading:read` |
| Close positions, move stops, cancel orders, and nothing that opens | `trading:reduce` |
| Place orders, pending orders and multi-account orders | `trading:execute` |
| Read deals and the event log | `history:read` |
| Read invoices, the billing subscription and daily usage | `billing:read` |
| Manage webhooks, and use the **fxapis Trigger** | `webhooks:write` |

**fxapis MT5 Login.** Your broker login, the server name exactly as MetaTrader shows it, and the **trading** password (not the investor password). It is a credential rather than a node parameter so that the password never sits in clear in the workflow JSON, in exports or in version history. fxapis encrypts the password on arrival and never returns it. Saving this credential only checks that the fields are filled in; the broker checks the login when the account connects.

## Quickstart

1. Add an **fxapis API** credential with your API key.
2. **Account → Connect**: choose an **fxapis MT5 Login** credential and a mode (**On Demand** suits most workflows).
3. **Account → Bring Online**, then **Account → Get Status** until `state` is `ready`.
4. **Order → Place Market Order**: pick the account from the list, name the market by broker symbol (`EURUSD`), send volume as `0.01`, and set an idempotency key you can reuse, such as `{{ $json.signalId }}`.

Every account, order, position, webhook and strategy field can be picked **From List** or entered **By ID**.

## Orders and idempotency

**Place Market Order**, **Place Pending Order**, **Position → Close** and **Multi-Account Order → Create** refuse to run without an idempotency key. The node never invents one. The same key returns the first answer instead of placing a second order; a new key places a new order, and a retried close with a new key can open the other side.

Derive the key from what caused the trade, such as a signal ID, never from the current time. See [Idempotency](https://docs.fxapis.com/guides/idempotency).

## What the node can do

| Resource | Operations |
|---|---|
| Account | Get many, get, connect, get status, get figures, get activity, bring online, bring many online, take offline, restart, reconcile, change mode, update password, change server, calculate margin or profit, disconnect, delete |
| Order | Get many, get, place market order, place pending order, modify a pending order, cancel, get deals |
| Position | Get many, close (whole or partial), modify or remove stop loss and take profit |
| Deal | Get many (an account's deal history) |
| Multi-account order | Create, get many, get, cancel |
| Market data | Get quotes, get price history (candles), get market hours, get many symbols, sync symbols, get instrument mapping |
| Instrument | Get many |
| Broker server | Search |
| Event | Get many (including catch-up after an event ID), get |
| Webhook | Get many, create, get, update, delete, enable, disable, rotate secret, send test, get many deliveries, get delivery, redeliver, replay |
| Copy strategy | Get many, create, get, update, archive |
| Copy subscription | Get many, create, get, update, delete, reset, get many links |
| Copy trading | Get status, get many executions |
| Billing | Get usage, get daily usage, get subscription, get plans, get many invoices, get invoice, get coins |
| Workspace | Get |

New endpoints belong in `nodes/Fxapis/catalog.ts`, not in a second node.

## Lists and optional fields

**Lists.** Every *Get Many* operation outputs one n8n item per record. Turn on **Return All** to follow the API's pages to the end, or set **Limit** to stop after that many records.

**Optional fields.** Required fields are on the node. Everything else is under **Additional Fields**, **Update Fields**, **Filters** or **Options**, and is sent only when you add it. A market order sends no slippage limit unless you add **Deviation Points**, so the broker's own default applies.

**Removing a stop.** On **Position → Modify** and **Order → Modify**, add **Remove Stop Loss** or **Remove Take Profit** to clear it. Leaving a field out keeps what is there.

## Trigger

**fxapis Trigger** registers its production webhook URL with fxapis when the workflow is activated, and removes it when the workflow is deactivated. Each delivery's `fxapis-signature` is checked against the raw body before the workflow starts. A bad, missing or stale signature is answered `401` and starts nothing. On every activation the node checks that its endpoint still exists, is enabled, points at the current URL and has the selected events; if not, it replaces it.

- **Public HTTPS on port 443 only.** fxapis delivers only to a public host over HTTPS on port 443. n8n Cloud works as it is. A self-hosted n8n needs a reverse proxy or a tunnel that serves it on 443, with `WEBHOOK_URL` set in n8n to that public address. A localhost or test URL is refused.
- **At least once.** The same event can arrive twice, for example after a timeout or a redelivery you asked for. Each event carries an `id`: de-duplicate on it, for instance with n8n's **Remove Duplicates** node set to *Remove Items Processed in Previous Executions* on `{{ $json.id }}`.
- **Catching up.** Deliveries are not in order. After downtime, use **Event → Get Many** with **After Event ID** set to the last event you processed from a list, and turn on **Return All**. See [Webhooks](https://docs.fxapis.com/guides/webhooks).

Leave **Events** empty to receive every event.

## Using fxapis with AI agents

The node is usable as a tool by n8n's AI Agent. Each tool node does the one operation you configured on it, with the parameters you fixed or left to the model; the agent cannot reach any other operation.

- **Trading tools place real orders.** An agent with **Place Market Order** or **Close** can trade. Connect only broker demo accounts until you trust the workflow.
- **Use a narrow key.** Give the agent's credential an API key with only the scopes it needs, for example `accounts:read` and `trading:read` for an agent that only reports, or `trading:reduce` for one that may close but never open. See [Credentials](#credentials).
- **Idempotency keys still apply.** Let the model supply one with `{{ $fromAI('idempotencyKey', 'A key unique to this trade decision; reuse it if you retry the same decision') }}`, or derive it from the incoming message ID so a retried run does not trade twice.
- **Keep money changes out of reach.** There are no billing write operations in this node.

## Copy trading

Copy trading is **coming soon**. Until then the API answers `503 COPY_TRADING_PAUSED` to anything that starts copying (creating a strategy or subscription, resuming, resetting). Reading, pausing, changing settings and deleting work. **Copy Trading → Get Status** says whether it is paused.

## Error handling

The error shows the API's `code` and message, what to do next, and the `requestId` that support can find. With **On Error → Continue (using error output)** or **Continue**, a failed item comes out as:

```json
{ "error": { "code": "ORDER_UNRESOLVED", "message": "…", "status": 503, "requestId": "…", "retryable": false, "retryAfter": null } }
```

Match on `code`; `message` is for a person.

| Code | What to do |
|---|---|
| `ORDER_UNRESOLVED` | Do not send the order again. Poll **Order → Get** until it leaves `unknown`, or run **Account → Reconcile**. |
| `SEND_FAILED`, `ACCOUNT_NOT_READY`, `NO_RUNTIME` | Nothing was opened. Retry with the **same** idempotency key. |
| `ORDER_REJECTED` | The broker refused it. A retry needs a **new** key, and only if `retryable` is true. |
| `RATE_LIMITED` | Wait `retryAfter` seconds, then retry with the same key. |
| `UNAUTHENTICATED`, `MISSING_SCOPE` | Fix the key or its scopes. |

`retryable` follows the [error catalogue](https://docs.fxapis.com/errors). The node does not retry by itself; n8n's *Retry On Fail* setting is safe on orders only because the idempotency key stays the same.

## Example workflows

Import any of these from *Workflows → Import from File*. Each uses demo-safe settings and placeholders you replace.

| File | What it does |
|---|---|
| [`examples/tradingview-to-market-order.json`](examples/tradingview-to-market-order.json) | A TradingView-style alert webhook places a market order, with the alert ID as the idempotency key |
| [`examples/order-filled-notify.json`](examples/order-filled-notify.json) | fxapis Trigger on `order.filled`, de-duplicated on the event ID, sends a notification |
| [`examples/scheduled-account-health.json`](examples/scheduled-account-health.json) | Every 15 minutes, reads every account's status and figures and flags accounts that need attention |

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

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

[support@fxapis.com](mailto:support@fxapis.com) · [status.fxapis.com](https://status.fxapis.com)

## License

[MIT](LICENSE) © 2026 El Wizard
