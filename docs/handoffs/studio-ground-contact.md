# Studio ground-contact handoff to Claude Opus

## Active work and merge hold

Resume in this worktree on `samsolomon/underpass-road-joins`. The baseline is `59b8cbc998e147ea21e028beecc3cbc409fe6938`. There is no PR yet for the road joins. **Hold its eventual PR until the coordinator relays Sam’s explicit OK.** Only the coordinator deploys. The new coordinator is `term_09e1b3da-5f48-4755-abf8-92a571a1f474` on Sam’s MacBook Air. Task message `msg_0dc023458d76`, handoff message `msg_8d98c97a626b`, outgoing Codex session `orca_session_id:22a6180b-5cd0-4056-bbed-4d2cb2483246`. Use your own session identity when replying to a coordinator message. Direct Studio-to-Air send has had pairing failures.

Sam’s exact words were “we should try and smooth the tunnel connections to the main roads. I think that's something that continues to be an issue.” The coordinator described a dark band across the lanes, double yellow fading into white dashes, and divider and side walls ending squarely. The requested result covers every road underpass, with continuous pavement and markings, a smooth ramp and tapered walls, day/night evidence, and a joint height and normal regression probe.

The screenshot description identifies **North Avenue**. It has two cells, a median pier and a shader that blends from the board paint into dashed lane markings over 15 m at either end. Grant is undivided, with the road already painted on continuous terrain. This identification comes from the scene and source; the original production screenshot was described in the message. The physical cause of the dark band still needs measurement.

## Checkpoint and evidence

The only changes on this branch are this handoff and the before captures. No fix or regression probe has been implemented. All 28 JPEGs decoded and were inspected on a contact sheet. They cover 14 normal-distance cameras at 14:00 and 23:00 Eastern, high tier, at the baseline commit. Some control views are occluded by elevated streets or nearby buildings. Inspect them at full size before using them for sign-off. A single control overview does not establish continuity at both ends.

Earlier work has landed. GitHub returned the following for `gh pr view --json state,mergeCommit`.

- Grant Street #370 `{"mergeCommit":{"oid":"f6cddc404d42e247228afddf1362fc907cf6918f"},"state":"MERGED"}`
- North Avenue #380 `{"mergeCommit":{"oid":"bca71fa4347daa8db0fe10f34d0ba6eac70ad62a"},"state":"MERGED"}`. MARTA closed its superseded draft #361. The south Midtown footbridge fix is in main, documented in the build log.

## Next steps in order

1. Inspect both North Avenue mouths and compare cross sections on high and low. In `web/src/terrain/underpass.ts`, trace `underpassFloor`, `drawUnderpass` and the 15 m paint blend. Compare the actual emitted pavement triangles with the exterior board on both sides of the joint. Check surface normals, shadows and the board light map separately before attributing the dark band.
2. Add a regression test or probe that fails on the current discontinuity. Sample height and tangent/normal across each mouth, including both lanes and shoulders. Inventory Grant, Leonard Tate, the seven Connector crossings, 17th and the Brookwood ramps against the rendered geometry. Existing `terrain/underpass-clearance.test.ts` tests overhead clearance, a separate property.
3. Implement one continuous ramp surface or a matched joint. Carry a coherent marking layout through the cut, taper divider and walls to grade, and match day/night illumination at the boundary. Reuse shared materials. Preserve surveyed cover spans and clearance, open daylight gaps and the disused rail tops. Check which other mouths share the defect before changing their geometry.
4. Repeat the before cameras and supply additional matched views of each joint that a control overview does not expose. Run `pnpm test`, `pnpm audit:ground --url http://localhost:5291` and `pnpm test:perf` on both tiers. Verify low remains within 90 programs. No test, ground-audit or perf result exists for the proposed change yet. On this Studio, `CHROME=/tmp/king-hardware-chrome` has worked for headless GPU checks. Ensure the Python pipeline tests actually run.
5. Record results and screenshot links in the build log, run the repo cross-review, open the task PR and reply to the coordinator with the evidence and camera strings. Wait for Sam’s OK before merging. Before any MERGED notice, quote `state` and `mergeCommit` from a fresh `gh pr view`.

