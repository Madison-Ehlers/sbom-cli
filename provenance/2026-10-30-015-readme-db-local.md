# readme-db-local
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Let's update the readme to include db local as the command and go that route

## Agent output
README.md Database section now documents only `yarn db:local` (foreground, own terminal) followed by `yarn db:migrate`; removed the Docker option and the `db:down` line. Left the `db:up`/`db:down` scripts and docker-compose.yml in place. Not committed.

Files changed: README.md, provenance/2026-10-30-015-readme-db-local.md
