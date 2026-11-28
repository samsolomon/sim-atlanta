# Studio east extension plan handoff (2026-11-27)

Owner: the expansion planner on the Mac Studio (worktree `east-extension-plan`, branch
`samsolomon/east-extension-plan`). Coordinator: the Air City-view Claude. Docs only. PR #733 (open, not for merge until the
coordinator's go). The coordinator has put the plan in a commentable doc for Sam (2026-11-27).

## Done

- `docs/east-extension-plan.md`: extent (26.4 km², 47 tiles), tile grid, neighbourhood layer,
  prerequisites with status, budgets, the road and rail gate, phasing E0–E5, questions for Sam.
- Figure: `docs/log/east-extension/extent.{png,svg}`. Tile shares: `docs/log/east-extension/tiles.json`.
  Tools and their inputs: `docs/log/east-extension/tools/README.md`.

## Next

1. Sam comments on the doc and answers §9 (trail people, east edge 5400 vs 6200, the I-20 strip, Buckhead next).
2. The coordinator assigns E0 owners (roads, streaming, materials, integrator).
3. Re-measure `test:perf` on current main before E1: the 16110fa6 baseline predates ~30 skin merges.

## State

Head: the latest commit on #733. Status: stopped, waiting for Sam's comments. Fold them into
`docs/east-extension-plan.md` on this branch, or in a new branch if #733 has merged.


No dev servers, no Chrome left running (one headless screenshot, self-exiting), no perf lock taken.
External fetches: City of Atlanta DCP GIS (city limits, NPU), TIGERweb places, Overpass (I-20 and
ramps, Krog Street). No secrets used.

Unverified in the plan (do before relying on them): UTC canopy coverage over the DeKalb cells;
I-20 cut and wall heights; the MARTA line's grade east of Hulsey; Hulsey yard's current use.
