# Releasing

Releases go out through this repository's [publish workflow](.github/workflows/publish.yml), not from
a laptop. It checks, builds and publishes to [npm](https://www.npmjs.com/package/n8n-nodes-fxapis) with
Trusted Publishing, so no npm token is stored anywhere. Every version it publishes carries a signed
provenance statement, which n8n requires before it will verify a community node.

The workflow file is named `publish.yml` because that is the name n8n's tooling and Creator Portal expect.

## The routine

1. Bump the version in `package.json` and move the `CHANGELOG.md` entries from `## [Unreleased]` into a
   section for the new version.
2. Push to `main` and wait for CI.
3. `gh release create vX.Y.Z --title vX.Y.Z --notes "…"`. The tag must equal the package version.
4. The publish job waits in the `npm` environment. A required reviewer approves it in GitHub
   (the run's **Review deployments** button). Nothing runs before that approval, and the environment
   accepts runs from `v*` tags only.
5. The job checks that the tag matches the version, runs lint, typecheck, tests and the build, and
   stages the version on npm with provenance (`npm stage publish`; the trusted publisher may only stage).
6. A maintainer approves the staged version with 2FA: npmjs.com → the package → **Staged Packages** →
   **Approve**, or `npm stage list n8n-nodes-fxapis` then `npm stage approve <stage-id>`. The version is
   installable once approved.

## The first version

npm cannot hand a package name that does not exist yet to Trusted Publishing, so `0.1.0` is published
once by hand by a maintainer, from a 2FA-enabled npm account that owns the name:

```bash
npm ci && npm run lint && npm test && npm run build
RELEASE_MODE=true npm publish --access public
```

`RELEASE_MODE` lets the publish past `prepublishOnly`, which otherwise stops a local `npm publish`.
A version published this way has no provenance, so it is not the version to submit for verification.

Then, on npmjs.com, open the package's **Settings → Trusted Publisher**, choose **GitHub Actions**, and
enter organization `FXapis`, repository `fxapis-n8n`, workflow `publish.yml`, environment `npm`.
After that, every release goes through the routine above.

## Versioning

- **Patch** (`0.1.1 → 0.1.2`): fixes, docs, new optional fields or operations.
- **Minor** (`0.1.x → 0.2.0`): anything that can break an existing workflow while the version is `0.x`.
- A version is never re-released.

## Verification

Submit at [creators.n8n.io/nodes](https://creators.n8n.io/nodes) only a version the workflow published
(it has provenance), after `npx @n8n/scan-community-package n8n-nodes-fxapis` passes and the README still
matches this repository. Reviews can take up to four weeks.
