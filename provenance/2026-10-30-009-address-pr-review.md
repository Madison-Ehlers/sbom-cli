# address-pr-review
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Take another look

## Agent output
Re-read PR #1 via the public GitHub API; found a submitted review with two inline comments on db/schema.sql:
- L20 (`format TEXT CHECK (...)`): "This could be an enum" → added `CREATE TYPE sbom_format AS ENUM ('spdx','cyclonedx')` (guarded for idempotency) and used it for `sbom_documents.format`.
- L43 (`name_lc`): "should not be necessary - store a name only" → dropped `components.name_lc`; the name/version index is now a functional index on `lower(name)`, queried with `WHERE lower(name) = lower($1)`.
Revalidated on PGlite (applies twice, ancestry and license queries OK). Other CHECK-constrained text columns (`link_type`, `kind`) left as-is; not flagged by the reviewer. Found the checkout had been moved to main (which gained its own db/schema.sql), so switched back to schema-proposal and merged main to resolve the add/add conflict.

Files changed: db/schema.sql, provenance/2026-10-30-009-address-pr-review.md
