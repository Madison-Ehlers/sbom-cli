# local-install-only
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
We don't actually need to publish it on npm, we just need it to work locally - does that change anything?

## Agent output
No source changes.

Actions:
- Ran `npm install -g . --prefix <scratchpad>/prefix` (isolated prefix, global state untouched). npm symlinked the global package to this directory; `sbom-cli --help` and `sbom-cli hello` ran from the new bin.

Answer:
- npm name collision, scope, `private`, `files`, and `prepublishOnly` no longer matter.
- Needs only `yarn build` then `npm install -g .` (or `npm link`); the global install is a symlink to the repo, so later `yarn build` runs update it.
- Caveats: the command runs from `dist/`, so it breaks if the repo moves or `dist/` is missing; `npm link` needs write access to the global prefix; the API and worker still run separately.

Files changed: `provenance/2026-10-30-018-local-install-only.md` only.
