# Handoff: studio-midtown-skyline (Claude → Codex), 2026-11-24

## Original Claude handoff state (historical)
- **Branch:** `samsolomon/studio-1180-night-2` (pushed, parked as WIP, **no PR yet**). It holds:
  - a no-behaviour-change refactor that moves the 1180 crown's night strengths into `CROWN_NIGHT` in `web/src/city/midtown-skyline-symphony.ts`
  - the step sheet `docs/log/ui/midtown-skyline/napkin-night-steps.jpg`
  - this doc
- **Open PRs from this worktree:** none. Everything else is merged to main.
- **Merged this session:**
  - Georgian Terrace: #173, #205
  - One Atlantic and 191 shared facade: #183
  - Promenade crown neon: #187
  - Tower Square: #188
  - 1180 Peachtree: #229, #247, #327
  - building parts: OSM #201, downtown Overture #215
  - strict pipeline tests: #211
  - Biltmore: #242
  - Academy of Medicine: #252, #269
  - Wimbish House: #255
  - Ponce de Leon Apartments: #256
  - flaky sections tests: #262
  - Federal Reserve: #274, #283
  - materials adoption: #290

## In-flight task: 1180 Peachtree night crown, too dim (Sam, 2026-11-24)
- **History:** #327 fixed the blown-out white slab: the veils had a near-white emissive at 1.8. Sam now says it is "almost too dim". The coordinator's target: the veils should read at a glance as the lit crown of the cluster, about as present as Promenade's white crown lines, with the brighter end lattice and the thin edge line visible. Nothing may clip to white or bloom past the silhouette.
- **Finding:** raising the emissive **intensity** barely changes the render. Steps A, B and C on the sheet (veil 1.0, 1.18 and 1.35) look almost the same as the current 0.82. The veils are transparent (opacity .88, `depthWrite: false`) over a dark base. **The sheet was not sent to Sam because the steps are indistinguishable.**
- **Next levers to try:**
  - a paler, brighter emissive **colour**: the veil is `#9dbcb2`; try about `#c4ddd4`
  - raising the veil **opacity** toward 1
  - possibly making the veil vertex colour (`#8fb3bb`) lighter at night
  
  Produce 2 or 3 visibly different steps at the aerial camera `/?view=city&cam=800,-3710,70,50,1021`, 23:30, on both tiers, with the Kendall/Heaton photo crop, on one sheet. Send it to the coordinator and let Sam pick. Then:
  - **retune** the test ceiling in `midtown-skyline.test.ts` ("1180 … no crown material's emissive may saturate", currently `< .7` per channel) to the picked values, still below clipping
  - run `pnpm test` and the code-review skill
  - open a small PR and merge it
  - send the coordinator a merge notice with the camera string and blob links

## Sam's decisions and intent
- **Every landmark (2026-11-23):** photos from two angles, day and night. Cite sources. Mark estimated dimensions. Document night gaps. Ground it on 3DEP. Use lidar where heights matter: `ept_points` in `pipeline/scripts/king_memorial_context.py` / `king_memorial_corridor.py`.
- **Review images:** captioned BEFORE | AFTER composites, money shot first, arrows on the subject, merge notices with GitHub blob links.
- **Historic buildings:** use the Georgian Terrace template (`web/src/city/classical-ornament.ts`: bands, modillions, rusticated base, quoins).
- **Materials:** come from `web/src/materials` (`shell.paint(surfaces.agedCopper())`, `prism(..., { wall: surfaces.stucco() })`).
- **Grounds:** formal beds use `flowerBed(..., { soil: 'rich-black' })`, with calm light ground.
- **Federal Reserve:** the lidar massing is authoritative: corner tower 61.9 m, slab 47.5 and 53.7 m, wing 14.2 m. The frieze stays plain, with no lettering.
- **Truth tiers (AGENTS.md, 2026-11-23):** don't label scenery heights on screen. Record them in docs.

## Next steps, in order
1. Finish the 1180 night-brightness pick (above).
2. **Colony Square** (100 and 400 Colony Square, OSM ways 536737548 and 536737549; 1414724134/1414724139 and 1451518631/1451518632 are their parts).
3. **1075 Peachtree** (osm:way:234935278, a 156.7 m tower, building parts in midtown-upper and midtown-central).
4. **12th & Midtown** towers.
5. **Peachtree Summit** seam recheck at the downtown and north-band join (see `docs/rectangle-detail-plan.md`).

