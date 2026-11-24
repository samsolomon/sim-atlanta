# Studio Midtown Connector handoff to Claude Opus

Updated November 23, 2026 at 22:03 Atlanta time. Outgoing Codex session
`orca_session_id:ba90dfab-f23c-404e-bc66-ec95b0d8b30a`. Read AGENTS.md and
the last 100 messages from this session. For earlier history the predecessor
is `orca_session_id:1f9238ff-2c34-4398-9612-0425e769c083`.

## Current branch and hold

`codex/bus-route-49`, [PR #368](https://github.com/samsolomon/sim-atlanta/pull/368),
contains the pushed implementation checkpoint `a9d74bbefaf7ddbcfc45162b6d57873d65ebd6c2`.
The prior candidate was `0d9eb50f` on main's #386
(`e603b19543020b75aadd3b129f93ecab088aaf80`). **Hold #368 until the Air coordinator
explicitly relays Sam’s OK for the revised behavior and shots.** Only the coordinator deploys.
New coordinator terminal `term_09e1b3da-5f48-4755-abf8-92a571a1f474`.
Reply to `msg_03cc54d915ae` for Route 49 and `msg_a1d98020a89b` for this handoff,
using the successor's own session ID. Direct Studio-to-Air send fails pairing.
Use `orca orchestration check` for replies. Before any MERGED notice quote
the actual `gh pr view <number> --json state,mergeCommit` output.

## Sam’s request

Sam’s own words, relayed in `msg_03cc54d915ae`:

> we should have a fallback to the schedule if we don't have it live... maybe the bus isn't exactly where the live GPS is, but should try and be pretty close.

The coordinator specified a three-minute per-trip freshness threshold, all
active trips falling back if the feed is down or empty, and no timetable twins
beside unmatched live buses. The scene-wide word stays Live at the real
present. The fallback card explains “No live GPS for this trip; shown at its
timetable position”. Steer live Route 49 buses toward an age-projected GPS
target with capped recent speed, respecting stops, signals and traffic queues.
Aim for a gap around 150 m, catch up modest gaps, fade out and back in for
large corrections. Label the observation Live and show its age and the actual
distance from the drawn bus to the last fix. Warn two weeks before the Dec 11
calendar expiration. Keep polls, draw batches and material count flat. Send
noon, 21:00 and a real live/fallback pair with cards before requesting approval.

## What is in the WIP

- The pinned GTFS exporter preserves the raw trip ID alongside each compact
  trip, aligned after sorting. All 658 IDs were regenerated from
  `/tmp/connector-marta-gtfs.zip` and the old timetable tuples compared equal.
  Regeneration checks the archive hash. Worker decodes optional trip ID and
  service date on its existing endpoint. Poll cadence and cache are unchanged.
- `timetable-buses.ts` matches and advances active trips, projects each new
  Route 49 observation onto the directed shape, suppresses nearby unmatched
  twins and runs the scheduled fallback. `gps-bus.ts` carries forward motion,
  dwell, signal/queue limits and a dithered large-correction transition. City
  uses one bus mesh/material and one instance attribute for fade. Map retains
  the raw GPS position. Live/fallback trip selection and follow preserve trip
  IDs. City cards and the scene tier distinguish live reports from inference.
- The release checklist in `docs/bus-route-49-plan.md` calls for refreshing
  the timetable on or before Nov 27, two weeks before the last service date.
- Verified genuine simultaneous November 23 service at 22:02 ET. GPS vehicle
  5106 claimed trip 299 (GPS 42 s old, drawn 1 m from report). Northbound trip
  298 showed the fallback card. Two captures were taken about 1.4 seconds
  apart. Both pages had the live and fallback buses in the same scene.
  [GPS](../log/ui/route-49/present-gps.jpg) and
  [fallback](../log/ui/route-49/present-fallback.jpg).
  Launch URLs used `?view=city&q=low&cam=598,-1173,215,38,150` with
  `&follow=marta:bus-trip:49-20261123-299` or `-298` and no t or speed.
  The moving follow camera uses bearing -148, tilt 26 and distance 300 m.
  `/tmp/route49-linked/{298,299}.json` records the observed card and vehicles.
- After the revision, `pnpm data:bus49`, `pnpm test` (20 Rust, 1,083 web,
  5 worker), and `pnpm build` passed. Python checks skipped without .venv;
  one unrelated web test skipped. Six focused tests passed covering source
  matching, stale/missing GPS, duplicate claims, bounded projection, stop
  dwell, far-fix fade, dates and card tiers. The updated edition has a contract
  assertion for index 295 = GTFS 11708661.
- Earlier work already on main includes #340, #346, #354 and #378.
  #378 at `c9e7cf2bc5d6efc1f8a916376c6e8b4651b4f3c7` bounded queue
  replay to 64 historical steps per draw during warm rollover. Three old
  64-bus runs gave GPS p95/max 0.7/4.5 ms and timetable 0.9/6.2 ms.
  On the pre-revision #368 head after #386, low measured 563/600 draws,
  90/90 programs, 393 MB post-GC; high 1181/1250, 105/140, 501 MB. These
  figures and the earlier A16 pass predate the GPS/fallback revision.

## Next steps in order

1. Inspect the WIP from `0d9eb50f..a9d74bbe`. Finish implementation review
   and add targeted regressions before calling it complete. In particular:
   - Verify an actual red, queue tail/release and large target gap complete
     correctly across fresh reports. Test a backwards correction between
     150 and 300 m (the current driver can hold a bus there until GPS passes it).
     Check what happens when modeled stops delay a bus enough to trigger the
     relocation threshold. The first checkpoint implements capped projection
     and steering; 150 m is not a guaranteed bound while stopped. Cold return
     from a feed gap currently fades the live bus in, but the prior fallback
     may disappear immediately. Check/fix continuity at that transition.
   - Verify a duplicate unmatched fix cannot suppress a second genuine trip,
     missing descriptor/date with opposite directions, and a delayed live trip
     beyond the modeled active interval. Ensure known exact matches take
     priority over proximity suppressions, including unknown route IDs.
     Handle fix near a shape gap, off-board GPS and return to coverage.
   - Check the mixed renderer under the 64-instance cap. Raw snap-only vehicles
     are currently inserted before tracked Route 49 buses. Avoid starving a
     matched or fallback trip when the batch fills. Verify raw/exact return
     paths, pick/follow tier changes and occlusion. Route 49 has the shape and
     stop data for steering. Other routes retain their previous GPS street
     snap. Do not invent timetables for them.
   - Read through compact follow card copy, rail-down notice and stale
     original descriptions (including the header of buses.ts and historical
     notes in the approved plan). Add City confidence and real-time
     bus-to-fallback follow tests. Confirm blending in colour, shadows and the
     model lab with the current shader. No new materials or program headroom
     at low. Format the new GPS/matching code for maintainability.
2. Rerun `pnpm test`, `pnpm build`, `pnpm test:perf --no-build` against
   the populated 12-area board. Recheck fixed +65 s and 64-bus CPU, especially
   the mixed live case. `/tmp/connector49-calls.mjs` and
   `/tmp/connector49-cpu-{cdp.mjs,browser.js}` are local harnesses; the old
   CPU harness must use presentAt for the new mode. Ask the coordinator for
   any additional A16 run. Never present the previous candidate’s results as
   the revised candidate’s results.
3. Refresh noon and 21:00 shots after finishing changes, inspect for bus/traffic
   contact and correctly labeled cards. Noon: `cam=573,-1411,78,48,150&t=2026-11-20T12:00:00-05:00&speed=0&q=low`.
   Night: `cam=598,-1173,215,38,150&t=2026-11-20T21:00:00-05:00&speed=0&q=low`.
   Existing `docs/log/ui/route-49/{noon,night}.jpg` are from the prior
   candidate. For a new real capture, discover the currently drawn trip IDs via
   dev `window.__city.buses.positions` and `window.__city.timetableBus(id)`.
   Use the shared local worker to capture real observations. Temporary scripts
   `/tmp/route49-linked.mjs` and `/tmp/route49-capture-pair.mjs` already
   work; the linked script hardcodes this evening’s two IDs. Stop all owned
   servers and close review tabs afterward.
4. Append a build-log entry for the revised milestone. Run the repo cross-review
   on the revised feature (`pnpm review -- --reviewer claude` was used by
   Codex; Claude should get Codex). The two old review rounds on the original
   feature predate Sam’s change. Update #368’s body and coordinator with the
   final four images, camera strings, verification and open limitations.
   Deployment now requires the updated **worker** and staged bus artifact in
   addition to the web build. Only coordinator deploys. Wait for Sam’s OK.
5. After #368 actually merges, start the separate vehicle lights PR. Sam:
   “the buses, cars and vehicles should probably have headlights, maybe some
   tail light glow?” Scope per `msg_0dae692360b0`: illustrative cars,
   timetable/live buses and Rapid XN40/XE60 at dusk/night. Use existing mesh
   patches, warm white fronts/red tails, brighter queued brakes if free, zero
   extra draws, optional high-only ground glow if affordable, no real lights
   or shadows. Send matched arterial, Peachtree/Edgewood queue and Five Points
   night shots before merge. After lamps return to the approved Route 23 queue.
   Rapid IDs: xe60 / marta:vt:xe60, xn40Rapid livery on marta:vt:xn40.
   XE60 service unverified.

Set Rust PATH with `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"`.
Use `pnpm --filter web exec vite --host 127.0.0.1 --port 5289 --strictPort`,
`pnpm dev:worker` on 8787, and `pnpm data:bus49` to stage the checked-in
snapshot. Earlier local bench and review logs are in /tmp; committed evidence
and PR notes are the portable record.
