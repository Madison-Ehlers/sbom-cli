# implement-ingest-pipeline
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Now let's implement the ingest pipeline, We need to implement the process to take a file, and ingest it into the database.

## Agent output
Implemented the end-to-end ingest path: CLI -> `POST /ingest` (validate + enqueue, 202 + job id) -> worker (parse + persist in one transaction) -> `GET /jobs/:id`.

Decisions:
- API stores upload bytes in new `sbom_uploads` table (not in `jobs`); job gets a `result` JSONB column.
- Three parsers (CycloneDX 1.x, SPDX 2.x, SPDX 3.x JSON-LD) -> one format-neutral `NormSbom`; `persist.ts` does set-based inserts via `jsonb_to_recordset`, pre-allocated component ids.
- Idempotent on `content_sha256`; handler writes and job `succeeded` commit together.
- CDX `doc_identity` uses bom-link form `urn:cdx:<uuid>/<version>`; document links resolve in both directions at ingest.

Verification: `yarn test` (5 parser tests) passes; `tsc --noEmit` clean; end-to-end against local Postgres: 3 hand-written fixtures + 24/29 sample JSON files ingested (27 docs, 6763 components); the other 5 correctly rejected (malformed JSON / not an SBOM); duplicate re-ingest is a no-op; XML / tag-value / missing file / bad job id give clear errors.

Notes: an older API process (pid 78145, stub code) was already listening on :3000 and needs restarting to pick up the new code; I tested on :3100 and stopped my own processes. Nothing committed.

Files changed:
- `db/schema.sql` (jobs.result, sbom_uploads, doc_identity comment)
- `src/api/server.ts`, `src/worker/index.ts`, `src/worker/ingest.ts` (new), `src/cli/index.ts`
- `src/ingest/{types,builder,licenses,index,persist}.ts`, `src/ingest/parse/{cyclonedx,spdx2,spdx3}.ts`, `src/ingest/ingest.test.ts` (all new)
- `fixtures/{cyclonedx-1.6,cyclonedx-1.6-linked,spdx-3.0}.json` (new)
- `package.json` (test script), `README.md`, `DESIGN.md`
