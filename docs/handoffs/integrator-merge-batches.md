# Merge integrator handoff (2026-11-28)

The integrator lands the PRs Sam picked, in batches. Each batch needs the coordinator's own merge
go; a go covers only the PRs it lists.

## Done

- Merged: batch 1 (`2c74320d`), group 2 with #727 (`da81aa24`), #729 (`584939eb`), #730, group 3
  (`81db0d05`), #732, #736, group 4 (`0341f96f`: #624 #626 #628 #629 #630 #633 #635 #636 #640) and
  group 5 (`3a72a96b`: #641 #642 #643 #645 #648 #650 #652 #653 #655 #637). #728, a dropped fix, is
  closed.
- Release 20 is packaged from `584939eb`:
  `~/Developer/releases/sim-atlanta-release-584939eb.tar.gz` (SHA-256 `6bd3ebda…0afad`), with its
  evidence and packaging scripts in `…-584939eb-evidence/`.
- The 1180 Peachtree crown veil stays single-pass: two passes need one more High program. The held
  branch is `samsolomon/veil-two-pass-held`.

## Open

1. **Group 6 is waiting for its merge go** (asked 2026-11-28): #657 #658 #659 #660 #661 #662 #664,
   tip `b723f200` on `main` `3a72a96b`. The request is `group6-merge-go.md` and the script is
   `evidence/merge6.sh <main-sha>`.
2. #660's corner sign glows as a flat rectangle at night. The request asks whether to merge it and
   dim it in a follow-up, or hold it.
3. #679 is a draft; Sam decides. #734 and #737 are held for Sam and conflict with `main`.
4. Release 21 is not packaged. Run `pnpm data:bake` first: it bakes the white stand-in.
5. Budgets at group 6's tip: Low geometry 164.2 MB (reserve starts at 165), High night 485 calls
   (reserve at 495), High programs 94 of 100 (inside the reserve), High heap 557 of 570 MB, Low
   heap 442 of 460 MB. Anything past the Low geometry reserve waits for Sam.

## How a batch is built

- Rebase the PRs onto `main` into **one chain** in merge order. Each appends to
  `docs/build-log.md` and wires into `web/src/city/city.ts`, so independent branches conflict as
  soon as the first one merges. Squash a branch that holds merge commits, or that rewrites its own
  wiring, into one commit with the PR's title, and check its diff against the original.
- Merge as merge commits in order, with `--match-head-commit`. If `main` moved after CI ran, close
  and reopen each PR to rerun CI against it (a plain rerun keeps the old base).
- Count budgets per head, then run `pnpm test`, `pnpm build` and one `pnpm test:perf` on the tip.
- Timed runs, counts and headless captures: take `~/Developer/perf.lock` first and release it on
  exit, including on `TERM`.
- A fresh or switched worktree needs `pnpm data:bake` before `pnpm test`.
- A new terrain yield can add a ground rebuild at boot, and ground cut after City drapes the
  streets lets them draw over the new surface. Pass such yields into terrain creation, and compare
  boot at 6x CPU throttle.
- Review: `REVIEW_CODEX_MODEL=gpt-6.2-sol REVIEW_CODEX_EFFORT=medium pnpm review --reviewer codex`,
  two rounds.

Evidence, scripts and contact sheets are in `~/Developer/merge-batch-sheets-2026-11-27/` on the
Studio.
