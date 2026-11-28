# Merge integrator handoff (2026-11-28)

The integrator lands the PRs Sam picked, in batches. Each batch needs the coordinator's own merge
go; a go covers only the PRs it lists.

## Done

- Every group is merged: batch 1 (`2c74320d`), group 2 with #727 (`da81aa24`), #729 (`584939eb`),
  #730, group 3 (`81db0d05`), #732, #736, group 4 (`0341f96f`: #624 #626 #628 #629 #630 #633 #635
  #636 #640), group 5 (`3a72a96b`: #641 #642 #643 #645 #648 #650 #652 #653 #655 #637), group 6
  (`4e901174`: #657 #658 #659 #660 #661 #662 #664) and #739, the corner sign dim (`25d11e9c`).
  #728, a dropped fix, is closed.
- Release 21 is packaged from `25d11e9c` for the coordinator to test on the A16 and deploy:
  `~/Developer/releases/sim-atlanta-release-25d11e9c.tar.gz` (SHA-256 `95242f25…9790f`), evidence
  and packaging scripts beside it in `…-25d11e9c-evidence/`.
- Release 20 is packaged from `584939eb`:
  `~/Developer/releases/sim-atlanta-release-584939eb.tar.gz` (SHA-256 `6bd3ebda…0afad`), with its
  evidence and packaging scripts in `…-584939eb-evidence/`.
- The 1180 Peachtree crown veil stays single-pass: two passes need one more High program. The held
  branch is `samsolomon/veil-two-pass-held`.

## Open

1. #679 is a draft; Sam decides. #734 and #737 are held for Sam and conflicted with `main` on
   2026-11-28.
2. Startup got slower in release 21: at 6x CPU on Low, ready is 7,125 ms against release 20's
   6,936, almost all of it in `stage:terrain` (2,648 ms, the longest task). The north route fills
   0.8 s later. Group 5 measured about +135 ms of the stage; nothing was split by PR.
3. Budgets at `25d11e9c`: Low geometry 164.2 MB (reserve starts at 165), High night 485 calls
   (reserve at 495), High programs 94 of 100 (inside the reserve), High heap 558 of 570 MB, Low
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
