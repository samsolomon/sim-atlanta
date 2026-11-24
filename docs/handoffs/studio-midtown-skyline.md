# Handoff: studio-midtown-skyline → gpt-6.2

## Current state — 2026-11-23 local / 2026-11-24 UTC

- **Branch:** `samsolomon/studio-colony-square`, pushed. Research commit `fee824c6`; this handoff is the next commit. **No open PR, no production code changes on this branch.**
- **1180 Peachtree B is finished:** PR #341, verified via `gh pr view 341 --json state,mergeCommit`: `state: MERGED`, merge commit `95acb6c4b8b56e94af95f5028579b5a89a25668d`. Coordinator received the verified notice and matched pairs. Only the coordinator deploys; deployment status is not known here.
- B uses #d5dfdc, strength .82, height multiplier .72–1, depthWrite true and opacity .88 by day / 1 at night. Missing veil depth caused the mottling because ink read objects behind it. Separate veil origins fix distance sorting; edge light draws afterward with depth testing. Veil ceiling tightened to .61 (~.605 actual peak).
- Tests passed: Rust/pipeline/worker and 931 web tests, 1 skipped. Performance ceilings passed; high-tier ready time 4.6 s exceeded the nonblocking 3 s target. Two Claude cross-review rounds completed. Alternate daylight and night angles were checked.
- Evidence on main: `docs/log/ui/midtown-skyline/napkin-b-daynight-high.jpg`, `napkin-b-daynight-low.jpg`, `napkin-b-angle-checks.jpg`, `napkin-b-oblique-day.jpg`. Aerial camera `800,-3710,70,50,1021`, 2026-11-20 14:00 and 23:30 ET.

## Next work — Colony Square 100 and 400

Read **`docs/research/colony-square.md`** first. It contains source links, inspected photo notes, lidar statistics, and architecture/product-design plan reviews. No implementation has started.

1. Inspect the full-resolution Commons tower photographs already linked in the research doc. Reconcile OSM part outlines with lidar: several supposedly low parts contain high tower returns. Do not blindly build the generated 86.2 m `podium` on 400.
2. Finish measured roof/parapet/core sections. Preliminary lidar: 100 ground 296.08 m NAVD88, core median 96.31 m above ground; 400 ground 296.30 m, core p90 91.12 m (generic currently 94 m). Shaft medians are 89.18 and 83.15 m, but upper returns need interpretation before assigning parapets. Acquisition predates the modern retail redevelopment.
3. Implement the towers through the existing `midtown-skyline.ts` registry and local shell, with a dedicated module/fixture. Model recessed window grids, concrete piers/bases, roof screens, and photographed contemporary entry additions. Use library materials, preserve parent IDs, ground on 3DEP. Scope the tower bases carefully against the surrounding plaza.
4. Full-night Urbanize photos were inspected: warm offices, bright entry/soffit lighting, string lights, and holiday-coloured accents. **Nonseasonal crown lighting remains a source gap.** Do not turn the holiday red accent into permanent lighting. Day/dusk design-team imagery was also inspected in a fresh Orca tab.
5. Capture matched day/night and both tiers; run tests/perf, cross-review and a dedicated PR. Coordinator expects screenshots, camera strings and verified merge state/commit. Remaining backlog after Colony Square: 1075 Peachtree, 12th & Midtown, Peachtree Summit seam recheck.

## Coordination and promises

- Coordinator: `term_05a952fa-de06-4064-8655-3e98e1caf1e0` on Air. Saved environment `air` rejects direct-send pairing tokens. **Reply routing works.** Use `orca orchestration reply --id <message> --from <YOUR session id> --body ...`; do not impersonate this predecessor's session.
- Current migration thread: `msg_92f9111f6941`. Colony research thread: `msg_1bc5e6559143`. Predecessor Codex session: `orca_session_id:f9351f4d-5bff-422e-895e-42277adf4c92`.
- Coordinator already received the Colony research link and the height/footprint/source gaps. No Sam approval is pending; continue research and implementation.
- **Before every MERGED notice:** run `gh pr view <n> --json state,mergeCommit` and quote the returned state and commit. On a build-log conflict, keep both entries and rerun tests.
- Keep the `TODO(tree-lab)` / `crapeMyrtleStandIn` promise on 1180. Historical agent IDs and other background promises are retained below.

## Cleanup, tools and scratch evidence

- Own server was Vite :5187; stopped. Orca reports no tabs in this worktree. No worker/API server was started. Do not stop other agents' servers.
- `/tmp/colony-research/`: `measure.py`, `measure.txt`, `lidar.npz`, photo downloads/contact sheets. Measurement uses existing `king_memorial_corridor.ept_points`; cached tiles are in `data/raw/ept/`. Scratch files are not committed; research statistics and sources are committed.
- `/tmp/1180-review/`: tests/review/perf logs and capture helpers. `chrome-capture.mjs` adapts the repo's `scripts/perf-run.mjs` CDP setup, taking URL arguments with `--desktop --out <dir>` and saving numbered PNGs. Final headless Chrome sessions closed themselves.
- Orca's browser eventually stopped advancing requestAnimationFrame even with visible/active tab. Fixed sleeps and awaiting the reveal did not recover it. Final verification used Chrome/CDP; inspect screenshots, never assume readiness from the loading text alone.
- `pnpm review` **does work now** and runs Claude for Codex. Earlier historical notes saying unavailable are obsolete. Use the repo cross-review skill, at most two rounds.
- Cargo: prepend `/opt/homebrew/opt/rustup/bin` to PATH. Python dependencies are in `.venv`.
- Plan-review skills were found at `/Users/samsolomon/.claude/skills/architect-plan-review/SKILL.md` and `product-design-plan-review/SKILL.md`; reviews are recorded in the Colony research doc.

---

## Historical handoff and work log (superseded by current state above)

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
