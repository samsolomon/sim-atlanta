# Handoff: baked ground, slice 1 (2026-11-26)

> **Parked in release 20 (2026-11-27).** Sam decided the per-visitor download (1,857,008 B Low,
> 3,953,367 B High for Brookwood South) wasn't worth about 0.5 s after ready.
> - Baked ground is now off unless the page asks for `?bake=1` (`bakeOn()` in
>   `terrain/ground-bake.ts`).
> - `vite build` leaves `ground-bake-*.bin.gz` out of `web/dist`.
> - The code, `pnpm data:bake` (still part of `pnpm data`), CI's bake step and the stale-bake
>   test all stay, for a future heavy area.
> - To use it again: drop the `closeBundle` filter in `web/vite.config.ts` and make `bakeOn()`
>   default to true.
> - `?perf&bake=0` below now reads `?perf&bake=1` (on) versus the default (off).

Owner: the Opus perf agent, worktree `studio-far-landmarks`. Coordinator: the Air city-view Claude.
Design: `docs/perf-architecture-plan.md` §4.1a on `samsolomon/perf-architecture` (1aa2cd03).

## Done

Branch `samsolomon/baked-ground`: brookwood-south's ground surface work is baked by `pnpm data:bake`
and replayed in the browser. (Until release 20, `?perf&bake=0` turned it off; it is now off unless `?bake=1`.)

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
- **More rows: not worth it today.** Measured 2026-11-26 in Node at 1×, best of 3, mount with
  bake=0 → with the bake. These are within noise:

  | Row | Low | High | Gzipped size |
  |---|---|---|---|
  | midtown-upper | 242 → 253 ms | 362 → 365 ms | 1.5 / 3.3 MB |
  | brookwood-station | 279 → 280 ms | 297 → 284 ms | 4.4 / 4.5 MB |
  | midtown-south | 211 → 210 ms | 239 → 238 ms | 1.5 / 1.6 MB |

  The coordinator's bar was about 300 ms saved at 6×, roughly 30 ms at 1× going by
  brookwood-south's ratio. brookwood-south's saving comes from its own grading and conformed cut
  edges (`gradeSouthboundSteps` acts there and on r16 only), not from yields in general.
  - **r16** is the other row with grading and `seatLandingEdges`, but its seam work with the
    Station re-cuts both rows at mount. It would need the joined-seam bake (§4.1).
  - **brookwood-station** bakes correctly as it stands: R16's seam re-cut runs live after the
    replay.

## Deploy

Needs `pnpm data` (or `pnpm data:bake` on already-staged data), then a `web/dist` rebuild and a
redeploy. Regenerate the bake whenever ground, yield or tessellation code changes. A stale bake
falls back, but its download is then wasted.
