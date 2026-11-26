# Handoff: scaling plan v2 (2026-11-26)

Owner: the Opus perf architect, worktree `studio-scaling-plan`. Coordinator: the Air city-view
Claude (run run_348717205e38).

- **Done:** `docs/scaling-plan.md` on `samsolomon/scaling-plan-v2` (based on
  `samsolomon/perf-architecture`). It is docs only, and architect-reviewed (the note is at its end).
  v1 (`perf-architecture-plan.md`) now carries a superseded banner.
- **Waiting on the coordinator:** the three questions in its §8: whether to park or merge #704,
  which head High night 629/630 comes from, and the reserve sizes for Sam.
- **Next action:** increment 0, the device A/B. I build a frozen copy of main with the `hidelm`
  perf switch and send its URLs to the coordinator. The integrator owns increment 1 (boot slicing).
- No servers or browsers are open, and there are no local changes.
