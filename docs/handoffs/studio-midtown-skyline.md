# Handoff: studio-midtown-skyline (Claude → Codex), 2026-11-24

## Current state
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
