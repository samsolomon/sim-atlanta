# Handoff: studio-amtrak-livery (rolling stock)

Claude agent `orca_session_id:e5348118-da22-4978-9d69-ad882db9e7a9` → Codex, 2026-11-23. The full history is readable with `orca agent read`; this note covers only what is not obvious from it.

## State

- **Open PR [#291](https://github.com/samsolomon/sim-atlanta/pull/291)**, branch `samsolomon/freight-loco-detail`. Freight PR 1 of 4: a detailed GE AC4400CW/CM44AC locomotive in CSX-like and NS-like schemes, with lit lamps. Status:
  - Rebased on `main` (2026-11-23 evening) and self-reviewed. Waiting for the coordinator's "merge when green".
  - `contract.test.ts` failed locally only because the borrowed pipeline data lacks `ga/routes.json`.
  - Run `pnpm data` (or borrow complete data) and re-run `pnpm test` before merging.
- **Parked WIP branch `samsolomon/freight-lookalikes`** (pushed, WIP commit `1b3b574d`, not a PR). It has rough code for six car types (blue boxcar, tank, covered hopper, gondola, autorack, double-stack) and lab entries `es44acNs` and `freightCars`. It predates #291 and conflicts with it.
  - Reuse `carBody()` from it for PR 3. Don't merge the branch.
- **Merged today:**
  - Charger #219, Crescent cars #230, AIRO lab #234.
  - S70 streetcar: #260 (first model), #272 and #277 (repaints), and #285, which Sam approved as final.
- **Dev servers:** none running; the vite server on :5641 is stopped. One Orca lab tab is open (page `8eb3d459-…`); close it if it's still there.

## Sam's decisions (all 2026-11-23)

- **Crescent:** Phase VII Charger by default, with Phase VI as a lab variant. Amfleet II is a mix of Phase VI and VII. Viewliner II wears Phase IIIB. The 0.41 m roof step is real and stays. AIRO is lab-only.
- **Streetcar:**
  - Done as of #285: deep indigo (input `#5a5694`), and three broad straight stripes per cab section (lime, cyan, violet), with the centre section plain.
  - Don't reopen it without Sam.
- **MARTA:** keep the CQ400 for every train. **Do not** model the CQ310/311/312 or date-gate City. The car row on the card stays `illustrative` (confirmed at `card.ts:60` and `:135`).
- **Freight scope**, in small PRs, each with dated photos, lab day and night views, and triangle counts:
  1. Detail the existing locomotive (#291).
  2. New locomotives: an NS-like ES44AC/AC44C6M (partly covered by #291's NS scheme), an SD70ACe or SD70M-2, a CSX-like ES44AH or AC44CW, and a GP38-2 switcher.
  3. Car types: double-stack well cars with varied containers, covered hoppers, open hoppers or gondolas (coal and scrap), black DOT-117 tank cars, autoracks, centerbeam/lumber cars, and boxcars in several colours. Each needs weathering and visible trucks, and should be instanced.
  4. City consists (an intermodal, a manifest and a unit train), with the freight card updated and kept `illustrative`.
  - Then road-vehicle variety: City uses only 3 of the 8 types in `vignette/vehicles.ts`. Pickups, vans and tractor-trailers already exist in code.
- **General:** no logos, wordmarks or numbers. Use Commons photos for references. Sam's screenshots are reference only and must not be committed.

## Next steps

1. Merge #291 once the coordinator approves and tests pass.
2. Freight PR 2: new locomotives.
3. Freight PR 3: car types.
4. Freight PR 4: City consists.
   - Also fix #291's plausible finding: `cityFreightCard` picks the scheme by a regex on the line name. Carry `userData.livery` instead.
5. Road-vehicle variety.

## Promises to other agents

- **`orca_session_id:84ff6fd9-a68e-4888-aa2a-4477f88e5ff0`** (studio-midtown-marta, places the streetcar in City): keep the `s70Sections()` / `S70_LAYOUT` / `s70Material` interface in `web/src/vignette/streetcar.ts` stable. Its kinematics are in `docs/atlanta-streetcar.md`. I told them the legacy-car work was cancelled and that `trains.ts` and `midtown-marta-rail.ts` won't change.
- **`orca_session_id:d577649d-8640-473a-8c9b-461abf2b616a`** (studio-ui-a2c): new lab fieldsets go in `web/src/models/lab-markup.ts`, not `models.html`. `window.__lab.render()` and `resize()` must stay; the captures use them.

## Repo rules and tooling that bit me

- **Colour grade.** It crushes dark blues and greys: input `#403d78` renders as near-black navy. Calibrate by sampling a fixed lit patch in a rendered frame, not by guessing.
  - CSX-like body: input `#76889a`.
  - S70 body: input `#5a5694`, which renders as `#28217b`.
- **Captures.** Full-size canvas captures come from `scratchpad/tools/cap.mjs`: `orca eval` with `__lab.camera`, then `__lab.render()`, then `toDataURL`. Composites come from `compose.py` (Pillow venv in the scratchpad). The scratchpad may be cleared; both are small to rewrite.
- **Merge conflicts.** `origin/main` moves constantly, and nearly every PR conflicts in `docs/build-log.md` (both sides append). Resolve by keeping both entries.
  - **Never** `git reset --soft origin/main` to squash after `main` has moved. It stages a revert of other agents' work. Squash onto `git merge-base`.
- **Pipeline data.** This worktree has no pipeline data (`web/public/data` holds only `ga/.gitkeep`). I borrowed `studio-amtrak-stock`'s data with a temporary symlink and always restored it. Don't commit the symlink.
- **Rust tests.** `cargo` isn't on PATH. Use `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"`.
- **Cross-review.** `pnpm review` (Codex) wasn't available to me, so I self-reviewed with the `code-review` skill. As Codex you can run `pnpm review` and have Claude review your work.
- **Merge notices.** Every one leads with GitHub blob links to the captioned photo/before/after composites, money shot first.

## Codex continuation — 2026-11-23

- #291 merged at `8fb88467`; Sam approved the updated freight train.
- #342 merged at `a1bafa0e`: Brookwood regression now uses a recorded timetable
  fixture. Fresh Amtrak data starts November 22, so pre-November-22 review cameras
  no longer show the Crescent after the next `pnpm data`. Use covered dates for
  future release checks; never extend feed validity to preserve old screenshots.
- Freight PR 2 is on `samsolomon/freight-locomotive-variety`: ES44AC/ES44AH,
  SD70ACe and GP38-2 lab studies. References/cameras: `docs/freight-variety.md`.
  City still uses the approved CM44AC-family units pending PR 4.
