# readme-copyable-commands
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
unknown shorthand flag: 'd' in -d

Usage:  docker [OPTIONS] COMMAND [ARG...]

Run 'docker --help' for more information
(base) madisonehlers@madisons-mbp sbom-cli %

this is my exception now. Update the readme, and fix the shorthand flag there, you can commit directly to main

## Agent output
Cause: README put trailing `# ...` comments on command lines; pasted into interactive zsh (comments off by default) the comment text, including `-d`, is treated as arguments. Rewrote the Database and Services blocks in README.md so each block holds only the bare command, with descriptions in prose outside the fence. Committed to main (only README + provenance; left package.json/yarn.lock changes uncommitted).

Files changed: README.md, provenance/2026-10-30-009-zsh-parse-error-db-local.md, provenance/2026-10-30-010-readme-copyable-commands.md
