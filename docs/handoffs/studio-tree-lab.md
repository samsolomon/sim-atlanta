# Studio tree lab handoff to Claude Opus

Updated 2026-11-23, America/New_York, by Codex session `orca_session_id:a2d7d1c0-3233-4ebd-b47a-19c9ea8d494f`. Worktree `studio-tree-lab`. Read `AGENTS.md`, fetch origin, and read that session’s history. The current coordinator is on Sam’s MacBook Air, terminal `term_09e1b3da-5f48-4755-abf8-92a571a1f474`. Use `orca orchestration reply --id <msg> --from orca_session_id:<your-session> --body '<body>'`. Direct sends from Studio have previously failed pairing. Only the coordinator deploys.

## State and holds

- Branch `samsolomon/american-holly-lab` contains pushed first pass `805729f8` and this handoff. No open holly PR. Hold any holly merge until the coordinator relays Sam’s OK. Hold additional species rollout to City until Sam has seen the all-converted comparisons.
- River birch A is the Lab default, verified #383 `MERGED`, `mergeCommit=dc07620e4bda00bde6ecee75c9fbd3c7685718f9`. Earlier merges: #375 lacebark elm A, #374 Callery pear A, #367 Eastern redbud A. These were Lab additions. The coordinator received verified notices.
- Holly’s initial A is a single fruiting female exemplar, with a tall narrow crown, close-up spiny leaves, and fall/winter fruit cards nested on foliage cards. Four sizes, 192/134 triangles and two instanced draws. Atlas cost 1.33 MiB, declared. Browser sheet, TypeScript and `pnpm test` passed at `805729f8`. The Python tests skip here without `.venv`. No code for the requested revisions or preview has been written.
- No tabs or dev servers are open in this worktree. The Lab has local GA data; the City `web/public/data/scene` directory is absent. I tested finding it at `/Users/samsolomon/Developer/sim-atlanta/web/public/data/scene` and removed my temporary symlink before handoff. Stage current data per README, or copy a known-current generated dataset into this worktree. A scene symlink is reported by Git as untracked, so keep it out of commits.

## 1. High priority: City all-species preview

Coordinator `msg_f111a77c7cc5`. Sam’s words, looking at Ansley Park overhead at 14:00 on November 20, about 150 m:

> “One thing we should do pretty soon is take a look with all of the trees converted... looking at this Ansley Park screen with the mixed trees, I'm a little worried about how the more detailed trees are going to look.”

The coordinator says the few converted trees look like dithered fuzz beside the crisp, faceted generic clumps. Requested:

1. Add an opt-in switch such as `?trees=all-species` to model every City tree under the current placement mix. Keep it an isolated preview and preserve the ordinary view. Start from current `origin/main` on a separate preview branch so this check can be made before further rollout and without holly changes.
2. Shoot matched off/on pairs at Ansley Park (Sam’s camera if available, otherwise about 150 m overhead), Piedmont Park, a Midtown street and a far skyline view. Each at noon in November, July and January, and once at night. Send the pairs and give an honest read. Report draw calls and triangles by tier with the preview on. The coordinator proposed silhouette, proportion, colour and branching in the same faceted clump language, with leaf cards reserved for a close LOD if the detailed trees clash.
3. Inspect `web/src/trees/rollout.ts` first. It plans context-specific species choices from canopy crowns and size eligibility; some crowns deliberately stay generic. Work out and disclose how the preview assigns those unassigned crowns while preserving existing calibrated placements, trees managed elsewhere, tier identity and the placement mix. Do not silently call a generic remainder an assigned species. `trees/rollout-city.ts` batches each look across City, has low-detail one-form controls, fixed bounds and ink-mask distance gates. `terrain/model.ts` connects board rows to it. Check `docs/tree-species.md` and `docs/handoffs/studio-tree-species.md` for prior placement and performance decisions; coordinate with the tree-species owner (receives separate rollouts).
4. Use `?view=city&cam=1194,-4352,20,50,420&t=2026-11-20T14:00:00-05:00` for the established Prado setup; it is a fallback, not Sam’s exact shot. Try tilt about 20° and distance 150 m for the overhead aesthetic and save the actual tested strings. Piedmont 10th Street gate reference target is x=1739, z=-3112. Its documented close shot uses `cam=1739,-3112,0,60,25`; use a normal distance for this task. Use July/January noon and a full-night clock on the same cameras. Capture both tiers and report `__perf.report()` at the same settings.

## 2. American holly A revision

