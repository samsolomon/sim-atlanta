# Studio ground-contact handoff (Claude Opus, 2026-11-23)

## Active work and merge hold

- **#399** (North Avenue underpass joints) is merged: `bfb20e9143c067c10e385362fb41c08e4f23b94a`.
- **PR #418** `samsolomon/deck-approach-joins` (bridge approaches and landing decks) is open and **held for Sam's OK**, which only the coordinator relays. The coordinator is `term_09e1b3da-…` on Sam's Air; reply to `msg_cec673161ad3`.
  - Approaches have 1.25 m columns (`JOINT_COLUMN_M`), and link toes follow each column.
  - Landing road decks (no profile, unsupported, inside the board) band their last seam at 1.5 m (`LANDING_BAND_M`) and keep the 12 cm tread.
  - `approach-joints.test.ts` fails at baseline. The audit and perf numbers are in the PR body.
  - Before merging: rebase, then run `pnpm build`, `pnpm test`, and `test:perf` on both tiers, then quote `gh pr view`.

## Next steps
1. Wait for Sam's OK on #418.
2. If the coordinator agrees: regrade the board under the landings that meet DEM humps, as North Ave was. That covers Ellis Street and its secondary link at north-corner (0.75 and 1.39 m), and the north-band Connector links at 121,-1300 and nearby (1–2 m). The probe (`measure()` in `approach-joints.test.ts`) lists them.
3. The 17th Street west approach still has 0.49 m of terrain showing through partway along, probably from its 4 m row spacing.

## Traps
- Surveyed deck profiles (`deckNavd88M`) must keep their ends. Easing them onto the board broke the I-20 and Spring/Techwood tests by 4–16 m.
- Low is triangle-bound: banding whole deck spans cost +134k triangles; banding only the seam costs +35.7k.
- **Camera targets inside a slot aim 26 m high.** City's `targetY` returns 0 where the board has no ground, so the view centres far beyond the point you asked for. Aim just outside the opening. The old `north-east`/`north-west` cams have this problem.
- `__setView` zoom has no `cam=` equivalent; record both.
- Capture helpers live in the session scratchpad (`shots.mjs`, `compose.mjs`); `/tmp/join-shots.mjs` is the original.
- `.venv` now exists in this worktree, so the pipeline tests run.

## Historical handoff

The Codex → Claude checkpoint that preceded this (baseline captures, no fix) is in git history at 224b8e45.

The following is the earlier Claude → Codex checkpoint. The active queue and coordinator above supersede it.

### Handoff: studio-ground-contact (Claude → Codex, 2026-11-23)

Worktree `studio-ground-contact`. Areas: terrain ground contact, depth range, low-tier terrain memory and triangles. Coordinator: `orca_session_id:1df827bc-6e12-4e74-b7da-83ee8931ec4b` (Sam's Air).

## State
Nothing in flight, and no open PRs of mine. Everything below is merged:
- **#282** Ground contact (beb576b). `terrain/ground-audit.ts` + `pnpm audit:ground` (headless full-board audit at both tiers). `terrain/drape.ts` (split along the drawn triangles, raise to terrain + lift; ballast capped at 25 cm). `GroundSurface.carve` + `GroundYield` (stair runs; also used by MARTA's `terrain/cutting.ts`). `city/depth-range.ts` (orbit near plane). The drape is **off on low** (Sam, 2026-11-23, phone memory). `ground-contact.test.ts` holds the low tier to stair treads only.
- **#308** Low ground maps at 0.724 px/m, downtown light map 1024² on low (80aa8d5). Sam chose option A over B on 2026-11-23, because road edges must stay legible at a 600 m orbit. `pnpm measure:gpu` (`scripts/gpu-meter.mjs`). `ground-map.test.ts` pins low ≤ 75 MB and high ≤ 410 MB.
- **#323** Far ground mesh (bc32b09). `GroundSurface.farGeometry(2)` is swapped in on low beyond `FAR_GROUND_M` = 2500 m (near again inside 2250 m); `?ground=old` turns it off. A16: default 14.7 → 24.8 fps, panning 15.8 → 25.1. The A16 skyline at 1.9 km isn't ground-bound, so don't lower 2500.

Branches you can delete: `samsolomon/low-ground-merge` is a WIP masked near-mesh merge. **Do not ship it**: it breaks the Brookwood ballast-seating and downtown underpass-clearance tests at low; the far mesh replaced it. Also `samsolomon/far-ground`, `samsolomon/terrain-texture-budget` and `samsolomon/studio-ground-contact` (all merged).

## Next steps, in order
1. Only if phone-perf asks: a near-mesh quadtree for low under a footprint/deck/rail mask (design (c), in my conversation). Phone-perf said the far mesh covers the fps for now.
2. KTX2/ETC2 ground maps as a pipeline project, if phone heap is still a problem after the geometry work (coordinator, 2026-11-23).
3. Re-run `pnpm audit:ground` after other agents land ground-hugging layers. Residual known items, handed off and not mine: street decks and bridge approaches (Connector, `86c22ca9-…`); graded freight cuts (MARTA, done in `terrain/cutting.ts`); the Arts Center station east-wing slab, 25 cm (MARTA, relayed via the coordinator with a 3-line `yields` fix); building shells (routed by the coordinator).

## Promises owed
None outstanding. Phone-perf (`3126b1a7-8882-498c-a5ff-7b65d626cf91`) has the perf tags and A16 numbers. Parks (`eee32d1c-…`) has #328 reviewed and merged. Culture (`dcd075c8-…`) has no open asks.

## Servers and ports
None of mine are running. I used 5291 (dev) and 4601/4602 (preview); all are stopped. The other listeners on the Studio belong to other worktrees.

## Rules and traps that bit me
- `window.__city` is taken by main.ts; the dev scene handle is `__cityDev`. Close-ups use `__setView(bearing, tilt, dist, x, z, zoom)`, because the orbit minimum is 150 m and Orca screenshots are in CSS pixels.
- `computeVertexNormals` reuses a stale normal attribute when a geometry is rebuilt; delete it first (it blanked a whole board once).
- three r180 calls `texStorage2D` and then `generateMipmap`: count mips once, or memory reads a third high.
- Rebase before every merge, because main moves fast; build-log conflicts are routine (keep both entries).
- Before approving a PR, check `git diff --stat origin/main...HEAD`. #328 first arrived as a stale-tree squash that deleted 3,335 lines of main.
- Use `git stash push -m <tag>` and `stash apply <sha>`, never a bare stash (the stash stack is shared). Remove scratch worktrees with `git worktree remove --force`.
- In shell `--body "..."` strings, backticks are command substitution; use single quotes.
- Cargo and `.venv` are missing on the Studio, so `pnpm test` runs web and worker tests only.
