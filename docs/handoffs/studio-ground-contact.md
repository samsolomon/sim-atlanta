# Handoff: studio-ground-contact (Codex → gpt-6.2, 2026-11-23)

Worktree `studio-ground-contact`. Areas: terrain ground contact, depth range, low-tier terrain memory and triangles. Coordinator: `term_05a952fa-de06-4064-8655-3e98e1caf1e0` on Sam’s Air. Predecessor Codex: `orca_session_id:acad9721-185c-4ee8-84df-9fb8fe9fac1e`; earlier Claude: `orca_session_id:1df827bc-6e12-4e74-b7da-83ee8931ec4b`.

## State
Clean stopping point; no open code PRs. This handoff is pushed on `samsolomon/handoff-ground-contact-62` (not merged). Everything below is merged:
- **#350** Audit buried transport faces, verified `MERGED`, commit `054b89ccec1cc43f4da7f4b9531b1cda409f8803`. Dev-only `groundAuditBuriedFaces` marks slab-bottom triangle offsets; audit ignores these regardless of winding. No rendered geometry changes. Generated-deck regression proves buried undersides are excluded while real top penetration survives. 20 Rust, 950 web, 5 worker tests passed; Python checks skipped without `.venv`. Claude cross-review clean. Evidence `docs/log/ground-audit/14th-street-top.jpg`, camera `125,-3641,30,55,45`.
- **#282** Ground contact (beb576b). `terrain/ground-audit.ts` + `pnpm audit:ground` (headless full-board audit at both tiers). `terrain/drape.ts` (split along the drawn triangles, raise to terrain + lift; ballast capped at 25 cm). `GroundSurface.carve` + `GroundYield` (stair runs; also used by MARTA's `terrain/cutting.ts`). `city/depth-range.ts` (orbit near plane). The drape is **off on low** (Sam, 2026-11-23, phone memory). `ground-contact.test.ts` holds the low tier to stair treads only.
- **#308** Low ground maps at 0.724 px/m, downtown light map 1024² on low (80aa8d5). Sam chose option A over B on 2026-11-23, because road edges must stay legible at a 600 m orbit. `pnpm measure:gpu` (`scripts/gpu-meter.mjs`). `ground-map.test.ts` pins low ≤ 75 MB and high ≤ 410 MB.
- **#323** Far ground mesh (bc32b09). `GroundSurface.farGeometry(2)` is swapped in on low beyond `FAR_GROUND_M` = 2500 m (near again inside 2250 m); `?ground=old` turns it off. A16: default 14.7 → 24.8 fps, panning 15.8 → 25.1. The A16 skyline at 1.9 km isn't ground-bound, so don't lower 2500.

Branches you can delete: `samsolomon/low-ground-merge` is a WIP masked near-mesh merge. **Do not ship it**: it breaks the Brookwood ballast-seating and downtown underpass-clearance tests at low; the far mesh replaced it. Also `samsolomon/far-ground`, `samsolomon/terrain-texture-budget` and `samsolomon/studio-ground-contact` (all merged).

## Next steps, in order
1. Fix the real **south inferred footbridge** ground contact at `(370.178,-1870.121)`: 8.8 cm terrain penetration on its top at both tiers. Connector traced the unsurveyed footway run `[[371.18,-1870.12],[360.93,-1870.15]]`, top y −18.267548, terrain −18.179921. Use a bounded hard-surface yield/carve, not a blanket lift or surveyed-height edit. No code for this fix exists yet. Camera `370,-1870,30,55,45` shows a green patch on the bridge from the building to the sidewalk. Connector diagnostic `/tmp/deck-attribution.log`; our report `/tmp/deck-audit-after.json`.
2. Fix `scripts/ground-audit.mjs` readiness separately: Parks reports the old `#city-info` “Frame the full board” gate can stall with current UI. Use loaded-area readiness, independent of UI text. Our manual checks used `window.__cityDev.areas().size === 12`; Parks used `__perf.report(false).areas.length >= 12`. Neither workaround is committed. `ui=classic` avoids the opening-animation screenshot stall.
3. Continue audits after Parks lands ground-hugging layers. No pending implementation changes to ground maps from us; street-edge paint is Parks-owned. Preserve resolutions, low drape off, and far thresholds.
4. Only if phone-perf asks: near-mesh quadtree for low under footprint/deck/rail mask. Far mesh covers fps for now. KTX2/ETC2 is conditional on continued phone heap pressure. Do not start either speculatively.

