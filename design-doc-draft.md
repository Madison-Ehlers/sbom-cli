# SBOM CLI Design Doc

## Scope
- `sbom-cli ingest <file>`: load a CycloneDX 1.x / SPDX 2.x / SPDX 3.0 JSON SBOM.
- `sbom-cli query --component <name> [--version <v>]`: documents/packages containing the component.
- `sbom-cli query --license <license>`: components with that license, with a ref to the parent document/package.
- Target scale: thousands of SBOMs, millions of components.

## Stack
- **TypeScript/Node**: main language; fastest path in a ~1h take-home.
- **Commander.js**: standard Node CLI library; minimal.
- **Express**: simple HTTP API between the CLI and the database.
- **Postgres**: relational + JSONB + indexing at this scale; known and reliable.

## Architecture
- CLI -> API (Express) -> Postgres. The CLI never touches the DB.
  - Reason: one place for validation and access control; CLI stays thin.
- Anything expected to exceed 200ms runs as a job, not inline in a request.

## Ingest: asynchronous
- API (`POST /ingest`) checks the file is a supported JSON SBOM, stores the bytes and a `jobs` row in one transaction, returns `202 {job_id}`.
  - Reason: parsing and persisting large SBOMs exceeds 200ms; the client must not block.
  - Only inline work is `JSON.parse` (tens of ms for multi-MB files); body capped at 50mb.
- Uploaded bytes live in `sbom_uploads`, separate from `jobs`.
  - Reason: polling the queue never reads blobs.
- Worker claims jobs with `FOR UPDATE SKIP LOCKED`; handler and the `succeeded` update share one transaction.
  - Reason: safe with many workers; a failed job leaves no partial document.
- CLI polls `GET /jobs/:id`, or uses `--wait`.
  - Reason: stateless client; no websockets.
- Idempotent: `content_sha256` is unique; re-ingesting the same file finishes `succeeded` with `duplicate: true` and writes nothing.
  - Reason: safe retries; concurrent duplicates serialize on the unique index.

## Parsing and persistence
- One parser per format (`cyclonedx`, `spdx2`, `spdx3`), all emitting one format-neutral `NormSbom`; `persist.ts` is the only code that knows the tables.
  - Reason: query code and schema stay format-agnostic; adding a format does not touch persistence.
- Bulk insert: component ids pre-allocated from the sequence, then one `INSERT ... SELECT FROM jsonb_to_recordset($1)` per table.
  - Reason: ~8 round trips per document regardless of component count.
- Normalization rules:
  - Directional relationships flipped to one direction (`X BUILD_DEPENDENCY_OF Y` -> `Y build_depends_on X`); unknown types kept as `other` with `raw_rel_type`.
  - `parent_id` = CycloneDX nesting, or first SPDX `CONTAINS` (skipped if it would form a cycle).
  - Relationships to files, `NOASSERTION` or unknown refs are dropped and counted; duplicate `local_ref`s keep the first.
  - Document identity: CycloneDX `urn:cdx:<uuid>/<version>`; SPDX namespace (2.x) or `spdxId` (3.x). Cross-document links resolve in both directions at ingest, so ingest order does not matter.

## Query: synchronous
- `query --component` and `query --license` are served inline by the API from Postgres.
  - Reason: indexed lookups, well under 200ms; a job round trip only adds latency.
- Indexes on component name (+ version) and on license.
  - Reason: needed to hold at millions of components.
- Ingest (write-heavy, slow) and query (read-only, fast) are separate paths.

## Data model
- **Format-neutral tables** (`sbom_documents`, `components`, `component_edges`, `document_links`, `licenses`, `component_licenses`).
  - Reason: one query path for every format.
- **Per-document component rows, no cross-document dedupe.**
  - Reason: ingest stays simple and parallel; `purl` links the same package across documents.
- **`components.parent_id` is a single containment parent; `component_edges` holds the dependency graph.**
  - Reason: "parent document/package" is one lookup; ancestry is a recursive CTE (depth ~3 in samples, so no closure table).
- **Nullable `local_ref`, `doc_identity`, `root_component_id`.**
  - Reason: bom-ref/serialNumber are often absent; many SPDX docs have no relationships, so the document is the fallback parent.
- **License expressions exploded to leaf ids** (`component_licenses`); raw expression kept on `components`.
  - Reason: `--license MIT` matches `MIT AND ISC` with a plain index lookup. `NONE`/`NOASSERTION` create no rows.
- **`document_links.to_document_id` nullable until the target is ingested.**
  - Reason: unresolved links stay queryable.

## Scale
- Workers are separable from the API and scale horizontally.
- Reads hit indexed tables, never raw SBOM blobs.

## Known gaps
- A worker that dies mid-job leaves the job `running`; needs a lease/heartbeat.
- Failed uploads are retained, not garbage-collected.
- One statement per table per document; a multi-million-component SBOM needs chunking.
- SPDX files, raw payloads and tag-value/XML inputs are not stored or supported.

## Process notes
- The scaffolding prompt took too long, which lengthened cycle time.
- Several extra prompts were needed. I assumed Docker was installed; it was not, so installs cost more time than planned. The Homebrew install also failed to finish.
- I built end to end first, which produced a lot of LLM output. With more time I would go through each area methodically, in this order:
  - API design, including async processing and the likely need for a queue.
  - CLI failure scenarios.
  - Database and schema design.
- I did not have enough time to understand how an SBOM's documents, components and relationships link together. The data model is immature and needs another pass with more research. That research would also inform performance.
- Result: a few ingests and a few queries run by hand by the end. End-to-end testing was not done.

## TODO
- Make the CLI installable globally and publish it, so `sbom-cli` works as a global command.
- Test end to end.
- Revisit the data model after more research on SBOM structure.
- Review the API, queue and CLI failure handling.
