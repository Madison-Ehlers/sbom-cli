# document-design-decisions
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Let me document my design decisions. So I'm mostly picked Command.js for knowing that it is a kind of a standard node library. I picked node because this is my main I had a familiarity with this process, and then also I picked Postgres because it's a tool that I had used well. I used it a lot, and so I just wanted something that was like normal and working. So I ended up picking those technologies. So at a baseline, when we want to go process these files, I want the server to accept the job, and then process that job asynchronously while there's a job polling on it. So that the client's not just sitting there waiting. And then the query commands are fast, just hitting the database directly. So kind of there's an async process for ingest, and then there's also a individual process for looking things up.

## Agent output
- Created `DESIGN.md` with tech choices (Node/TS, Commander.js, Postgres), async ingest (API enqueues, worker processes, CLI polls), and sync query path.
- Interpreted "query hits the database directly" as the API querying Postgres inline, per CLAUDE.md (CLI → API → DB; CLI never touches DB).
- Files changed: `DESIGN.md`, `provenance/2026-10-30-003-document-design-decisions.md`
