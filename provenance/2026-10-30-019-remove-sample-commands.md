# remove-sample-commands
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
We can remove all of the commands at this point that are sample ones.

## Agent output
Removed the only sample command: `hello` (CLI command and `GET /hello` API route), plus its README mentions. Kept `/health`, and the required `ingest` / `job` stubs. Left the `API_URL` constant in `src/cli/index.ts` since the ingest/job commands will need it. Typecheck passes.

Files changed: src/cli/index.ts, src/api/server.ts, README.md, provenance/2026-10-30-019-remove-sample-commands.md
