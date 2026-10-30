# create-claude-md
- Date: 2026-10-30
- Model: claude-opus-5-5

## Prompt
@"/Users/madisonehlers/Downloads/Take-Home_Exercise__SBOM_CLI_-_10.2026.pdf"
I am building out a CLI tool to ingest SBOMs. I want you to make a CLAUDE.md file that captures some of these rules and things. First off, every prompt in this repository should be logged in the repository under a provenance folder with MD files to record prompts and agent output.

Next, to start, we're going to use command.js for the cli tooling, postgres for a datastore as a starting point, and express for an intermediary API. As a best practice, any processes that take more than 200ms should be job based, so this will impact the ingestion process.

ALWAYS prefer terse communication in agent output, especially for design and product decisions. Go ahead and make this MD file

## Agent output
- Read exercise PDF (extracted via PDFKit; poppler unavailable).
- Created `CLAUDE.md`: project scope/commands from PDF, stack (Commander.js, Express, Postgres), rules (200ms → job-based, ingest enqueues + returns job ID), provenance format, terse output.
- Created this provenance file.
- Assumed "command.js" = Commander.js.
