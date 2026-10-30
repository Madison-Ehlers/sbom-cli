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
