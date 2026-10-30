# sbom-cli

CLI to ingest and query CycloneDX / SPDX SBOMs.

```
CLI --HTTP--> Express API --enqueue--> Postgres (jobs) <--claim-- Worker
```

## Setup
```bash
npm install
cp .env.example .env
```

## Database
Pick one (both: user/password/db `sbom`, port 5432):
```bash
npm run db:up      # Docker: docker compose up -d db
npm run db:local   # No Docker: prebuilt Postgres binaries, data in .pgdata (runs in foreground; Ctrl-C to stop)
```
Then apply the schema:
```bash
npm run db:migrate
```
Stop the Docker DB with `npm run db:down`.

## Services
Run each in its own terminal:
```bash
npm run api      # Express API on :3000 (PORT to override)
npm run worker   # job worker (polls the jobs table)
```
Check it is up: `curl localhost:3000/health`

## CLI
Set `API_URL` if the API is not on `http://localhost:3000`.
```bash
npm run cli -- hello                                   # prints "hello world" via the API
npm run cli -- --help
npm run cli -- ingest <sbom-file>                      # stub
npm run cli -- query --component <name> [--version <v>]  # stub
npm run cli -- query --license <license>               # stub
npm run cli -- job <id>                                # stub
```

## Build
```bash
npm run build   # tsc -> dist/ (bin: dist/cli/index.js)
```

Stub commands exit 1 with "not implemented yet"; API `/ingest`, `/jobs/:id`, `/query` return 501.
