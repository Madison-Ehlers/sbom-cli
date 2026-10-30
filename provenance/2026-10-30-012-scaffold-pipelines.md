# scaffold-pipelines
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
As the senior engineer for this prompt, go ahead and standup the main pipelines for this project. Nothing needs to actually run end to end, but we need a postgres database that is stood up locally, and a cli command that actually runs and spits out a hello world. A basic express api that gets hit so we have the main pipelines in place

## Agent output
- Scaffolded TS project: CLI (Commander) -> Express API -> Postgres `jobs` table <- polling worker (`FOR UPDATE SKIP LOCKED`).
- No Docker on host; `brew install postgresql@16` stalled compiling cmake from source, so aborted. Added `docker-compose.yml` (canonical) plus `npm run db:local` using `embedded-postgres` prebuilt binaries as a Docker-free fallback.
- Verified: db:local up, `db:migrate` applied, `/health` -> `{"status":"ok","db":"up"}`, `sbom-cli hello` -> `hello world`.
- `ingest`/`query`/`job` registered as stubs; API `/ingest`, `/jobs/:id`, `/query` return 501.
- Files: package.json, tsconfig.json, docker-compose.yml, .env.example, .gitignore, README.md, db/schema.sql, src/api/server.ts, src/cli/index.ts, src/worker/index.ts, src/db/{pool,migrate,local}.ts, provenance/2026-10-30-003-scaffold-pipelines.md
