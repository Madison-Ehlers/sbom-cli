# sample-ingest-command
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Can you get me a command with a sample file to run an ingest?

## Agent output
Replied with `yarn cli ingest fixtures/cyclonedx-1.6.json --wait` (plus a real-world sample), noting the API and worker must be restarted to pick up the new code. No code changes; this log file is uncommitted.

Files changed:
- `provenance/2026-10-30-019-sample-ingest-command.md` (new)

## Follow-up (user ran `yarn api`)
`yarn api` printed "listening" then exited: port 3000 was still held by the old stub API (pid 78145). Cause of the misleading message: Express 5 passes listen errors to the `app.listen` callback. Fixed in `src/api/server.ts` (log error, exit 1). Started `yarn worker` in a terminal tab. Killing the stale pid was denied by the permission classifier, so the user must stop it.

Files changed:
- `src/api/server.ts`
