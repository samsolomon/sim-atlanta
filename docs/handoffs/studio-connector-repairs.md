# Handoff: Connector bridges lead (studio-connector-repairs)

Updated 2026-11-26 17:45 at Sam's stopping point. **Owner:** the Connector bridges lead (Claude). Worktree: `studio-connector-repairs`.

## Done and merged

| Item | PR → main | What it does |
|---|---|---|
| A, B1, B2 (Connector repairs) | #689, #690, #691 | Sweet Auburn viaduct, Jackson Street bridge, stacked ramps on lidar profiles |
| D (Capitol Gateway lid) | #692 → 6353c672 | Streets and walks drawn on the lid; lid spikes removed. Gate re-baselined on checker daaa6bbd (`study/crossing-check-calibration`) |
| Ellis fix (release 18 ellis-high) | #697 → 6c5aa4e6 | An unsurveyed deck joint at a board edge takes the joining deck's height; a sliced ramp's unspanned part stays a board road |
| Capitol tunnel | #701 → 675cc601 | Ten tunnel mouths cut into the bank; lit mouths; cars 22 m into each tube; the lid road flagged as a tunnel |

Evidence is in `docs/log/ui/connector-repairs/` (`d-lid/`, `ellis-fix/`, `capitol-tunnel/`) and the build log.

## In progress: road kit part 1 (draft PR, branch `samsolomon/road-kit-1-overlaps`)

- **Commits**, in order:
  1. The plan (`docs/road-kit.md`) and the covered-Connector write-up.
  2. `pnpm lint:roads` (`web/src/terrain/road-lint.ts`, `scripts/road-lint.mjs`).
  3. The baseline budget (`web/src/core/road-kit-budget.json`).
  4. The fix: one surface owner in `connector-corridor.ts`, covered option lanes, gores in `connector-paint.ts`, shared-edge lines on decks in `transport.ts`.
  5. The tunnel nits, per-board lint sites, and a WIP shoulder rule.
- **Lint, High** (13 boards; Low matches), baseline → fix before the WIP shoulder rule:
  - at-grade paint overlap 4,498 → 103 m²;
  - gores missing 71 → 20;
  - stacked road tread 3,666 → 2,627 m².
  - **But open elevated edge is +299 m**, almost all at Sweet Auburn, so the ratchet would fail. The likely cause: the parapet probe 0.28 m inside a shoulderless shared edge hits the deck's own lane.
- **Head commit** (`WIP: drop the deck shoulder on a shared edge only beside a sibling deck`): drops the shoulder only where the sibling is itself a deck there. It compiles but has **no tests and no lint run yet**; the Studio was on hold.
- **Exact next step:**
  1. `cd web && npx vitest run src/terrain` (connector-owner, connector-paint, road-lint), plus `src/city/connector-traffic.test.ts` and `src/city/joined-connector.test.ts`.
  2. `node scripts/road-lint.mjs --json <out>`. Check that `openM` is at or under the budget in `road-kit-budget.json`, and see how much of the stacked-tread drop survives.
  3. If both hold, squash the last three commits into the fix commit.
  4. `node scripts/road-lint.mjs --write` to lower the ratchet, and commit that.
  5. Run the stills script (Sam's sites A5, J3, K1, S2, S3, E1, E2 plus a gore; the scratch script is described in the PR), `test:perf` in the integrator's window, then self-run Grok and mark the PR ready.
- **Remaining stacked tread is not Connector ribbons.** It's I-20's own merging decks on the south band at (−53, 960), (−154, 884) and (−448, 999), plus Brookwood. They need the owner rule applied to plain deck runs that share an end node. That's the next ratchet step.

## Queued (Sam, 2026-11-26)

1. Road kit part 2, parapets. It must come in at **0 net draw calls**: High night is at 629/630, and Sam's reserves are 40 night calls and 10 High programs. Show the cost in the PR.
2. Parts 3–6, in the plan's order.
3. Washington Street bridge (E1), right after part 3.
4. Ellis Street's z = −520 seam (2.2 m above Sweet Auburn's stub, with a plan gap): part 3, one profile per structure.

## Traps

- **Worktree data:** symlinking `web/public/data` lands it inside the tracked `data/ga`, so vite serves HTML for the data and the City shows "Atlanta couldn't load". Rsync the data in instead.
- **Dev servers:** several sharing one `node_modules` clobber vite's dependency cache. Run one at a time, with `--force`.
- **opencode (Grok):** it can only read inside the worktree, so put diffs in an untracked `.review/` folder. Tell it not to run commands, or it spends the run trying vite.
- **Grid regrades** (`capitolTunnelGround`): tests that join downtown to the south band from the raw grid must regrade downtown too, or the seam check fails.
- **orca replies:** `reply --id` must be the other agent's message id.
