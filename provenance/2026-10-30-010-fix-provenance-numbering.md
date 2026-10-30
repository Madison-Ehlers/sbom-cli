# fix-provenance-numbering
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
You can fix this in a worktree if necessary

## Agent output
Interpreted "this" as the duplicate provenance sequence numbers I flagged (parallel sessions produced two files each for 003, 004, 005, 007, 008; 010 unused). The main checkout is shared with other sessions and has uncommitted changes, so I used a git worktree on new branch `provenance-numbering`, stacked on `schema-proposal` (PR #1) so PR #1 is not widened.

Rule: the earliest-committed file keeps its number; later duplicates move to unused numbers (012+), since NNN is a global unique sequence and git history gives chronology. Renames (git mv, content unchanged):
- 003-scaffold-pipelines -> 012
- 004-commit-push-scaffold -> 013
- 005-readme-run-commands -> 014
- 007-open-schema-pr -> 015
- 008-pr-opened-by-user -> 016
Untracked 011-prefer-yarn in the main checkout left alone.

Files changed: 5 renames in provenance/, provenance/2026-10-30-010-fix-provenance-numbering.md
