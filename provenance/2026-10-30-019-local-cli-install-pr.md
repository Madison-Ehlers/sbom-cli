# local-cli-install-pr
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Let's just make it private for now, go ahead and get this setup, open a PR and update the documentation and provenance logs

## Agent output
Actions:
- `package.json` already has `"private": true`; left as is (no npm publish).
- Added `cli:install` (`yarn build && npm install -g .`) and `cli:uninstall` scripts.
- README: new "Install the `sbom-cli` command" section (install, run, uninstall, symlink and `sudo`/prefix caveats).
- Did not install globally from this worktree: the global link would point at a worktree path that disappears. Run `yarn cli:install` from the main checkout after merge.
- Committed, pushed branch `claude/cli-publish-sbom-cli-1c8f57`, opened a PR against `main`.

Files changed:
- `package.json`
- `README.md`
- `provenance/2026-10-30-017-explore-cli-publish.md` (new, from earlier turn)
- `provenance/2026-10-30-018-local-install-only.md` (new, from earlier turn)
- `provenance/2026-10-30-019-local-cli-install-pr.md`
