# Live MARTA motion smoothing (release 20, item 5)

- **Owner:** Studio release-20 agent. Coordinator: the Air.
- **Branch:** `samsolomon/live-marta-motion-r20`, the 8 commits of `samsolomon/live-marta-motion`
  (2026-11-24) rebased onto main, plus release-20 fixes. The original branch is untouched.
  Worktree `release20-live-motion`.
- **Status:** PR open, waiting for the coordinator's wording call and merge go.

## What it does
Snapped live trains play back 40 s behind the newest fix (`web/src/live/motion.ts`):
- a monotone cubic through the fixes
- cruise speed carried through moving fixes
- an 8 s braking tail at the newest fix
- a late fix holds, then restarts

## Release-20 changes on top
- Keeps `s.tier: 'live'`. The branch had relabelled snapped trains `inferred` and the next-stop chip
  "Reported". The card already labels the position Inferred. Revert the top fix commit alone to
  restore the original.
- Fix ages use the server clock, as `freshness()` does.
- A repeated fix still refreshes the next station and ETA.
- Responses that overlap are ordered by snapshot time. A stale row never erases a fresher train.
  A fix dated more than 60 s ahead is distrusted.
- Card: "Placed between reports, about 40 s behind the latest · MARTA · reported N s ago",
  awaiting the coordinator's check.

## Evidence
- Real feed: 24 polls, 21 trains, 2026-11-27, measured with `scripts/live-motion-preview/cadence.mts`.
  - Fixes: median gap 30 s, p90 52 s.
  - 18% of observations repeat a fix.
  - A train between stations sits still 76.3% of the time on main's 8 s glide and 16% with
    playback.
- Synthetic Train 101 fixture at Georgia State (`city.config.mjs`): monotone, never ahead of the
  newest fix, cruises at 6.7 m/s, dwells from 130 to 160 s at 16,066.3 m.
- Live at the real present, through the production proxy:
  - The card and corner read correctly.
  - With `/api` blocked, Live holds for 170 s, then the corner reads Timetable with the notice.
- Per frame, `playback()` costs 0.17 µs for 21 trains (the old glide cost 0.09 µs). test:perf pins
  the clock to 2026-11-20, so it never runs live.
