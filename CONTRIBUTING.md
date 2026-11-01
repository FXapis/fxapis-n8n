# Contributing

The node is hand-written against the public fxapis API. It is not generated. A new
endpoint belongs in `nodes/Fxapis/catalog.ts`, with the same names the API uses.
Do not add a runtime dependency. n8n will not verify a community node that has one.

## Before you open a pull request

```bash
npm install
npm run lint
npm test
npm run build
```

Use Node 22 or 24. Node 25 cannot compile a native dependency of the n8n CLI
(`isolated-vm`). `npm install --ignore-scripts` is enough to lint, test and build
on Node 25. `npm run dev` needs Node 22.

These are what the `ci` workflow runs.

## Reporting a bug

Open an [issue](https://github.com/FXapis/fxapis-n8n/issues) with the resource, the
operation, the error code, and the response `requestId` if you have one. Do not
paste an API key, a broker password, or a webhook secret. For account or billing
issues rather than a node bug, email [support@fxapis.com](mailto:support@fxapis.com).
