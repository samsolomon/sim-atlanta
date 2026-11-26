# City performance architecture plan

> **Superseded for direction (2026-11-26).** [`scaling-plan.md`](scaling-plan.md) (v2) is the plan of
> record. This file stays as the evidence. Its §7 lists which sections here still stand.

Draft for Sam, 2026-11-26. This is a plan only: nothing here changes product code. It covers what
City costs today, measured, and what it would cost at the full I-285-plus-airport extent under
today's architecture and under the proposed one. It then sets out the five pillars, the program
consolidation, the order of shippable increments, and Sam's decisions (§7).

Measured on `main` 1e9e7a7b (north expansion merged). The integrator re-ran `test:perf` on
1550d9d0 (#685) at the same counts: Low 366 calls, 85 programs, 148.9 MB geometry, 413 MB heap;
High 435 / 100 / 270.3 MB / 536 MB; High night 622 calls / 100 programs; `low-north` longest task
199 ms. The raw results and probe scripts are in
[`docs/log/perf-architecture/`](log/perf-architecture/) (provenance in §1).

**Release 17 (`main` 66b8a295).** The integrator's `test:perf` ran 2026-11-26 04:39–04:47 at a load
average of 8.1 falling to 5.9, with 0 retries. Main now builds areas in slices by default (`?slice=0`
gives one task per area).

| Tier | Calls | Programs | Triangles | Geometry MB | Heap MB | Texture MB | Ready |
|---|---:|---:|---:|---:|---:|---:|---:|
| Low | 368 | 85 | 1,795,179 | 149.3 | 413 | 108.7 | 1.5 s |
| High | 436 | 100 | 6,456,744 | 269.5 | 537 | 772 | 1.8 s |
| High night | 624 | 100 | — | — | — | — | — |

- **Longest tasks:** `low-north` 177 ms, `low-zoomout` 0 ms, `low-r16` 335 ms, `high-r16` 86 ms.
  Slicing took R16's mount from 4.1 s (27.7 s at 6×) to under 0.4 s per task.
- **With R16 mounted:** Low geometry 241.5 MB, heap 510 MB, 88 programs. High geometry 372.9 MB,
  heap 666 MB, 105 programs. The memory and program findings in §2 still hold.
- Increment 1 has landed in part. Slicing covers the north and south patches and the Midtown,
  Brookwood and R16 rows. Downtown, `loadEast` (King Memorial) and `loadNorth` (Sweet Auburn) are
  still one task each. `loadNorth` is the worst task after ready: 1.04–1.09 s at 6× on Low (66b8a295),
  about 750–800 ms of it in the parapet strips calling `inConnectorLanes`.

## 0. Summary

1. **Today's board is already over its ceilings away from the opening view.** At a Midtown street
   camera, with no R16, Low geometry is 209.5 MB (ceiling 190). High geometry is 319.1 MB (300),
   heap 585 MB (570) and programs 103 (100). `test:perf` measures only the opening view, so it
   doesn't see this.
2. **Memory grows with the places a visitor has been.** Near house tiles are built on approach and
   never freed. One `route:north` pass takes Low houses from 9 MB to 68 MB of array bytes, and
   High geometry from 270 to 360 MB.
3. **Ground work is most of the main thread.** It is 43% of boot (2.1 of 4.9 s busy at 1×) and 98%
   of R16's own 4.0 s mount: `nearYields`, `seatLandingEdges`, `lower` and a second carve from
   `studyRails`. That work depends only on data, so it can be baked.
4. **High textures are ground maps and render targets.** Ground maps take 406 of 772 MB, and
   composer and shadow targets take 330 MB. Facades are 21 MB.
5. **Programs:** 100 on High = 25 plain Lambert and 10 Basic define variants, 16 landmark- or
   structure-owned hooked shaders, 15 system-owned hooked shaders, 12 shadow-depth variants and 17
   post/ShaderMaterial programs. Consolidation targets about 45 on High and 35 on Low, with landmarks
   adding none.
6. **Projection.** Today's board is 21 km², under 2% of the 1,239 km² square that encloses I-285
   and the airport (Sam's target, §7). Scaled linearly, the current architecture needs about 10 GB of
   Low geometry, about 27 GB of High ground maps, and roughly 5 minutes of main-thread build at 1×.
   The proposed architecture holds
   Low at or under 150 MB geometry, 250 draws and 45 programs whatever the size of the city.
7. **Before the next expansion:** per-view budgets, area slicing (in flight), near-tile eviction
   plus packing, program phase A and night draw consolidation. New areas load lazily on approach,
   as R16 does. Baking (with seams baked in their joined state), then unload by distance, 800 m
   tiles and the baked far LOD come before the second expansion, and before South in any case.

## 1. How this was measured

- **Harness.** `scripts/perf-run.mjs` (headless Chrome, `?perf=run`) with `--eval` probes:
  `__perf.captureDraws()` with and without a forced shadow redraw, `__perf.programs()` and
  `programOwners()`, a scene walk of geometry by its first two named ancestors (with arrays
  de-duplicated exactly as `perf.ts` does, so the totals match `geometryMB` to 0.1 MB), and texture
  sizes by slot. `tools/probe.js` is that combined probe; an earlier version without array
  de-duplication over-counted shared arrays, and no figure here comes from it. CPU profiles came from a CDP profiler started at navigation on an unminified build,
  with samples bucketed by call chain. The scripts are in `docs/log/perf-architecture/tools/`.
- **Views.** Opening (default camera), Midtown street (`cam=640,-3150,250,68,220`, docs/perf.md
  camera 3), R16 (`cam=-120,-6100,-58,55,900`, #682), a matched pair at 5.6 km orbit that differs
  only by whether R16 is mounted (`cam=-120,-5300,…,5600` and `cam=-120,-6100,…,5600`), and
  `motion=route:north`. Low ran at the phone viewport and High at the desktop viewport, at 14:00 and
  22:00 on 2026-11-20. Main-thread runs used the A16 canvas (384×692 at DPR 1) at 1× and 6× CPU.
- **Provenance and caveats.**
  - Data was copied from the integrator's worktree (`studio-north-expansion-pr`). The R16 context
    hash matched #682's `e8104621`.
  - The build carried a one-line local patch exposing `__cityScene` under `?perf`. It is not
    committed.
  - The Studio's load average was 3–10. The perf-window claim to the coordinator couldn't be
    delivered at first (Studio-to-Air pairing), so the first timing runs were taken without the
    window. **All main-thread timings below are provisional.** Counts and memory are deterministic.
  - `test:perf` was not re-run here: the integrator holds the window for release 17, and its
    1550d9d0 figures are quoted above.
  - **No A16 run exists on this head.** The A16 figures quoted (about 25–27 fps steady, 10.6 s
    ready) are from before #682.
- **iPhone 15 Pro baseline** (coordinator, release 16, Safari, Low, opening view, 12 areas):
  - 25.6 fps steady, p50 37 ms and p95 53 ms.
  - 375 calls, 1.91M triangles, 80 programs, geometry 180.7 MB, textures 105.2 MB.
  - Areas finish mounting at about 75 s, with 25 freezes over 100 ms. The worst are 8.7, 8.6, 7.8,
    6.6, 5.6 and 5.0 s.

  Like the A16, the steady state is draw-bound. Loading is the worst experience. The freezes are
  about 2.3× the longest task in Studio Chrome at 6× (3.7 s), so a throttled-Chrome proxy
  understates Safari. The iPhone route stays a device run (§4.5).

  An earlier run reported `areas = 1`. That came from the coordinator's plain-HTTP test origin, where
  `crypto.subtle` is undefined and the board hash checks threw. Production is HTTPS, so it isn't a
  production bug.

## 2. Today's cost, measured

### 2.1 Headline by view and tier

| View | Calls | Triangles | Programs | Texture MB | Geometry MB | Heap after GC MB |
|---|---:|---:|---:|---:|---:|---:|
| Low, opening, 14:00 | 366 | 1.79M | 85 | 108.7 | 148.9 | 413 |
| Low, opening, 22:00 | 543 | 2.13M | 85 | 108.7 | 148.9 | 413 |
| Low, Midtown street | 64 | 1.32M | 86 | 108.7 | **209.5** | 444 |
| Low, R16 (13 areas) | 56 | 1.09M | 86 (**89** at 22:00) | 115.0 | **225.8** | **495** |
| Low, after `route:north` | 105 | 1.74M | 86 | 108.7 | **227.6** | **473** |
| High, opening, 14:00 | 434 | 6.45M | 100 | 772 | 270.3 | 537 |
| High, opening, 22:00 | **622** | 6.82M | 100 | 772 | 270.3 | 536 |
| High, Midtown street | 92 | 3.35M | **103** | 772 | **319.1** | **585** |
| High, R16 (13 areas) | 85 | 2.73M | **106** (107 at 22:00) | 820.8 | **353.1** | **644** |
| High, after `route:north` | 269 | **8.10M** | **104** | 772 | **359.8** | **627** |

Bold marks a figure over today's opening-view ceiling (Low 190 MB geometry / 460 MB heap / 86
programs; High 300 / 570 / 100 and 6.85M triangles; High night 630 calls). Low 22:00 has no
ceiling; its 543 calls would exceed the day ceiling of 435.

**What R16 itself costs** (the matched pair at 5.6 km orbit, same camera distance): Low +17.6 MB
geometry, +6.3 MB texture, +56 MB heap, +1 program. High +40.0 MB geometry, +48.8 MB texture (its
ground map), +65 MB heap, +1 program. Most of #682's "with R16 mounted" excess is close-camera
detail, not the row.

### 2.2 Memory

**Textures** (Low / High, MB, opening view):

| Source | Low | High | Note |
|---|---:|---:|---|
| Ground maps (canvas, `terrain/ground-map.ts`) | 50.8 | 406.4 | High paints about 0.5 m texels: one 5,735×1,639 map is 239 MB with mips |
| Post and shadow render targets | 21.6 | 329.5 | High composer targets at 2,880×1,800 (DPR 2) |
| Landmark facades and signs | 20.9 | 20.9 | Within the 40 MB budget in `materials/budget.ts` |
| Transport | 15.3 | 15.3 | |

**Geometry by layer** (array bytes, de-duplicated; Low / High, MB):

| Layer | Opening Low | Street Low | After route Low | Opening High | Street High |
|---|---:|---:|---:|---:|---:|
| Ground meshes (board, far forms, near re-cut) | 14.0 | 42.9 | 34.5 | 70.5 | 70.5 |
| Houses (near tiles plus far blocks) | 9.3 | 41.0 | **67.5** | 9.3 | 58.0 |
| Generic buildings (unindexed Float32, 44 B/vertex) | 28.5 | 28.5 | 28.5 | 38.1 | 38.1 |
| Surface transport decks and embedded rails | 25.1 | 25.1 | 25.1 | 25.1 | 25.1 |
| Other transport (streetcar, North Line, freight, MARTA, bridges) | 16.1 | 16.1 | 16.1 | 30.7 | 30.7 |
| Yards, landscape, ground cover | 8.0 | 8.0 | 8.0 | 47.1 | 47.1 |
| Landmark batches and landmarks (#575-packed) | ≈ 37 | ≈ 37 | ≈ 37 | ≈ 25 | ≈ 25 |
| Trees, vehicles, scenery, other | ≈ 11 | ≈ 11 | ≈ 11 | ≈ 25 | ≈ 25 |
| **Total (= `geometryMB`)** | **148.9** | **209.5** | **227.6** | **270.3** | **319.1** |

Two findings:

- **Near detail is never released.** Ground's near re-cut swaps: 42.9 MB at the street camera and
  34.5 MB after the route. But near house tiles accumulate: 9.3 → 41.0 → 67.5 MB on Low. High
  geometry grows from 270.3 to 359.8 MB over the same route. Memory therefore grows with distance travelled, not just with board
  size.
- **Unpacked fabric.** Generic buildings, houses and ground still use Float32 positions, normals and
  colours. #575 packed only the landmark batches (−26 MB Low). The same packing on generic buildings
  alone saves about 18 MB on Low.

CPU-side copies (`cpuMB`) are 214 MB on Low and 602 MB on High. three.js keeps every attribute array
after upload, which is why the heap tracks geometry so closely.

### 2.3 Draw calls

`captureDraws` sees 5–15% more submissions than `renderer.info.render.calls` (417 against 366 on
Low), so these are **shares**, not counts.

| Category | Low 14:00 | Low 22:00 | High 14:00 | High 22:00 |
|---|---:|---:|---:|---:|
| Buildings | 51% | 61% | 47% | 55% |
| Terrain | 12% | 9% | 10% | 8% |
| Transport | 15% | 11% | 13% | 10% |
| Trees | 10% | 8% | 11% | 9% |
| Vehicles | 7% | 6% | 8% | 7% |
| Landscape, scenery, post | 5% | 5% | 11% | 11% |

Night adds about 130 building submissions on both tiers: lit panes, lamps and window layers that
still draw separately after dark (#441 merged them into the wall draw by day only). That is the
High-night 622/630 problem. A forced shadow redraw adds 95 calls and 1.28M triangles on Low, and 148
and 4.18M on High.

### 2.4 Triangles (main pass, opening view)

- **Low 1.79M:** buildings 42%, trees 29%, transport 17%, vehicles 6%, landscape 3%, terrain 3%.
- **High 6.45M:** trees 43%, terrain 25%, buildings 16%, landscape 7%, transport 6%.

The A16 is triangle- and draw-bound (docs/perf.md, #613): #613's far boxes took it from 383 calls and
2.18M triangles at about 27 fps to 204 calls and 1.16M triangles at about 44 fps.

### 2.5 Programs (High 100 / Low 85, opening view)

| Bucket | High | Low | Where they come from |
|---|---:|---:|---|
| Plain Lambert define variants | 25 | 23 | One program per combination of map/UV, emissive map, vertex colours, instancing (+colour), alpha test, flat shading, side (front/double/back), transparency and receive-shadow, read from three's cache key |
| Plain Basic define variants | 10 | 10 | The same splits on unlit materials (lamps, lit windows, signal heads, platform lights) |
| Plain variants with no live owner | 4 | 4 | Compiled by `core/prewarm.ts` or by an object since removed |
| Landmark- and structure-owned hooked shaders | 16 | 16 | Westin and Truist skyline reflection (Phong), 191 Peachtree stone, Mercedes-Benz roof ribs, Georgia State platform glow, One Atlantic ashlar (2), 1180 veil (2), Rhodes wash, the materials library (Davison's), Auburn sanctuary wash, Grant Street (2), 17th Street bridge spill, the cut-and-cover trench |
| Landmark-owned plain Phong | 1 | 1 | The Capitol dome |
| System-owned hooked shaders | 15 | 14 | Ground contours (2), yards (2), ground cover (2), houses' night styles (2), stock night (streetcar and Crescent), freight containers, Xcelsior bus, CQ400, road traffic, figure looks |
| Shadow depth variants | 12 | 12 | Depth programs split by instancing, alpha test, side and vertex textures |
| Post passes and ShaderMaterials | 17 | 5 | Tilt-shift, grade, glass blur, AO blend, bloom, GTAO and ink stages, sky, underpass light |

R16 adds one program (Mayson's inferred carriers) on both tiers. The street, R16 and route cameras
add another 3–7 on High. Their owners weren't resolved: three's ShaderMaterial cache keys differ
between runs, so they may be near forms or late compiles that prewarm misses. Increment 0's sweep
names them. Per-landmark programs are 17 of the 100. The other
programs come from define fan-out, which the program rule has to cover too.

### 2.6 Main thread: boot and mount

CPU profiles, 1× CPU, A16 canvas, Low, unminified build (provisional, §1):

| Bucket | Boot (12 areas) | Boot plus R16 mount |
|---|---:|---:|
| Ground: grid, cut, carve, yields, normals, drape | **2.12 s (43%)** | **6.09 s (68%)** |
| Other (per-frame updates, alignments, mosaic glue; no item over 52 ms) | 1.01 s (21%) | 1.03 s (12%) |
| Render and shader compile | 0.77 s (16%) | 0.67 s (8%) |
| Transport decks, rails, parapets (excluding ground carve) | 0.43 s (9%) | 0.44 s (5%) |
| Traffic and vehicle setup | 0.31 s (6%) | 0.36 s (4%) |
| Garbage collection | 0.16 s | 0.22 s |
| Buildings (generic, landmarks, batches) | 0.08 s | 0.09 s |
| **Busy total** | **4.88 s** | **8.92 s** |

- **R16's own mount** is about 4.0 s of that, and 3.97 s of it is ground. The heaviest self-time
  functions are `nearYields` 1.14 s, `seatLandingEdges` 1.12 s, `contains` 0.32 s, `splitConvex`
  0.23 s and `pointInRing` 0.24 s. `studyRails` re-carves the ground (2.06 s inclusive), as #682
  found.
- **R16 mount task:** 4.13 s at 1× on Low and 4.28 s on High. **27.7 s at 6×.**
  `samsolomon/area-build-slicing` (c3f87a82) moves it into the budgeted build; it is not merged.
- **Boot at 6× (A16 proxy):** 40 long tasks totalling 22.1 s, the longest 3.74 s. Ready at 7.5 s,
  the last area at 22.4 s, prewarm done at 24.3 s.

**Which steps make the long tasks** (6× CPU, A16 canvas, Low, single run, provisional). Each task
over 700 ms is matched to the City phase that lands inside it in the same run:

| Task (start, length) | Phase landing in it | Step |
|---|---|---|
| 0.9 s, **2.4 s** | `stage:terrain` | Downtown ground: grid, cut and carve (`buildDowntownTerrain`) |
| 3.6 s, 1.3 s | `stage:streets and freight` | Surface transport and its ground carve |
| 5.3 s, 0.7 s | `city:built` (lights, renderer, placement) | City assembly and the first compiles |
| 8.4–13.6 s, 0.8–1.6 s each | `area:south-band`, `midtown-south`, `midtown-central`, `midtown-upper` | One Midtown row mount each |
| 15.7 s, **3.7 s** | `area:brookwood-south` | Row mount (the densest canopy and Ansley ground) |
| 20.0 s, **2.9 s** | `area:brookwood-station` | Row mount (station, rail cut, highway ground) |
| 23.6 s, **27.7 s** | `area:r16` (R16 camera only) | R16 mount, 98% ground at 1× (above) |

Every long task over 700 ms is a ground-and-board build: the downtown stage or one area's mount. The
iPhone's 5–9 s freezes fit these same mounts at Safari's speed. The 1× bucket split above holds for
these tasks as a whole. A per-task split at 6×, repeated twice, waits for the integrator's perf window
(`tools/tasks.mjs`). It refines the shares and doesn't change the conclusion.

## 3. Projection to the full extent

**Extent (Sam, 2026-11-26).** The target is the full square enclosing I-285 and the airport: 35.2 ×
35.2 km, about **1,239 km²**. On #435's 800 m lattice that's 1,936 tiles, or 5,808 files at three per
tile (29% of the free plan's 20,000-file cap). The I-285 hull alone is 682 km² (1,218 tiles).
Today's board is 19.0 km², plus R16's 2.24 km²: under **2%** of the square. The figures below
project to 1,239 km², a factor of about 59. The first draft projected to the hull; scaling from it
gives the same numbers, at about 1,239 / 682 = 1.8× the hull figures.

**Method.** Fabric (ground, generic buildings, houses, trees, roads, yards) scales with area, using
the matched R16 pair as the marginal cost per km². Hand-built landmarks don't scale with area: they
scale with how many get built, and they are projected separately. Main-thread time scales by area
from the boot profile (0.26 s/km² at 1×). R16 runs at 1.8 s/km², an upper bound for dense highway
ground.

| Metric (opening view unless noted) | Today (21 km²) | Current architecture at 1,239 km² | Proposed at 1,239 km² (budget) |
|---|---:|---:|---:|
| Low geometry | 149 MB (226 at R16) | ≈ 9.8 GB (149 + 1,218 × 7.9 MB/km²) | ≤ 150 MB resident, flat |
| Low heap after GC | 413 MB | ≈ 31 GB (25 MB/km²) | ≤ 400 MB |
| High ground maps | 406 MB | ≈ 27 GB (21.8 MB/km²) | ≤ 120 MB (distance-tiered) |
| Low draws | 366 | ≈ 16,600 (about 30 per 2.24 km² area today); ≈ 8,900 with #613's boxes (about 16 per area) | ≤ 250 |
| Low triangles | 1.79M | ≈ 70–105M (far forms at today's density) | ≤ 1.5M |
| Programs | 100 High / 85 Low | +1 per hooked landmark material; about 70 landmarks and 100 skins are listed for the four directions' first steps | ≤ 55 High / 45 Low, and landmarks add 0 |
| Main-thread build, 1× | 4.9 s busy | ≈ 5 min (0.26 s/km²); worst case ≈ 37 min (1.8 s/km²) | ≤ 1 s at boot; ≤ 8 ms per frame while streaming |
| Main-thread build, A16 (6×) | 22 s of long tasks | ≈ 24 min | Ready ≤ 8 s; no task > 50 ms |
| Download, opening view | ≈ 18 MB (all of `web/public/data`) plus the 1 MB `midtown-rows` chunk | grows with area | ≤ 8 MB compressed (horizon plus coarse levels); tiles stream after |

**Where the proposed numbers come from (Low).**

- **Near ring: about 35 MB.** It is roughly the 3×3 tiles around the orbit target. Today's
  close-camera detail is about 60 MB for a Midtown neighbourhood (street minus opening); packed like
  #575, about 35 MB.
- **Coarse levels: about 30 MB.** At #435's target of 40 KB per tile, packed and expanded about 2× on
  the GPU, with 3.2 km merges past about 5 km.
- **Always-resident global layers: about 45 MB.** Today's transport is 49 MB; the network polylines
  and coarse height grid for the whole square fit in that once decks are tiled.
- **Landmarks in view: about 20 MB.**

Draws come from about 2 draws per coarse block and 15–25 for the near ring. Triangles come from #613's
measured 1.16M for the whole board as boxes, plus canopy masses.

**The opening view decides the far budget.** Sam chose downtown at about 5 km, with the rest of
the city as horizon (today's tilted diorama; §7). Only the tiles near downtown then need L0 or L1.
Everything else draws at L2 or L3 (§4.3), which keeps the opening download and the coarse budget
above independent of the square's size.

## 4. The five pillars

Each pillar keeps three rules: the blink test (no visible change from a speed-up), truth tiers
untouched, and free-tier hosting.

### 4.1 Bake in the pipeline, not the browser

**Design.** The pipeline runs City's own TypeScript builders in Node and stores the results.
`pnpm data:bake` imports `terrain/*` and the board builders through vite-node, with three.js
headless and no WebGL. It runs the same generator steps #611 and #621 sliced, using `runSync`. It
writes packed binary buffers per area (later per tile), with:

- Int16 positions relative to the tile origin, Int8 normals, Uint8 colours, Uint16/32 indices, and
  material-slot groups
- the yields and seat edges the near re-cut needs
- a height raster of the drawn surface for `heightAt` (vehicles, camera clamp, ground audit)

A manifest records each file's sha256, the source-data hashes and a hash of the builder sources.

Bake what is expensive **per byte**, not everything:

- **Bake:** ground cut, carve, yields and normals (2.1 s at boot and 4 s for R16) and the near-ring
  ground detail. **Bytes, estimate (not measured):**
  - Ground arrays today are Float32 at about 32 B per vertex (position, UV, normal). Packed like
    #575 at about 16 B and then Brotli-compressed, they are roughly a quarter of today's array size.
  - Low: 14 MB at the opening view → about 3–5 MB to download.
  - High: 70.5 MB → about 15–20 MB, unless High downloads Low's ground and refines only the near
    ring in the browser.
  - Near-ring detail (29 MB on Low for one Midtown neighbourhood) → about 5–8 MB per neighbourhood,
    fetched on approach.
  - Increment 5's first output is the measured byte count per tier, before any wiring.
- **Maybe later:** transport decks (0.43 s, about 8 MB).
- **Never:** generic buildings (0.08 s; extruding footprints is cheaper than downloading them).

Node can already run these builders: `terrain/sliced-build.test.ts` builds `buildDowntownTerrain`
from staged rows under vitest. The bake reuses that path rather than a new runtime.

**Seams are baked in their joined state.** Today a mount changes its neighbours. R16 re-cuts
Brookwood Station's ground at the seam, swaps its seam buildings (`mountSeamBuildings`), and repaints
both ground maps (`joinGroundMaps`, `city.ts` around line 1089). The bake builds each unit with all
its neighbours present and stores the joined result. A unit's files then never depend on which
neighbours are mounted. An absent neighbour is covered by its coarse level (§4.3), not by an unjoined
edge. That is what makes unload (§4.2) safe without per-seam undo code.

The ground map stays procedural and stays where it is painted today (`terrain/ground-map.ts`). Its
cost is memory on High, which §4.3's distance-tiered resolution fixes. It moves to a Worker only if
the per-task profile (§2.6) shows painting among the long tasks.

**What changes.**

- **Pipeline:** a Node bake stage after `pnpm data`, a manifest, and a check that fails on a stale
  bake (builder hash mismatch).
- **Web:**
  - Areas fetch baked buffers and upload them; the builder becomes the fallback when a bake is
    missing or stale, so the site keeps working.
  - Mount-time seam work (`joinGroundMaps`, the seam cuts and `mountSeamBuildings`) is skipped for
    baked units.
  - `area.carve` runs once.
- **Contract:** bake manifest and buffer header types in `web/src/model/types.ts`, plus
  `bake.contract.test.ts`.
- **Worker:** none.
- **Deploy:** needs `pnpm data`, a `web/dist` rebuild and a redeploy. Every bake-changing PR says so.

**Parity.** For every area and both tiers, a hash test compares the baked meshes with the in-browser
build: names, matrices, positions, normals, colours, indices and draw ranges, as in #621's proof.
Both run V8 with the same float32 rounding, so a mismatch is a bug, not noise.

**Risks.**

- Builders that read the DOM or canvas need splitting. Ground-map painting stays in the browser.
- The joined-seam bake must equal today's mount for the default visit. The parity hash runs on the
  joined board, both tiers.
- Download grows by the baked ground bytes (above). Sam accepted that for both tiers (§7, decision 4).
- Bake time is about 5 s for today's board on the Studio, and roughly 5 minutes for the square.
- Hand-written per-area branches (`id === 'r16'` in `square-board/sections.ts`) don't scale to 1,936
  tiles. The bake has to emit them as data: yields, special profiles, overrides.

**Effort.** 15–25 agent-hours for today's areas: bake, joined seams, fallback and parity test.

**Reuse.** #611 and #621 generators (via `area-build-slicing`), #575's packing, #682's R16 mount
function, and the ground-contact audit (`pnpm audit:ground`) as a parity check of the drawn surface.

### 4.1a Increment 5, first slice: a one-area ground bake (design, 2026-11-26)

**Scope.** Bake one area's ground on both tiers and load it in place of the in-browser surface
work. It sits behind `?perf&bake=0`, which turns the bake off and rebuilds in the browser as
today. Prove the geometry is byte-identical, and measure the mount long task, boot and download at
Low 6×.

**What the code does today** (code map, main fb118c6b):
- `buildDowntownTerrain` tessellates the whole board, then re-tessellates it on every carve, using
  all yields so far:
  - carve 1: golf, landmark yields, Winn Park and the Piedmont garden;
  - carve 2: yards;
  - after it returns: the deck cutting, the trail, R16's landing and seam yields, and the
    studyRails envelope.
- The final near mesh therefore equals `tessellateSteps(spec, heights, quality, openings, join,
  allYieldsInOrder)`, followed by normals.
- Every step is pure code over static data. The ground map canvas does not depend on geometry and
  stays painted in the browser.

**The catch: yields are closures, and many sample the surface at mount.** Cuttings, deck
footprints, tee grades, yard terraces, residential sites and the R16 formation envelope all read
`groundAt` or `terrainAt` from the surface as it stands at that point. Baking only the final mesh
is therefore not enough: the yields have to be built the same way to keep `carved`, `holdGround`
and later seam carves working, and building them needs the intermediate surfaces.

**Design: a baked surface plus a sample tape.**
1. **Bake (Node).**
   - Run the area's real build (`addSection` or `loadNorth`, with fetch stubbed) under `runSync`
     for each tier and each join set the site uses.
   - At every tessellation (the first build and each carve), record two things:
     - the surface arrays produced (`position`, `uv`, `normal`, index, `starts`, `blockCols`);
     - every `groundAt`, `terrainAt` and `sampleScene` call made since the previous tessellation
       (inputs and outputs, in order).
   - Store only the **final** surface arrays plus the **tape** of samples. The tape is a few
     thousand floats.
   - The manifest records the grid sha256, the tier, the join set, and a hash of the builder
     sources. A stale bake is a test failure.
2. **Load (browser).**
   - `GroundSurface` gets a baked source. Each tessellation step becomes a no-op that advances a
     counter, and the last one adopts the baked arrays.
   - `groundAt`, `terrainAt` and `sampleScene` answer from the tape while it is being replayed. Each
     call checks that its inputs equal the recorded ones.
   - Any mismatch (a different call order, a stale bake, a missing file) drops to today's
     in-browser build for that area, logs it in dev, and counts it in the perf summary.
   - Yields are still constructed exactly as today, so `carved`, `hold`/`revert`, the far boxes and
     later carves (the R16 seam on the Station) see the same objects. Their floors return the
     recorded numbers.
   - Carves made after the replay (a neighbour mounting later) re-tessellate in the browser as
     today, until §4.1's joined-seam bake.
3. **Runner.** Add `vite-node` (already in the lockfile through vitest) as a dev dependency, and a
   `pnpm data:bake` script that runs `web/scripts/bake-ground.ts`, stubbing `document` the way the
   tests do. It writes `web/public/data/scene/<area>/ground-bake-<tier>[-<join>].bin` and a JSON
   manifest. `pnpm data` calls it last.
4. **Format.** The arrays are the Float32 and Uint16/32 arrays the surface already uses, so
   adoption is a copy and parity is exact. Brotli on the wire. Packing (Int16, #575) is a later
   byte cut, measured separately, because quantised positions can't be byte-identical.

**Proof.**
- **Parity test** (vitest, both tiers, every baked join set): fingerprint the area built with the
  bake against the same area built in the browser, using `sliced-build.test.ts`'s FNV
  `fingerprint`. That covers ground, decks, carved list, far prefixes and `sampleScene` at a grid
  of points.
- **Revert check:** the test fails if the replay is forced to record a different sample.
- **In the browser:** run `?perf&bake=0` against the bake on one frozen build at Low 6× (A16
  canvas): the mount long task, ready and last-area time, the bytes fetched, and a matched pixel
  diff at the default view and at the area's street view.

**Which area.**
- I recommend **midtown-central for the mechanism**. It has a fixture, a sliced-build test, yards,
  golf-free carves, decks and the trail, and needs no seam.
- **The felt freeze is elsewhere.** The integrator's numbers show the iPhone's 10 s and 4 s
  freezes are before ready, in downtown's `stage:terrain`, which still builds in one task. Post-ready
  mounts are already sliced to under about 300 ms at 6×.
- **So the second slice should be downtown**, the same mechanism plus the transport cutting. That
  is the lever for the iPhone freeze. Sweet Auburn is the smallest area (161×161), but it skips
  `seatLandingEdges` and grading, so it proves less.

**Cost, estimated before measuring.**
- **Download:** a Midtown row's Low surface is about 45k vertices × 32 B plus indices, roughly
  1.6 MB raw and about 0.6 MB with Brotli. High is about 4× that. The first deliverable is the
  measured bytes per tier.
- **Main thread:** the mount keeps transport, decks and the yields' own construction. Only
  tessellation, `lower`, `nearYields`, conform, grade, `seatLandingEdges` and normals go.
- **Deploy:** needs `pnpm data`, a `web/dist` rebuild and a redeploy. With the bake missing, the
  site still works through the fallback.

**Risks.**
- **Tape order** must be deterministic. Sliced and sync builds already produce identical output
  (#621), which suggests it is.
- **Tier and join variants multiply files.** Sweet Auburn alone has two join sets (mosaic or
  preview).
- **The `?ground=old`, `?worker=1` and `farsettle` flags** bypass the bake.

### 4.2 Load and unload by distance (streaming)

**Design.** A ring manager keeps a resident set chosen by screen-space error under a memory budget
per tier, with LRU eviction, hysteresis (join closer than leave, as #435 proposed) and prefetch
along the pan velocity.

- **The unit is today's areas first, then 800 m tiles.** Areas already exist, R16 already loads
  lazily, and slicing makes mounts safe. Retiling to #435's lattice (anchor (−1,000, −5,700), about
  5,808 files for the square, 29% of the free 20,000-file cap) comes with the next large expansion.
- **Unload comes after baking.** Evicting an in-browser-built unit would have to undo the seam
  changes its mount made to neighbours (§4.1). Baked units carry joined seams, so eviction is
  just disposal. Until the bake lands, new areas load lazily and stay loaded, as R16 does.
- **Eviction frees GPU buffers and the CPU arrays.** Attribute arrays are dropped after upload only
  for meshes with no CPU reader. Ground keeps its height raster for `heightAt`. The batcher, picking
  and far-form prefixes keep theirs. WebGL context loss (seen on phones) then reloads the affected
  units from their files rather than re-uploading arrays that are gone.
- **The near-house leak is fixed first,** as the same rule on the smallest scale. `HouseTile`
  (`city/house-lod.ts`) builds its near group once and only hides it. Increment 2 disposes it a few
  seconds after the tile leaves the near band. The existing one-near-build-per-frame cap bounds the
  rebuild when the camera returns.

Always resident:

- a coarse height grid for the whole square (25 m int16 ≈ 2.7 MB), for the camera clamp and vehicle
  heights in unloaded tiles
- the rail and road network polylines vehicles run on (already statewide in `data/ga`)
- the tile index
- the coarse levels (§4.3)

**What changes.**

- **Web:**
  - `square-mosaic.ts` becomes the ring manager. Its R16 rules (orbit ≤ 5 km, destination inside,
    follow within 600 m, Show full board) generalise to every unit.
  - Eviction is added.
  - A memory meter feeds the budget.
- **Pipeline:** the tile driver, index and per-tile files from #435 §5, when retiling starts.
- **Worker:** none. The client fetches only paths listed in `index.json`, never guesses a URL, and
  never widens `run_worker_first`, so streaming adds no Worker invocations. Tiles are static assets
  under a versioned path with `immutable` headers.

**Risks.**

- **Pan hitches.** #435's first load-and-free design reached 533 ms because builds were synchronous.
  Slicing (`area-build-slicing`) plus baked buffers is the fix. The bar is no task over 50 ms at 6×.
- **Deep links and follow.** A `cam=` link or a followed vehicle requests its units first, and reveal
  waits for the near ring around the target, as `city:areas-released` does today. #682's "follow
  waits for the row, and ends if it can never arrive" becomes the general rule, with its browser test
  (`follow-north.test.ts`) extended to an evicted unit.
- **Truth tiers.** Untouched. Vehicles are simulated from schedule or live data whatever is loaded.
  A selected card reads the same fields. Only the drawing changes: a vehicle over an unloaded unit
  draws on the coarse level at the coarse height.
- **Look.** Units have to switch inside the fog, or behind the coarse level with a matching look.

**Effort.**

- 15–20 agent-hours for area-level unload of baked units, eviction and follow.
- Then about 10 hours to move the manager to tiles, plus #435's pipeline estimate of 12–18 hours.

**Reuse.** #435's `city/stream/` ring prototype and fog culling, #682's lazy R16 and follow-pending
logic, `area-build-slicing`, and #435's index, hosting and file-count analysis.

### 4.3 A baked far LOD that matches the look

**Design.** A hierarchy, baked by the same Node stage:

| Level | Covers | Contents | Budget |
|---|---|---|---|
| L0 | Near ring | Full detail (today's build or baked) | Today's per-area cost, packed |
| L1 | 800 m tile (area-sized at first) | Buildings as #613's min-area boxes in 1–3 height bands with area-weighted wall and roof colours, plus its night variant; canopy masses from `trees/far-canopy.ts` (#450); a coarse 25 m ground carrying the ground map's colours; main rail and road ribbons | ≤ 40 KB per tile raw, ≤ 2 draws |
| L2 | 3.2 km (16 tiles) | Merged boxes as block masses; canopy as ground tint | ≤ 1 draw per block |
| L3 | Whole hull | The horizon mesh (#538's very-far ground) | 1–2 draws |

**Parity is the gate.** `ce1aed44` failed because it computed its own colours: greener than
November, darker at night, flatter. Every level must take its colours from the functions the near
form uses:

- palette and per-building finishes
- seasons from `World.setSeason`, with canopy season driven by the clock, not baked into one colour
- night window share from the generic buildings' style attributes

A blink-test harness is required before any review. It runs the default, wide and dolly cameras at
14:00 and 22:00 in November, July and January. It produces a per-pixel diff at each level's switch
distance and a strip at 0.8×, 1× and 1.2× of it, plus the threshold strips #613 already makes. No
level ships without Sam seeing that sheet.

**What changes.**

- **Pipeline:** bake L1–L3 alongside L0, with per-season canopy class attributes and a night colour
  set.
- **Web:** the level selector (in the ring manager) and the L1–L3 materials on existing programs:
  `StaticLandmarkMaterial` for boxes and the foliage program for canopy masses, so no new program.
  #613's night variant uses an unlit Basic program that already exists at night.
- **Worker:** none.
- **Hosting:** about 1 file per tile and level. That is within the square's 29% file estimate if L1 is
  folded into the tile's `lod.bin`.

**Risks.**

- The look: boxes read bulkier, and night sparkle is sparser (#613's known differences).
- Shadows: coarse levels cast no shadows past 9 km, as trees and houses already do.
- Ambient scenery stays ambient: tiers go in Key and About, not on screen.

**Effort.** 20–30 agent-hours for the bake, selector and blink harness. Finishing #613 and #450 for
Sam's call takes 4–6 hours.

**Reuse.** #613 (`city/far-board.ts`), #450 (`trees/far-canopy.ts`, far form, 400 m cells), #538 and
#586 (very-far ground, opt-in), #442's far house blocks and the houses far-far boxes already on main,
and #435's
`stream/lod-build.ts` (replaced by the shared builders).

### 4.4 Material consolidation (programs)

The design is in §5. Its rule: **a new landmark may not add a program.** Enforcement:

- A lint (`materials/program-rule.test.ts`) fails when a module under `web/src/city/` constructs a
  material outside the library kit, or sets `onBeforeCompile` or `customProgramCacheKey`. An
  allow-list holds the system shaders, each with an owner.
- `test:perf` ratchets the program ceiling down as each phase lands.

**Effort.** Phase A 8–12 agent-hours. Phase B 20–30 agent-hours.

**Reuse.** The materials library (`materials/library.ts`, already one program per tier for every
surface), #441's batcher (its `hooked` and `texture` exclusions go away as landmarks move into the
kit), and the texture budget.

### 4.5 Per-view budgets in `test:perf`

**Design.** `perf-budget.json` gains views. Each view has a ceiling per tier, and every new area
adds a showcase camera to the list (`docs/expansion-checklist.md`).

| View | Camera | Tiers | Checks |
|---|---|---|---|
| Opening | Default | Low, Low 22:00, High, High 22:00 | Calls, triangles, programs, texture, geometry, heap |
| Street | Midtown, docs/perf.md camera 3 | Low, High | Same |
| North edge | R16, `cam=-120,-6100,-58,55,900` | Low, High 22:00 | Same, with the newest area mounted |
| Each area's showcase | Per area | Low, High | Same |
| Growth | `route:north` out and back, then a second sample at the start camera | Low, High | Geometry and heap within +10% of the first sample (catches the near-tile leak) |
| Pan routes | `route:north`, `route:zoomout`, and a new `route:stream` crossing unit boundaries | A16 proxy | Longest task |
| A16 proxy | 384×692 at DPR 1, 6× CPU | Low | Longest task during boot and mount; ready |
| iPhone-class proxy | 393×695 at DPR 1, 4× CPU, the longest rAF gap from navigation (the coordinator's Safari metric) | Low | Longest boot and mount stall, so the device and the proxy compare |

**Proposed ceilings at the end state** (Low / High):

| Measure | Low | High |
|---|---:|---:|
| Calls (day and 22:00) | 250 | 450 |
| Triangles | 1.5M | 6M |
| Programs | 45 | 55 |
| Geometry | 150 MB | 250 MB |
| Texture | 100 MB | 500 MB |
| Heap | 400 MB | 500 MB |
| Longest task (A16 proxy) | 50 ms | — |
| Ready (A16 proxy) | 8 s | — |

Until then, each view starts at today's measurement plus 10% and ratchets down, as the opening view
does now. Fps and A16 ready stay device-only (docs/perf.md).

`perf-budget.mjs` needs two additions: a `cam` per entry (the motion and time fields exist), and
a second sample after a route for the growth check, in `perf.ts`'s `run()`.

**Effort.** 6–10 agent-hours. It reuses `perf-run.mjs`, `program-sweep.mjs` and the motion routes.

## 5. Programs: the consolidation design

**Phase A: normalise the define fan-out.** 8–12 hours. It aims at no visible change, but side
policy, flat shading and alpha-test moves can shift pixels. Each step needs a matched-frame pixel
diff by day and night against main.

- **Vertex colours always on** for static kit materials. Untinted meshes get a white Uint8 colour,
  which packing makes 3–4 bytes per vertex.
- **Receive shadow stays a kit axis.** It splits programs (`numDirLightShadows` in the cache key),
  but forcing it on would add shadows Sam hasn't seen and shadow lookups on a GPU-bound A16. Each
  static kit therefore has a shadowed and an unshadowed program, and nothing else varies.
- **Flat shading baked into geometry** (unindexed normals), not the material flag.
- **One side policy:** front for closed solids, double only in a named two-sided kit material.
  Back-side and flipped variants go.
- **Alpha test only in the foliage kit.** Transparency only in a glass kit.
- **Instancing colour on** for every instanced kit mesh.
- **Prewarm** compiles only kit programs, and orphans are removed.

| Bucket | High today | High after A |
|---|---:|---:|
| Plain Lambert | 25 | about 9 (static vertex-colour and static plus map, each shadowed and unshadowed; instanced; instanced alpha-test foliage; transparent glass; two-sided; ground map) |
| Plain Basic | 10 | about 4 (static, instanced, transparent glow, lit windows) |
| Orphans | 4 | 0 |
| Shadow depth | 12 | about 5 |

That is about 33 fewer programs on High, with the post passes and hooked shaders unchanged.

**Phase B: one landmark program.** 20–30 hours, blink-tested per landmark. The library becomes the
only way a landmark gets a look:

- **Per-vertex surface data.** Today a material carries a library `Surface` (`kind` plus 4
  parameters). It moves into Uint8 vertex attributes, `aSurface` (kind) and `aSurfaceParams`, and
  one library program per tier branches on the kind. Davison's and Rhodes' two library programs
  become that one.
- **Per-building state in one data texture.** Night share, wash level and reflection probe height
  move into a small `DataTexture` indexed by a per-vertex building id: 4,096 buildings × RGBA8 =
  16 KB. Phase B extends the existing night uniform fan-out (0.5 ms a frame) into that one texture
  write.
- **Facade canvases in one array texture.** The canvases (21 MB today, 40 MB budget) become one
  `DataArrayTexture` (WebGL2 `sampler2DArray`) indexed by `aLayer`. Facade bytes stay in the budget.
  There is one sampler for every textured landmark, instead of a map variant per facade.
- **Hooked effects become library kinds.** Skyline reflection, ashlar, stone, veil, ribs, wash,
  bridge spill, platform glow and trench light each become a library kind, evaluated in the shared
  program. The Capitol's Phong dome becomes a library "gilt" kind with a specular term.

With one program, #441 can batch textured and formerly hooked landmarks into their cell batches, so
calls fall too. At night, lit panes and windows ride the wall draw (the data texture carries the
night share), which takes about 100–130 building submissions off High-night.

**Expected count.**

| Bucket | High today | High end | Low today | Low end | Note |
|---|---:|---:|---:|---:|---|
| Post and ShaderMaterial | 17 | 15 | 5 | 5 | Floor; landmark work can't touch it |
| Shadow depth | 12 | 5 | 12 | 5 | |
| Plain define variants and orphans | 39 | 13 | 37 | 13 | Phase A |
| Landmark and structure | 17 | 2 | 17 | 2 | Library opaque and transparent |
| System hooked | 15 | 10 | 14 | 10 | Yards and ground cover merge; stock, bus and CQ400 share one livery program |
| **Total** | **100** | **≈ 45** | **85** | **≈ 35** | Ceilings 55 / 45 leave room for systems, not landmarks |

**Risks.**

- Phase B touches approved landmarks. Each migration needs a matched-frame pixel diff by day and
  night, like the release pixel compares.
- The shared shader grows. Keep kinds in a `switch` over a small integer so the GPU's branch stays
  uniform within a draw.
- WebGL2 array textures are required. They are in WebGL2 core, and City already needs WebGL2.

## 6. Shippable increments and order

Each increment keeps the site working and passes `pnpm test`, `test:perf` and the blink test where it
touches the look. "Gate" marks what must land before the next expansion.

| # | Increment | Pillar | Effort (h) | Reuses | Gate |
|---:|---|---|---:|---|---|
| 0 | Per-view budgets: street and north-edge views, the growth check, the A16 and iPhone proxies; ceilings at today's figures | 5 | 6–10 | perf-run, program-sweep | **Gate** |
| 1 | Area slicing: the patches and the Midtown, Brookwood and R16 rows landed in release 17 (66b8a295). Remaining: slice downtown, `loadEast` and `loadNorth`, starting with Sweet Auburn's parapet strips and `inConnectorLanes` (1.04–1.09 s at 6×) | 1 | 4–8 (remainder) | #611, #621, `area-build-slicing` | **Gate** |
| 2 | Dispose near house tiles outside the near band; pack generic buildings and houses like #575 | 2 | 6–10 | #575, #442 | **Gate** (gets street and route back under ceilings) |
| 3 | Programs phase A plus the program-rule lint | 4 | 8–12 | library, prewarm | **Gate** (High is at 100/100) |
| 4 | Night windows and lit panes ride the wall draw | 4 | 6–10 | #441 | **Gate** (High night is at 622/630; Low 22:00 is at 543 calls, unbudgeted, on draw-bound phones) |
| 5 | Bake ground in Node for today's areas with seams joined, browser fallback, parity hash | 1 | 15–25 | sliced-build tests, #611, #621, #575 | Before the second expansion |
| 6 | Unload baked areas by distance, drop CPU arrays where nothing reads them, follow and deep links into evicted areas | 2 | 15–20 | #682 R16 rules, #435 rings | Before the second expansion |
| 7 | Far LOD L1 per area (boxes plus canopy plus coarse ground) behind a flag, blink harness, then Sam's call; distance-tiered High ground maps | 3 | 20–30 | #613, #450 | Before the second expansion |
| 8 | Programs phase B (library kinds, data texture, facade array) | 4 | 20–30 | library, #441 | Before the second expansion |
| 9 | Retile to 800 m; tile driver, index and contract; ring manager on tiles; L2 and L3 | 1–3 | 25–35 | #435 §1–§5, #538 | Before South, or any step over about 3 areas |

- **The next expansion** loads its areas lazily, as R16 does, and must fit the increment-0 views.
  Each new area costs about 8 MB of Low geometry at a distance (R16's matched pair). Increment 2
  restores that headroom.
- **Total:** about 130–190 agent-hours.
- **Critical path:** 0 → 2 → 5 → 6 → 9 is about 70–100 hours. Steps 3, 4, 7 and 8 run in parallel
  with separate owners.
- **Integration:** one integration owner per group, per AGENTS.md: increments 0, 2 and 6
  (streaming); 3, 4 and 8 (materials); 5, 7 and 9 (bake and LOD).

## 7. Decisions (Sam, 2026-11-26)

Sam answered the six open questions. The coordinator relayed them on 2026-11-26.

1. **Extent:** the full square enclosing I-285 and the airport, about 1,239 km² and 1,936 tiles,
   not just the 682 km² hull. §3 projects to the square.
2. **Opening view:** downtown at about 5 km with the city as horizon (today's tilted diorama). Far
   areas need only a cheap coarse level (L2 and L3 in §4.3).
3. **Far LOD look:** simpler far forms are fine, such as #613's boxes past 9 km, as long as a blink
   test at normal views shows no pop at the switch. The blink harness in §4.3 stays the gate.
4. **Baking ground:** yes, on both tiers. That's +3–5 MB (Low) and +15–20 MB (High) of compressed
   download for today's board, and PRs that need `pnpm data` are accepted. Increment 5 bakes Low
   and High. Measuring the bytes per tier is still its first output.
5. **Approved landmarks in Phase B:** one batch review sheet (matched day and night stills) is
   expected to be fine. The coordinator confirms with Sam when the sheet is ready.
6. **Loading versus look:** largely overtaken by #686 and #687's sliced builds. Mount-on-approach
   for areas past the fog is still allowed if needed, but a brief bare table edge should be the
   exception, not the plan.

## Appendix: reproducing

```sh
# Build with the probe hook (local only; do not commit), serve, run:
sed -i '' 's/if (import.meta.env.DEV) Object.assign(window, { __cityScene: scene });/if (import.meta.env.DEV || perfEnabled) Object.assign(window, { __cityScene: scene });/' web/src/city/city.ts
(cd web && npx vite build --outDir <scratch>/dist)        # add --minify false for profiles
node scripts/perf-run.mjs --out <dir> --eval "$(cat docs/log/perf-architecture/tools/probe.js)" \
  'http://127.0.0.1:<port>/?view=city&perf=run&q=low&t=2026-11-20T14:00:00-05:00'
node docs/log/perf-architecture/tools/prof.mjs '<url with perf=1>' <out.json> [cpu]
node docs/log/perf-architecture/tools/bucket2.mjs <out.json>
node docs/log/perf-architecture/tools/tasks.mjs <out.json> 300
```

`measurements-2026-11-26.json` holds every run's summary, categories, draws by category, largest
geometry and texture layers, phases, long tasks over 100 ms, and the High program list with owners
and cache keys.

## Architect review (2026-11-26)

`architect-plan-review` on the first draft, with claims checked against the code. Changes:

- **Significant: unload before bake was the wrong order.** Mounting R16 changes its neighbour: it
  re-cuts Brookwood Station's seam, swaps seam buildings and repaints both ground maps
  (`city.ts` near line 1089). Unloading in-browser-built areas would have needed per-seam undo.
  Now the bake stores joined seams, unload follows the bake, and the next expansion loads lazily
  like R16.
- **Significant: dropping CPU arrays after upload** would have broken `heightAt`, the batcher,
  picking and recovery from context loss. It is now limited to meshes with no CPU reader, and
  context loss reloads from files.
- **Significant: forcing receive-shadow on** to merge programs would add unseen shadows and A16 GPU
  cost. It stays a kit axis; the expected count is about 45 / 35 rather than 43 / 33.
- **Simplified:** dropped Worker painting of the ground map from the bake. It wasn't measured as a
  long task, and seam repainting runs on the main thread. The bake reuses the Node build path the
  sliced-build tests already use.
- **Confirmed:** `HouseTile` keeps its near group after building it (the leak in §2.2). `perf-budget.mjs`
  has no `cam` field yet (added to §4.5).

Not folded in:

- The opening-view download budget (≤ 8 MB) stays an estimate until the coarse levels exist.
- The 6× per-task attribution waits for the integrator's perf window (§2.6).
