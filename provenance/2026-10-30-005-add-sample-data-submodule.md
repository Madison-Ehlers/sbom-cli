# add-sample-data-submodule
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Next we need to add some sample data, once verifying that this sample repository is accurate and something to use for the specified formats, add this repo as a submodule to the project. https://github.com/chainguard-sandbox/bom-shelter

## Agent output
Shallow-cloned chainguard-sandbox/bom-shelter into scratchpad and inspected it (clone since deleted). Did NOT add the submodule: verification failed.

Findings:
- Last commit 2023-06-01; predates CycloneDX 1.6 and SPDX 3.0 (both 2024).
- CycloneDX JSON: 8 files total, specVersion 1.2 (1), 1.3 (2), 1.4 (5). Plus 5 XML (1.4), not 1.6.
- SPDX JSON: 2.2 (~1311) and 2.3 (~2103); tag-value 2.1/2.2/2.3. Zero SPDX 3.0 (JSON-LD, @context) files.
- Size: ~4.5G working tree (4.2G in `in-the-lab`, 47M `in-the-wild`).
- Licenses in lab data are mostly NOASSERTION.

Asked user whether to add anyway (possibly sparse/`in-the-wild` only), or source 1.6/3.0 samples another way.

Files changed: provenance/2026-10-30-005-add-sample-data-submodule.md

---

# add-sample-data-submodule (follow-up)
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Add anyway

## Agent output
Added bom-shelter as submodule at `samples/bom-shelter` (staged, not committed). Used a shallow, blob-filtered, sparse clone limited to `in-the-wild` (57M on disk) to avoid the 4.2G `in-the-lab` data. Sparse config is local to this checkout; fresh clones need: `git submodule update --init --depth 1 samples/bom-shelter && git -C samples/bom-shelter sparse-checkout set in-the-wild`.

Files changed: .gitmodules, samples/bom-shelter (submodule), provenance/2026-10-30-005-add-sample-data-submodule.md

---

# add-sample-data-submodule (commit and push)
- Date: 2026-10-30
- Model: claude-sonnet-5-5

## Prompt
Once added, commit and push

## Agent output
Committed only the submodule, .gitmodules and this provenance file (left unrelated untracked/modified files alone) and pushed main to origin.

Files changed: provenance/2026-10-30-005-add-sample-data-submodule.md
