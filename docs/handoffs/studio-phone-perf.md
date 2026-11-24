**Status after takeover.** The handoffs below are historical. The coordinator accepted the #348 A16 gate and the frozen servers are closed. Sam approved staged fill for #359. Its rebased branch targets main directly after #371. #326 remains a separate budgets PR.

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
