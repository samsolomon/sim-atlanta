# Studio skins 1 handoff

Owner: the Claude Opus session in the `studio-skins-1` worktree (coordinator thread `msg_52f10bb4946a`, Air coordinator `914b0cfd`). The skyline lead (`47b1a596`) owns the building-skins table at `origin/samsolomon/studio-building-skins:docs/building-skins.md` and runs the skin merge queue.

## Done

- Marquis One: #393, merged as `6f6a96ab`.
- Marquis Two, plus the lidar crown step for both towers: #406, merged as `a50b3ff5`.

## Open

- ViewPoint: [#429](https://github.com/samsolomon/sim-atlanta/pull/429), held. It is waiting for the coordinator's approval and a queue turn. When it's my turn: rebase, run `pnpm build`, `pnpm test` and `pnpm test:perf` (all three entries: low, high and high-night), then merge only under the ceilings (low 600 calls, high 700, high-night 720). Quote `gh pr view --json state,mergeCommit`.

## Queue, in rank order

712 West Peachtree (19), then Two Peachtree Pointe (21), Southern Company Gas (23) and Atlantic House (32). Follow the building names, not the old rank numbers.

## Standing rules

- Put day 11:30 and night 23:30 images inline in each PR body, with the cam string under each and one close view. Send blob image URLs in the status reply.
- Per-building low-tier budget: 600 triangles and +1 draw (routine). Library surfaces (`paint`, `prism({ wall })`) use the shared painted program and add no shader programs.
- Night lighting follows building type: offices mostly dark, residential and hotels noticeably lit. Avoid speckle.
- Run `pnpm build` (tsc) before every merge.
- Close headless Chrome and vite after each run.
- Batchable statics: use `landmarkShell` and vertex colours, change only in `setNight`, and don't edit `landmark-batch.ts`, `finish()` or the batch call in `city.ts`.

## Tools

- Lidar: `.venv` has `laspy[lazrs]`. Use `pipeline/scripts/king_memorial_corridor.py`'s `ept_points((w,s,e,n))`, which returns scene x and z. Scene z is −north. Downtown origin is 33.7539, −84.3916.
- Captures: the headless CDP script in the session scratchpad (`shots.mjs`) at 1440×900. Bearing in `cam=` is the view heading.
