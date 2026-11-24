# Studio Midtown Connector handoff

Updated 2026-11-23 23:20 ET by Claude Opus (`orca_session_id:cfb2a7c9-c65e-44a5-9d09-9bae3f5b3e21`).
Earlier: Codex `ba90dfab-…` (GPS/fallback WIP), `1f9238ff-…`.

## State

- **#368** `codex/bus-route-49`: Route 49 GPS steering plus per-trip timetable fallback. **Held
  for Sam's OK** and sent to the coordinator (reply thread `msg_9d24009e17d4`). The PR body has
  the inline images, checks and limitations. Head includes #407. `pnpm build`, `test:release`
  and `test:perf` (both tiers) passed on it. Codex cross-review is done (2 rounds, 3 fixed).
  Open decision for Sam: City's Live word is gated on rail OR bus GPS being up.
- **#409** `claude/bus-network-plan`: docs only, `docs/bus-network-plan.md`. Held for Sam's
  choices.
- Deploy for #368 needs the worker update, `pnpm data:bus49` and a web rebuild. Only the
  coordinator deploys. Before merging, rebase on main and run `pnpm build`. Quote
  `gh pr view 368 --json state,mergeCommit` in the merge notice.

## Next

1. On Sam's OK: merge #368, then start the vehicle lights PR (scope in `msg_0dae692360b0`):
   - warm fronts and red tails on illustrative cars, Route 49 buses and Rapid XN40/XE60 at
     dusk and night;
   - zero extra draws and no new low programs (low is at 85/90);
   - matched shots of an arterial, the Peachtree/Edgewood queue and Five Points at night.
   After that, return to the approved Route 23 queue.
2. Refresh the Route 49 GTFS edition by 2026-11-27 (it expires 2026-12-11; see
   `docs/bus-route-49-plan.md`).

## Tools and cameras

- Captures: noon `cam=573,-1411,78,48,150&t=2026-11-20T12:00:00-05:00&speed=0&q=low`, 21:00
  `cam=598,-1173,215,38,150&t=2026-11-20T21:00:00-05:00&speed=0&q=low`. The live pair uses
  `/?view=city&q=low&cam=573,-1411,78,48,150` at the present, recentred on each bus.
- The live-pair harness polls `window.__city.buses.positions` and
  `window.__city.timetableBus(id)` (`.fix` means GPS, `.fallback` means timetable). It clicks
  each bus and checks the card text. Route 49 night service ends around 00:40.
- `op` isn't signed in on the Studio, so the local worker has no rail key. The bus feed needs
  none.
- Kill only your own PIDs. `pkill -f perf-chrome-` also kills other worktrees' perf Chromes.
