# Studio Midtown MARTA handoff (Claude Opus → Codex)

Outgoing session: `orca_session_id:54bca5c0-00b8-4d4d-94c4-c1c7f8cdd9f8` (Claude Opus, worktree `studio-midtown-marta`). Read it with `orca agent read`. The coordinator is `term_09e1b3da-5f48-4755-abf8-92a571a1f474` on Sam's MacBook Air; reply to its newest message with `orca orchestration reply --id <msg> --from <your session id>`. The skyline lead `studio-midtown-skyline-1c` (`orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`) sequences merges: ask it for a slot, rebase at your turn, rerun the checks, merge, then report the `gh pr view <n> --json state,mergeCommit` output to both. Ground-contact (`orca_session_id:a761d59f-dbff-4e39-95d4-51790b17cb47`) owns `web/src/terrain`. The vehicles agent (`orca_session_id:bceb5cfc-138b-456e-a77d-4537701e21ef`) runs the passenger-swing probe and reviews.

This worktree owns downtown and MARTA: the stations, the east cut (`east-cut*.ts`, unowned since #29, now ours), the streetcar shape and the freight tunnel portals.

## Open work, in order

1. **[#663](https://github.com/samsolomon/sim-atlanta/pull/663) freight tunnel portals (1/2): open, approved in principle as a fix (merges without Sam once clean).** Branch `samsolomon/rail-gaps`. Sam saw track "ending in grass": Overture tunnels hidden by `terrain_transport.py`. The PR adds portals at the two hillside mouths, A north (−368,−592) and B north (10,−41); freight runs 8 m into the tube before clipping; and `DOWNTOWN_RAIL_ENDS` declares every loose rail end (a test fails on an undeclared or stale one). Before merging:
   - Get the coordinator's sign-off on the frames.
   - Ask ground-contact to review the 16 `audit:ground` samples (worst 37 cm on B's lid).
   - Ask the skyline lead for a slot.
   - Not yet done: a night frame and a freight-entering frame at B north. A night frame at A north is also missing: the one taken was accidentally shot at 11:36.
2. **PR 2: Five Points east-cut end faces (not started).** The coordinator asked for full-width end faces at the cut's existing mouth planes, (171,118) and (248,192), in `east-cut-ground.ts`:
   - Matched to the three-track bed (`bed(grid)`), top flush with the street, a dark mouth where MARTA (`ServiceTrack` clip planes) and freight already clip.
   - Check a MARTA train and a freight train passing through, by day and night.
   - Then change those two `DOWNTOWN_RAIL_ENDS` entries from `cut-end` to a covered kind.
   - Which gap is Sam's is unconfirmed. The coordinator's reconstruction (camera looking north) fits B+C better than A, so this PR probably fixes Sam's actual frame. The coordinator has asked Sam for a share link.
3. **CQ400 two-bogie PR (branch `samsolomon/cq400-bogies`, pushed, no PR yet).** The coordinator ordered it after the rail gaps. Every CQ400 is seated with its bogie centres (`CAR_BOGIES` = −7.75 / +7.0 in `vignette/cq400.ts`) on the track: City tracks, the east cut and the Midtown North Line. Probe results from the vehicles agent:
   - Worst swing 0.64 → 0.46 m; cells over 0.35 m went from 34 to 2, both a recorder artefact at the east-cut mouth.
   - Frames: [four sites before and after](https://github.com/samsolomon/sim-atlanta/blob/772bb993/docs/log/passenger-swing/bogies/cq400-before-after.jpg?raw=true).
   - Checks passed on `a7a95322`: build, web 261 files, `test:perf`.
   - To ship: rebase, rerun the checks, open the PR with those frames, get the coordinator's approval and ask for a slot.
4. **[#427](https://github.com/samsolomon/sim-atlanta/pull/427) landuse paving: held for Sam** (step 1 only, or both steps). The step 2 lawn check found no real lawns; the coordinator recommends both. If Sam picks both, set `PAVE_CAMPUS_LANDUSE = true`, update its test and reshoot the door and campus views. The branch is far behind main and needs a rebase.

Merged today:

| PR | Merge commit | What |
|---|---|---|
| #384 | `4981bd3c` | Robinson College / Empire Building |
| #397 | `bae6e381` | Marriott Marquis piers |
| #405 | `43ab33a2` | Robinson pediments |
| #452 | `f3cae641` | Flaky east-rail test |
| #517 | `4e33e335` | P0: stale MARTA and weather shown as live |
| #597 | `6ccca8a2` | Midtown coffer lamps, benches, detachment ratchet |
| #625 | `750228e6` | Streetcar corner fillets |

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

No dev server or browser tab is left open from this session.
