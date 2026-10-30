# zsh-parse-error-db-local
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
I'm getting this error, how do I fix it?

npm run db:local   # No Docker: prebuilt Postgres binaries, data in .pgdata (runs in foreground; Ctrl-C to stop)
zsh: parse error near `)'

## Agent output
Diagnosed: user pasted the README's trailing `# ...` comment into an interactive zsh shell. Interactive zsh has `interactive_comments` off by default, so `#` is not a comment and the `(`...`)` fails to parse. Advised running only `npm run db:local`, or `setopt interactive_comments` to allow comments. No code changes.

Files changed: provenance/2026-10-30-009-zsh-parse-error-db-local.md
