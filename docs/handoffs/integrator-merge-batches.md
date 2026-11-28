# Merge integrator handoff (2026-11-27)

The integrator lands the PRs Sam picked, in batches. Each batch needs the coordinator's own merge
go; the go for batch 1 covered batch 1 only.

## Done

- **Batch 1 merged**, `main` `2c74320d`: #717 (single-pass panes), #427, #481, #521, #542, #604,
  #627, #632, #404, #594.
- **Group 2 merged**, `main` `da81aa24`: #727 (park lamps stop at the fence), #533, #539, #544,
  #560, #563, #568, #578, #591, #595, #598. `pnpm test:perf` on that tip: High night 480 of 535
  calls (the reserve starts at 495), High programs 94 (inside the reserve), Low geometry 160.7 MB,
  High heap 544 of 570 MB, Low heap 432 of 460 MB.
- The 1180 Peachtree crown veil stays single-pass: two passes need one more High program. The
  held branch is `samsolomon/veil-two-pass-held`.

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

1. `samsolomon/group2-fixes` (#544's south sliver, #578's trellis post), stacked on #726
   (`c9990e15`), needs its own merge go. It is the last gate for release 20 packaging, which needs
   `pnpm data:bake` (`scene/placeholder/board.bin.gz`).
2. Group 3, chained on that fix: #600 #602 #605 #606 #607 #609 #614 #617 #618 #620 and the
   approved reworks #634 (`35371006`), #573 (`efdb5923`), #587 (`c7588892`). Squash #606 and #620
   (merge commits) and check their diffs.
3. Later groups, about ten each in PR-number order: #624 (retarget #652 to `main` first) #626
   #628 #629 #630 #633 #635 #636 #637 #640 #641 #642 #643 #645 #648 #650 #652 #653 #655 #657
   #658 #659 #660 #661 #662 #664 #679 (a draft). The rest of the Rework set stays out.
4. Budgets: High night calls stop at the 535 ceiling, no PR may add a High program, Low geometry
   stays under 165 MB, and heap is the one to watch.

Evidence, scripts and contact sheets are in `~/Developer/merge-batch-sheets-2026-11-27/` on the
Studio.