## Coordination and promises
- **Parks successor** `orca_session_id:ef6ac039-f20d-4773-bbff-e84554815860`: Winn #349 reported verified merged at `a64509686c54314f208ddd9eafcd64323a8e1e5d`. We audited unchanged hard surfaces: 4,149 exposed-surface samples and 4,036 water samples, zero penetration. Our headless screenshots stalled; Parks retained visual evidence and bounded tree-carpet suppression.
- **Ansley terraces** audit-ready `ceae1970` on `samsolomon/studio-ansley-terraces`, served by Parks at :5417. Scoped ground-contact sign-off already sent: all 30 shelves, 34,850 shelf/tread samples at 25 cm, zero penetration or coplanar hits; low with 12 areas has zero terrace shelf/tread layers. High close views checked. Evidence `/tmp/ansley-terrace-evidence/stairs.jpg` camera `1503,-4056,70,60,45`, `piers.jpg` camera `916,-4352,180,60,45` (the supplied bearing 0 was roof-occluded). JSON `/tmp/ansley-terrace-audit.json` and `-low.json`. Hedge colour matches existing citywide hedges, so aggregate hedge hits are not attributable to new terraces. Parks still owns full tests, review, merge and future street-edge paint. No response currently owed.
- **Connector successor** `orca_session_id:1f9238ff-2c34-4398-9612-0425e769c083`: upper `(125,-3641)` 83 cm and central `(-458,-2864)` 28 cm hits were buried slab bottoms; tops clear terrain by 12 cm. #350 removes both at high and low. South real hit is now ours. No surveyed Connector heights need changing.
- **Coordinator reply route**: direct Studio → Air sends may reject pairing token. Reply to `msg_88128dad0dde` for ongoing status, or takeover thread `msg_611f3007fd44`, with your own `--from orca_session_id:...`. Example: `orca orchestration reply --id msg_88128dad0dde --from <your handle> --body '...'`. Only coordinator deploys.
- Other inherited items remain with their owners: Arts Center east-wing slab (MARTA), building shells (coordinator-routed). Phone-perf has no new request here.

## Servers and ports
None of mine are running; :5291 stopped, all my audit Chrome processes and Orca tabs closed. Parks owns :5417; do not stop it. Earlier :4601/4602 are stopped. Other listeners belong to other worktrees.

## Rules and traps that bit me
- `window.__city` is taken by main.ts; the dev scene handle is `__cityDev`. Close-ups use `__setView(bearing, tilt, dist, x, z, zoom)`, because the orbit minimum is 150 m and Orca screenshots are in CSS pixels.
- `computeVertexNormals` reuses a stale normal attribute when a geometry is rebuilt; delete it first (it blanked a whole board once).
- three r180 calls `texStorage2D` and then `generateMipmap`: count mips once, or memory reads a third high.
- Rebase before every merge, because main moves fast; build-log conflicts are routine (keep both entries).
- Before approving a PR, check `git diff --stat origin/main...HEAD`. #328 first arrived as a stale-tree squash that deleted 3,335 lines of main.
- Use `git stash push -m <tag>` and `stash apply <sha>`, never a bare stash (the stash stack is shared). Remove scratch worktrees with `git worktree remove --force`.
- In shell `--body "..."` strings, backticks are command substitution; use single quotes.
- Cargo now works: `pnpm test` ran Rust, web and worker. `.venv` is still absent, so Python pipeline checks skip.
- Verify every merge with `gh pr view <n> --json state,mergeCommit` BEFORE announcing it, and quote both fields. Keep both build-log entries on conflicts and rerun tests.
- Orca browser worked for screenshots when headless capture stalled: `orca tab create`, `orca eval --page <id>`, `orca screenshot --page <id>`, then `orca tab close --page <id>`.
- Audit colour filters may include buried box bottoms: Winn CAP-colour underside hits were intentional. Restrict conclusions to exposed surfaces and confirm geometry/winding.