Coordinator `msg_3d013e341010`. Sam’s exact words in the note: hollies “usually end up more like big bushes instead of trees” and he wants them to read as spiky. The coordinator’s requested direction:

1. “Shape: drop the bare trunk and the narrow top crown. Make the mature tree a dense, broad pyramid with foliage to the ground and no visible trunk; the reference photo is much broader than the model.”
2. “Add a shrub form: a big rounded hedge or screen bush 2-4 m tall (the Nellie R. Stevens / Burford hollies common in Atlanta yards). In City placement, shrubs should outnumber trees, mostly as foundation plantings and screens beside houses.”
3. “Spikiness at City distance: individual spines won't resolve at 100-400 m, so carry it through the silhouette and light. Use jagged, notched outer cards instead of soft blobs, glossy glints (reuse the magnolia sheen material; add no new shader program, since low tier is at 90/90), and a darker, bluer green with more contrast than the neighbouring trees.”
4. “Berries: make the winter clusters slightly larger and put them on the outer surface, so they read from street distance.”
5. “Bug: the close-up shows brownish outlines around the leaf cards (fruit.png). Remove them.”
6. “Deliver: the same-layout sheet with tree and shrub forms side by side, plus a City view at normal distance by day and at night, with triangles and draws for both tiers. Don't merge until I relay Sam's OK.”

Pointers and design risks, all unimplemented:

- `web/src/trees/american-holly.ts` has tree habit, palette, sizes and Look. `web/src/trees/foliage-kit.ts` has spiny leaf painter, fruit tile and card placement. Fruit initially floated when put beyond its support; keep it on an outer foliage plane with enough coverage, rather than scattering detached berries. Current sheet is `docs/log/ui/tree-species/options-american-holly.jpg`; close-up `docs/log/ui/tree-species/american-holly/fruit.png`. Photos remain in `/tmp/holly-form.jpg` and `/tmp/holly-fruit.jpg`; source and credits in `docs/tree-species.md#american-holly`.
- Brown line comes from ink mode 2. `web/src/vignette/ink.ts` uses warm `uFoliageInk` for modes above 1.5. Try neutral silhouette mode 1 on both forms. The low-tier City mask drops out at wide orbits by design.
- Magnolia A3 uses existing `specks: 0.18` (low uses 0.6 times the value). The compile key also includes `bloomWash`, `bloomLift` and `bloomFill`. Simply setting the same speck amount on holly will still add a program unless those parameters align. Magnolia has wash 0.12 and default lift/fill; holly currently has default wash and lift 0.65. A possible fix is to make the wash a per-material uniform and reuse the exact magnolia program, with shared code and no wash on holly. Measure actual programs on both tiers, with magnolia present and after pan. Do not tint the foliage red to make a cache key match. Near vs far shader, mask, and shadows must still agree.
- City yard placement source is `residential.ts`’s foundation runs and clipped hedges; low currently skips those shrubs. Consider bounded deterministic replacements/placements that use accepted yard clearances, reuse the rollout batch, and preserve both tiers’ planting identity. Avoid blocking paths, drives, sidewalks, house footprints, terrace work and existing trees. Turf grade, hard-cover overlaps, stem count, evergreen appearance and seasonal replay all need browser checks. No City wiring has been completed. Keep the requested City study separate from rollout approval.
- Holly eye camera `(0,1.6,15)` to `(0,5.04,0)`, FOV 58. Fruit close-up `(-4.6,3.8,0)` to `(0,3.9,0)`, FOV 43. Lab `/models.html?v=american-holly&variant=A&size=mature&t=2026-12-06T12:00:00-05:00`. Far comparison at z=100 or 300, target y=4.725, FOV 30. The first-pass capture and sheet scripts are in `/tmp/capture-holly.py` and `/tmp/sheet-holly.py`; update the closed tab IDs before reuse. Pillow is at `/tmp/tree-sheet-venv/bin/python`.

## Checks and release routine

- `pnpm --filter web dev --port 5833` for browser review. Use Orca tabs. `VITEST_MAX_FORKS=2 VITEST_MAX_THREADS=2 pnpm test` keeps parallel City tests within timeout on the busy Studio. Run TypeScript, checked browser captures, and `pnpm review` per repo guide. City changes need `pnpm test:perf`, plus view-specific metrics and ground contact checked where placement changes terrain contact.
- If main moves and the build log conflicts, keep both entries and rerun tests. Before announcing any merge, use `gh pr view <n> --json state,mergeCommit` and quote the verified fields. Do not merge either on hold. Close own tabs and stop own servers at completion.
