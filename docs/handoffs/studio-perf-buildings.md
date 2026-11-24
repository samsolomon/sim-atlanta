# studio-perf-buildings handoff (Claude Opus → Codex)

## Current state, 24 November 2026

- **Release queue.** #654 is open. #613 is open at the approved head `89adda5e`, with the 15 km threshold. The skyline lead has confirmed the next slot after #654. Ask them to route it to the successor. Release 11 currently has priority and the Studio is paused for heavy work. The lead will broadcast clearance. Run heavy release checks one at a time through the shared wrapper, e.g. `../.perf-run 613 pnpm test:perf`. The earlier merge-tree check against main at `d93c51d8` passed. Repeat it on landed #654, then follow the merge-slot steps below. Fix the title and send the verified merge SHA to the lead and coordinator immediately. #575 remains held.
- **Far-mesh slicing.** Pushed `samsolomon/far-board-build-steps` at `c9fb5ebb` on #613. It slices grounding, day/night buffer generation and post-carve rebuilds. Boot also yields to the browser. `?perf&farsteps=off` drains the generators synchronously for matched comparisons. TypeScript, the production Vite build and the regression test for rebasing night-window indices across 65,535 vertices passed. The full test run passed Rust, Python and the fixture rebake check, then timed out in several web tests under shared load. It was stopped for the release pause. Rerun the full suite including worker tests.
- **Timing still open.** In an unlocked intermediate run, low-zoomout at 6× mounted all 12 areas and reported a 107 ms longest browser task. The slowest individual mesh step took 34.5 ms. The subsequent head bounds detailed towers separately and removes window allocations. It needs a locked 6× run before claiming the ~8 ms target. The frozen build is in `/tmp/perfb-sliced-c9fb5ebb`. After clearance, from this worktree use `../.perf-run studio-perf-buildings sh /tmp/perfb-locked-capture.sh` for the route and matched day views. Rebuild the capture inputs if the head changes. Check the screenshots, run the ground audit and full perf suite, cross-review, package evidence and open the PR only after the checks pass. There is no slicing PR yet.
- **Generic tone.** The dependency exists in draft #644. Pushed `samsolomon/generic-v2-far-tone`, with `c0e2a1ac` integrating #613 and #644 locally and `f70ed15d` carrying just the tone change. The checkout is `/tmp/perfb-tone-work`. TypeScript passed. Each v2 wall triangle uses its style's linear colour before the area-weighted mean. Legacy walls retain their existing tint and roofs retain their colours. `?perf&fartone=off` restores the previous tone on the same build. After the dependencies land, cherry-pick the tone commit onto main, add a weighted mixed-style regression test, check matched low near/far views, review #644 with its owner, and run the PR gates. There is no tone PR yet.
- All browsers, previews, tests and pending perf wrappers from this session are stopped.

2026-11-24, from `orca_session_id:f4e52674-8b74-4ea3-8ba4-d026c9326377` (worktree
`studio-perf-buildings`). Read that session's history with `orca agent read` for detail. The
coordinator's handoff request is `msg_35e34be62f53` (Air terminal
`term_09e1b3da-5f48-4755-abf8-92a571a1f474`).

## Mandate

Cut building draw calls and triangles on low and high **without a visible change**. Every change
ships with:

- a same-build A/B behind a `?perf&...` off-switch;
- matched before/after screenshots;
- a Taildropped tarball for the coordinator, named `sim-atlanta-perf-buildings-<topic>-<sha>.tar.gz`
  with a `.sha256` beside it. Send it with `/Applications/Tailscale.app/Contents/MacOS/Tailscale
  file cp <files> sams-macbook-air:`.

No new shader programs on low. Run `pnpm build`, `pnpm test` and `pnpm test:perf` on the head you
will merge. Merge only in the merge-train lead's slot, with a merge commit, and quote
`gh pr view N --json state,mergeCommit`. The lead is `orca_session_id:47b1a596-...`, reached by
replying on the "Geometry plan approved, with conditions" thread.

The A16 is CPU-bound per draw. This agent owns the far-board building form end to end. phone-perf
(`orca_session_id:48e90760-...`) gates it on the A16 and the Studio.

