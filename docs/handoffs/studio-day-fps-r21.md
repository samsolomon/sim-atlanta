# Handoff: win back release 20's day fps (release 21)

- **Owner:** Studio materials follow-up (Claude). Coordinator: the Air city-view Claude.
- **Branch:** `samsolomon/day-fps-r21`. The PR is linked from the coordinator message.
- **Problem:** on the A16, release 20 ran about 9% slower than release 19 at 14:00 at the default
  view (46.8/45.7 → 42.7/41.1 fps). Night held.
- **Cause, as attributed:** since #721, a landmark lit-wall group drew with the facade program by
  day too, and its far version did as well, because it shares the material. At Low's default view
  that is about 346k of 1.68M triangles (337k of them far), each vertex running the 16-range glow
  loop and writing 11 floats of facade varyings, all to add nothing. #726's placeholder costs 1 call
  and 13k triangles by day, and its ink branch is off by day (`uMarkNight` 0), so it is the smaller
  suspect. The A16 set below separates the two.
- **Fix:** while every run's glow is exactly zero, `sync()` puts a plain twin on the group's
  full and far draws. The twin is the material cloned before the facade hook: release 19's day
  material, on an existing program. Board clipping carries over in the swap. Design and numbers:
  `docs/facade-night.md`, section "By day: off the facade program".
- **Budget, same build:** calls, programs, triangles and geometry are identical at 14:00, 17:50 and
  22:00 on Low and High. `test:perf` passes on both sides, and High night stays at 480 calls and 94
  programs.
- **Look:** see the pixel-diff section in `docs/facade-night.md`. The fix matches main within the
  main-vs-main floor.
- **A/B switches:** `?perf&daywall=facade` gives the release 20 path, `&nightwall=off` the old
  landmark path, and `&placeholder=off` removes the placeholder.
- **Deploy:** a rebuild only. No `pnpm data`.

## A16 pass (coordinator runs it)

The frozen build is at `~/Developer/sim-atlanta-dayfps-frozen` on the Studio, built from `de899a1e` (the PR head's code;
later commits are docs only). Release 19's staged dist is at
`~/Developer/sim-atlanta-release-92e71e45/web/dist`. Serve both from `web/` in this worktree:

```sh
npx vite preview --outDir ~/Developer/sim-atlanta-dayfps-frozen --host 0.0.0.0 --port 4691 --strictPort
npx vite preview --outDir ~/Developer/sim-atlanta-release-92e71e45/web/dist --host 0.0.0.0 --port 4692 --strictPort
```

Run each URL with `P=http://100.78.214.26:4691/?view=city&q=low&perf=run&t=2026-11-20T14:00:00-05:00`.
Use a fresh Chrome per URL, and alternate the order twice:

| # | What | URL |
|---|---|---|
| 1 | Fix (release 21 candidate) | `$P` |
| 2 | Release 20 path, same build | `$P&daywall=facade` |
| 3 | Old landmark path (release 19's batches) | `$P&nightwall=off` |
| 4 | Fix, no placeholder | `$P&placeholder=off` |
| 5 | Release 20 path, no placeholder | `$P&daywall=facade&placeholder=off` |
| 6 | Release 19 itself | `http://100.78.214.26:4692/?view=city&q=low&perf=run&t=2026-11-20T14:00:00-05:00` |
| 7 | Night check, fix | `$P` with `t=…T22:00:00-05:00` |

- **Pass:** #1 is about #3 and #6 (the release 19 day fps), and better than #2. #7 is within noise
  of release 20's night (about 38 fps), with landmark panes lit.
- **Reading it:** #2 − #1 is the facade cost. #1 − #4 is what the placeholder costs. If #4 and #6
  still differ, a third change since release 19 costs fps.
