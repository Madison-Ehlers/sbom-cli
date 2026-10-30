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
yarn cli ingest <sbom-file> [--wait]
yarn cli query --component <name> [--version <v>]
yarn cli query --license <license>
yarn cli job <id> [--wait]
```
`hello` prints "hello world" via the API. `ingest` prints a job id (or waits with `--wait`); `job` shows status and the ingest summary. `query` is still a stub.

Ingest accepts JSON only: CycloneDX 1.x, SPDX 2.x, SPDX 3.x (JSON-LD). Re-ingesting identical bytes is a no-op. Try it:
```bash
yarn cli ingest fixtures/cyclonedx-1.6.json --wait
yarn cli ingest samples/bom-shelter/in-the-wild/spdx/flux_0.26.3_sbom.spdx.json --wait
```

## Test
```bash
yarn test
```

## Install the `sbom-cli` command
The package is `private` (not published to npm); install it from a local checkout. Build and install globally:
```bash
yarn cli:install
```
Then run `sbom-cli` from anywhere (needs the API and worker running, see Services):
```bash
sbom-cli --help
```
npm symlinks the global command to this checkout, so `yarn build` picks up changes without reinstalling. Moving or deleting the checkout (or `dist/`) breaks the command. If `npm install -g` needs `sudo` on your machine, point npm at a user-level prefix (`npm config set prefix ~/.npm-global`) and add its `bin` to your `PATH`.

Remove it:
```bash
yarn cli:uninstall
```

## Build
Compile with tsc to `dist/` (bin: `dist/cli/index.js`):
```bash
yarn build
```

`query` exits 1 with "not implemented yet"; API `/query` returns 501.
