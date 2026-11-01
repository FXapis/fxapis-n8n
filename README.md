<div align="center">

<img src="https://fxapis.com/logo.png" alt="" width="72" height="72">

# fxapis

**The official n8n node for fxapis — the hosted MetaTrader 5 REST API**

[Website](https://fxapis.com) · [Docs](https://docs.fxapis.com) · [API Reference](https://docs.fxapis.com/api-reference) · [Status](https://status.fxapis.com) · [Support](mailto:support@fxapis.com)

[![License: MIT](https://img.shields.io/badge/license-MIT-22D3D6?style=flat-square)](LICENSE)
[![ci](https://img.shields.io/github/actions/workflow/status/FXapis/fxapis-n8n/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/FXapis/fxapis-n8n/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/n8n-nodes-fxapis?style=flat-square&color=22D3D6)](https://www.npmjs.com/package/n8n-nodes-fxapis)
[![release](https://img.shields.io/github/v/release/FXapis/fxapis-n8n?style=flat-square&color=22D3D6)](https://github.com/FXapis/fxapis-n8n/releases)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A518.17-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![fxapis status](https://status.fxapis.com/badge.svg)](https://status.fxapis.com)

</div>

---

Connect an MT5 account once, then place market and pending orders, close and modify positions, send one trade to many accounts, and read copy-trading and billing — from an n8n workflow. A trigger starts the workflow when fxapis sends a signed webhook.

You run **no MetaTrader terminal, no Windows VPS and no EA**. fxapis runs the MT5 terminals in its cloud (EU, Amsterdam). This package is an n8n community node. It is not an official n8n node, and it has not yet been submitted for n8n verification.

MT5 only (MT4 is not supported). The API key stays in an n8n credential. Do not put it in a Code node or a workflow parameter.

## Table of contents

- [Installation](#installation)
- [Quickstart](#quickstart)
- [Orders and idempotency](#orders-and-idempotency)
- [What the node can do](#what-the-node-can-do)
- [Trigger](#trigger)
- [n8n Cloud](#n8n-cloud)
- [Error handling](#error-handling)
- [Related fxapis repositories](#related-fxapis-repositories)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Installation

In n8n, install the community node `n8n-nodes-fxapis` once it is published. Until then, from this repository:

```bash
npm install
npm run build
npm run dev
```

`npm run dev` starts a local n8n with the node loaded. Search for **fxapis**, not the package name.

Create an API key in the console at [fxapis.com](https://fxapis.com). The credential test calls `GET /v1/workspace`.

> [!WARNING]
> **Test keys reach real brokers.** An `fx_test_` key is a label for your configuration, not a sandbox. Build and test with a **broker demo account**.

## Quickstart

1. Add the **fxapis** credential. Paste the API key. Leave the base URL as `https://api.fxapis.com`.
2. **Account → Connect**. Send the MT5 login, the server name exactly as MetaTrader shows it, and the **trading** password. Choose On Demand.
3. **Account → Bring Online**, then **Account → Get Status** until `state` is `ready`.
4. **Order → Place Market Order**. Name the market by broker symbol, send volume as `0.01`, and set an idempotency key you can reuse, such as `{{$json.signalId}}`.

The trading password is a credential-style field. It is not written into the error text the node returns.

## Orders and idempotency

Market orders, pending orders, closes and multi-account orders refuse to run without an idempotency key. The node does not invent a new UUID on each run. A new key is a new order. A retried close with a new key can open the other side.

Reuse the same key when n8n retries the item. Derive it from the thing that caused the trade, not from the current time.

## What the node can do

| Resource | Operations |
|---|---|
| Account | List, get, connect, status, figures, quotes, bring online, take offline, disconnect, prepare, delete |
| Order | List, market, pending, get, cancel |
| Position | List, close, modify |
| Multi-account order | Create, get, cancel |
| Instrument | List |
| Webhook | List, create, get, update, delete, enable, disable, rotate secret, test, deliveries, redeliver, replay |
| Copy strategy | List, create, get, update, archive |
| Copy subscription | List, create, get, update, delete, reset, links |
| Copy trading | Status, executions |
| Billing | Usage, daily usage, subscription, invoices, coins |

New endpoints belong in `nodes/Fxapis/catalog.ts`, not a second node.

## Trigger

**fxapis Trigger** registers its production webhook URL with `POST /v1/webhooks` and checks `fxapis-signature` before the workflow starts. A delivery with a bad, missing or stale signature is answered `401` and does not start the workflow. The signing secret is kept in the workflow's node static data. It is shown once by the API and is not returned again.

The URL fxapis calls must be public HTTPS. A localhost test URL is refused. Leave Events empty to receive every event except `webhook.test`.

## n8n Cloud

This node does not read `FXAPIS_KEY` from the environment. Cloud and self-hosted both use the credential. Importing the HTTP Request templates in [`fxapis-integrations`](https://github.com/FXapis/fxapis-integrations) is a separate path. Those templates are not this node, and this repository does not claim they have been run on n8n Cloud.

## Error handling

Match on `code`. `message` is for a person. `requestId` is what support can find.

| Code | What to do |
|---|---|
| `ORDER_UNRESOLVED` | Do not send the order again. Poll **Order → Get** until it leaves `unknown`. |
| `SEND_FAILED`, `ACCOUNT_NOT_READY`, `NO_RUNTIME`, `NO_PRICE` | Nothing was opened. Retry with the **same** idempotency key. |
| `ORDER_REJECTED` | The broker refused it. A retry needs a **new** key, and only if the reason was transient. |
| `RATE_LIMITED` | Wait for `retry-after`, then retry the same key. |

The node does not retry by itself.

## Related fxapis repositories

| Repository | What it is |
|---|---|
| [`fxapis-typescript`](https://github.com/FXapis/fxapis-typescript) | The official TypeScript SDK |
| [`fxapis-python`](https://github.com/FXapis/fxapis-python) | The official Python SDK |
| [`fxapis-examples`](https://github.com/FXapis/fxapis-examples) | Runnable examples |
| [`fxapis-integrations`](https://github.com/FXapis/fxapis-integrations) | Postman collection, TradingView payloads, n8n HTTP templates |
| [`fxapis-mcp-examples`](https://github.com/FXapis/fxapis-mcp-examples) | AI agents over MCP |
| [`fxapis-nextjs-starter`](https://github.com/FXapis/fxapis-nextjs-starter) | A small Next.js app |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support

[support@fxapis.com](mailto:support@fxapis.com) · [status.fxapis.com](https://status.fxapis.com)

## License

[MIT](LICENSE) © 2026 El Wizard
