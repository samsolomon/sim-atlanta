# Studio ground-contact handoff (Claude Opus → Codex, 2026-11-24)

Previous session: `orca_session_id:a761d59f-dbff-4e39-95d4-51790b17cb47` (read it with `orca agent read`).
Coordinator: `term_09e1b3da` on Sam's MacBook Air. Merge slots: the skyline lead
`orca_session_id:47b1a596-9151-4aee-9df7-2767a8c93529`. Nothing merges without the coordinator relaying Sam's OK
(or, where stated below, the coordinator's own approval).

## In flight, in priority order

### 1. Sam's footpath over the freight line: `samsolomon/footpath-rail` (no PR yet; the coordinator reviews the sheet before merge)
Sam saw a pale path at the Gulch deck corner (site **G**) climb onto the freight track and trains drive through it.
Cause: all 238 downtown bridge runs are inferred (no lidar profile) and each run's ends sat on the bare-earth DEM,
which in the Gulch is the rail floor.
- `terrain/deck-levels.ts` (pure solver) and the wiring in `terrain/transport.ts`. Only **rail clusters** are
  affected: decks connected through bridge-only nodes to a deck over a track. Every other deck on every board is
  bit-identical to main.
- Rules, each a coordinator ruling: rail clearance over the swept width (`RAIL_ENVELOPE_M` 1.8, rail + 8 m);
  free nodes take a level ramped at 8% (`DECK_GRADE`, checked at `DECK_REACH` 6.5%) to real abutments;
  **a road's sidewalk stays welded to its deck end to end** (sidewalk = at least 60% of its length beside a road
  deck; Overture leaves `subclass` empty); a standalone footbridge end on a ground walk keeps the ground; an
  unreachable end at OSM steps stays up and gets a drawn stair; a deck ending on another deck meets its drawn
  tread (`drawnTopAt`, drawn in `throughFirst` order); clustered deck ends are mitred (folded in from road-cracks).
- `terrain/model.ts`: canopy trees within 4 m of a surface track are skipped **after** their seed is drawn
  (filtering the list reshuffled every tree's colour; don't do that).
- `terrain/rail-envelope.test.ts`: board-wide envelope check, with counts pinned (downtown 8 cells in the
  envelope, was 47; 45 cells under 7 m, was 166; 1 path at grade). Lower the pins as fixes land.
- Evidence so far: 89 of 533 runs change, all downtown. Pixel diffs on frozen builds (`?perf&nopass=grade,gtao`):
  Whitehall (#418 cam), North Ave/Connector, 17th, Grant/CSX and all 21 deck-over-road shadow cams are identical
  to main, except `viaduct` (0.1% of pixels, max delta 4/255, shadow-map rounding). The traffic sampler
  (cfb2a7c9) found cars follow the new heights (within 5 mm), crack cells down from 85 to 81, and one new
  cell at (-484.8, 100.7). The mitre added since should close that; ask cfb2a7c9 to re-run.
- `pnpm test`: 1304 passed. One vitest worker RPC timeout under load; rerun.
- **Remaining before the PR**: `pnpm test:perf` both tiers; `pnpm build`; `pnpm review` (Claude → it will be
  Codex reviewing Claude's code; triage per review-charter); the sheet for the coordinator (frames for G, A
  (Russell Plaza), B (trees), Whitehall, North Ave/Connector and the shadow set; the changed-run table with
  old/new max grade and clearance; 20 runs with a new steep step (short links and pinned ends between a raised
  deck and a floor footway, none mid-span); the 32-joint landing list in `docs/art-backlog.md`). The coordinator
  approves after reviewing that sheet and shows Sam G, A and Whitehall.
- Frame tooling is in the old scratchpad (gone with this session): `shots5.mjs` reloads a frozen preview build
  per `cam=` and screenshots PNG with the HUD hidden; build main from `git merge-base HEAD origin/main`.

### 2. #418 deck-sidewalk welds and landings (coordinator ruling, after item 1 lands)
Stack on #418 (`samsolomon/deck-approach-joins`, held for Sam): deck sidewalk strips continue into ground
sidewalks (same width and colour, short taper, no gap); parapets ramp to nothing at landings; Whitehall's
40% climb under 8%; a board-wide landing list with before/after frames and a check flagging deck sidewalk ends
more than 0.5 m from a ground sidewalk or kerb. Include the 32 Gulch landings from item 1.

### 3. Far-slice GC follow-up: `samsolomon/far-slice-pool` (WIP 9ef65c07)
The coordinator and lead want the far-ground background build's longest slice at or under 8 ms at 6x (lead:
5 ms). Diagnosis: GC pauses from number[] and Map survivors. The WIP converts the far build to growing typed
arrays; output is bit-identical in 78 cases. Remaining: per-triangle temporaries, a CDP trace on main versus the
branch at 6x, the slice distribution (p50/p99/max), and a PR. It needs rebasing on main.