## Open PRs I own

| PR | Branch | Head | Status |
|---|---|---|---|
| [#613](https://github.com/samsolomon/sim-atlanta/pull/613) far-board buildings (low) | `samsolomon/far-board-buildings` | `89adda5e` | **Approved by Sam, gated and cleared by phone-perf. In the merge queue** behind #654 (the band fix); the lead will ping. #420 has merged since, so rebase-check at the slot. |
| [#575](https://github.com/samsolomon/sim-atlanta/pull/575) Int16 positions / Int8 normals in landmark batches | `samsolomon/compact-batch-vertices` | `4d0cda01` | **Held** by the coordinator. Evidence is posted: pairs and the freight-deck shadow set sit at the noise floor. Don't merge without a relayed OK. |

The local fallback `samsolomon/compact-batch-normals` (normals only) is unpushed on purpose. Push it
only if asked.

Merged today: #524 landmark distance LOD (`4c527bca`). Earlier: landmark batching, lamp shadow flags
(#484), compact Uint8 colours (#535) and house blocks.

The PR title of #613 still says "beyond 9 km". The switch is **15 km** (`FAR_BUILDINGS_M`). Fix
the title at merge time.

## #613 at the merge slot

1. Fetch. Check that `git merge-tree --write-tree origin/samsolomon/far-board-buildings origin/main`
   is clean.
2. Merge main locally on a detached HEAD, then run `pnpm build` and `pnpm test`. Also run
   `pnpm test:perf` if main changed what City draws. #420's flat glass and #654 both touch City.
3. Confirm main hasn't moved, then run `gh pr merge 613 --merge --match-head-commit <head>`, and
   reply to the lead with `gh pr view 613 --json state,mergeCommit`.

Numbers at `89adda5e`, Studio headless:

| Tier | Draw calls | Triangles | Programs |
|---|---|---|---|
| Low | 196 (was 358) | 1.14M | 78 |
| High | 407 | 6.24M | 93 |
| High-night | 599 | — | — |

Low-north longest task is 337–410 ms; main reads 369. phone-perf's own three runs each way:
#613 305/289/346 ms against main's 310/319/354. Low-zoomout's longest task is 70–89 ms. Low
ceilings are lowered in the PR: 220 calls, 1.25M triangles, 84 programs.

## Sam's decisions that touch this area

- **Far board:** approved, with the switch at **15 km**. Sam was shown matched pairs at 6 km and
  9 km (tarball `sim-atlanta-perf-buildings-farboard-pairs-89adda5e.tar.gz`). The coordinator
  recommended keeping 15 km and looking for look-neutral savings with phone-perf. If Sam wants it
  nearer anyway, first give the far form lit crowns on the tallest towers (the BofA gold top
  disappears) and denser night window sparkle.
- **Landmark LOD:** approved and merged (#524). Far versions switch at 3.5 km on low and 7 km on
  high, and come back inside 3.1 km and 6.3 km.
- **Far shadows:** far versions never cast shadows. The full version keeps casting (`hideFromView`
  sets a −1 draw range in `onBeforeRender`).
- **Generic buildings are the priority.** studio-generic-buildings (structworker `32bb7624-...`) is
  building v2 archetypes behind `?generic=v2`. Far-board wall tones must follow them. That agent
  will export `v2StyleTone(style, wallRgb)` from `web/src/vignette/generic-v2.ts` once Sam picks
  the archetypes. Wire it into `boxFromVertices`, which reads vertex colour only today, so v2
  towers would otherwise read too light from afar. I also agreed to review that agent's
  shader-branch PR.
  - **Update:** `v2StyleTone` is now exported in draft
    [#644](https://github.com/samsolomon/sim-atlanta/pull/644), awaiting review. Its author
    (`orca_session_id:920819b7-...`) confirmed that the vertex colours are linear (`Builder.use`
    buffers `THREE.Color` r/g/b) and that `v2StyleTone` takes and returns the same linear values.
    Apply it per triangle, using that vertex's `aStyle`, before the area-weighted wall average.
- **Other decisions** the coordinator listed for today that I didn't work on directly: flat glass
  (#420, merged), tree far form, the streaming flag, the 0.45 shade floor, 1075 glass B, and
  expansion paused. Take their details from the coordinator and the owners' handoffs, not from this
  file.

## Coordinator rules in force

- **Idle-time work is sliced to a few ms per task.** Report the longest step at 6× CPU throttle.
- **Never `pkill` or `killall` by pattern on the shared Studio.** Kill only PIDs you started.
- **Never attach to a browser you didn't launch.** Use `scripts/chrome-cdp.mjs` `launchChrome`,
  which gives you your own `--user-data-dir` and `--remote-debugging-port=0`. Check the page URL is
  yours before capturing, then close your Chrome by its PID.
- **Keep the Studio quiet while someone else is gating.** Don't run `test:perf` over phone-perf's
  route runs; their long-task numbers are sensitive to it.

## Next steps, in order

1. Merge #613 at the lead's slot (above).
2. **Small PR after #613: split the far-mesh build into steps of about 200 buildings.** This is the
   coordinator's ask. `addFarBuildings` and `farBoxMesh` in `terrain/model.ts` and
   `city/far-board.ts` build an area's whole box mesh in one task: 24 ms per area at 6×. phone-perf
   also saw one 222 ms task on low-zoomout, likely this build when the orbit crosses 15 km. Report
   the longest step at 6× and low-zoomout's longest task.
   - `lowerFarBoxes()`, which runs after every carve, also rebuilds the whole mesh. Fold it into
     the same slicing.
3. Wire the generic-v2 tone function when studio-generic-buildings pings, and review their PR.
4. #575: wait for the coordinator.

## Gotchas

- **Closures leak in V8.** A closure created inside a big build function keeps that function's
  whole context alive. This cost +49 MB once (the `sync` closure in `batchLandmarks`) and +33 MB
  once (`raycast = () => {}` in `farBoxMesh`). Use module-level functions (`syncer()`,
  `noRaycast`).
- **three r180 shadows:** shadow casters are tested against the *view* camera's layers, so a
  shadow-only layer doesn't work. `drawRange.count = 0` still issues a draw; only `-1` skips it.
- **Raycasting hits hidden meshes.** Far meshes take a no-op raycast.
- **Far boxes and the ground:**
  - `grounded()` drops boxes that stand more than 3 m clear of the ground (skybridges) and lowers
    each box to the lowest drawn ground under it.
  - `carve()` and `carveSteps()` both call `lowerFarBoxes()`.
  - Bands only step inward.
  - There is no night sparkle inside carved cuts (`inCarved`).
  - Run `pnpm audit:ground` after changing any of this.
- **`World.buildingSteps(..., withFarBoxes)`** fits far boxes only when asked (low with the far
  board on). Near house-tile builds must not pay for it: it was 19–41% of each long task on
  route:north.
  - The tree lab's #646 and #651 rebase onto #613 and change the yield in `buildingSteps`. They
    agreed to keep `farBox()` before the next building's vertices and before `geometrySteps()`.
- **Landmark far versions** are built in a worker (`landmark-lod.worker.ts`), and their main-thread
  copies are chunked about 1 MB per task (`COPY_CHUNK`). With `Float32Array.from(uint8)` instead of
  `new Float32Array(uint8)`, the copy-out took 10–20 ms.
- **Watch the streaming PRs #621 and #611.** Both are held, owned by the streaming agent, and both
  switch `model.ts` to `yield* buildLandmarkBatches(...)`. When they rebase onto #524 they must
  keep passing `lod: LANDMARK_LOD[...]` and keep the `farReady` log and `setLandmarkDetail`.
- **Off-switches:** `?perf&farboard=off`, `?perf&farm=<m>` (0 forces far), `?perf&lod=off`,
  `?perf&batch=off`, `?perf&colours=float`, `?perf&lampshadow=off`.
- **zsh:** brace `"${SHA}:path"` in `git show`. An unbraced `$M:w` is parsed as a zsh modifier.
