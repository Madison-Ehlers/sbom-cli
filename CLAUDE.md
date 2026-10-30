# CLAUDE.md

## Project
`sbom-cli`: CLI to ingest JSON SBOMs (CycloneDX 1.6 / SPDX 3.0) and query them.

Required commands:
- `sbom-cli ingest <sbom-file>`
- `sbom-cli query --component <name> [--version <version>]` → documents/packages containing component (version-filtered if given)
- `sbom-cli query --license <license>` → components with that license + ref to parent document/package

Scope: take-home (~1h). Favor clear design over production polish. Design must consider scale to thousands of SBOMs / millions of components.

## Stack
- Language: TypeScript/JavaScript (Node)
- CLI: Commander.js
- API: Express (CLI → API → DB; CLI does not touch DB directly)
- Datastore: Postgres

## Rules
- **Jobs for slow work.** Any operation expected to exceed 200ms runs as a job, not inline in a request.
  - Ingest: API validates + enqueues, returns job ID immediately. Worker parses/persists.
  - CLI exposes job status (poll or `--wait`).
- **Provenance.** Log every prompt + agent output. See below.
- **Terse output.** Agent responses: short, direct. Design/product decisions → bullets, decision + reason, no preamble.

## Provenance
- Dir: `provenance/`
- One MD file per prompt: `provenance/YYYY-MM-DD-NNN-<slug>.md` (NNN = sequence, zero-padded, global across days)
- Write it at the end of every turn, before finishing.
- Format:

```md
# <slug>
- Date: YYYY-MM-DD
- Model: <model id>

## Prompt
<user prompt, verbatim>

## Agent output
<summary of actions taken + final response; list files changed>
```
