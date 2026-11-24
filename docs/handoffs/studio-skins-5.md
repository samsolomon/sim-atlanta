# Studio skins 5 handoff

The owner was the Claude Opus session in the `studio-skins-5` worktree (Orca session `orca_session_id:95400b56-5fed-4e10-b40d-a937408a182e`). Read its history with `orca agent read`.

It reports to two people:

| Who | Session | Thread to reply on |
|---|---|---|
| The skyline lead, who runs the merge trains | `orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529` | newest message in the "Geometry rule: report MB delta" chain, e.g. `msg_91093283d09a` |
| The Air coordinator, who approves new skins | `term_09e1b3da` on Sam's MacBook Air | "Coordinator welcome: reply here", newest `msg_714f28c2ee82` |

Never merge, and never push to a PR in a train, unless the lead asks; the lead runs the trains. The lead did ask for the coplanar fixes below, which are pushed.

## Open PRs (all mine, all approved)

| PR | Building | Head | Status |
|---|---|---|---|
| #544 | Piedmont House (strengthened white grid) | `27ba31c1` | Approved, train 8c |
| #560 | Ansley Above the Park | `25817ec2` | Approved, train 8 |
| #602 | Loews rework (residence band, sawtooth bays) | `ffdbcfdb` | Approved, train 8b |
| #626 | City Heights | `269e72a9` | Approved, train 8d |
| #635 | Bethel Towers and the Auburn podium; adds sweet-auburn to `skin-footprint.test.ts` | `1f3c0a02` | Approved, train 8d |
| #661 | The Commons at Imperial Hotel (downtown, `city.ts`) | `efceb4df` | Approved, train 8d |

- **Heads for the trains:** the lead took the five heads from #635 to #560 above after my coplanar sweep. #661's head is as approved.
- **Merged earlier:** #423 The Atlantic, #434 1010 Midtown, #455 and #466 Loews, #483 MAA Midtown, #507 and #579 Norfolk Southern, #529 Vireo, #584 Atlantic detached tidy-up.

## In progress: the downtown footprint audit (branch `samsolomon/downtown-footprint-audit`)

The lead asked for this on 2026-11-24 (`msg_91093283d09a`). About 15 downtown skins are landing tonight, and downtown is outside the automated audit, so for now each relies on asserts in its own unit test.

The goal is for `web/src/city/skin-footprint.test.ts` to cover the downtown `city.ts` landmarks with the footprint, detachment and coplanar checks, ratcheting any existing failures.

Done (WIP commit on the branch):

- `web/src/city/fixtures/downtown-buildings.json` is a 354 KB snapshot of all 828 staged downtown buildings. Regenerate it with `node scripts/downtown-buildings-fixture.mjs` after `pnpm data`.
- The downtown ground is already committed at `pipeline/prototypes/downtown-ground/`. It has the same sha256 as the staged `web/public/data/scene/downtown/ground.i16`.

Planned design (also sent to skins-6, `msg_cf26cb8bd14a`; their reply was pending):

1. **Read the mount chain out of `city.ts`.** The test reads the `build('terrain', ...)` block, from `westin = createWestin(` to `const city = { ...vd`. It matches each `x = createX(prev, ground|groundAt|(x, z) => …)` and the `const stack = createCoreyTower(...)` form, in order. It maps each creator to its module through the `import { createX } from './file'` lines, and loads modules with `import.meta.glob('./*.ts')`.
2. **Run each creator in order** over the fixture's remaining buildings, as `city.ts` does:
   - `ground` maps to the `GroundGrid`;
   - `groundAt` maps to `(x, z) => grid.sample(x, z) - sceneZeroNavd88M`, and so do the capitol's inline lambda and any other lambda.
   - Floyd is outside that block (it needs the station passage), so skip it.
3. **Audit each built landmark.** Its replaced ids are the buildings it removed. Run it through the same per-landmark checks as the boards: `footprintReport` with `bottom` = min grade − sceneZero − 8 plus `userData.footprint`, `detachedParts`, and skins-6's coplanar lint.
4. **Fail on mounted creators that build nothing.** With the full board in the fixture, that means a broken skin, unless it is listed.
5. **Share one function.** Expose a single per-landmark `audit(object, rings, limits)`, called by both the board traverse and the downtown chain, so skins-6 adds the lint in one place. Coordinate with skins-6 (`orca_session_id:f7b4e433-6da3-4bf8-8413-4d95febd2d10`) on who lands first.
6. **Ratchet existing downtown failures** into `KNOWN` / `KNOWN_DETACHED` with comments, as the board entries have.

## Next, in order

