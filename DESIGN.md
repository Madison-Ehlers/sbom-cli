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
