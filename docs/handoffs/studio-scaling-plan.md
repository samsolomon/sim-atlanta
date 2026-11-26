# Handoff: scaling plan v2 (2026-11-26, stopped at Sam's stopping point)

Owner: the Opus perf architect (orca_session_id 379eb796), worktree `studio-scaling-plan`.
Coordinator: the Air city-view Claude (run run_348717205e38).

## Done

- **Scaling plan v2:** `docs/scaling-plan.md` on `samsolomon/scaling-plan-v2` (head below). It is
  architect-reviewed, and the coordinator's and Sam's answers are recorded in §8. v1
  (`perf-architecture-plan.md`) carries a superseded banner. There is no PR: it is a plan branch,
  like v1.
- **Decisions recorded:**
  - #704 is parked. It ships in release 19; then the bake goes off by default.
  - High night 629/630 came from #701's rebased head.
  - Sam adopted the reserves: Low geometry 25 MB, High programs 10, High night calls 40.

## Open PRs

| PR | Branch, head | State | Exact next step |
|---|---|---|---|
| #708 | `samsolomon/budget-reserves`, f9069139 | Ready; Grok MERGEABLE | Run `pnpm test:perf` in a Studio window, paste the `IN RESERVE` lines into the body, send the head to the coordinator |
| #709 | `samsolomon/hidelm-ab`, 7d487bc1 | Draft; two Grok rounds, fixes in | Build a frozen copy (`docs/perf.md`, Device protocol). At the default view, Low, check that `hidelm=glass`, `hooked`, `plain` and `all` each lower calls and triangles against the base, with `plain` catching the batch far meshes after `farReady`. Send the A/B URL set in the PR body to the coordinator |

## Queued (not started)

1. **Measure High night calls on 92e71e45** (release 19), or take them from the integrator's
   release 19 `test:perf`. That settles 629 against the 590 the reserve allows.
2. **After increment 0: turn the bake off by default.** Stop shipping the
   `ground-bake-*.bin.gz` files (pipeline `data:bake` output and the `pnpm data` hook). Keep the
   code, `?bake=1` and the CI step.
3. Then the plan's §5 order: the restore increments 2a–2d, then area unload (§3.2).

## Cleanup

- I removed the scratch worktrees for #708 and #709; both branches are pushed.
- No dev servers, browsers or background jobs are running. This worktree has no local changes.
