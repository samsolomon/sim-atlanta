# Studio Midtown MARTA handoff (Claude Opus → Codex)

## Brookwood two-span comparison · 2026-11-25

The private comparison uses the approved Mayson baseline `21341f85a658f9230c22592a59733981cae2297f`. Downtown rail owns portable geometry. Brookwood source `5657605d054a642921351da0b4b45b1a1c4c00aa` mounted as `955f5f56e7386575d58381649134d28d723c30b5` and Sam accepted its design. The southwest boarding island and two NS mains (38978865 and 874902950) cross I-75 on a shared flanged steel deck. The adjacent Peachtree Street road bridge is separate. Both full-width closures and nine legs meet drawn earth on Low and High. Each tier repeats 31 illustrative freight and 41 scheduled Crescent frames at identical car poses. The Crescent retains its baseline wheel-height residual. [November 2026 freight underside](https://www.google.com/maps/@?api=1&map_action=pano&pano=D3jzz_wMUQeJhwtuEW6hpw)

MARTA North Line ways 54044472 and 319512643 cross I-85 on a concrete guideway. The first accepted contact comparison `1522f6cdd6235b4f9aae656d07c83f6433853c7a` fit four round shafts to the actual girder triangles. The shoulder successor `aad862bcfa547d8a6ee08576d382d6b15adb5956` uses rail source `bd1d872756559f22b1e083eb3b14e906bae510fe` on `codex/private-brookwood-two-spans`. Six September 2026 bearings register the visible northbound shaft behind a capped protective wall. Moving this one shaft clears the painted northbound shoulder by 2.868 m and the raised ramp 38980983 asphalt by 3.334 m. On both tiers the entire bearing top matches the soffit within 0.0041 mm. The southbound view establishes a barrier, vegetation and ribbed end wall. Its footing is hidden. The inferred shaft retains a 1.665 m² modeled shoulder overlap. Physical clearances and precise dimensions remain unverified. [Northbound wall and shaft](https://www.google.com/maps/@?api=1&map_action=pano&pano=8_ASoEWh9WnoZsY9uNWYAA&heading=90) · [Southbound wall and barrier](https://www.google.com/maps/@?api=1&map_action=pano&pano=ZAzpf7hJDZZwXu-CAOe5SQ&heading=27)

Next, present the two shaft dispositions with the labeled dated images, final replay checks and matched cameras. Formal Grok review remains pending authentication.

## Current handoff · 2026-11-24

The downtown rail maintainer owns integration of the freight portals, Five Points cut faces and CQ400 seating. Ground-contact owns the separate Capitol road/ramp investigation. The rail branches do not edit the Capitol ramp or its deck grade.

1. **#663 freight portals.** Geometry commit `bdb26b1d7cfd2f4ac556e164aaeecdf221737262` on `samsolomon/rail-gaps` grades B’s approach from the ballast shoulders to the original bank. A has visual sign-off. Next, inspect B at `cam=10,-45,180,40,90` by day, at night and with illustrative freight, and repeat the full-board ground audit at both tiers. The capture and audit job is queued under ticket 663. Only #670 has the current timing window.
   - Earlier geometry at `b8ffce92bc22a08ec891ebe28e03336f41893ea4` passed ground-contact review with zero penetrations over 2 cm in 646 samples per tier. The [earlier daylight comparison](../log/ui/rail-portals/b-recessed.jpg) and [night and freight frames](../log/ui/rail-portals/night-freight.jpg) predate the graded approach.
   - The new geometry passed `git diff --check`. New screenshots, ground-contact results, coordinator sign-off, merge slot, final build, full tests, perf and cross-review are pending.
2. **Five Points cut faces.** Draft `0d30281c0f0f4d3bf44e4ce16dd979697ed16553` on `samsolomon/five-points-cut-faces`. After #663 lands, rebase and check the joints between the three track strips at (171,118) and (248,192). Day/night MARTA and freight passage frames, tests and review are pending.
3. **CQ400 seating.** Branch `samsolomon/cq400-bogies` at `a7a95322` follows the cut faces. The earlier probe measured worst swing falling from 0.64 m to 0.46 m. Rebase and verify the frames before opening the PR. [Earlier four-site comparison](https://github.com/samsolomon/sim-atlanta/blob/772bb993/docs/log/passenger-swing/bogies/cq400-before-after.jpg?raw=true)
4. **#427 landuse paving.** Downtown rail owns approved commercial/retail paving and the bounded Robinson frontage at `b1a9ce162408d20c2a8bb3015f46899cb91159dc`. Campus-wide paving stays off. Ticket 427 is queued for the matched door and campus-edge images, final-base tests, perf and review before explicit transfer.

## North-row rail study · 2026-11-24

Downtown rail owns the three-track Norfolk Southern continuation. Private fixture `6e425ea8f2745918d949ceb9bae25fe6c925100f` extends the two Brookwood mains and siding from the frozen City mount `d0251f98`. All three new axes meet the old axes at identical centimetre-rounded endpoints on z = −5700. Offline mesh inspection found 16,838 triangles and one ballast corner 5.03 cm below the raw DEM. Independent visual review of final private mount `9c2e854ada179f4b750db5289f33c1b65e471171` confirms both mains and the siding continue across the seam in the matched Low 40° and 220° views at 08:01:12 EST. The ballast corner at (706.49, −5700) sits 0.290 m above both drawn Low terrain meshes. This verifies visibility at the seam. The separate Armour fork observation has no saved pose.

The Armour reference diagram distinguishes the NS siding-to-yard switches, MARTA yard lead and CSX crossing. The archived wider OSM extract has SHA-256 `368924db35efb0b0e04b126dade9d4ba3f4ba490ae57a0bd57ebeaf6dd7acb85`. BTS/FRA NARN corroborates the two railroad corridors. Sam's separate fork observation has no saved camera. The three-track fixture ends at the R16 edge for the mains and at the mapped yard node for the siding. Yard routing and operating status remain unverified.

### Northbound Red track visibility

Downtown rail traced scheduled trip `marta:trip:25-27300-20261120` on the NR guideway over 08:00:45–08:01:15 EST. The original contact-corrected clip at `d0251f98` and the combined mount at `9c2e854a` share the same local terrain overlap. Continuous triangle intersections on Low found the left railhead 50.7 mm below ground near chainage 637 m, the right railhead 32.3 mm below near 559 m and the outer tie top 99.0 mm below near 638 m. Chainage starts at the north edge of Brookwood. The two worst sections pass the lead car around 08:01:05 and 08:01:07. The R16 board paints pavement directly on its terrain triangles. The separate Mayson carriers clear the sampled track tops. The extension stays fully drawn through the replay.

Final private mount `4bbc489d0dfa97c402b5018f8f814f76113cbede` uses a 0.75 m transition at the 22 northbound cut ends. On both tiers all 876 track-bed probes hit. Continuous triangle intersections reproduce +49.43/+64.89/+12.72 mm left/right/tie minimum gaps over chainage 432–933 m, and +42.06/+53.87/+0.43 mm over the whole replay. The former terrain gaps beneath ballast are closed to numerical precision. The largest added elevation change across a 4 cm endpoint control is 2.354 mm. The fixed normal camera and four low obliques show continuous northbound track. All 129 follow samples retained the scheduled six-car train. At 85 timestamps the original wheel results repeated exactly across 4,080 tread centres and 21,466 lateral hits. All 244 Mayson road contact rays hit. Three separate terrain probes land at two positions in the newly opened west ramp mouth; the road owner checks its lower tread.

## Brookwood and Northeast Trail · 2026-11-25

Downtown rail owns the rail regression on private mount `f4772f58fe5c1f0b08c2743b303b1d8348d7a33a`. The full I-85 southbound shoulder clears the modeled NR track bed by 3.498 m at its closest point. The separate BeltLine cycleway tunnel passes beneath 26.202 m of the pavement footprint in plan. On both detail tiers, the union of changed rear-bank terrain triangles covers 722.496 m² and clears the nearest rail axis by 57.664 m. The matched 40° and 220° screenshots show both NS mains and the siding continuing across the seam. Both tiers reproduce the baseline NR samples, terrain strips, paint and signed surface intersections. At 85 timestamps the successor reproduces all 4,080 rail tread centre hits and 21,466 lateral hits. All 244 road contacts hit. All 129 follow samples retained the selected six-car scheduled Red trip over 29.932 s, with at most 0.308 s between samples. Next, check these same controls if the separate trail fixture changes the mounted geometry.

The existing Northeast Trail crosses over GA13 on OSM way 1043756758 and under I-85 on 38981771. Access at Mayson reaches node 12926353268. Proposed Segment 3 begins there and leaves R16 after 379 m. At Mayson, NR bridge 81137860 spans the public road. NL bridge 319512612 spans private access 429349499. Independent lidar windows support elevated bands from 25 m south to 20 m north on NR and from 15 m south to 25 m north on NL, relative to their respective crossings. Exact abutments and underside clearance remain unresolved. NS yard way 144485857 meets Mayson at grade at FRA crossing 717947V. Grade at the two NS mainline crossings of the proposed trail remains unverified. [Construction photograph](https://a-us.storyblok.com/f/1020195/0382e15d33/northeast-trail-construction-img_1501-websized.jpg) · [Segment 3 project](https://beltline.org/learn/current-projects/northeast-trail-segment-3/)

### Mayson rail supports

Downtown rail owns the portable Mayson support study at `53920e96e39147d60c456448c5e1f5097e40b8cd`. Private mount `162fd60820abdb294e9e89e735262f51bad5602f` integrates it over the accepted trail pass `234d62a3`. Trail stations 327 m and 348 m frame the NR and NL crossing. The first eye is 1.85 m from the supplied emergence panorama. The source shows a vertical mural-faced end support, the side girder and an open bay. A second view along the former rail corridor shows the concrete retaining face and girder end. The model infers two end piers per track from the mapped span limits. Individual bearing positions, girder depth, pier count and physical clearances remain unverified. Five metres north of the mapped ends, the displayed formation is still 9.84 m above terrain on NR and 10.08 m above on NL. The exterior approach structure remains unresolved. [Beltline side photograph](https://a-us.storyblok.com/f/1020195/1920x1051/22e5520541/northeast-trail-segment-3-2024_1920x1051.jpg)

Both detail tiers passed five matched camera pairs on the final private mount. All four stems seat over their whole footprints and all eight bearing pads meet both adjacent surfaces exactly. The matched Red replay retained six cars across all 130 samples. At 85 timestamps, all 4,080 wheel centres hit and all 21,466 lateral hits reproduced the baseline. At 08:01:12.365 EST, 16 centre rays fell directly on the modeled span and met the rail to numerical precision. Next, review the crossing bay with Sam. The adjacent approach needs independent structure evidence before extending the supports.

### Mayson approach extensions

Sam approved the center bay on `162fd608`. Downtown rail delivered the four inferred structural continuations at `eefa7db5755cf2fb72ae7ac5068e4688cc03a2fe`. Private mounted successor `21341f85a658f9230c22592a59733981cae2297f` passes the registered trail-exit and reverse-eye comparisons on Low and High. The NR girders extend 14.53 m south and 34.68 m north, and NL extends 21.04 m south and 32.87 m north. All four transverse end faces close into the drawn earth. The shallow pocket beyond initial NL north contact lies inside the extended structure. All 48 join vertices coincide with the approved bay. The field extent of the structure remains unverified. In the following 20 m the outer formation edge can still stand up to 0.29 m above earth on NR and 0.79 m on NL.

Both detail tiers preserved the signed terrain and rail controls. At 85 fixed times all 4,080 tread centres reproduced baseline. The on-structure sample at 08:01:12.365 EST had 4, 16 and 14 wheel centres on the south approach, bay and north approach respectively, all in contact to numerical precision. The six-car scheduled Red trip stayed selected and drawn for all 129 follow samples. Next, present the private comparison to Sam. Formal OpenCode/Grok review is pending authentication.

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
