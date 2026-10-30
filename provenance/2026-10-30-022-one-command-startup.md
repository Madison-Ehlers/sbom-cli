# one-command-startup
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Can we make a command to simplify the startup time to just run one command to apply migrations, start db, start server, etc? If so, please do that and if it's straight forward commit directly to main

## Agent output
Added `yarn dev`: starts Postgres, applies the schema, then runs the API and worker as child processes with prefixed logs.
- DB: reuses Postgres if `DATABASE_URL` is already reachable (left running on exit); otherwise starts embedded Postgres (`.pgdata`) and stops it on exit. Port/user/password/db now derive from `DATABASE_URL`.
- Migrations: `schema.sql` is idempotent, so it is applied on every start.
- Shutdown: Ctrl-C/SIGTERM stops children and the embedded DB; if the API or worker dies, everything shuts down with exit 1.
- Verified on alternate ports (5433/3100): fresh embedded start, ingest via CLI `--wait` succeeded, clean SIGINT stop (no leftover processes); reuse-existing-DB path also checked.
- Committed directly to `main` (fast-forward), not pushed.

Files changed:
- `src/dev.ts` (new)
- `src/db/embedded.ts` (new; shared embedded-Postgres start)
- `src/db/local.ts` (uses shared helper)
- `src/db/migrate.ts` (exports `migrate()`, still runnable directly)
- `package.json` (`dev` script)
- `README.md` (Quick start section)
- `provenance/2026-10-30-022-one-command-startup.md` (new)
