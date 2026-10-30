# propose-db-schema
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Next, I want you to read through the samples specifically for the formats recorded in the repo, and help me understand what the schema of the database might be. 

I want you to ensure that You can query based on hierarchical sbom linkage, and be able to look up/filter things by license, too in the schema. You don't need to make any code changes yet, but propose this in chat

## Agent output
Read db/schema.sql and DESIGN.md; surveyed samples/bom-shelter/in-the-wild with throwaway scripts (scratchpad, not in repo). No code changes.

Findings: 17 valid SPDX JSON (2.2/2.3), 2 unparseable; 8 valid CycloneDX JSON (1.2-1.4), plus 1 non-SBOM dict and 1 flat array. SPDX: 12/17 have no relationships; CONTAINS/DEPENDS_ON and reversed *_OF types; ~99% of license fields NONE/NOASSERTION; no cross-document refs. CycloneDX: nested components to depth 3, bom-ref missing in 5/8, license forms id/name/expression.

Proposed schema (in chat): sbom_documents, components (parent_id nesting, nullable local_ref, purl), component_edges (normalized dependency graph), document_links (cross-document), licenses + component_licenses (expressions exploded to leaf ids). Recursive CTE for ancestry; indexes on lower(name)+version, purl, license_id.

Files changed: provenance/2026-10-30-006-propose-db-schema.md
