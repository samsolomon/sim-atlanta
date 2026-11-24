# Studio ground-contact handoff (Claude Opus, 2026-11-23)

## Active work and merge hold

Merged today (quote `gh pr view` from history if asked):
- #500 71b26f41 (transport far form), #509 a1305a32 (North Line far form), #514 3eca63b9 (far prefix in shadow pass).
- #538 52de7bf9 (very-far ground, settled 8 m beyond 12 km).
- #566 2742657d (R8 release blocker: freight-deck undersides kept in the shadow prefix).

Open and held:
- **#418** (bridge approaches and landing decks) and **#476** (north-band seam links, stacked on #418): with Sam.
- **#571** `samsolomon/settle-far-ground`: settle the 2 m far level. Held for the coordinator's judgement (reply to `msg_65d362faf04c`).

## Next steps
1. **Road-surface cracks** (branch `samsolomon/road-cracks`). The traffic owner (cfb2a7c9) listed 72 sites in `docs/log/perf/traffic-height-cracks.md` on `claude/traffic-frame-cost-2`: cityRoadHeight returns null, or a dip over 15 cm under both rims, along traffic lanes at 0.13 m steps on low.
   - Biggest: (-170,-4150) 13 m, the 17th Street west approach. Then (-780,-40) 1.35 m, (1095,240) 0.81 m, (110,-1255) 0.51 m.
   - Most others are single "no surface" samples on the Connector at x 1080-1240 (east boards).
   - When fixes land, ask the traffic owner to re-run its sampler.
2. Review the streaming agent's sliced createSurfaceTransport when asked: mesh order and far prefixes must stay byte-identical.
3. Known gaps in `docs/art-backlog.md`: the Whitehall and RDA climbs, Peachtree at Brookwood.

## Traps
- The far prefix is also the shadow pass (#514): anything dropped from it must not be the only caster for its spot (freight decks, #566). The far-form test pins every deck sample.
- Capture scripts must launch their own Chrome via `scripts/chrome-cdp.mjs` launchChrome (port 0); never attach by port, never pkill by pattern.
- Pixel-diff City frames only with `?perf&nopass=grade` (animated grain), and on high also `gtao`; otherwise identical runs differ.
- Perf baselines with swapped files: use `git merge-base HEAD origin/main`, never `origin/main`.
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
