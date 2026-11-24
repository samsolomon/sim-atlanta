# Studio skins 1 handoff

Outgoing owner: the Claude Opus session in the `studio-skins-1` worktree. Read its history with `orca agent read orca_session_id:914b0cfd-3709-4968-881b-c1ff4ef1ba08` (this worktree's session; the id also appears as `--from` on every reply it sent). Its predecessor (Codex) was `df4d3e3e-cf2f-45e2-913e-2f05d725e805`.

Report status by replying to the coordinator (Air, thread `msg_52f10bb4946a`). The skyline lead (`47b1a596`) owns the building-skins table (`docs/building-skins.md` on `samsolomon/studio-building-skins`) and builds the merge trains. Never merge or push to a PR in a train unless the lead says it isn't built yet. The coordinator approves skins (Sam delegated this).

## Open PRs (2026-11-24, about 13:30 UTC)

| PR | Building | Head | Status |
|---|---|---|---|
| #568 | Southern Company Gas, Ten Peachtree Place | `d045755b` | Approved. Detachment fix (0 detached) and the 4 cm lit-layer fix are pushed. Rides 8c. |
| #606 | Two Peachtree Pointe crown band and canopy | `320eb85a` | Approved. Entrance-light offset fix is pushed. Rides 8c. |
| #620 | Tower Square piloti base and crown band | `76c35230` | Approved. Rides 8c. |
| #633 | Atlantic House stepped-wall fix and ViewPoint canopy declaration | `86a10c94` | Approved. Rides 8c. |
| #641 | Capital City Club (downtown) | `8b65b1bf` | Approved, with the coordinator's colour notes folded in. Rides 8d. |
| #657 | 260/270 Peachtree Parking (downtown) | `e8101917` | Approved. Rides 8d. |
| #662 | Marquis layer offsets of 5 cm or more | `c3062840` | Lead accepted it. Rides 8c with #655. |

Merged today: #393, #406 (Marquis One and Two), #429 (ViewPoint), #454 (712 West Peachtree), #494 (Marquis litHash), #510 (Atlantic House), #527 (Two Peachtree Pointe), #590 (Marquis piers).

## Next steps, in order

These are the downtown-generics priority, assigned by the lead.

1. **30 Allen Plaza** (`samsolomon/30-allen-plaza`, branched from main; no code yet).
   - The Overture id is `f78605b6-ea94-4b02-a0ba-0a89d1b3c84e`. The lead's message wrote "ca94", which is a typo.
   - The record says 22.4 m, but its parts (46–53 m) and the lidar disagree. The lidar puts the main roof at 357.3–362.5 m NAVD88 over 305.4 m grade, about 52–57 m. The west end reaches 369.6 m. The east part is 13 m at 322.2–325.3 m.
   - This looks like a 14-floor glass office at Ivan Allen Jr Boulevard. Commons "Ernst & Young Building, Atlanta, GA" (32532263357, 2019) may be this building. Verify by position and photo before building, and send the features to the lead first.
2. **CenturyLink building** (`9e51304f-8eb8-4e8e-a2cc-197113c121c1`, mapped 24.6 m, near 727,−1250). Not started.
3. **#657 follow-up** (coordinator note): parked cars and painted bays on the 260/270 roof deck, as International Garage has. Stack it on #657 or wait for it to merge.

## Sam's decisions affecting skins today

- Expansion is paused. Generic downtown buildings next to the skinned landmarks come first.
- Glass:
  - Flat glass.
  - A glass-only shade floor of 0.45× lives in the shader (#631). Pick glass against the sunlit rule only: rendered sunlit S ≤ 36 (teal ≤ 40) and V ≥ 40. Shaded readings are no longer needed.
  - Dark punched windows are fine where the photos show them; the value floor is for curtain-wall glass.
  - 1075 glass is option B.
- Rendering and streaming (other agents' areas): far-board, landmark LOD, far shadows, tree far form, and the streaming flag. Don't fight them in skins.

## Coordinator rulings in force

- **Recognition:** features come from photos of the real building (rhythm, base, crown, material, massing). Cite the photo behind every colour or contrast change. A plain box at the right height passes when the building really is plain.
- **Identify before building:** send the lead one or two identifying features with photo links and wait for confirmation.
- **PR images:**
  - Inline in the PR body: day at 11:30 and night at 23:30 with cam strings, one close view, and a four-side sheet. Make the sheet with `node scripts/four-side-sheet.mjs --id … --ground <NAVD88> --top <m> --dist 400 --base http://localhost:<port> --out docs/log/ui/<slug>/<slug>-four-sides.jpg`. Use `localhost`, not 127.0.0.1.
  - Send blob image URLs in the status reply.
- **Checks:**
  - Before every merge: `pnpm build` (tsc), `pnpm test`, and `pnpm test:perf`. Perf runs five entries (low, high, high-night, low-north, low-zoomout).
  - Measure main in the same session and report deltas for calls, triangles and geometry MB.
  - Never raise a ceiling.
- **Footprint:**
  - `skin-footprint.test.ts` must pass: 0 past the allowance (default projection 2.5 m) and 0 detached.
  - Declare a photographed projection with a reason via `group.userData.footprint = { maxProjection }`.
  - Downtown `city.ts` landmarks aren't covered, so run a local harness. Copy the shape of the deleted `_tmp_ccc_footprint.test.ts` in this branch's history (commit `db8c1a22` era) or rewrite it: build the skin from `web/public/data/scene/downtown/vignette.json` and call `footprintReport` and `detachedParts`.
- **Layers:** keep coplanar layers at least 4 cm off their wall, with 4–8 cm preferred. Under 3 cm z-fights into black teeth at 400–600 m.
- **Batching:**
  - Vertex colour only on static parts (library surfaces cost a draw).
  - Lit panes use skin-kit `litHash` or `litFacade`, never a linear modulus or an RNG stream.
  - Change the night look only in `setNight`.
  - Downtown landmarks go in `city.ts` and in the `listed` array next to their `setNight` call.
- **Lidar:** the default source is USGS `GA_Statewide_B2_2018` via `pipeline/scripts/king_memorial_corridor.ept_points((w,s,e,n))`. The `.venv` has `laspy[lazrs]`. Scene z is −north, and the downtown origin is 33.7539, −84.3916. Watch for phantom towers over parking polygons.
- **Shared Studio:**
  - No pattern kills (`pkill -f …`): kill only your own PIDs.
  - Scripts attach only to a Chrome they launched (`scripts/chrome-cdp.mjs`, port 0).
  - Close your own Chrome and vite when done.

## Gotchas

- `cam` bearing is the view heading. Bearing 0 looks north and shows the **south** face; 90 shows the west face; 180 the north; 270 the east. Label four-side panels by the face shown.
- `landmarkShell`'s ring can be wound either way. Re-wind it counter-clockwise before using `(dz, −dx)` as the outward normal, or details end up inside the wall.
- Use the real wall edges for façade details, not the bounding box. Stepped walls left Atlantic House and 712 details floating. `wallRuns()` in `marquis-offices.ts` merges collinear runs.
- Buildings crossing a board seam (Two Peachtree Pointe, 1010 Midtown, EUHM deck) build once per board. Draw every fragment, and put one-off parts like a canopy on one clip only.
- Test timeouts such as `east-rail.test.ts` under heavy Studio load are flaky. Rerun the file alone.
- A detached copy of main (`git worktree` in the scratchpad) on vite :5393 gave before/after frames. Copy `web/public/data` with `cp -RL` (a symlink fails), and run `pnpm install --offline` there.
