# explore-cli-publish
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
I need you to explore how we publish this cli as a name, so that clients can run "sbom-cli" on their machines.

## Agent output
Read-only exploration; no source changes.

Actions:
- Read `package.json`, `tsconfig.json`, `src/cli/index.ts`, README.
- `yarn build` → `dist/cli/index.js` keeps the `#!/usr/bin/env node` shebang; `bin.sbom-cli` already points at it.
- `npm view sbom-cli` → name is TAKEN on npm (v0.0.2, "production sbom command line tool", maintainer bugong). `@madisonehlers/sbom-cli` and `@sbom-cli/cli` are unclaimed (404).
- `npm whoami` → not logged in.
- `npm pack` into a scratch dir + `npm i <tgz>` in a scratch consumer: `sbom-cli --help` works; 81 packages / 5 MB installed.
- `npm pack --dry-run` shows the tarball has no `files` allowlist, so it ships `provenance/`, `CLAUDE.md`, `DESIGN.md`, `docker-compose.yml`, `.env.example`, `.gitmodules`.

Findings:
- Unscoped `sbom-cli` is unavailable on npm. Options: scoped package (`@<user-or-org>/sbom-cli`, still installs a `sbom-cli` binary because `bin` is independent of the package name), a different unscoped name with `bin: sbom-cli`, or a non-npm channel (GitHub Packages, Homebrew tap, standalone binary).
- Blockers for any npm publish: `"private": true`; no `files`; `express`/`pg` are runtime deps of the CLI package though the CLI needs only `commander`; no `prepublishOnly` build; no `engines`; no `license`; the default `API_URL` is localhost.

Files changed: `provenance/2026-10-30-017-explore-cli-publish.md` only.
