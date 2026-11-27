# Merge integrator handoff (2026-11-27)

The integrator lands the PRs Sam picked, in batches. Each batch needs the coordinator's own merge
go; the go for batch 1 covered batch 1 only.

## Done

- **Batch 1 merged**, `main` `2c74320d`: #717 (single-pass panes), #427, #481, #521, #542, #604,
  #627, #632, #404, #594. `pnpm test:perf` on that tip: High night 480 of 535 calls (the reserve
  starts at 495), High programs 94 (inside the reserve), Low geometry 160.4 MB.

## How a batch is built

- Rebase the PRs onto `main` into **one chain** in merge order. Each appends to
  `docs/build-log.md`, so independent branches conflict as soon as the first one merges. Squash a
  branch that holds merge commits and check its diff against the original.
- Merge as merge commits in order, with `--match-head-commit`. If `main` moved after CI ran, close
  and reopen each PR to rerun CI against it (a plain rerun keeps the old base).
- Timed runs and headless captures: take `~/Developer/perf.lock` first and release it on exit.
- A fresh or switched worktree needs `pnpm data:bake` before `pnpm test`.
- Review: `REVIEW_CODEX_MODEL=gpt-6.2-sol REVIEW_CODEX_EFFORT=medium pnpm review --reviewer codex`,
  two rounds.

## Next

1. This fix PR: the 1180 veil and the Piedmont lamp paths. It goes in the next batch, before
   release 20 is packaged.
2. Measure and build the later groups (about ten PRs each, PR-number order): #533 #539 #544 #560
   #563 #568 #578 #591 #595 #598, then #600 onward. #634, #573 and #587 may join after Sam's look.
   The rest of the Rework set stays out. Stop at 495 High night calls until Sam decides on a higher
   ceiling. No PR may add a High program. #539 needs day and night stills showing grey roofs.
   Retarget #652 to `main` before #624 merges.

Evidence, scripts and contact sheets are in `~/Developer/merge-batch-sheets-2026-11-27/` on the
Studio.
