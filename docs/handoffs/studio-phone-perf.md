# Phone performance handoff: Claude Opus to Codex (2026-11-24 morning)

From `orca_session_id:48e90760-403c-4eb9-940d-0d1f0fc0ade8` (Claude Opus, worktree `studio-phone-perf`).
Read that session's history with `orca agent read`. This section supersedes everything below it.
Coordinator: the Air session `term_09e1b3da-5f48-4755-abf8-92a571a1f474`. Merge slots: the skyline lead
`orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`. Every status goes by `orca orchestration reply`.

## Where things stand

The A16 target is met at the default view on stack 3e: 65-67 fps at one vsync (p50 11.2 ms), 64 on
route:north, 62.7 at night. Release builds read 26-28 fps. The pieces, all approved by Sam today:
far-board buildings (#613), flat glass on low (#420), landmark day LOD (#524, merged), far shadows
(#520, merged), and the traffic frame cut (#592) and static matrix freeze (#552, merged). A16 frame time is a
step function of total cost at 11.1 / 22.2 / 33.3 ms (90 Hz). Report render + update (+GPU) against those
lines, not fps alone. Sam's decision page: https://claude.ai/artifact/HQdi2Xwpe5pXEPw3V194Xr (private to Sam).

**The open problem is 6-12 km.** A16 on 3e: 6 km 48 fps (178 calls, render 9.5), 9 km 42 fps (253 calls,
render 12.2). Target from the coordinator: 6 km at one vsync; 9 km best effort (a steady two vsyncs is
acceptable for now).

## PRs and their status

| PR | Owner | Status |
| --- | --- | --- |
| #593 long-task gate (`low-north`, `low-zoomout` in test:perf) | phone-perf | **Merged** 793e1d93 |
| #520 low far shadows | phone-perf | **Merged** fbf396d1 |
| #613 far-board buildings | perf-buildings, now Codex | Approved by Sam; my gate passed at 89adda5e (north 289-346 vs main 310-354; zoomout one 222 ms task, slicing follow-up promised). Slotted after #420, #654. |
| #646 house near build off the frame, then #651 | tree lab | My rerun: north 70-90 ms, no task over 100 (main 310-354). Approved from perf. Slotted after #613. |
| #435 streaming prototype (`?stream=1`) | author gone; **mine to merge** | Sam approved as is. The lead calls it after #649, #420 and the band fix. My squash in a scratch worktree is **not pushed and is stale** (predates #593/#520 in perf.ts and perf-run.mjs): redo it on current main. Squash is fine (its 28 commits conflict one by one). Flag-off must be look-neutral: pixel diff at 420 m, 3 km, default **plus a tap test**, because `pick.ts`'s hidden-ancestor check is not behind the flag. |
| ratchet low-north 650 -> 300 | phone-perf | Send after #646/#651 land; the lead has a slot for it. Main reads north 310-378 today; with #646, 70-90. |
| forceSinglePass on 10 two-pass transparent materials | phone-perf | Approved by the coordinator, **not started**. The 1180 Peachtree veil, World of Coca-Cola sign and bottle frost, Hilton flood, Georgia Aquarium signs, College Football HoF sign, Coda gallery glass, streetcar stop panes. Each costs 2 draws and 2 getProgram key rebuilds every frame (three flips `side` with `needsUpdate`). Day and night close-ups per building; any that sorts wrong stays two-pass. |
| frost only on open sheets | phone-perf | After #420 lands, held for Sam. |
| `samsolomon/far-board-draws` (78a4fcd1) | phone-perf | Measurement tooling, not a PR yet: `captureDraws({ detail: true })` (rows by area, program, material look, geometry bytes, per-frame program re-lookups), `?perf&landmarkcell=<m>`. |

## Sam's decisions today that bind this area

Flat glass on low (#420); far-board buildings (#613); landmark distance LOD (#524); far shadows (#520);
tree far form (#450); streaming merged behind `?stream=1` with no further expansion work (expansion paused);
the 0.45 shade floor; 1075 glass option B; generic buildings are the priority (studio-generic-buildings,
#644). Mirrored glass (Westin, Truist, Georgia Power) stays: the A16 showed it free. Nearer far-board
threshold (6/9 km): **Sam's look call, pending**; perf-buildings' pairs are with the coordinator (night loses
crown glow and sparkle).

## Coordinator rulings still open

- Plan B before plan (c): look-neutral building draw cuts first, then the terrain/landscape/transport far form,
  then nearer far-board only if Sam wants it.
- Per-area landmark cells: ship as its own small PR with four-view numbers and A16 at 420 m and 9 km;
  check triangles at close views and use a middle size or distance gate if they rise.
- The recount the coordinator asked for (not yet done): building draws at 9 km over batchable meshes only,
  **by day and at night**, plus unbatched landmark parts by reason (texture, transparent, hooked), then an
  order by draws saved per day of work. Candidates: a texture atlas for signs (#611 has an atlas cache),
  transparent parts merged per area with a fixed sort, hooked library materials moved to the vertex-colour path.

## Measurements to build on

- 9 km on main (Studio, low, A16 canvas): 266-271 draws, buildings 152 (62 distinct (area, program),
  82 distinct (area, program, look)), trees 33, terrain 30, transport 24, vehicles 20, landscape 10.
  Of the buildings: about 41 landmark batch draws, 14 house blocks, the rest mostly unbatched landmark parts.
  So plan (c) as scoped saves only 13-28 draws there.
- Landmark cell size (`?perf&landmarkcell=`, main 4c527bca + far-board-draws, Studio 6x): 500 / 1500 / 10000 m.
  420 m Midtown 68/67/67 calls (tris 1.53M/1.56M/1.56M); 420 m downtown 104/103/103 (1.95M/2.08M/2.08M, +7%);
  6 km 187/173/171 (1.48M/1.56M/1.57M); 9 km 266/239/235; default 381/350/347. **1500 m gets most of the
  gain.** Since #524 the cell is also the LOD unit (far beyond 3.5 km of the cell box), so a bigger cell is
  NOT pixel-identical: pixel diffs still to do. Render-ms columns were noisy (load ~30).
- Far-board nearer (A16, CSS glass): 6 km 187 -> 122 calls, render 9 -> 5.8 ms with `&farm=5500`;
  9 km 266 -> 186, render 10.1 -> 8.5 with `&farm=8500`.
- BatchedMesh: the A16 (Mali-G68, ANGLE GLES) has WEBGL_multi_draw and MAX_TEXTURE_SIZE 8192. The advisor's
  view: prefer HouseBlock's pattern (one per-area buffer per class, drawn whole when far, per-cell ranges near)
  over BatchedMesh. No new programs, no matrix texture fetch on the Mali, no per-frame instance loop.
- Per-draw CPU cost: about 45-48 us per draw on the A16 at 1x; the Studio at 6x matches it (about 46 us).
- A16 CPU profile (stack 3b): setProgram 30.8% (uniforms 9.9, getProgram 4.2, clipping setState+projectPlanes
  6.7). three already sorts opaque draws by material id; distinct materials are the knob.

## Next steps, in order

1. #435 when the lead calls it (see the table).
2. The 9 km recount (day and night, batchable only, unbatched by reason) and the ordered proposal to the coordinator.
3. The per-area (1500 m) landmark cell PR: pixel diffs at four views, triangles, A16 at 420 m and 9 km.
4. The low-north ratchet PR after #646/#651.
5. forceSinglePass with close-ups; frost-only-on-open-sheets after #420.
6. Plan (c) for terrain/landscape/transport once the building cuts land.

## Gotchas

- Shared Studio: never pkill or killall by pattern. Launch your own Chrome (port 0, own user-data-dir) and kill only PIDs you started. Load average sits near 30, so alternate arms and run 3+ per arm.
- Long-task attribution: profile with CDP from navigation on an unminified build (`vite build --minify false`), then map the samples onto `summary.longTasks`. perf.ts sets no `PERF_SAMPLING` title, and perf-trace only buffers about 2 s.
- Before reading test:perf output, check that `/tmp/*-p.log` is newer than the build log. A stale `perf=` line fooled a wait loop once.
- `gh pr merge` fails on drafts: mark the PR ready first.
- A16 runs go through the coordinator: frozen `vite build --outDir <scratch>` copies served with `vite preview --host 0.0.0.0` on 46xx ports.
- Before every merge: rebase, then `pnpm build` on the final head, then `pnpm test` and `pnpm test:perf`, then merge with a merge commit and quote `gh pr view N --json state,mergeCommit`.

---

# Phone performance handoff to Claude Opus

2026-11-23, from `orca_session_id:c74d45e5-b1c7-4503-ad83-5440c1631917`. This section supersedes every earlier task list below. Current branch `samsolomon/low-program-headroom`, draft [#391](https://github.com/samsolomon/sim-atlanta/pull/391), base `59b8cbc9` including #377 and #381. Implementation `e5137af0`, initial evidence `d721ee3a`. **Hold #391 and #326 until the Air coordinator relays Sam’s OK.** #326 is the separate open budgets proposal on `samsolomon/studio-phone-budgets`; its measurements predate these changes. Deployment belongs to the coordinator.

## Mandate and decisions

Sam’s directly quoted decision was “I am ok with load-time staging.” That approval covered #359. For #391 the coordinator’s exact assignment was “Apply the same treatment on low (drop the reveal precompile there if it applies, and use the shared landmark material) and report the headroom.” The latest switch instruction was “Merge holds stay in force; nothing merges until I relay Sam's OK.” The historical goal is 30 fps and ready within eight seconds on the Galaxy A16.

## What is on main

Checked with `gh pr view` at handoff. The merge commits were #348 `a6e6a28a` (mask gate), #363 `0937b971` (tree round two), #371 `614cf140` (transport heap), #359 `3d8c6506` (load staging), and #386 `e603b195` (instanced freight, downtown batching, high program warmup). The four waiting owners received verified #386 notices. The #359 device comparison saved about 1.85 s from data to ready. Proxy-inflated absolute times cannot establish production ready. Round-two tree default passed on A16; the coordinator deferred its noisy pan check to the release candidate. Both frozen ports 4616 and 4619 were stopped at the coordinator’s request.

## What is verified on #391

- The separate reveal precompile was already gone on Low. Once the white image is captured, the temporary white material can release its programs. Midtown arterial traffic and Sweet Auburn infrastructure now share downtown’s four-plane shader variants while clipping to the moving outer perimeter. Plain landmark bodies batch on both tiers.
- Same production data and clock on the phone viewport, all twelve areas. Baseline 567 draws, 90 programs, 393 MB after GC. Candidate 538 draws, 85 programs, 393 MB; both captured 2,359,308 triangles. **Five programs and 62 draws free.** High measured 1,189 draws, 100 programs, 500 MB; 61 draws and 40 programs free. No ceiling changed. No new device FPS or load-time claim.
- `pnpm build`, `pnpm test`, and `pnpm test:perf --no-build` on that production build passed. 20 Rust, 1,076 web, 5 worker tests passed, one web test skipped; Python pipeline checks skipped without a virtual environment. One earlier high run measured 1,004 MB after GC during concurrent capture activity. Both repeats measured 500 MB; the cause of the outlier is unconfirmed.
- Matched baseline and candidate Chrome views, Low at 14:00 Eastern, `cam=1536,-182,190,48,180` (Sweet Auburn shelter and streetcar), `cam=902,-1925,130,32,270` (arterial traffic signals). City → Map → City re-entry rendered successfully. [Shelter capture](../log/perf/low-streetcar-shelter.jpg). Review used `pnpm review -- --reviewer claude`; no blocking or significant findings. Its sole minor request was a matched day/night landmark check. At 14:00 and 22:00 both the requested Midtown camera `565,-3965,-101,55,421` and the downtown camera `400,-650,15,60,1150` matched the frozen baseline in the inspected renders. [Downtown day](../log/perf/low-landmarks-day.jpg) · [Downtown night](../log/perf/low-landmarks-night.jpg).
- Local evidence: `/tmp/low-current-test.log`, `/tmp/low-current-repeat.log`, `/tmp/low-program-high-repeat.log`, `/tmp/low-program-baseline-valid.log`, `/tmp/low-program-cross-review.log`, and `/tmp/low-program-views/`. The committed screenshot travels with the branch.

## Next steps in order

1. Read this session’s history and coordinator inbox. For the transition reply to `msg_c08a3709dda0` on Air terminal `term_09e1b3da-5f48-4755-abf8-92a571a1f474` with your own session ID. The low-program assignment thread is `msg_95794cd7d226`. Direct sends to the Air reject the pairing token. The successor may need a fresh inbound message for the reply route.
2. Await the coordinator’s explicit relay of Sam’s approval for #391. Keep it in draft pending that relay. On approval, fetch main and resolve changes if needed, preserving build-log entries. Run `pnpm build`, `pnpm test` and `pnpm test:perf --no-build`; confirm twelve mounted areas and five program slots on the recorded base. Recheck the matched cameras if the base or rendering changes.
3. After approval and verification, mark #391 ready and merge. Quote fresh `gh pr view 391 --json state,mergeCommit` in the notice; include screenshot, camera strings, budgets and coordinator-only web rebuild/deployment. Ask for separate disposition of #326 before touching it. Its proposed ceilings need new measurements.
4. The A16 release-candidate pan and any further work toward 30 fps belong to the coordinator’s release queue. No device server or review tab needs to remain open during this handoff.

---

# Codex → gpt-6.2 handoff (2026-11-23 evening)

This section supersedes the older Claude handoff below. Session:
`orca_session_id:dd052a89-7838-444f-a6d9-f1dfde9fcc25`. Sam requested a clean model
handoff; take no new work after READY FOR 6.2.

## Current state and first next steps

1. **Finish the tree mask claw-back A16 gate first.** Tree-species owns draft
   [#348](https://github.com/samsolomon/sim-atlanta/pull/348), branch
   `samsolomon/tree-low-clawback`. Frozen rendering SHA is
   `fb699bbb1fd9d4db74931cb4c182375f61aca3a1`. Current head `7ce1bf34` adds only docs.
   Verified with `gh pr view`: OPEN, mergeCommit=null at handoff. Sam accepted the
   far visual tradeoff; a single-clump far-crown follow-up is recorded in its docs.
   Coordinator is STILL RUNNING pan comparisons on :4619 candidate/control and
   :4616 pre-rollout baseline. Await results; do not stop or rebuild these servers.
   Target: default and pan within about 3% of pre-rollout A16 baseline. No final
   performance sign-off or merge permission yet. Tree owner/successor merges;
   only coordinator deploys. After any merge, verify `state,mergeCommit` with
   `gh pr view` before sending MERGED. Build-log conflicts retain both entries and
   require tests rerun (coordinator instruction).
2. When coordinator confirms testing done, stop the two retained servers below.
3. Resume **our original load-time task**, branch `samsolomon/studio-phone-load`
   stacked on OPEN #326 `samsolomon/studio-phone-budgets`. No load PR yet.
   Existing load optimizations are unchanged from predecessor. This handoff commit
   adds the review fix: prefetched fetches get AbortControllers, and taking a
   prefetched response binds City cancellation through body consumption. Two
   regression tests cover pending-fetch cancellation and the body-phase signal.
   This is pushed WIP, not merge-ready: reveal browser check and round-two review
   still required. Do not conflate #348 source with this worktree's old load branch.
4. Review round 1 was `pnpm review -- --reviewer claude` on combined #326/load diff
   versus main. No blocking findings. Confirmed minor cancellation issue fixed as
   above. Plausible visual risk: deferring far areas until reveal can show a mostly
   empty board/pop-in at default/full-board view and while panning during reveal.
   Check daytime/night at 6x CPU, normal and far linked cameras; screenshot. Review
   file in shared git dir:
   `train-review/a5ebdc1a6484ed211d5f00e30c5a03a3ff28cae2-2026-11-23T23-44-23-228Z.md`.
   Run round two after visual triage, then open load PR (base budgets branch or
   main after #326 merge). Retarget children BEFORE deleting a stacked base.
5. Send frozen load branch URLs for A16 timing against production ready10.6s.
   Then resume profiling/remaining30fps work listed in original handoff below.

## Validation of this worktree

Full `pnpm test` rerun before handoff:20 Rust,916 web passed/1 skipped,5 worker;
Python pipeline SKIPPED (no .venv). Log `/tmp/phone-handoff-tests.log`.
Typecheck and the2 new prefetch tests passed. Earlier combined branch perf run
passed both ceilings: low529calls/2.326M triangles/424MB heap; high1130/13.270M/
525MB. That perf run PRECEDES cancellation fix; no new drawing changes in fix.
Logs `/tmp/studio-phone-perf.log`, `/tmp/studio-phone-review.log`.
No browser tabs owned/open. Headless test browsers close after each completed run.

## Tree investigation and promises

Tree owner (now also handing off):
`orca_session_id:752c9656-15cc-4501-99e1-e59257d6fdcb`, worktree studio-tree-species.
Successor should read its handoff. We own frozen builds/A16 evidence, they own source.

- #336 rollout count sign-off posted at
  https://github.com/samsolomon/sim-atlanta/pull/336#issuecomment-7117594835 .
  Bounds/leaf litter/far detail met agreed counts; winter exception accepted:
  13,974 limb triangles, no shadows, preserves bare silhouette. Verified `gh pr view336`: state MERGED,
  mergeCommit `831662eff79d5ea8eb2e0926e7c3735107a7fadf`.
- Frozen baseline d1411a9e vs rollout b4993131 A16 isolated tree cost:
  default26.0→23.8fps (-8%); pan24.5→21.9 (-11%), only+9calls/+47k triangles.
  b4993131 does NOT include later #340/#339/#291; initial attribution to those
  changes was corrected. Most extra triangles were duplicate mask draws.
- Probe546ab349 A16 default: valid control18.5 (second bad-count run rejected);
  mask-off23.6/23.3; shadow-off19.6/18.9; foliage-off25.0/24.3. This establishes
  mask as main cost, but control n=1 and pan probe failures mean final paired
  acceptance is still needed. Carpet probe has no effect at default (already off).
- #348 suppresses low species mask beyond600m CAMERA-TO-ORBIT-TARGET distance,
  restores below500m, preserves state in between. High unchanged. Near420m Prado
  and350m1180 retain mask (all-low suppression visibly darkened crown interiors).
  Candidate default/pan at384x692 orbit21,084.375m, suppress962/962 registered
  instances (100%); near0/962 suppressed. These are NOT visible crown counts.
  Coordinator initially assumed400–450m default; we disproved using Share camera:
  default `400,-2300,15,35,21084`; pan endpoint `114,-2292,15,35,21084`.
- Candidate browser1000→420→550→700→350m: mask off/on/on/off/on; area mount,
  dispose/reopen and empty mask uniform tests pass. Author full tests20/939/5,
  build/perf pass; Claude no code/lifecycle findings, far visual risk approved by Sam.
- “Details” pan failure was only tail of coordinator's Node/CDP error, NOT app UI.
  Full original log unavailable. Local frozen control/mask-off pan succeeded at
 384x692/all12/36 shadow updates. Treat as unresolved harness-side; no speculative
  scene fix. Coordinator retains full logs/screenshots on any final-run failure.

## Coordination route

Direct `orca orchestration send --on air` rejects pairing token. Reply routing works:
`orca orchestration reply --id msg_9bec7846695b --from <your-session-id> --body ...`
(or coordinator threads msg_18ca0923740d, msg_f612f96c3c3b).
Coordinator terminal `term_05a952fa-de06-4064-8655-3e98e1caf1e0` on Air.
CLI `/Applications/Orca.app/Contents/Resources/bin/orca`.
Coordinator explicitly authorized leaving4616/4619 live during model handoff.

## Retained frozen servers — do not alter until coordinator confirms done

Base URL query for both:
`/?view=city&q=low&t=2026-11-20T14:00:00-05:00&perf=run`
Append `&motion=pan`;4619 control additionally `&treeprobe=mask-on`.
Host `http://100.78.214.26:<port>`; `build-info.json` identifies each build.
All53 data files SHA256-identical across builds. Vite production previews, NO HMR.

| Port | Build | Terminal |
|---|---|---|
|4616|pre-rollout d1411a9e|term_66e9297e-f840-4d4a-9e36-a11792f2dd59|
|4619|#348 fb699bbb|term_d147791c-a9fc-4ee8-b2a4-8fdd0fede476|

Frozen roots (outside repo, archives not git checkouts):
-4616: `/var/folders/g_/cg074qld6k5_ld1tq_hfn4l00000gn/T/phone-tree-ab-48b5pe3t/without/web`
-4619: `/var/folders/g_/cg074qld6k5_ld1tq_hfn4l00000gn/T/phone-tree-final-0v5_v5tz/web`

Restart only if needed: from root above,
`./node_modules/.bin/vite preview --outDir dist --host 0.0.0.0 --port 4616 --strictPort`
(use port4619 for final).
Stop via `orca terminal close --terminal <handle> --tab`, then verify no listener.
Stopped4617 old rollout and4618 probes at coordinator's authorization.

Evidence directories: `/tmp/phone-tree-final-smoke`, `/tmp/phone-tree-default-camera`,
`/tmp/phone-tree-pan-repro`, `/tmp/phone-tree-probe-results`, `/tmp/phone-tree-ab-results`.
Each has results.json and screenshots. Exact-A16 scratch runner:
`/tmp/phone-tree-perf-a16.mjs` (384x692/DPR2.81); repo runner still411x891.
Final smoke normal536calls/~2.337M versus mask-on540/~2.382M, all12,
geometry/texture memory unchanged. Studio fps does NOT establish A16 performance.

---

## Original Claude handoff (historical, next steps superseded above)

# Handoff: phone performance (studio-phone-perf)

Written 2026-11-23 by the Claude session `orca_session_id:3126b1a7-8882-498c-a5ff-7b65d626cf91`.
Sam approved phone performance as a dedicated workstream that day. The reference device is a Galaxy A16
(Mali-G68, 4 GB, Chrome; its canvas is 384x692 with the URL bar showing). The targets at q=low are 30 fps
sustained and ready in 8 s or less.

## Where it stands

**On the A16 against production (bc32b09, Wi-Fi):** default view ~24-26 fps, panning ~25, and 2.34M
triangles. Ready is 10.6 s, and all areas have loaded by ~22 s. The morning baseline was 12.8 fps,
4.77M triangles and ~20 s to ready.

**Merged to main:**

| PR | Change |
| --- | --- |
| #307 | `?perf` instrumentation, protocol and `pnpm test:perf` budgets (`docs/perf.md`) |
| #311 | Tree limbs dropped beyond 800 m on low |
| #318 | Low shadow map moves in 80 m steps, at most every 250 ms (replaces #314) |
| #312 | Device auto tier (`core/device-tier.ts`) |

Owners' work merged into the same push:

| PR | Owner | Change |
| --- | --- | --- |
| #308 | ground-contact | Ground textures |
| #315 | parks | Houses by distance |
| #323 | ground-contact | Far ground mesh, the biggest win: +10 fps |
| #321 | UI | Auto steps down from High below 20 fps |

**Open, mine:**
- **#326:** `samsolomon/studio-phone-budgets`. Tightens the low ceilings after #323, adds the load phases
  `city:built` / `city:atmosphere` / `city:placed`, and adds `perf-run --cpu N`. Not yet code-reviewed.
- **`samsolomon/studio-phone-load`:** stacked on #326. There's no PR yet; open one with base main once
  #326 merges, or with base `samsolomon/studio-phone-budgets` now. Not yet code-reviewed or checked on the A16.
  - Far mosaic areas wait for the white-model reveal, or 8 s. A `lookAt` to an off-board target, or a
    study or profile camera, still loads at once.
  - `core/prefetch.ts` starts City's code and first data at boot when a visit lands on City.
  - Byte-identical hot-spot fixes: Builder colour memo (`vignette/geom.ts`), numeric `PlacementIndex`
    keys (`vignette/spatial.ts`), a walkways bbox precheck, and an early exit in `distToLine` (`city.ts`).
    `__perf.hash()` showed the scene unchanged: d7c8973d, 591 meshes, both builds, q=low.
  - Measured at 6x CPU on the Studio: ready 9.07 -> 6.6 s, sidewalks stage 750 -> 290 ms, first frame to
    ready 2.2 -> 0.7 s.

## Next steps, in order

1. Run the code-review skill on #326 and on the load branch, fix the findings, and open the load PR.
2. Ask the coordinator for an A16 run of the load branch against production. The protocol is in
   `docs/perf.md`: serve a frozen build with
   `vite preview --outDir <copy> --host 0.0.0.0 --port 46xx`, then send
   `http://100.78.214.26:46xx/?view=city&q=low&t=2026-11-20T14:00:00-05:00&perf=run`, two runs each,
   median. Compare ready to 10.6 s.
3. Load time, remaining. On the A16, terrain takes 2.4 s and streets+freight 1.1 s. Profile with
   `scratchpad`-style tooling: a CDP Profiler under `Emulation.setCPUThrottlingRate`, resolved through
   source maps. The last profile's hot spots, in 6x CPU time:
   - `subtractSlot` in `terrain/openings.ts` via `terrain/surface.ts` (~0.3 s). That's ground-contact's
     module, so ask them.
   - First-use uniforms on the first frame (~0.3 s).
   - The `quad`/`tri` callers in `terrain/transport.ts` and `city/landmark-shell.ts`.
4. Fps 25 -> 30 at the default view. On low at bc32b09 it draws 2.33M triangles against a 2.0M target.
   Use `hide=` A/B on the A16 to rank what's left (transport, downtown landmarks). Draw calls cost
   little on this phone; triangles and their shadow-pass copies cost the most.
5. Once a cut lands, lower the matching ceiling in `web/src/core/perf-budget.json`.

## Promises to other agents

- **tree-species** (`orca_session_id:6b76e039-f4f6-472d-b827-e2a3fdf94a0a`): sign off their tree
  rollout PR. The agreed terms:
  - species honour `setDetail({ farTrees })` (limbs, leaf tips and the leaf-disc carpet drop)
  - carpet tagged `userData.perf='landscape'`
  - real bounding spheres
  - at most +45 calls and +150k triangles at the low default view, or a single-clump far crown
  - `pnpm test:perf` passes
  - default, skyline and pan numbers in the PR
- **ground-contact** (`orca_session_id:1df827bc-6e12-4e74-b7da-83ee8931ec4b`): owns terrain. Their masked
  near-mesh merge (`:4601`) was dropped because it broke the Brookwood ballast and underpass clearance
  tests. Route `subtractSlot` load cost to them.
- **UI** (`orca_session_id:d577649d-8640-473a-8c9b-461abf2b616a`): tell them if the `device-tier.ts`
  rules change, because their Auto label depends on them.
- **parks** (`orca_session_id:eee32d1c-9a81-4fc4-b25f-64c0efd863df`): offered to free far house tiles'
  CPU attribute arrays if heap stays over 400 MB (it's 424 MB after GC now).

## Servers

None are running. I stopped 4610-4615 and 4619-4621. Coordinator rounds used Tailscale 100.78.214.26.
A `vite preview` started in the background dies at the default 30 min, so use a 2 h timeout.

## Rules that bit me

- **Stacked PRs:** merging a PR deletes its branch, and GitHub then closes any PR stacked on that branch
  for good (#314). Retarget children to main before merging their base. When restacking, use
  `git rebase --onto <new-base> <old-base-tip> <child>`.
- **Stale builds:** never rebuild `web/dist` while a device test is loading it. Serve a frozen
  `--outDir` copy.
- **Device runs:** a fresh Chrome per run, check `summary.areas === 12`, and compare medians. The first
  "crash" reports were a reused crashed tab.
- **Proxy timings:** load times through the Tailscale proxy overstate the network by ~6 s, so measure
  ready against production.
- **Agent shells:** cargo isn't on PATH. Use
  `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"` before `pnpm test`.
