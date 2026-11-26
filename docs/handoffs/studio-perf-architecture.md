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

**#613 far board, now on `samsolomon/far-board-v2` (head cdd6d76a, from main 068b32ed).** No PR yet.
- **Ported** onto the north rows, slicing, the Peach and the ramp decks.
- **Landmarks keep their own form** (their cell batches' far versions) by default. Boxes stand in only
  for generic buildings and houses. `?perf&farlandmarks=1` boxes landmarks too, as #613 did.
- **Generic boxes draw with the generic buildings' material,** with each wall's style and base, so
  facades and night windows match the near form. That removes the night mesh and its program.
- **Switch:** 15 km, back at 13.5 km (the coordinator's decision).
- **Measured (Low, default view):** 369 → 343 calls by day, 547 → 521 at night, −12% triangles,
  +4.8 MB geometry. With boxed landmarks: 205 / 219 calls.
- **Waiting on the coordinator's iPhone A/B** of `farboard=off`, the default (landmarks kept) and
  `farlandmarks=1`. Then a decision: ship as is, and/or follow-up C (merge each area's plain
  landmark batch classes into one far mesh past 15 km; about −100 calls with the same look).
- **Not yet done:** the zoom video on the final head (an older recording exists; ffmpeg is now
  installed via brew), matched composites, full tests, test:perf.

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
