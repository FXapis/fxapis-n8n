# Releasing

Every release goes out through this repository's [publish workflow](.github/workflows/publish.yml),
never from a laptop: it builds, tests and publishes to [npm](https://www.npmjs.com/package/n8n-nodes-fxapis)
with Trusted Publishing, so no publish token exists anywhere to leak. The published package carries a
signed provenance attestation. n8n requires that provenance for community-node verification.

The workflow file is named `publish.yml` because that is the name the n8n Creator Portal asks for.

## The routine

1. Bump the version in `package.json` and add a `CHANGELOG.md` section under `## [Unreleased]`.
2. Push to `main` and wait for CI.
3. `gh release create vX.Y.Z --title vX.Y.Z --notes "…"`. The tag must equal the package version.
4. The workflow stages the version on npm. A maintainer approves it with their own 2FA before it is installable.

The first publish of a new package name cannot use Trusted Publishing. A maintainer publishes `0.1.0`
once by hand from a 2FA-enabled npm account, then adds this repository as a trusted publisher for
`publish.yml`. After that, laptops do not publish.

## Versioning

- **Patch** (`0.1.1 → 0.1.2`): fixes, docs, new optional fields or operations.
- **Minor** (`0.1.x → 0.2.0`): anything that can break an existing workflow while the version is `0.x`.
- A version is never re-released.

## Verification

Submit the published package at [creators.n8n.io/nodes](https://creators.n8n.io/nodes) only after
`npx @n8n/scan-community-package n8n-nodes-fxapis` passes and the README still matches this repository.
Reviews can take up to four weeks.
