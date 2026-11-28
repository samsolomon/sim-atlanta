# Handoff: Gulch tracks investigation (2026-11-27)

Sam asked why tracks around the Congress Center and the stadium go nowhere and stay empty.
Investigation only; no code changed. Findings, segment table and screenshots:
[gulch-tracks-investigation.md](../log/gulch-tracks-investigation.md). Branch
`samsolomon/gulch-tracks`, checked on main `81db0d05e`.

## Next, if Sam wants the fixes (separate PRs, none started)

1. **North-band track** (z −1700 to −1300): add the row to `web/src/city/fixtures/midtown-rail.json`
   through `pipeline/scripts/midtown_rail.py`, standard gauge only. Web rebuild.
2. **NS illustrative freight:** chain Overture `93cbb978` + `2d29ca7a`. `pnpm data` and a redeploy.
3. **Portal mouths** at (−571…−562, z −532 and −307) and (−368,−592). Web rebuild.

Fixes 1 and 2 add geometry: run `pnpm test:perf` and check the Low geometry reserve.

## Notes

- The worktree's `web/public/data` was copied from the `merge-batches` worktree (same commit).
- The Overture rail extract used for the dead-end check came from an archived handoff folder; it
  isn't in the repo.
