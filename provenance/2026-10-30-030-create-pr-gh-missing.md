# create-pr-gh-missing
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
/create-pr command: create a ready-for-review (not draft) PR for `claude/design-decisions-doc-477a24` into `main` on Madison-Ehlers/sbom-cli.

## Agent output
- Working tree was clean and the branch was already pushed; `main` exists on origin.
- Could not open the PR: the `gh` CLI is not installed on this machine (not on PATH, not in `/opt/homebrew/bin` or `/usr/local/bin`). Did not install it or open the PR another way.
- Gave the user the GitHub compare link (`https://github.com/Madison-Ehlers/sbom-cli/pull/new/claude/design-decisions-doc-477a24`) plus a suggested title and body.
- Files changed: `provenance/2026-10-30-030-create-pr-gh-missing.md`
