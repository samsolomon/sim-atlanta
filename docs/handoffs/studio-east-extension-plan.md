# Studio east extension plan handoff (2026-11-27)

Owner: the expansion planner on the Mac Studio (worktree `east-extension-plan`, branch
`samsolomon/east-extension-plan`). Coordinator: the Air City-view Claude. Docs only.

## Done

- `docs/east-extension-plan.md`: extent (26.4 km², 47 tiles), tile grid, neighbourhood layer,
  prerequisites with status, budgets, the road and rail gate, phasing E0–E5, questions for Sam.
- Figure: `docs/log/east-extension/extent.{png,svg}`. Tile shares: `docs/log/east-extension/tiles.json`.
  Tools and their inputs: `docs/log/east-extension/tools/README.md`.

## Next

1. Sam answers §8 (trail people, east edge 5400 vs 6200, the I-20 strip, Buckhead next).
2. The coordinator assigns E0 owners (roads, streaming, materials, integrator).
3. Re-measure `test:perf` on current main before E1: the 16110fa6 baseline predates ~30 skin merges.

## State

No dev servers, no Chrome left running (one headless screenshot, self-exiting), no perf lock taken.
External fetches: City of Atlanta DCP GIS (city limits, NPU), TIGERweb places, Overpass (I-20 and
ramps, Krog Street). No secrets used.
