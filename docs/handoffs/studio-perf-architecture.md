# Handoff: Studio perf architecture (2026-11-26)

Owner: the Opus perf-architecture agent, worktree `studio-perf-architecture`. Coordinator: the Air
city-view Claude.

## Done

| Work | Where | State |
|---|---|---|
| Performance architecture plan | `docs/perf-architecture-plan.md` on `samsolomon/perf-architecture` (7355072d), evidence in `docs/log/perf-architecture/` | Sam answered §7 (recorded there). No PR yet: it is a plan branch. |
| iPhone traffic regression (release 17) | #688, merged as 068b32ed | Root cause: `deckAt` scanned every tread triangle of a run per sample. Now an 8 m tread index, proven identical at tolerance 0. Phone: Connector 13 → 1.7 ms, 18 → 23.5 fps. The traffic gate is in `perf-budget.json` (low). |
| Seam program fold | #696, merged as feb26b51 (release 19) | The Station seam fragments and R16 seam buildings take the perimeter clip. Programs: Low 83 → 80, High 98 → 93 (R16 view 87 → 84, 107 → 101). |

## In progress

**#613 far board, version A (landmarks kept): head 4f97f653 on main 6c5aa4e6, for release 19.**
- `pnpm test` and build pass. Stills and zoom videos are in `docs/log/far-board-v2/`.
- iPhone: 23.4 → about 26 fps (boxed landmarks gave 36.2).
- Waiting on Grok (via the coordinator) and `test:perf` (the integrator has it queued third).
- Generic boxes draw with the generic buildings' material (`styledBoxMesh`). The wall style is chosen
  by area (`dominantWallStyle`).

**C (decided follow-up): one far mesh per area for plain landmark batches.** Design, not started:
- **Where:** inside `materials/landmark-batch.ts`. Add `batches.buildAreaFar()`, built after `farReady`,
  and `batches.setAreaFar(on)`, called from model.ts's `showFar` next to the box mesh.
- **What merges:** a `DayGroup` merges when its group is alike at every night probe (no lit-window
  runs) and its material is plain vertex colour (StaticLandmarkMaterial-like: no maps, no hooks).
  Copy its far index range (the `far` mesh's index into the class buffer) out of the packed buffer:
  unpack each mesh's transform cube to the scenery frame, then repack. Merge into one mesh per look
  (`lookOf` key), drawn with that look's existing material, so no new program.
- **While the area is far:** for merged groups, hide `d.far` and keep the full mesh's `hideFromView`,
  so landmark shadows don't change. Add a `merged` flag that `show()` respects, so a cell's own LOD
  transition can't re-show `d.far`. Groups that aren't alike (lit windows at night) keep their own
  far version.
- **Target:** at the default view, calls 343 → roughly 240 by day (boxed landmarks gave 205), with
  nothing visible changing. Check it with matched stills at 14 km (forced) and at the default view,
  day and night: the pixel diff of A against A+C should be about 0.
- **Checks:** the shared/material class, so the full set plus `test:perf`. Then the coordinator's
  iPhone A/B.

## Queued

**#435 streaming prototype (`?stream=1`), approved by Sam.**
- Rebase onto main. Keep it behind the flag, off by default.
- Reconcile `docs/expansion-plan.md` with the perf plan: the perf plan is the plan of record.
- Measure what stream=1 costs and saves on Low, and re-run the blink test.
- Check its layer-1 rules against the Peach, the ramp decks, the seam fragments and the held ground.

## Scratch and tools

- **Probes and scripts:** `docs/log/perf-architecture/tools/`, plus my scratchpad.
  - `slot*.sh`: builds, then perf-runs, then stills.
  - `tools/record.mjs`: a WebM of the canvas via MediaRecorder.
- **Temporary worktrees, safe to remove** (`git worktree remove`):
  - `<scratchpad>/wt-613`: the far-board-v2 branch is pushed.
  - `<scratchpad>/wt-base`: a detached main.
