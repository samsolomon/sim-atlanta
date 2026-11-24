# Studio Midtown MARTA handoff (Claude Opus → Codex)

## Current handoff · 2026-11-24

The downtown rail maintainer owns integration of the freight portals, Five Points cut faces and CQ400 seating. Ground-contact owns the separate Capitol road/ramp investigation. The rail branches do not edit the Capitol ramp or its deck grade.

1. **#663 freight portals.** Geometry commit `bdb26b1d7cfd2f4ac556e164aaeecdf221737262` on `samsolomon/rail-gaps` grades B’s approach from the ballast shoulders to the original bank. A has visual sign-off. Next, inspect B at `cam=10,-45,180,40,90` by day, at night and with illustrative freight, and repeat the full-board ground audit at both tiers. The capture and audit job is queued under ticket 663. Only #670 has the current timing window.
   - Earlier geometry at `b8ffce92bc22a08ec891ebe28e03336f41893ea4` passed ground-contact review with zero penetrations over 2 cm in 646 samples per tier. The [earlier daylight comparison](../log/ui/rail-portals/b-recessed.jpg) and [night and freight frames](../log/ui/rail-portals/night-freight.jpg) predate the graded approach.
   - The new geometry passed `git diff --check`. New screenshots, ground-contact results, coordinator sign-off, merge slot, final build, full tests, perf and cross-review are pending.
2. **Five Points cut faces.** Draft `0d30281c0f0f4d3bf44e4ce16dd979697ed16553` on `samsolomon/five-points-cut-faces`. After #663 lands, rebase and check the joints between the three track strips at (171,118) and (248,192). Day/night MARTA and freight passage frames, tests and review are pending.
3. **CQ400 seating.** Branch `samsolomon/cq400-bogies` at `a7a95322` follows the cut faces. The earlier probe measured worst swing falling from 0.64 m to 0.46 m. Rebase and verify the frames before opening the PR. [Earlier four-site comparison](https://github.com/samsolomon/sim-atlanta/blob/772bb993/docs/log/passenger-swing/bogies/cq400-before-after.jpg?raw=true)
4. **#427 landuse paving** remains held for Sam’s choice of paving scope. Preserve the branch.

## Sam's decisions and coordinator rulings that touch this area

Today's decisions as the coordinator relayed them in the handoff call; ask the coordinator for details, since they're not all written up on main yet:
- flat glass
- far-board
- landmark LOD
- far shadows
- tree far form
- streaming flag
- 0.45 shade floor
- 1075 glass B
- expansion paused
- generic buildings as the priority

Coordinator rulings in force:
- **Merging:** nothing merges without the coordinator relaying Sam's OK, except fixes the coordinator approves as fixes (#663, PR 2). Run `pnpm build`, `pnpm test` and `pnpm test:perf` on the final rebased head right before merging.
- **Screenshots:** every PR embeds captioned before/after images inline, day and night, with cam strings, and the status reply lists direct blob URLs.
- **Streetcar kerb:** the overshoot is a ceiling ratchet (`KERB_PAST` in `streetcar-shape.test.ts`), not kerb to kerb. Ground-contact will paint carriageway under `streetcarSweptCorners()` and lower it.
- **Weather:** "weather reported" requires an observation at most 60 minutes old (`WEATHER_MAX_AGE_MS`).
- **Shared Studio:**
  - Kill only process IDs you started; never by pattern.
  - Drive only a Chrome you launched, with its own `--user-data-dir` and `--remote-debugging-port=0`.
  - Idle-time work is sliced to a few milliseconds, and PRs report the longest task at 6× throttle.
  - A new downtown landmark in `city.ts` must also go in the `listed` array (`landmark-batch-list.test.ts`).
  - Low tier must add no shader programs (81/86 now).

## Gotchas

- `pnpm test` needs Rust on PATH (`PATH="$(brew --prefix rustup)/bin:$PATH"`) and a `.venv`. Symlink `../studio-midtown-skyline/.venv` and remove it afterwards.
- On a loaded Studio, web tests hit vitest RPC timeouts. `cd web && pnpm exec vitest run --pool=forks --maxWorkers=3` gives a clean run; run the Rust, pipeline (`node scripts/test-pipeline.mjs`) and worker suites separately.
- Swapping a source file to shoot "before" frames needs about 85 s for Vite to rebuild City. The first capture after a swap is often blank (about 123 KB).
- To freeze a freight train in frame: `await import('/src/core/clock.ts')`, then `clock.rebase(); clock.speed = 0`, then reload with `?t=<that ISO>&speed=0`.
- zsh doesn't word-split `$var` inside loops; pass separate arguments to shell functions.
- The raw Overture rail is only in other worktrees (`../studio-amtrak-livery/data/raw/overture_downtown_rail.geojson`). Run `pnpm data` to get your own.