### 4. Road cracks: `samsolomon/road-cracks` (WIP 849a9a60, 99bdfec5)
Apron (17th St west) and mitre (10th St). The traffic sampler showed 85 to 77. Agreed next step: in
`city/road-height.ts`, fall back to a deck run sharing the road's end node; then downtown (-778,-38) at 1.35 m
and Connector (1097,241). Ping cfb2a7c9 to re-run after each.

### 5. Streetcar paving (B): after #625 (merged 750228e6)
Paint carriageway paving under `streetcarSweptCorners()` (city/streetcar-shape.ts) in ground-map.ts; cover site
9 (161,-643); then tighten `KERB_PAST` in streetcar-shape.test.ts.

## Open PRs I own
- **#418** `samsolomon/deck-approach-joins`: held for Sam. Merge it first, then retarget #476 to main.
- **#476** `samsolomon/connector-seam-links`: held for Sam, stacked on #418.

## Sam's decisions today (relayed by the coordinator; check details with the coordinator)
Flat glass; far-board; landmark LOD; far shadows; tree far form; the streaming flag; the 0.45 shade floor;
1075 glass B; expansion paused; generic buildings as the priority. In my area: footpath/viaduct fixes merge
after the coordinator reviews the sheet (not merge-on-green), and sidewalks stay welded.

## Notes
- phone-perf's #593 number for main c01ca94d: route:north 547 ms (HouseTile near builds, tree lab's), zoomout
  109 ms; very-far ground no longer in it. Relay it to the coordinator if not done.
- The connector agent's `claude/fifth-street-park` (WIP) adds a second floor patch set
  (`pipeline/prototypes/midtown-connector/landbridge-floors.json`, 209 midtown-central nodes) in
  `surface-build.ts` nodeHeights. `samsolomon/far-slice-pool` rewrites farSurfaceSteps in the same file, so
  rebase carefully; it is a different function. Their successor re-runs the crack sampler on request.
- #663 review (2026-11-24): accepted at 294455e1 (0/1694 high, 0/1691 low at 2 cm; opt-in partial-void drape). Was: the portal lid must drape on the drawn triangles
  (max(drawn, grid) + 0.12 at the rim and past the slot end); accept at 0 audit samples on both tiers.
- Studio Midtown's #663 (rail-gaps) adds freight tunnel portals and OpenSlots downtown. Review it when asked,
  including `audit:ground` and far-form registration.

## Traps
- **Shared perf lock (Studio-wide, 2026-11-24):** run every `test:perf` and long-task or perf sweep through
  `/Users/samsolomon/orca/workspaces/sim-atlanta/.perf-run TICKET pnpm test:perf` (TICKET = PR number or worker
  name), one at a time, and wait on the wrapper. Release tickets come first. Rerun any failure under load
  inside the lock before acting on it.
- Idle work must be sliced (coordinator rule): use core/slice.ts runBudgeted on rAF, never requestIdleCallback for whole-board work, and report the longest slice at 6x.
- The far prefix is also the shadow pass (#514): anything dropped from it must not be the only caster for its spot (freight decks, #566). The far-form test pins every deck sample.
- Capture scripts must launch their own Chrome via `scripts/chrome-cdp.mjs` launchChrome (port 0); never attach by port, never pkill by pattern.
- Pixel-diff City frames only with `?perf&nopass=grade` (animated grain), and on high also `gtao`; otherwise identical runs differ.
- Perf baselines with swapped files: use `git merge-base HEAD origin/main`, never `origin/main`.
- **Camera targets inside a slot aim 26 m high.** City's `targetY` returns 0 where the board has no ground, so the view centres far beyond the point you asked for. Aim just outside the opening. The old `north-east`/`north-west` cams have this problem.
- `__setView` zoom has no `cam=` equivalent; record both.
- Capture helpers live in the session scratchpad (`shots.mjs`, `compose.mjs`); `/tmp/join-shots.mjs` is the original.
- `.venv` now exists in this worktree, so the pipeline tests run.

- origin/main moves fast: before frames or dumps, rebase, or use `git merge-base HEAD origin/main` files. A
  "main" build from origin/main files on an older tree fails to load midtown-upper.
- Downtown deck data is staged (`web/public/data/scene/downtown/vignette.json`, gitignored). Tests that need it
  `skipIf` it is missing.

**Bridge verification update:** The two service conflicts were checked against aerials and
the decks raised over freight. Both tiers have zero sampled cells below 7 m at 9fdc7b86.
See the [bridge evidence sheet](../log/footpath-rail/bridge-review.md) for the revised
profiles, open landings and traffic measurements. The earlier counts above are historical.
