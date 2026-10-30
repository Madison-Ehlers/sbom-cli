# Design Decisions

## Technology choices
- **TypeScript/Node**: author's main language; fastest path to a working result in a ~1h take-home.
- **Commander.js**: de facto standard Node CLI library; familiar, minimal.
- **Postgres**: author knows it well; boring, reliable, and handles relational + JSONB + indexing needs at this scale.

## Architecture
CLI → API (Express) → Postgres. The CLI never touches the DB directly.

### Ingest: asynchronous
- `sbom-cli ingest <file>` sends the file to the API.
- API validates the payload, enqueues a job, and returns a job ID immediately.
  - Reason: parsing/persisting large SBOMs exceeds the 200ms inline limit; client must not block.
- Worker picks up the job, parses, and persists documents/components.
- CLI polls job status (or `--wait`) until done/failed.
  - Reason: simple, stateless client; no websockets needed.

#### Ingest pipeline (`src/ingest`, `src/worker`)
- **API** (`POST /ingest`, raw file body): checks it is a JSON CycloneDX 1.x / SPDX 2.x / SPDX 3.x document, then in one transaction inserts a `jobs` row and the bytes into `sbom_uploads`; returns `202 {job_id}`. `GET /jobs/:id` returns status, error, and result.
  - Reason: the only inline O(size) work is `JSON.parse` (tens of ms for multi-MB SBOMs; body capped at 50mb). Bytes live in a separate table so queue polling never reads blobs.
- **Worker**: claims with `FOR UPDATE SKIP LOCKED`, runs the handler for `job.type` in one transaction together with the `succeeded` update, so a failed job leaves no partial document. Failures are recorded on the job (`failed` + `error`).
- **Parsers** (`parse/cyclonedx.ts`, `spdx2.ts`, `spdx3.ts`) emit one format-neutral `NormSbom`; `persist.ts` is the only code that knows the tables.
  - Reason: query code and schema stay format-agnostic; adding SPDX 3 / CDX 1.6 did not touch persistence.
- **Persist**: component ids are pre-allocated from the sequence, then each table is filled by one `INSERT ... SELECT FROM jsonb_to_recordset($1)`. ~8 round trips per document regardless of component count.
- **Idempotency**: `content_sha256` is unique; re-ingest finishes `succeeded` with `duplicate: true` and writes nothing. Concurrent identical ingests serialize on the unique index.
- **Normalization rules**:
  - Directional relationships are flipped (`X BUILD_DEPENDENCY_OF Y` -> `Y build_depends_on X`); unrecognized types are kept as `other` with `raw_rel_type`.
  - `parent_id` = CDX nesting, or first SPDX `CONTAINS` (skipped if it would form a cycle); `contains` edges record all explicit containment.
  - Relationships to files / `NOASSERTION` / unknown refs are dropped and counted (`dropped_relationships`); duplicate `local_ref`s keep the first.
  - CDX `doc_identity` = `urn:cdx:<uuid>/<version>` (bom-link form); SPDX = namespace (2.x) / `spdxId` (3.x). `document_links` resolve in both directions at ingest, so order does not matter.
  - CDX 1.6 `acknowledgement: concluded` -> concluded; `evidence.licenses` -> `evidence`; free-text `license.name` -> `is_spdx = false`.
- **Known gaps**: a worker that dies mid-job leaves it `running` (needs a lease/heartbeat); failed uploads are retained, never garbage-collected; one document is persisted in a single statement per table (a multi-million-component SBOM would need chunking); SPDX files are not stored.

### Query: synchronous
- `sbom-cli query --component ...` / `--license ...` are served inline by the API, directly from Postgres.
  - Reason: indexed lookups, expected well under 200ms; a job round-trip would only add latency.
  - Needs indexes on component name (+ version) and license to hold at millions of components.
- Query path and ingest path are separate: ingest is write-heavy and slow, query is read-only and fast.

## Scale notes
- Worker is separable from the API, so workers can scale horizontally for thousands of SBOMs.
- Reads hit indexed tables, not raw SBOM blobs.

## Data model (`db/schema.sql`)
Derived from surveying `samples/bom-shelter/in-the-wild` (SPDX 2.2/2.3, CycloneDX 1.2–1.4); also maps SPDX 3.0 / CycloneDX 1.6.
- **Format-neutral tables** (`sbom_documents`, `components`, `component_edges`, `document_links`, `licenses`, `component_licenses`): one query path for both formats; format specifics are normalized by the worker.
- **Per-document component rows, no cross-document dedupe**: ingest stays simple and parallel; `purl` links the same package across documents.
- **`components.parent_id` = single containment parent; `component_edges` = dependency graph**: "parent document/package" is one lookup, and ancestry is a recursive CTE (nesting depth is ~3 in samples, so no closure table).
- **Nullable `local_ref`, `doc_identity`, `root_component_id`**: bom-ref/serialNumber are often absent; 12/17 sample SPDX docs have no relationships at all, so the document is the fallback parent.
- **License expressions exploded to leaf ids** (`component_licenses`): `--license MIT` matches `MIT AND ISC` via a plain index lookup. Raw expression kept on `components`. `NONE`/`NOASSERTION` (~99% of sample license fields) create no rows.
- **`document_links.to_document_id` nullable until the target is ingested**: ingest order doesn't matter; unresolved links stay queryable. No sample data exercises this; needs a hand-written fixture.
- **Not stored yet**: SPDX `files`, raw payloads (object storage or separate table), tag-value/XML inputs (rejected at validation).
