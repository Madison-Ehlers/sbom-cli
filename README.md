# sbom-cli

CLI to ingest and query CycloneDX / SPDX SBOMs.

```
CLI --HTTP--> Express API --enqueue--> Postgres (jobs) <--claim-- Worker
```

## Run locally
```bash
npm install
cp .env.example .env
npm run db:up        # Postgres via docker compose
# no Docker? npm run db:local (foreground, prebuilt binaries, data in .pgdata)
npm run db:migrate   # apply db/schema.sql
npm run api          # terminal 1
npm run worker       # terminal 2 (optional for now)
npm run cli -- hello # prints "hello world" via the API
```

`ingest`, `query`, `job` are registered but not implemented yet.
