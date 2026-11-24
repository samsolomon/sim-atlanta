# Studio skins 7 handoff

The owner was the Claude Opus session `cda9a6e2-74ea-4cbb-88a6-1fa0819a44c8` in the `studio-skins-7` worktree. Read its history with `orca agent read`. It reported to the Air coordinator (`TERM_09E1B3DA…`, "Coordinator welcome" thread) and the skyline lead (`47b1a596`). The lead has handed off to Codex: the successor's notes are `docs/handoffs/studio-midtown-skyline.md` on `samsolomon/studio-building-skins`, and that successor builds the merge trains. Never merge, or push to a PR in a train, unless the lead asks.

## Merged

| Building | PRs |
|---|---|
| One Coca-Cola Plaza | #402, litHash windows #491 |
| Emmi Midtown | #414 |
| EUHM staff deck | #431, fixture strips and fin coping #557 |
| 100 and 400 Colony Square | #438, #462, rework #554 (palette in `docs/research/colony-square.md`) |
| Winship Cancer Institute | #487, #564 |
| Hard Rock Cafe block | #508 |
| The Landmark | #515 |
| Coca-Cola USA (Enclos aerial rework) | #530 |

## Open PRs I own

| PR | What | Status |
|---|---|---|
| #539 | Renaissance Atlanta Midtown (detachment fix: walls on a bounding slab) | Approved, train 8c |
| #627 | Emmi balcony slabs seated on the wall (detached 29 → 0) | Approved, train 8c |
| #578 | Centergy One | Approved, queued |
| #587 | Centergy glass wing | Approved, queued |
| #598 | Hampton Inn & Suites Midtown | Approved, queued |
| #632 | T Deck (GSU, 29 Peachtree Center Ave) | Approved for **8d**, head `5910174b` (3 cm layer fix plus a rebase on main) |
| #659 | Fairlie–Poplar block: Haas-Howell, Standard, Aderhold, and the Theatrical Outfit (a 40.4 m phantom, 9.2 m in the lidar) | Approved for **8d**, head `8006119e` (one shared shell, darker Aderhold roof) |

Branch `samsolomon/palette-hold-coke-euhm` @ `a23eed89` has no PR and is **held for Sam**. It changes One Coca-Cola glass to `#6a7378` and the EUHM stair to `#6d8090`.

Review sheets are hosted on the orphan branch `samsolomon/skins7-review-sheets` (`sheets/`).

## Sam's decisions affecting skins

The coordinator named these in the handoff message of 2026-11-24. Check the coordinator's thread and the lead's handoff for the full wording.
- flat glass;
- far-board;
- landmark LOD;
- far shadows;
- tree far form;
- the streaming flag (`?stream=1` must not change the look);
- the **0.45 shade floor** (#631): glass is picked against the sunlit rule only, and shade readings are no longer reported;
- 1075 glass B;
- **expansion paused**;
- **generic buildings are the priority**, downtown named generics first.

## Coordinator rulings in force

- **Each PR has:**
  - day (11:30) and night (23:30) images, plus one close view, inline with their cams;
  - a four-side sheet from `node scripts/four-side-sheet.mjs --id … --ground … --top … --dist 400 --base http://localhost:<port>`. Use `localhost`, not `127.0.0.1`: the Studio dev server binds IPv6.
- **Recognition at 400–600 m:** not mistakable for a generic box, using photo-backed features only. A plain building drawn plain passes; cite the photos.
- **Glass:** rendered sunlit S ≤ 36 (teal 40) and V ≥ 40.
- **Footprint and detachment:** `detachedParts` = 0. Downtown skins carry their own test, like `t-deck.test.ts` and `fairlie-poplar.test.ts`.
- **Layers:** no coplanar layer within 3 cm of the one beneath. Use 4–8 cm. skins-6 is adding a lint for this.
- **Batching:**
  - vertex colours only, no per-skin material, no onBeforeCompile;
  - night changes only in `setNight`;
  - don't edit `landmark-batch.ts`, `finish()` or the city.ts batch call;
  - downtown mounts go in city.ts and in the `listed` array;
  - several buildings can share one shell, which saves lamp draws at night (see `createFairliePoplar`).
- **Night:** offices mostly dark, residential and hotels lit, using `litHash` or `litFacade`, never a linear modulus.
- **Before a merge:** run `pnpm build`, `pnpm test`, and `pnpm test:perf` against a same-session merge-base run. Report draws and geometry MB for low, high and high-night.
- **Shared Studio:** no pattern kills; kill only PIDs you started. Drive only a Chrome you launched (`scripts/chrome-cdp.mjs` `launchChrome`, port 0). Delete `pipeline/scripts/__pycache__` before rebasing.

## Next steps, in order

1. **Medical Arts Building parking garage**, Overture `770fb440-8914-43bb-8223-38494fec539b`, at City (485, −1259).
   - It is mapped at 16.4 m. The lidar gives p50 7.6 m, p95 11.1 m and max 16.6 m, so check for a split-level or ramped deck.
   - It has three Overture parts, and its shared edge abuts another agent's Medical Arts skin, so check that edge.
2. **Sunlit glass check on #659.** The sash glass `#8a969c` and Aderhold's `#808d95` were picked by analogy with Hard Rock. Every sample I took came from a shaded face, so the sunlit S/V reading is still owed. Sample a sunlit face before the 8d train builds, and adjust the colour if needed.
3. **T Deck follow-up** (coordinator note): darken the light-well walls to a shaded concrete. Do it after 8d lands, not on #632.
4. **Then the next downtown named generics** from the lead's list.

## Gotchas

- **City coordinates:** +z is south. Compass labels in face comments go wrong easily, so check each face against the projected ring (see the #659 review).
- **The lidar scripts:**
  - `/tmp/sky-lidar-h.py <id>` gives p50 and p95 per building;
  - grid scripts use `.venv/bin/python -I` with `king_memorial_corridor.ept_points`;
  - the downtown origin is 33.7539, −84.3916, and scene y is NAVD88 inside a shell.
- **Phantom towers:** look for them next to any target. A generic box at the wrong height can hide the skin (the Theatrical Outfit, 40.4 m mapped and 9.2 m in the lidar).
- **Shade colours:** in shade the colour grade crushes brick to V≈18 and pushes glass toward navy. Sample sunlit faces only.
- **`test:perf` noise:** LOW-NORTH `longestTaskMs` swings 285–712 ms run to run on the shared Studio. Re-run before treating it as a regression.
- **A/B toggles:** use a reversible sed with a marker, never `git checkout` of a file.
- **Street View:** Google Maps search for the address, then click the "Street View" button (`orca snapshot` refs). Change heading and pitch in the place URL. Raw `api=1` pano links often snap to indoor photospheres.
