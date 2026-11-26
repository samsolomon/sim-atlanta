# Handoff: baked ground, slice 1 (2026-11-26)

Owner: the Opus perf agent, worktree `studio-far-landmarks`. Coordinator: the Air city-view Claude.
Design: `docs/perf-architecture-plan.md` §4.1a on `samsolomon/perf-architecture` (1aa2cd03).

## Done

Branch `samsolomon/baked-ground`: brookwood-south's ground surface work is baked by `pnpm data:bake`
and replayed in the browser. `?perf&bake=0` turns it off.

- **Code:**
  - `terrain/ground-bake.ts`: the format, recorder, replay, yield and height prints, gzip loading.
  - `terrain/surface.ts`: `buildSteps` skips or adopts stages. Reads check the replay. `recover`
    and `endBake`.
  - `square-board/sections.ts`: `readBake`, `options.record`, `endBake`.
  - The Node mount helpers are in `terrain/ground-bake.node.ts`. The runner is
    `web/scripts/bake-ground.bake.ts`, run under vitest by `web/vite.bake.config.ts`.
- **Stages.** Each re-cut is stored as a tape (the reads until the next re-cut) or as the surface
  it built, whichever is smaller. On brookwood-south both tiers ship only surfaces: High's tape
  would be 25.6 MB, from the High drape's `trianglesIn` reads.
- **Safety.**
  - Each stage checks `yieldPrint`: flags, rings, and floors sampled at the vertices and the centre.
  - The first build checks `heightsPrint` of the drawn grid.
  - Tape reads check their inputs.
  - Any miss falls back to a live rebuild of the stage the stale surface stood for.
  - Tests fail if the staged bake is stale.
- **Numbers.**
  - **Download:** 1.8 MB (Low) and 3.9 MB (High), gzipped as shipped. The host doesn't compress
    binaries.
  - **6× Low main-thread work for the row:** 2418 → 1912 ms (median −506 ms, −21%).
  - **Fallbacks:** 0 on a clean build.
  - **test:perf:** passed at a59a499c.
- **Grok:**
  - Round 1: 1 Blocking, 1 Significant and 2 Minor. All fixed.
  - Round 2: 1 Blocking (a probe failure re-entering a stale stage). Fixed, with
    `ground-bake-replay.test.ts`, which failed before the fix with infinite recursion.

## Next

- **Slice 2 (downtown)** is worth less than planned. The integrator's boot profile (main f0c5ef55,
  `~/Developer/sim-atlanta-boot-profile-f0c5ef55/PROFILE.md`) puts bakeable ground at about 0.6 s of
  downtown's ~7.2 s before ready at 6×. The integrator is slicing downtown boot (landmark builders,
  batching, transport). Agree the seams with them first: replay needs surface reads and carves in
  the same order in Node and the browser. Downtown would only add a bake fetch and an `endBake` at
  the `createDowntownTerrain` call in `city.ts`, plus `endBake` after the transport carve.
- **Byte cuts:**
  - Baking the first build too saves ~42 ms at 1× for about one more surface of download.
  - Byte-plane shuffling before gzip would likely shrink the files a lot.
  - Packing to Int16 can't stay byte-identical.
- **More rows:** brookwood-station needs care, because R16's seam re-cuts it after its mount (that
  runs live after the replay, which is correct but not baked).

## Deploy

Needs `pnpm data` (or `pnpm data:bake` on already-staged data), then a `web/dist` rebuild and a
redeploy. Regenerate the bake whenever ground, yield or tessellation code changes. A stale bake
falls back, but its download is then wasted.
