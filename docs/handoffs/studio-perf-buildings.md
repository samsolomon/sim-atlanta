# Building performance handoff

Updated 2026-11-24. The building-performance owner in `studio-perf-buildings` owns the combined #613 integration. The phone-performance owner gates the A16 result. The skyline lead assigns the merge slot.

## Current candidate and next action

- Combined candidate `68d8787386e9c6239de8eca045b7ffcc1db9a779` on `samsolomon/far-board-main-tone` integrates the landed #644 facade code with #613. It applies linear RGB tone per wall triangle before area weighting and keeps roof colours separate. The approved #613 PR head is still `89adda5efd5cf659a9b1ca008f441e46f455729b`.
- Only #670 has the Studio timing window. Wait for explicit clearance for ticket 613 and for #654 to land before final integration. Refresh main, resolve any overlap in terrain or building generation, then run the production build, full tests, perf suite, ground audit and matched low-tier captures across the 15 km switch under the shared lock. Inspect the images, run cross-review, and confirm A16 clearance for the combined candidate before updating #613. Correct its title to 15 km. Merge only in the assigned slot.
- Prior evidence at the approved head includes day, dusk and night pairs and a transition strip in `docs/log/far-board/` on the feature branch. Low-tier counts were 196 calls, 1.14M triangles and 78 programs. Combined candidate build, tests (including the new 3:1 mixed-wall regression), screenshots, perf and device confirmation are pending.
- Preserve `samsolomon/far-board-build-steps` at `c9fb5ebb` for the slicing follow-up. TypeScript, Vite and the large night-index regression passed on that branch. Full suite, locked 6× timing and screenshots remain pending. The earlier 34.5 ms longest mesh step and 107 ms longest zoom-out task predate that head. Target longest mesh step is about 8 ms.
- Preserve `samsolomon/generic-v2-far-tone` at `f70ed15d` as the original contribution. The combined candidate already contains its tone change and regression test. #575 remains held on `samsolomon/compact-batch-vertices`; retain the local normals-only fallback too. No generic-buildings reference checkout is required. There is no running building-performance preview or verification job.

## Gotchas

- **Closures leak in V8.** A closure created inside a big build function keeps that function's
  whole context alive. This cost +49 MB once (the `sync` closure in `batchLandmarks`) and +33 MB
  once (`raycast = () => {}` in `farBoxMesh`). Use module-level functions (`syncer()`,
  `noRaycast`).
- **three r180 shadows:** shadow casters are tested against the *view* camera's layers, so a
  shadow-only layer doesn't work. `drawRange.count = 0` still issues a draw; only `-1` skips it.
- **Raycasting hits hidden meshes.** Far meshes take a no-op raycast.
- **Far boxes and the ground:**
  - `grounded()` drops boxes that stand more than 3 m clear of the ground (skybridges) and lowers
    each box to the lowest drawn ground under it.
  - `carve()` and `carveSteps()` both call `lowerFarBoxes()`.
  - Bands only step inward.
  - There is no night sparkle inside carved cuts (`inCarved`).
  - Run `pnpm audit:ground` after changing any of this.
- **`World.buildingSteps(..., withFarBoxes)`** fits far boxes only when asked (low with the far
  board on). Near house-tile builds must not pay for it: it was 19–41% of each long task on
  route:north.
  - The tree lab's #646 and #651 rebase onto #613 and change the yield in `buildingSteps`. They
    agreed to keep `farBox()` before the next building's vertices and before `geometrySteps()`.
- **Landmark far versions** are built in a worker (`landmark-lod.worker.ts`), and their main-thread
  copies are chunked about 1 MB per task (`COPY_CHUNK`). With `Float32Array.from(uint8)` instead of
  `new Float32Array(uint8)`, the copy-out took 10–20 ms.
- **Watch the streaming PRs #621 and #611.** Both are held, owned by the streaming agent, and both
  switch `model.ts` to `yield* buildLandmarkBatches(...)`. When they rebase onto #524 they must
  keep passing `lod: LANDMARK_LOD[...]` and keep the `farReady` log and `setLandmarkDetail`.
- **Off-switches:** `?perf&farboard=off`, `?perf&farm=<m>` (0 forces far), `?perf&lod=off`,
  `?perf&batch=off`, `?perf&colours=float`, `?perf&lampshadow=off`.
- **zsh:** brace `"${SHA}:path"` in `git show`. An unbraced `$M:w` is parsed as a zsh modifier.
