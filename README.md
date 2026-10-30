# sbom-cli

CLI to ingest and query CycloneDX / SPDX SBOMs.

```
CLI --HTTP--> Express API --enqueue--> Postgres (jobs) <--claim-- Worker
```

## Setup
Uses [yarn](https://classic.yarnpkg.com) (v1).
```bash
yarn install
cp .env.example .env
```

## Database
Pick one (both: user/password/db `sbom`, port 5432).

Docker (runs `docker compose up -d db`):
```bash
yarn db:up
```
No Docker (prebuilt Postgres binaries, data in `.pgdata`; runs in the foreground, Ctrl-C to stop):
```bash
yarn db:local
```
Then apply the schema:
```bash
yarn db:migrate
```
Stop the Docker DB with `yarn db:down`.

## Services
Run each in its own terminal.

Express API on :3000 (set `PORT` to override):
```bash
yarn api
```
Job worker (polls the jobs table):
```bash
yarn worker
```
Check it is up: `curl localhost:3000/health`

## CLI
Set `API_URL` if the API is not on `http://localhost:3000`. Arguments go straight after the script name (no `--`).
```bash
yarn cli hello
yarn cli --help
yarn cli ingest <sbom-file>
yarn cli query --component <name> [--version <v>]
yarn cli query --license <license>
yarn cli job <id>
```
`hello` prints "hello world" via the API. The other commands are stubs.

## Build
Compile with tsc to `dist/` (bin: `dist/cli/index.js`):
```bash
yarn build
```

Stub commands exit 1 with "not implemented yet"; API `/ingest`, `/jobs/:id`, `/query` return 501.
