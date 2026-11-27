# MARTA timetable expiry (release 20, item 1)

- **Owner:** Studio release-20 agent (worktree `release20-small`). Coordinator: the Air.
- **Branch:** `samsolomon/marta-timetable-expiry`, from main `0d2225c2`.
- **Status:** PR open, waiting for the coordinator's wording check and merge go.

## What it does
Past a feed's last published date (MARTA 2026-12-11), `Schedule.trainsAt` repeats the same
weekday of the last full published week from calendar.txt only, stamps `s.tier: 'inferred'`, and
sets `projectedFrom`. `Schedule.projectionsAt(date)` drives the corner word ("Inferred"), the
live-down notice, and the share freeze text. Spec and wording: `docs/data-model.md`, "Past a feed's end".

## Evidence
- `web/src/sched/projection.test.ts`: synthetic calendar (dropped exception, holiday-only service,
  service ending early, after-midnight trips) plus the real feed (02:11 boundary, minute sweep,
  inside-feed unchanged).
- Inside the feed, it deep-equals main's engine at 921 instants (15,978 trains); that was a
  one-off scratch check, not committed.
- Screenshots: `docs/log/ui/marta-expiry/`.

## Next
- When MARTA publishes a new feed, run `pnpm data` and the projection steps aside on its own. The feed watcher (#707)
  opens the issue.
- No `test:perf`: no meshes, materials or programs. Per frame it adds one `projectionsAt` call
  in the shell's 2 Hz tick. That call is two `Intl` formats per feed.