## Promises owed to other agents
- **studio-tree-lab** (`orca_session_id:4a8d1cca-2174-43ce-8afc-2421541a75cd`): the 1180 roof-garden crape myrtles are a stand-in, `crapeMyrtleStandIn` in `midtown-skyline-symphony.ts`, tagged `TODO(tree-lab)`. Tree-lab will swap in `createLook` once Sam picks the crape myrtle rendering. Keep the tag.
- **studio-materials** (`orca_session_id:2a079a0f-2573-4fe8-9648-2ec17e852466`): already adopted on the Academy and Biltmore (#290). Swatches are at `/models.html?v=swatches`.
- **Release packager** (`orca_session_id:f4705eb0-457d-47df-aca6-992847d53ceb`): told that #201 and #215 need `pnpm data:midtown` and `pnpm data:city`, and to use `pnpm test:release`.

## Servers and ports
- My Vite dev server ran on **:5187** (`pnpm --filter web dev --port 5187 --strictPort`). It is stopped now. Other agents use 5289, 5297, 5317 and 5417; don't stop those.
- My capture helpers live in the session scratchpad, not the repo. Recreate as needed:
  - Orca-tab goto plus screenshot, waiting until "Building the city…" disappears from `document.body.innerText`
  - a PIL composer for BEFORE | AFTER sheets with captions and arrows

## Repo rules and gotchas that bit me
- `pnpm review` and the Grok fallback are unavailable on the Studio. Self-review with the code-review skill and say so in the PR.
- **Before captures:**
  - check out `origin/main`'s versions of the changed files
  - wait for the reload
  - capture
  - check out `HEAD` again
  - confirm `git status` is clean
- **Building parts:**
  - `pipeline/scripts/rebake_buildings.py --check` must stay byte-identical; it runs in `pnpm test`.
  - Never text-merge regenerated JSON. Re-run the generator instead.
  - Merging `docs/build-log.md` with union is fine. Check TS files by hand: the union merge once dropped a closing brace.
- **Main moves fast:** rebase immediately before `gh pr merge`, and retry on "Base branch was modified".
- **Night:** Three.js emissive adds on top of lighting. A near-white emissive above about 0.9 clips to white and blooms. Raise emissive colour or opacity, not just intensity, when a transparent surface reads dim.
- **New UI:** the top-left time panel now covers about the top-left 200 × 130 px of captures. Place captions elsewhere.
- **Cargo:** not on PATH on the Studio. Use `export PATH="/opt/homebrew/opt/rustup/bin:$PATH"`. `.venv` (Python 3.15 with shapely, laspy and pypdf) exists in this worktree.

## Codex takeover, 2026-11-23 (local date)
- Fetched origin, read guide and predecessor's last 100 messages, rebased branch on origin/main.
- Captured runtime-only colour/opacity trials in `docs/log/ui/midtown-skyline/napkin-night-colour-trials.jpg`: A #b2cfc5/.92, B #c4ddd4/.97, C #d8e9e2/1.00; intensity .82 unchanged. Both tiers, requested aerial and 23:30 clock. Production source unchanged.
- The veil brightens, but mottling persists at both tiers. Investigate before calling the soft wash finished. No pick or merge yet; tests/ceiling/review remain after selection.
- Coordinator delivery blocked: saved environment alias is `air`, but `orca orchestration send --on air` returns `Remote Orca runtime rejected the pairing token`. User asked to refresh pairing. Local delivery cannot find the remote terminal. `orca orchestration check` returned no messages.

## Smooth-wash follow-up (supersedes colour-only trials)
- Coordinator reply route works: reply to msg_ba155acc1549 from orca_session_id:f9351f4d-5bff-422e-895e-42277adf4c92. No pairing refresh needed for replies.
- Source now provisionally implements step B in napkin-night-smooth-steps.jpg: #d5dfdc, intensity .82, depthWrite true, opacity .88 daytime to 1 night, procedural height emission multiplier .72–1. A=#b4c3bf, C=#e7eeeb. Await Sam's pick; no PR/merge.
- Controlled old-colour/.88-opacity test with only depthWrite enabled removed the large mottling. Ink uses background depth when the veil does not write depth.
- pnpm test, focused 15 skyline tests, and pnpm test:perf pass. pnpm review now works (Claude); round 1 found stale docs (superseded here and in build log) and plausible near/far daytime sorting / oblique edge-light occlusion. Check those cameras before merge, retune ceiling to chosen colour, then final review (round 2).

## Sam selected B — finishing for merge
Sam selected B via coordinator msg_6a895c5d57ac. The source is now the selected production change: #d5dfdc, strength .82, depth writing, opacity .88 by day and 1 at night, emission gradient .72–1. Veil peak linear emission is ~.605; its regression ceiling is now .61. Separate mesh origins give the transparent veils distance sorting, and the edge light composites after the veil with depth testing retained. Final verification and PR details follow in the merge notice.

## Current Opus handoff — supersedes the earlier queue status

**Hold all merges until the Air coordinator relays Sam’s OK.** The latest route is coordinator terminal `term_09e1b3da-5f48-4755-abf8-92a571a1f474`, message `msg_6626b4281eeb`. This Codex session was `orca_session_id:1a78f936-e5cd-47ed-85c9-ff6182accf6a`. Get a coordinator reply route for the successor session. Direct Studio-to-Air sends previously failed pairing. Only the coordinator deploys. Quote the actual `gh pr view N --json state,mergeCommit` output before any merge notice.

### Sam’s brief, as received

> "skin the remaining large/important buildings." Before Colony Square, produce docs/building-skins.md. (1) Rank every still-generic building on the board by importance: height, footprint, visibility from Peachtree, the Connector and the default camera, and public recognition (offices, hotels, campus buildings, garages over 30 m or on key corners); list the top 40 with OSM/Overture ids, height, and a one-line facade description from photos. (2) Write a shared skin spec: facade families from the material library, window grids, crowns and roof equipment, ground-floor treatment, night lighting rules, and a per-building triangle and draw budget at low. (3) Split the list into briefs a simpler agent can execute: each with day and night photo links, dimensions, the family to use, and acceptance shots. Mark which buildings need landmark-level research (keep those for yourself or an Astra agent) and which are routine (for Sol workers). Send me the doc; I will start Sol workers on the routine briefs. Then continue Colony Square.

### Branches and ownership

- Current branch `samsolomon/studio-building-skins`, work pushed through `682b78aaa8614d4e4f028ff7cd5d4b251542b81e` before this handoff. No PR. [Skin spec and 40 briefs](../building-skins.md) and [6,177 candidate rows](../building-skins-ranking.csv) sent to coordinator. All changes in this session were documentation. No scene implementation on this branch.
- Colony Square research branch `samsolomon/studio-colony-square`, pushed tip `a9cb0e14`, no PR. [Research, lidar measurements and implementation plan](https://github.com/samsolomon/sim-atlanta/blob/fee824c6/docs/research/colony-square.md). Earlier 1180 wash is finished, #341.
- Downtown worker `7abc46f1-296e-4e71-94c0-65df6427a6fa`. GitHub verified #377 (230 Peachtree) state MERGED, mergeCommit ad79062c3d3c7ffa7387b3257e21fedeb4f2038b; #381 (Davison’s) state MERGED, mergeCommit 59b8cbc998e147ea21e028beecc3cbc409fe6938. Robinson #384 OPEN, mergeCommit null. Worker reports full tests and high 1193 draws / 105 programs / 500 MB, low 569 / 90 / 393 MB on combined main after #381. **Held for Sam’s OK**; the new hold superseded the prior performance clearance.
- Sol `df4d3e3e-cf2f-45e2-913e-2f05d725e805` owns Marquis One then Two, shaft/base and tower-side entrances. Shared podium and skybridges are outside scope. No matching open PR found at handoff.
- Sol `94a6c83c-dbc8-48c0-b7be-57ef54461228` owns 171 Seventeenth #388 (OPEN, mergeCommit null), then 903 and 999 Peachtree. **#388 and all follow-ons held for Sam’s OK**. 171’s staged parts are 89, 98 and 106 m, all reported. At 903 include the integrated deck screen on levels 2–7. All three workers were directly informed of the new hold.

### Next steps, in order

1. Finish the survey evidence on the current branch. Ranking uses corridor distance, proximity to Five Points and name/class proxies. Actual default-camera framing, corridor occlusion, recognition, key corners and complete exclusion of existing coordinate-selected models still need checking. Refresh recently merged footprints and avoid duplicate assignments. Verify the unnamed 60-floor footprint before identifying it as 1072 West Peachtree. Campanile’s mapped 200 m needs lidar reconciliation. Most briefs link a gallery but still lack verified full-night exterior images; mark each precise gap. Investigate the staff garage independently of Emory’s visitor deck. Scratch survey scripts are /tmp/sky-rank.py and /tmp/sky-csv.py on this Studio. The CSV is a candidate snapshot, not a verified runtime replacement registry.
2. Send revised evidence to the coordinator and seek review on the docs branch. Preserve worker ownership. Run full tests and cross-review before opening a PR; neither was run for the final documentation. All merges await explicit coordinator clearance.
3. Resume Colony Square on its separate branch. Resolve tower/podium lidar registration first. Match main roof, parapet and core; compare daytime and ordinary nighttime photographs (available holiday lighting is unreliable for everyday crown lighting). Reuse the existing registry and shell, preserve both parent IDs, and check grades. Follow the branch’s research plan for test/visual evidence. Then take 1075 Peachtree, 12th & Midtown and the Peachtree Summit seam in order, checking reservations first.

### Cameras and checks

- Every survey row has a proposed City camera. Colony Square starting targets are `cam=794,-3754,32,60,282` (400) and `cam=819,-3670,32,60,288` (100). Cluster overview `cam=800,-3710,70,50,1021`. These are starting points; save the actual entrance and roof-return frames. For low and high, use `/?view=city&q=low&weather=clear&speed=0&t=2026-11-20T11:30:00-05:00&cam=794,-3754,32,60,282`, repeat at 23:30 and with q=high. Capture BEFORE/AFTER pairs at the same viewport.
- Use pnpm test, pnpm build, pnpm test:perf and pnpm review before merging a visual PR; use pnpm audit:ground against the dev server for ground contact. Cargo path is noted above. Low/high baseline on #386 independently reproduced 562/1179 draws, 90/105 programs and 392/499 MB after GC, all 12 areas. Current program ceilings are 90/140; draw ceilings 600/1250. No spare low-tier shader variant at this baseline. landmarkShell uses StaticLandmarkMaterial; the high-tier downtown batch excludes custom shader hooks and does not automatically cover Midtown.
- No research or review tabs were opened by this session. Performance harness terminated its own Chrome and preview server. No worktree Vite server remains running.


## Opus session, 2026-11-23/24 (orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529)

The coordinator replies to this session. Its welcome message was msg_bb2e23eb596c. The coordinator approves skins; this lead sequences merges and sends merge reports.

**Merged by this session**
- #403 1100 Peachtree. Skyline registry, lidar heights.
- #407 Fixed a tsc error that #403 left on main. **Run `pnpm build` (tsc) before every merge.** Neither vitest nor test:perf typechecks.
- #413 The Campanile, drawn as its stripped 2026 frame. Reference date: AJC photos of 19 May 2026.
- Skin merge train 1, #445 at 4cf6f874: #422, #426, #428, #429, #430, #431, #433, #434 and #437. **This is the release 3 cut.**
- Skin merge train 2, #447 at f3e5fe5a: #438, #439, #444.

**Open**
- #449 untracks two `.pyc` files. It is approved and merges after perf-buildings' #441 and #442.
- Train 3 starts only after #441 and #442 land and low tier has been re-measured. Approved for it: #448 Hanover Midtown. Coming: Sora (skins-2), 271 Seventeenth (skins-4), Twelve Midtown (skins-3), Loews (skins-5), 1355 Peachtree (skins-6), 400 Colony Square (skins-7), Square on 5th (culture agent), Atlantic House (skins-1).
- The shared lit-pane hash in skin-kit is skins-6's, reviewed by skins-7. Afterwards skins-7 converts #402 and skins-1 converts Marquis One. The reason: a linear modulus draws diagonal staircases of lit windows.

**Docs delivered (branch `samsolomon/studio-building-skins`, no PR)**
- `docs/building-skins.md`: re-ranked using a runtime drawn-footprint probe and 2019 lidar heights. It now carries owners, merge status and the merge-train rule.
- `docs/building-skins-extension.md` and its CSV rank key buildings in the north, south, east and west extension boxes, with lidar from the B2 and B3 collections. B2 has no returns over Buckhead.

**Proposal waiting for Sam**
- `docs/night-occupancy.md` on `samsolomon/night-occupancy-proto`: one shared lit-window model by building use and hour, behind `?occ=proposed`. **Don't open a PR until Sam decides.**

**Merge train recipe**
1. Branch from main.
2. `git merge --no-ff origin/<head>` for each PR in approved order.
3. Resolve `web/src/terrain/model.ts` and `docs/build-log.md` by keeping both sides.
4. Run tsc, `pnpm build`, `pnpm test`, the worker tests and `pnpm test:perf` (low, high and high-night).
5. Open one PR and merge it with a merge commit.
6. Verify each PR shows MERGED.
7. Quote `gh pr view` to the coordinator.

East-rail's King Memorial test times out at 5 s when Studio load is around 50; it passes alone.

**Ceilings (#425):** low 600 calls and 85 programs; high 700; high-night 720. Main after train 2: low 586, high 634, high-night 677.

**Tools in scratch, not in the repo:**
- `/tmp/sky-lidar-h.py`: lidar heights by footprint or part id, with ground from a 3–20 m ring.
- `shot.py`: waits for `__city.revealed`, then `__setView`.
