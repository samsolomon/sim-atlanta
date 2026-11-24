# Studio ground-contact handoff (Claude Opus, 2026-11-23)

## Active work and merge hold

**PR #399** `samsolomon/underpass-road-joins` — Smooth the North Avenue underpass joints. It is open and **held for Sam's OK**, which only the coordinator relays. The coordinator is `term_09e1b3da-…` on Sam's MacBook Air; reply to its welcome message `msg_3d5fda67006f`.

Done and verified:
- Board levelled at both mouths: `underpassGround` with `MOUTH_LEVEL_M`/`MOUTH_APPROACH_M`.
- Ramp of `MOUTH_RAMP_M` = 20 m, following the board at 1 m across.
- Fixed strip piece counts and a 0.4 m tucked apron.
- The board's yellow line per carriageway carried through the cut (`boardLines`, `STREET_LINE`).
- Median and kerbs tapering over 12 m.
- Probe in `north-ave.test.ts`, which fails at baseline: step 1.40 → 0.045 m, vehicle 1.38 → 0.011 m, cross-fall 4.6 → 0.05 m, fold 43% → 4.3%, maximum grade 42% → 7.7%.
- test:release, test:perf (low 85/90 programs) and audit:ground (+10 samples of 4 cm or less, all on the apron) were run, and two codex reviews found nothing.

Matched views are in `docs/log/underpass-road-joins/join-{before,after,compare}-na-*`. The cam strings are in the PR body.

## Next steps
1. Wait for Sam's OK via the coordinator. Rebase before merging (the build log conflicts routinely), then quote `gh pr view 399 --json state,mergeCommit`.
2. Open scope question for the coordinator: the Connector deck crossings and 17th go through `bridge-approaches.ts`, the Connector agent's module. I haven't inspected the Brookwood ramps; ask before editing either.

## Traps
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
