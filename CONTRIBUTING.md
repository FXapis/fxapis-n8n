# Contributing

The node is hand-written against the public fxapis API. It is not generated. A new
endpoint belongs in `nodes/Fxapis/catalog.ts`, with the same names the API uses:
`descriptions.ts` renders it and `Fxapis.node.ts` runs it.
Do not add a runtime dependency. n8n will not verify a community node that has one.

## Before you open a pull request

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

These are what the `ci` workflow runs, on Node 22 and 24. The tests use Node's built-in
test runner on the TypeScript sources, so they need Node 22.6 or newer.

`npm run dev` (n8n's `n8n-node dev`) starts n8n with the node loaded, in a Docker or
Podman container by default. To use an n8n you already run, start it with
`N8N_DEV_RELOAD=true` and use `npx n8n-node dev --external-n8n`.

## Reporting a bug

Open an [issue](https://github.com/FXapis/fxapis-n8n/issues) with the resource, the
operation, the error code, and the response `requestId` if you have one. Do not
paste an API key, a broker password, or a webhook secret. For account or billing
issues rather than a node bug, email [support@fxapis.com](mailto:support@fxapis.com).