1. Finish the downtown audit above, then do the PR, review and perf (it is test-only, so perf is n/a).
2. **Emory Faculty Office Building:** Overture `806a6dd9-0ea5-47e1-a6ab-99d9c062da89`, mapped 25.7 m, at about (886, 85).
   - Identify the building, check the lidar, consult day and night photos, and confirm its board.
   - The mapped point is south of the downtown origin. Check whether it's on downtown (`city.ts` plus the `listed` array) or a square board (`terrain/model.ts` dispatch).
3. Then the lead's downtown list (generics around the Westin, Bank of America and Peachtree Center blocks). Expansion is paused.

## Sam's and the coordinator's decisions that bind this area

- **Generic buildings first:** expansion is paused. The priority is downtown named generics next to skinned landmarks.
- **Glass:** #631 added a glass-only shade floor in the shader at 0.45× its own colour, which fades at dusk. Pick glass against the sunlit rule only: rendered sunlit S ≤ 36 (teal 40) and V ≥ 40. Don't compensate shade in base colours, and don't report advisory shade readings (docs/glass-palette.md).
- **Coplanar layers:** no layer within 3 cm of its wall or of another layer; use 4–8 cm steps. At 400–600 m, 1–1.5 cm gaps z-fight into black teeth. skins-6 is adding the shared lint, built on the method in `studio-skins-5-tools/coplanar-lint.test.ts.txt`:
  - measure point-to-plane, not plane-offset differences;
  - require in-plane overlap with a 5 cm margin;
  - use a 5 mm floor;
  - skip the two halves of one quad.
- **Four-side sheets:** use `node scripts/four-side-sheet.mjs --id <id> --ground <lidar NAVD88> --top <m> --dist 400 --base http://<host>:<port> --out docs/log/ui/<slug>/<slug>-four-sides.jpg`. Panels are labelled by the face shown (bearing 0 = south face). On the Studio, `pnpm dev` binds IPv6, so use `localhost`; my own vite was bound to 127.0.0.1.
- **Footprint and detachment ratchets** (`KNOWN`, `KNOWN_DETACHED`): any new loose part fails. A larger projection needs a photo-backed `group.userData.footprint.maxProjection`.
- **Recognition from photos:** passes come from the real building's features, and every colour change cites a photo. No invented colour and no logos; name signs are not drawn.
- **Night:** follows building type (housing is about a third lit, as illustrative occupancy). Change the night look only via `setNight`/`finish`, and light panes with skin-kit `litHash`.
- **Builds:** flat vertex colours, `landmarkShell` and `StaticLandmarkMaterial`, with no new shader programs; that is why I declined the review nits asking for library surfaces.
- **Per-PR evidence:** day 11:30 and night 23:30 on 2026-11-20, a close view and the four-side sheet, inline with cam strings. Also `pnpm test`, `pnpm build`, and `pnpm test:perf` with draws and geometry MB deltas against the merge-base file (low, high, high-night), plus the code-review skill.
- **Ceilings:** low 435 calls, high 475, high-night 630, with night headroom thin across trains. Two sites that make one building should share one shell and lamps mesh, as Bethel does.

**Also decided today, not in my area:** flat glass, far-board, landmark LOD, far shadows, tree far form, the streaming flag (`?stream=1` must not change the look), and 1075 glass B. See the lead and coordinator threads; I didn't implement these.

## Gotchas

- **City z grows to the south.** The face with normal z < 0 is north. I mislabelled the Imperial's sides once, and MAA and Vireo before that.
- **Copied capture scripts:** check every BEFORE/AFTER composite for the right area label and building. A copied script once composed Bethel's pairs from the City Heights folder.
- **`tidy()`-style simplification:** faces built from simplified plans drift centimetres off walls built from the exact ring. Lay layers on the same plan as the wall (the Loews fix in #602).
- **Edge filters:** `faces()` filters edges of 1.5 m or less, so bay sides of about 1 m vanish. Build short edges explicitly (the Imperial fix in #661).
- **Base swaps for perf:** measure the base by swapping in the merge-base version of the one dispatch file: `terrain/model.ts` for boards, `city/city.ts` for downtown.
- **Shared Studio:** never kill by pattern. Kill only PIDs you started, and drive only a Chrome you launched (`--remote-debugging-port=0`, its own profile).
- **Environment:** `.venv` in this worktree was a symlink to `../studio-skins-1/.venv` (removed at handoff). Lidar helpers are run with `.venv/bin/python -I`. Cargo comes from brew rustup: `export PATH="$(brew --prefix rustup)/bin:$PATH"`.
- **Tools:** copies of my scratchpad tools are in `docs/handoffs/studio-skins-5-tools/` (`.txt` so nothing compiles them):
  - `shot.mjs`: own headless Chrome, one capture, `--eval` for `__setView`;
  - `capture-pairs.sh`: after/before day and night, low tier and close, then composites via `compose.html`;
  - `verify2.sh`: build, test, then perf for the candidate and the base;
  - the coplanar lint.

  They contain my scratchpad paths, so adjust before use.
