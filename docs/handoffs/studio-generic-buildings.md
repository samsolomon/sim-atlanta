# Handoff: studio-generic-buildings (generic buildings v2)

- **Previous agent:** Claude, Orca session `orca_session_id:c8732aa9-d854-4b8b-b12d-5f248a2244ea`, task `task_4dcabc4e258c`, dispatch `ctx_f41041cb27d5`. Read its history with `orca agent read`.
- **Worktree:** `studio-generic-buildings`.
- **Branch:** `samsolomon/studio-generic-buildings-v2`, based on main at `48d24987`.

## State (2026-11-24)

The task is to make City's generic (unskinned) buildings look good. It is Sam's top visual priority.

The first deliverable is done. Sam has not picked yet.

- [Draft PR #644](https://github.com/samsolomon/sim-atlanta/pull/644) puts eight archetypes behind `?generic=v2`, default off. It is **held for Sam's pick**, so don't merge it.
- The PR body embeds a BEFORE | v2 sheet (day 11:30, dusk 17:25, night 17:50). The images are in `docs/log/ui/generic-buildings/`:
  - `pc.jpg`: Peachtree Center at 600 m. This is the money shot.
  - `dt.jpg`: downtown wide.
  - `mt.jpg`: Midtown at 1.6 km.
  - `nb.jpg`: Old Fourth Ward.
  - `closes.jpg` and `closes-night.jpg`: one close-up per archetype, day and night.
- The sheet went to the coordinator as a reply to `msg_7c41c123fc59`, and the coordinator is waiting on Sam. The brief's terminal address (`term_09e1b3da…`) no longer resolves.
- Design, archetypes, photo references and assignment rules are in `docs/generic-buildings.md`.

## Code

- `web/src/vignette/generic-v2.ts`:
  - the flag (`genericV2()`, `setGenericV2`)
  - `archetypeFor` (deterministic, seeded from `id + ':v2'`) and `lookFor` (palette, base, cap, inset, cornice, roof)
  - `offsetRing`
  - a dev-only `window.__genericV2` list of where each archetype landed
- `web/src/vignette/generic-v2-glsl.ts`: the facade patterns, one shader branch for styles 20 and up.
- `web/src/vignette/world.ts`:
  - `appendGenericWalls`, which builds the base, optional soffit, shaft, and cap or cornice
  - `aBase` is now set per vertex (the `wallOrigin` array)
  - the `st > 19.5` branch in `patchFacades`; the legacy branch is wrapped in `else`
  - with the flag off, output should be unchanged, but that has not been pixel-verified
- **Encoding:**
  - `aStyle` = 20 + archetype × 4 + variant, so 20–51. Archetypes: 0 precast, 1 banded, 2 brick, 3 limestone, 4 residential, 5 deck, 6 shop, 7 glass.
  - Base styles: 52 lobby, 53 arcade, 54 plinth, 55 shopfront.
  - Caps and soffits use -1.

## Numbers (same session, flag off against on, `cam=600,-1000,15,70,1700`)

| Tier | Draws | Programs | Generic-building triangles | Generic-building geometry |
|---|---|---|---|---|
| High | 260, unchanged | 96, unchanged | 846k → 970k | 66.4 → 82.0 MB |
| Low | 214, unchanged | 82, unchanged | 881k → 1005k | 68.7 → 84.3 MB |

The +15.6 MB is the open cost. `pnpm test:perf` has not been run.

## Sam's decisions today that affect this area

The coordinator listed these. Ask it for the details of each.

- Generic buildings are the priority.
- Flat glass.
- Far-board.
- Landmark LOD.
- Far shadows.
- Tree far form.
- Streaming flag.
- 0.45 shade floor.
- 1075 glass B.
- Expansion paused.

**Glass rules** (docs/glass-palette.md on `samsolomon/studio-building-skins`):
- Binding: sunlit rendered S ≤ 36 and V ≥ 40.
- Base table: V ≥ 62 → S ≤ 30; V 50–60 → S ≤ 22; V 40–50 → S ≤ 15.
- Shade readings are advisory.
- Colour must come from photos.

## Open coordination

- **studio-perf-buildings** (`orca_session_id:f4e52674-8b74-4ea3-8ba4-d026c9326377`) agreed to review the PR. Its far-board form (#613) reads only vertex colour. I promised to export `v2StyleTone(style, wallRgb)` from generic-v2.ts, returning the shader's faded mean `mix(wall, glass, mean)`, once the archetypes settle, then ping it.
- **Skins lead** (studio-midtown-skyline-1c, `orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`) owns the merge queue. It warned about phantom "parking" heights (78.7 m and 68.2 m against lidar 27.7 m and about 3 m). v2 treats parking taller than 36 m as an office; a 198 m "parking" polygon exists near (470,−533). It also listed downtown buildings its skins workers are taking, which v2 can ignore.

## Next steps, in order

1. Get Sam's pick (keep, cut or tune per archetype; the overall mix) and apply it.
2. Redo the close-ups. The current ones show more roof than facade. Frame each building's sunlit face from a flatter tilt, and check the subject in the image rather than trusting the raycast picker.
3. Fix the shaded dark-grey generic tower in the downtown-wide shot, which still reads as a flat slab.
4. Cut geometry. Drop the soffit and cornice on the low tier, split walls only above a height threshold, or both. Then run `pnpm test:perf` (ceilings: low 86 programs / 190 MB, high 100 / 300 MB).
5. Glass check on rendered pixels at 11:30, high tier, for the banded and glass archetypes. Put the numbers in the PR.
6. Pixel-diff the default path (flag off) against main at a matched frame.
7. Export `v2StyleTone` for studio-perf-buildings and ask for its review.
8. Run `pnpm test` and `pnpm review` (cross-model), add a build-log entry, and make the PR ready.

## Gotchas

- **Port collisions:** another worktree (studio-ground-contact) had a dev server on 5291. My Vite failed to bind, and my first shots silently came from that server. Use `--strictPort` and check the log.
- **Data:** `web/public/data` was copied from studio-perf-buildings; it is gitignored.
- **Bearing:** in `cam=x,z,bearing,tilt,dist`, the bearing is the view direction (0 looks north). Max tilt is 72°. North is −z. Westin is at about (280,−615) and Bank of America at (505,−1886).
- **Building parts:** many downtown generics have `parts`, so v2 applies per mass, and a raised part gets no base. Woodruff shopfront lots keep the legacy walls.
- **Artmap:** `artmap/capture.ts` assumes one quad per facade. It is only affected with the flag on.
- **Scratch scripts:** the scratchpad has `shot.mjs` (CDP shots that wait for the board to load), `compose.mjs` (captioned composites) and `pick.js`/`ray.js` (raycast style probes). They may be cleared; they follow `scripts/chrome-cdp.mjs` `launchChrome`.
