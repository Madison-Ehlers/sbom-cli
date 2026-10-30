# resolve-main-conflicts
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
This PR cannot merge tom main, we need to address conflicts and update the PR

## Agent output
Merged origin/main (ingest pipeline, local install, dev script) into the query branch via sync_with_base_branch. Conflicts in `src/api/server.ts` (kept both the ingest imports and `queryRouter`), `src/cli/index.ts` (kept main's real ingest/job commands plus `registerQuery`; dropped `hello` and the now-unused `notImplemented`), and `README.md` (removed stale "query is a stub"/501 notes, folded the query docs into the CLI section).

Removed `db/fixtures/query-demo.sql` since real ingest now supplies data. Re-verified against a scratch DB populated by the real ingest pipeline (fixtures/*.json): component name/version (case-insensitive), license, paging, JSON, error paths all behave. Stopped only the processes I started.

Files changed: README.md, src/api/server.ts, src/cli/index.ts, db/fixtures/query-demo.sql (deleted), provenance/2026-10-30-020-resolve-main-conflicts.md
