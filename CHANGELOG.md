# Changelog

All notable changes to this package. Versions follow [Semantic Versioning](https://semver.org/):
while the version is `0.x`, a minor release (`0.2.0`) may change the API and a patch release
(`0.1.2`) does not.

## [Unreleased]

## [0.1.0] — 2026-11-01

- First release of the fxapis n8n community node and signed webhook trigger.
- Account connect, status, figures, quotes, warm and cool.
- Market and pending orders, position close and modify, multi-account order create.
- Order writes require an idempotency key. A new key is a new order.
- `ORDER_UNRESOLVED` is reported as not retryable.
- Order list, account prepare and delete, webhook management, copy trading, and billing reads.
