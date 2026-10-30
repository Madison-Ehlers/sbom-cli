# add-process-notes-to-draft
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Also include my notes here:

<pasted_content>
The prompt I did to setup the scaffolding took too long, which heightened my cycle time.
Multiple prompts added. I thought I had Docker on my machine but ended up not, so the installs ended up eating more time than I had hoped.  Wait for homebrew install failed to finish.

The way I was building this was trying to get this end to end working, and there’s a lot of LLM output, and I’d want to take more time and methodically go through each area over time. Specifically the API design including the asynchronous processing and the likely need for a queuing mechanism, the CLI failure scenarios, and the database and schema design. 


I didn’t feel like I had enough time to really understand the data model of an SBOM and how documents, components, etc all link together. So my data model is not very mature, and likely needs another pass with more research and insights. I think this would inform the performance of it too. 


TODO still:
- Ensure global install of cli is accessible, and publish it so I can use the sbom-cli command globally

* Did not get it testing end to end
</pasted_content>

 by the end of the exercise, got a few ingests run, and then a few queries.

## Agent output
- Appended "Process notes" and "TODO" sections to `design-doc-draft.md`, condensed from the notes. Read "did not get it testing end to end" as no end-to-end testing done, alongside a few manual ingests and queries.
- Added two TODOs implied by the notes: revisit the data model, review API/queue/CLI failure handling.
- Google Doc still not edited (Docs connector not connected).
- Files changed: `design-doc-draft.md`, `provenance/2026-10-30-028-add-process-notes-to-draft.md`