## Before views

Reproduce with `/?view=city&q=high&dev&speed=0&t=2026-11-20T14:00:00-05:00&cam=...` or hour 23. The captures used 999 × 496 CSS pixels at DPR 2 and zoom 1. Camera order is x, z, bearing, tilt, distance. The local batch helper and camera list are in `/tmp/join-shots.mjs` and `/tmp/join-cams.json` on this Studio. With Vite on 5291, use `node /tmp/join-shots.mjs --desktop after 14` and repeat with 23. The capture browsers exited and Vite on 5291 was stopped.

| View | Camera | Day | Night |
| --- | --- | --- | --- |
| north-east | `-740,-1898,62,58,160` | [14:00](../log/underpass-road-joins/join-before-north-east-14.jpg) | [23:00](../log/underpass-road-joins/join-before-north-east-23.jpg) |
| north-west | `-920,-1812,-109,58,160` | [14:00](../log/underpass-road-joins/join-before-north-west-14.jpg) | [23:00](../log/underpass-road-joins/join-before-north-west-23.jpg) |
| grant-north | `1381,482,177,60,150` | [14:00](../log/underpass-road-joins/join-before-grant-north-14.jpg) | [23:00](../log/underpass-road-joins/join-before-grant-north-23.jpg) |
| grant-south | `1382,533,8,60,150` | [14:00](../log/underpass-road-joins/join-before-grant-south-14.jpg) | [23:00](../log/underpass-road-joins/join-before-grant-south-23.jpg) |
| leonard-north | `1096,134,164,58,160` | [14:00](../log/underpass-road-joins/join-before-leonard-north-14.jpg) | [23:00](../log/underpass-road-joins/join-before-leonard-north-23.jpg) |
| leonard-south | `1119,240,-7,58,160` | [14:00](../log/underpass-road-joins/join-before-leonard-south-14.jpg) | [23:00](../log/underpass-road-joins/join-before-leonard-south-23.jpg) |
| baker | `892,-930,-38,52,260` | [14:00](../log/underpass-road-joins/join-before-baker-14.jpg) | [23:00](../log/underpass-road-joins/join-before-baker-23.jpg) |
| courtland | `685,-1157,84,58,230` | [14:00](../log/underpass-road-joins/join-before-courtland-14.jpg) | [23:00](../log/underpass-road-joins/join-before-courtland-23.jpg) |
| peachtree | `565,-1274,-50,52,230` | [14:00](../log/underpass-road-joins/join-before-peachtree-14.jpg) | [23:00](../log/underpass-road-joins/join-before-peachtree-23.jpg) |
| turner | `320,-1445,85,58,220` | [14:00](../log/underpass-road-joins/join-before-turner-14.jpg) | [23:00](../log/underpass-road-joins/join-before-turner-23.jpg) |
| decatur | `855,452,3,58,220` | [14:00](../log/underpass-road-joins/join-before-decatur-14.jpg) | [23:00](../log/underpass-road-joins/join-before-decatur-23.jpg) |
| mlk | `595,626,9,58,220` | [14:00](../log/underpass-road-joins/join-before-mlk-14.jpg) | [23:00](../log/underpass-road-joins/join-before-mlk-23.jpg) |
| capitol | `354,1044,85,58,220` | [14:00](../log/underpass-road-joins/join-before-capitol-14.jpg) | [23:00](../log/underpass-road-joins/join-before-capitol-23.jpg) |
| 17th | `-60,-4173,155,58,240` | [14:00](../log/underpass-road-joins/join-before-17th-14.jpg) | [23:00](../log/underpass-road-joins/join-before-17th-23.jpg) |

## Historical handoff

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
