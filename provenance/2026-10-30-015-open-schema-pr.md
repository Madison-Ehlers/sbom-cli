# open-schema-pr
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Open this one as a PR that I can review

## Agent output
Interpreted "this one" as the schema proposal. Created branch `schema-proposal`; implemented the proposal in `db/schema.sql` (extends the jobs table; db/ was previously untracked so the file is added whole), added a "Data model" section to DESIGN.md. Validated the DDL with PGlite (Postgres in WASM, installed in scratchpad): applies cleanly, is idempotent when run twice, and the ancestry CTE and license lookup return expected rows on a toy dataset. Not tested against postgres:16 itself (no Postgres/Docker locally). Committed only these files plus provenance; left unrelated untracked/modified files alone. Pushed and opened a PR.

Files changed: db/schema.sql, DESIGN.md, provenance/2026-10-30-006-propose-db-schema.md, provenance/2026-10-30-007-open-schema-pr.md
