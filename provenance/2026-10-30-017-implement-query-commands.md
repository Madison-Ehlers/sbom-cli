# implement-query-commands
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
In a worktree, start by implementing the two query commands for sbom-cli query. the ingest work is happening in a separate agent and should land separately

## Agent output
Implemented `sbom-cli query --component <name> [--version <v>]` and `--license <license>` end to end (CLI -> API -> Postgres), kept in new files to avoid conflicts with the parallel ingest work.

- API `src/api/query.ts`: `GET /query/components` (case-insensitive name via `lower(name), version` index; exact version) and `GET /query/licenses` (exploded `component_licenses`, LIMIT applied on the narrow index before joining). Both return component + document + containment parent (package, or null = document). Keyset pagination on `components.id` (`limit` 1..1000, `after`, `next_cursor`); 400 on bad params. Synchronous per DESIGN.md.
- CLI `src/cli/query.ts`: `registerQuery`, validates exactly one of `--component`/`--license`, `--version` requires `--component`, `--limit`, `--after`, `--json`.
- Verified against a scratch DB (`sbom_query_test`, seeded from `db/fixtures/query-demo.sql`) with API on :3101: version filter, case-insensitivity, multi-license match, paging, JSON, error paths. Left the shared `sbom` database and the API on :3000 untouched.
- Not done: no automated tests; no EXPLAIN check at scale; real ingest-produced data untested.

Files changed: src/api/query.ts, src/api/server.ts, src/cli/query.ts, src/cli/index.ts, db/fixtures/query-demo.sql, README.md, provenance/2026-10-30-017-implement-query-commands.md
