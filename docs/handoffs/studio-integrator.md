# Studio integrator handoff (2026-11-26, wound down at release 19)

The Studio integrator packages releases on the Mac Studio, owns its performance window and
works for the coordinator on the MacBook Air. Nothing merges or deploys without the
coordinator's go. Sam asked for a stopping point after release 19: nothing below is running.

## Done

- **Release 19 packaged from `92e71e45` and sent to the Air**, awaiting the coordinator's check
  and deploy. `~/Developer/sim-atlanta-release-92e71e45.tar.gz`, SHA-256
  `2128e4a27ceefa56b29ba05546adeccc6544ce9c62f968358f802602b775cb14`; evidence and the packaging
  scripts in `~/Developer/sim-atlanta-release-92e71e45-evidence/`. Its `RELEASE.md` compares it
  with release 18 (`6c5aa4e6`), the rollback. To see whether it is live, compare the site's
  `index.html` with the package's.
- #699 `trafficMean` ceiling, #702 CI, #703 checks by risk and Grok self-review, #705 far-board
  boxes after ready (boot at 6x back to release 16's and 18's figure).
- Boot profile: `~/Developer/sim-atlanta-boot-profile-f0c5ef55/PROFILE.md`.

## Open

- **#707, feed watcher**, branch `samsolomon/feed-watch`, head `f2c364e0`: CI passed, Grok
  MERGEABLE, waiting for the coordinator's check. One judgment to confirm: Amtrak counts as new
  only on new Crescent train numbers or an earlier end date, since its file changes daily.
  After the merge, run the "Feed watch" workflow by hand: it should open the MARTA expiry issue.
  Its `pipeline/feeds.json` matches release 19's two input files byte for byte.

## Next, in the coordinator's order

1. **MARTA projection past the feed's end. Must ship by about 8 December** (MARTA ends
   2026-12-11; the last rail trip runs until 02:11 on the 12th, the last streetcar until 23:15
   on the 11th; no newer feed existed on 26 November). No branch yet. Sam's spec:
   - Past any GTFS feed's end, repeat the last full published week by weekday, with
     `calendar_dates` exceptions dropped.
   - Projected trips carry tier `inferred`, never `scheduled`. The selected-train card reads
     "Inferred from MARTA's last published timetable (ended Dec 11)".
   - The scene word says "Timetable" only while a real schedule covers the moment, otherwise
     something like "Inferred" (wording rules in `docs/data-model.md`).
   - When live is down past expiry, the notice must not say "showing the timetable"; say what is
     shown. Live MARTA still wins at the real present.
   - Tests: past the end gives inferred trips with the right tier on card and scene word; inside
     the feed nothing changes; after-midnight trips at the boundary are right.
   - The coordinator checks the wording before merge.
   - Start at `serviceRuns`/`serviceDays` (`web/src/sched/time.ts`), `Schedule.trainsAt`
     (`web/src/sched/engine.ts`, which stamps `scheduled`), `web/src/ui/status.ts`, the feed
     notice in `web/src/ui/next/shell.ts` and the tier chips in `web/src/map/card.ts`.
2. **Boot slicing** (Sam's top phone lever). At 6x, two single tasks: `stage:terrain` about
   2.3 s and streets and freight about 1.1 s. Yield between the landmark builders in
   `city.ts`, and use the step forms for terrain, batches and transport. Baked ground (#704)
   only added hooks; keep the order of surface reads and carves. `test:perf`, Grok, then the
   coordinator's A16. Optional, only if cheap: hold the far-box swap until the camera next moves
   or a quiet moment.
3. `src/vignette/road-semi.test.ts` can pass Vitest's 5 s default under load.

## Releases

- Besides `AGENTS.md`: `pnpm data` runs `data:bake` (#704). Since release 20 baked ground is parked:
  off unless `?bake=1`, and `web/dist` ships no `ground-bake-*` files. The release perf run should
  show `summary.groundBake` adopted 0 and fallbacks 0, and `find web/dist -name 'ground-bake*'` should print nothing.
- Budget reserves adopted by Sam (#708 encodes them): Low geometry 25 MB, High programs 10,
  High night calls 40. At `92e71e45` High programs (94 of 100) and night calls (629 of 630) are
  inside their reserves, so any change adding to them must offset it.
- Building batches follow the merge plan on `samsolomon/north-expansion-lead-handoff`
  (`7a94a136`). Clubhouses: cherry-pick only, and never push private history below `74e0f9f0`.

## Studio rules

- Before a timed run, have every other agent stop builds, test suites and headless browsers,
  and wait for their replies. Lightweight work, such as editing or a Grok review, continues.
- Stop only processes you started, by process ID.
