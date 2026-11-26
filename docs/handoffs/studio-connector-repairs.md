# Handoff: Connector bridges lead, 2026-11-26

**Owner:** the Connector bridges lead (Claude).

## Done and merged

| Item | Merge | What it does |
|---|---|---|
| A, B1, B2 (Connector repairs) | #689, #690, #691 | Sweet Auburn viaduct, Jackson Street bridge, stacked ramps on lidar profiles |
| D (Capitol Gateway lid) | #692 → 6353c672 | Streets and walks drawn on the lid; lid ground spikes removed. Gate re-baselined on checker daaa6bbd (`study/crossing-check-calibration`) |
| Ellis fix (release 18 ellis-high) | #697 → 6c5aa4e6 | Unsurveyed deck joints at a board edge take the joining deck's height (Andrew Young +5.9 m, Ellis +9.4 m); a sliced ramp's unspanned part stays a board road |

The evidence is in `docs/log/ui/connector-repairs/` (`d-lid/`, `ellis-fix/`) and the build log.

## In flight

- **Capitol tunnel:** `samsolomon/capitol-tunnel`. The covered Connector under Capitol Gateway is drawn as a tunnel: 10 mouths, each with a headwall, a 30 m tube and lamps. Covered slots cut the board only up to the ceiling, cars stay in view 22 m in, and the lid road is flagged as a tunnel. Unit tests pass. Renders, day and night stills, Grok, and a `test:perf` check are owed. It adds two meshes on the shared Lambert programs; High night has 4 calls of headroom.
- **Road kit part 1:** `samsolomon/road-kit-1-overlaps` (local WIP commits, not pushed).
  - Done so far:
    - `pnpm lint:roads` and a ratchet budget, with no baseline yet.
    - The one-surface-owner pass in `connector-corridor.ts`. Painted overlap is 5,326 → 138 m², and Sam's A5 is at 2 m².
    - Covered option lanes: main's option-lane routing is kept.
    - Generated gores.
  - Owed:
    - the browser lint baseline (both tiers, two identical passes) and the after counts;
    - stills of A5, J3, K1, S2, S3, E1 and E2, day and night, both tiers (`cap3.mjs` handles the J3 eye camera);
    - `test:perf`, plus the `road-kit` line proposed for `perf-budget.json`.

## Queued (Sam, 2026-11-26)

- Washington Street bridge (E1), right after road-kit part 3. Open both Street View links first and record the railing form.
- Road kit parts 2–6, in the plan's order.
- Ellis Street's z = −520 seam: 2.2 m above Sweet Auburn's stub, with a small plan gap. That is part 3 (one profile per structure).

## Traps

- Worktrees: symlinking `web/public/data` lands it inside the tracked `data/ga` folder, so vite serves HTML for the data and the City shows "Atlanta couldn't load". Rsync the data in instead.
- Several dev servers sharing one `node_modules` clobber vite's dependency cache. Run one at a time, with `--force`.
- `orca orchestration reply --id` must be the other agent's message id. Replying to your own id loops back to you.
