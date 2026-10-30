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
Start Postgres (prebuilt binaries, no Docker; data in `.pgdata`, user/password/db `sbom`, port 5432). Runs in the foreground, so leave it in its own terminal and Ctrl-C to stop:
```bash
yarn db:local
```
Then, in another terminal, apply the schema:
```bash
yarn db:migrate
```

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
`hello` prints "hello world" via the API. `query` is implemented; `ingest` and `job` are stubs.

`query` takes exactly one of `--component` / `--license`. Name and license match case-insensitively, `--version` is exact. Results are paginated (`--limit`, default 100; `--after <cursor>` as printed by the previous page); `--json` prints the raw API response. API: `GET /query/components?name=&version=` and `GET /query/licenses?license=`.

To try `query` before ingest lands, load the demo rows into a scratch database (`db/fixtures/query-demo.sql`, after `db/schema.sql`) and point the API at it with `DATABASE_URL`.

## Build
Compile with tsc to `dist/` (bin: `dist/cli/index.js`):
```bash
yarn build
```

Stub commands exit 1 with "not implemented yet"; API `/ingest`, `/jobs/:id` return 501.
