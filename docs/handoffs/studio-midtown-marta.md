# Studio Midtown MARTA handoff (Claude Opus → Codex)

## Current handoff · 2026-11-24

The downtown rail maintainer owns integration of the freight portals, Five Points cut faces and CQ400 seating. Ground-contact owns the separate Capitol road/ramp investigation. The rail branches do not edit the Capitol ramp or its deck grade.

1. **#663 freight portals.** Geometry commit `bdb26b1d7cfd2f4ac556e164aaeecdf221737262` on `samsolomon/rail-gaps` grades B’s approach from the ballast shoulders to the original bank. A has visual sign-off. Next, inspect B at `cam=10,-45,180,40,90` by day, at night and with illustrative freight, and repeat the full-board ground audit at both tiers. The capture and audit job is queued under ticket 663. Only #670 has the current timing window.
   - Earlier geometry at `b8ffce92bc22a08ec891ebe28e03336f41893ea4` passed ground-contact review with zero penetrations over 2 cm in 646 samples per tier. The [earlier daylight comparison](../log/ui/rail-portals/b-recessed.jpg) and [night and freight frames](../log/ui/rail-portals/night-freight.jpg) predate the graded approach.
   - The new geometry passed `git diff --check`. New screenshots, ground-contact results, coordinator sign-off, merge slot, final build, full tests, perf and cross-review are pending.
2. **Five Points cut faces.** Draft `0d30281c0f0f4d3bf44e4ce16dd979697ed16553` on `samsolomon/five-points-cut-faces`. After #663 lands, rebase and check the joints between the three track strips at (171,118) and (248,192). Day/night MARTA and freight passage frames, tests and review are pending.
3. **CQ400 seating.** Branch `samsolomon/cq400-bogies` at `a7a95322` follows the cut faces. The earlier probe measured worst swing falling from 0.64 m to 0.46 m. Rebase and verify the frames before opening the PR. [Earlier four-site comparison](https://github.com/samsolomon/sim-atlanta/blob/772bb993/docs/log/passenger-swing/bogies/cq400-before-after.jpg?raw=true)
4. **#427 landuse paving.** Downtown rail owns approved commercial/retail paving and the bounded Robinson frontage at `b1a9ce162408d20c2a8bb3015f46899cb91159dc`. Campus-wide paving stays off. Ticket 427 is queued for the matched door and campus-edge images, final-base tests, perf and review before explicit transfer.

## North-row rail study · 2026-11-24

Downtown rail owns the three-track Norfolk Southern continuation. Private fixture `6e425ea8f2745918d949ceb9bae25fe6c925100f` extends the two Brookwood mains and siding from the frozen City mount `d0251f98`. All three new axes meet the old axes at identical centimetre-rounded endpoints on z = −5700. Offline mesh inspection found 16,838 triangles and one ballast corner 5.03 cm below the raw DEM. Independent visual review of private mount `a5f3d22a35790e3c62abed5d03160041e9073c00` confirms both mains and the siding continue across the seam in the matched Low 40° and 220° views at 08:01:12 EST. The ballast corner at (706.49, −5700) sits 0.290 m above both drawn Low terrain meshes. This verifies visibility at the seam. The separate Armour fork observation has no saved pose.

The Armour reference diagram distinguishes the NS siding-to-yard switches, MARTA yard lead and CSX crossing. The archived wider OSM extract has SHA-256 `368924db35efb0b0e04b126dade9d4ba3f4ba490ae57a0bd57ebeaf6dd7acb85`. BTS/FRA NARN corroborates the two railroad corridors. Sam's separate fork observation has no saved camera. The three-track fixture ends at the R16 edge for the mains and at the mapped yard node for the siding. Yard routing and operating status remain unverified.

## Rail references for expansion

Grant Street remains the rail-over-road control for the current first-bake pilot. For future yard expansion, use Norfolk Southern Inman Yard as the reference for a shared graded track bed carrying parallel tracks. Verify each switch connection against source geometry or imagery before representing it as connected.

## Separate LiveMarta motion study

**Active candidate service — port 5766.** Train 101 uses a 40 s playback delay and an 8 s braking tail on ordinary intervals at candidate code `dad26db8b51e9233637caf561fa1ad7a49686842`. Sampling the served module at 10 ms gave 6.67 m/s at replay 75, 90 and 105 s, a 30 s hold at the 600 m platform, and a 10 s midtrack hold when a report arrived 20 s late. Zero sampled overshoot. Both previews remain available for City. Full app clips and checks pending the capture slot.

**Active comparison service — port 5765.** Downtown rail maintains the 30 s schematic fixture preview from `3fc8c88d56cd59de356bd6f88e72e318c4e889d4`. The coordinator verified Train 101, the controls and advancing time on the review laptop over the tailnet. Keep this service running until City releases it. The LAN route timed out. The matched Map/City fixture is prepared at `8520da59f152271867148d068276865bc165acb3` for the explicit capture slot. Use `?view=map&train=marta%3Atrain%3A101#16/33.7502/-84.3859` and `?view=city&train=marta%3Atrain%3A101` on that fixture server. Each reload restarts the synthetic westbound Georgia State sequence.

Downtown rail owns integration on `samsolomon/live-marta-motion`, prototype `97ab955833210bb4f6fdb6f6f1a0b404937744d6`. A lightweight replay of six reports 30 s apart and 300 m apart showed the original 8 s glide implies 37.5 m/s followed by 22 s stationary. Buffered playback passed the middle cruising fixes at 10 m/s. With positions 0, 300, 600, 600, 600, 900 m, the final second into 600 m covered 0.66 m, the dwell stayed at 600 m and the first second of departure covered 0.98 m.

The prototype budgets 60 s from receipt to the corresponding displayed fix. Source delay adds to that budget; stale observations expire and playback holds at the final supported position. Report time is the latest source observation; buffered positions are inferred. Map and City share TrainSource in code. Next, exercise delayed, duplicate and out-of-order feeds through the public poll path, measure the lag tradeoff and verify shifted-clock fallback. Full tests, rendered Map/City parity, matched before/after clips and acceptance are pending the dedicated check window. Keep this branch separate from release work.

**Delay comparison** at `6a2b20fa6e61c4967b4f4538cc21ce56074ede75`: replay with `node --experimental-strip-types scripts/study-live-motion.mjs` on the prototype branch. Six synthetic reports have a 30 s cadence, 5 s observation age at receipt and a 300 m cruising increment. In the delayed trace, one observation arrives 20 s later (25 s old). Durations below are in seconds. Speeds are the two quarter-second samples straddling the third moving update, in m/s.

| Receipt to displayed endpoint | Cruise hold per poll | Cruise update speeds | Displayed 60 s dwell | Hold before delayed update | Effective age at ordinary / delayed endpoint |
|---|---:|---:|---:|---:|---:|
| 8 s linear | 22 | 0 → 37.50 | 82 | 42 | 13 / 33 |
| 15 s buffered | 15 | 0 → 0.99 | 75 | 35 | 20 / 40 |
| 30 s buffered | 0 | 0.25 → 0.25 | 60 | 20 | 35 / 55 |
| 60 s buffered | 0 | 10.08 → 10.00 | 60 | 0 | 65 / 85 |

No endpoint overshoot in any quarter-second sample. The 30 s curve touches zero instantaneous speed on a timely update. The 15 s curve brakes into its hold and restarts gradually. The input-expiry regression is written; execution and rendered clips await the explicit window. Endpoint age in the table is measured when the display reaches a distinct fix; age continues growing during a hold. The 60 s setting is experimental.

## Sam's decisions and coordinator rulings that touch this area

Today's decisions as the coordinator relayed them in the handoff call; ask the coordinator for details, since they're not all written up on main yet:
- flat glass
- far-board
- landmark LOD
- far shadows
- tree far form
- streaming flag
- 0.45 shade floor
- 1075 glass B
- expansion paused
- generic buildings as the priority

Coordinator rulings in force:
- **Merging:** nothing merges without the coordinator relaying Sam's OK, except fixes the coordinator approves as fixes (#663, PR 2). Run `pnpm build`, `pnpm test` and `pnpm test:perf` on the final rebased head right before merging.
- **Screenshots:** every PR embeds captioned before/after images inline, day and night, with cam strings, and the status reply lists direct blob URLs.
- **Streetcar kerb:** the overshoot is a ceiling ratchet (`KERB_PAST` in `streetcar-shape.test.ts`), not kerb to kerb. Ground-contact will paint carriageway under `streetcarSweptCorners()` and lower it.
- **Weather:** "weather reported" requires an observation at most 60 minutes old (`WEATHER_MAX_AGE_MS`).
- **Shared Studio:**
  - Kill only process IDs you started; never by pattern.
  - Drive only a Chrome you launched, with its own `--user-data-dir` and `--remote-debugging-port=0`.
  - Idle-time work is sliced to a few milliseconds, and PRs report the longest task at 6× throttle.
  - A new downtown landmark in `city.ts` must also go in the `listed` array (`landmark-batch-list.test.ts`).
  - Low tier must add no shader programs (81/86 now).

## Gotchas

- `pnpm test` needs Rust on PATH (`PATH="$(brew --prefix rustup)/bin:$PATH"`) and a `.venv`. Symlink `../studio-midtown-skyline/.venv` and remove it afterwards.
- On a loaded Studio, web tests hit vitest RPC timeouts. `cd web && pnpm exec vitest run --pool=forks --maxWorkers=3` gives a clean run; run the Rust, pipeline (`node scripts/test-pipeline.mjs`) and worker suites separately.
- Swapping a source file to shoot "before" frames needs about 85 s for Vite to rebuild City. The first capture after a swap is often blank (about 123 KB).
- To freeze a freight train in frame: `await import('/src/core/clock.ts')`, then `clock.rebase(); clock.speed = 0`, then reload with `?t=<that ISO>&speed=0`.
- zsh doesn't word-split `$var` inside loops; pass separate arguments to shell functions.
- The raw Overture rail is only in other worktrees (`../studio-amtrak-livery/data/raw/overture_downtown_rail.geojson`). Run `pnpm data` to get your own.
