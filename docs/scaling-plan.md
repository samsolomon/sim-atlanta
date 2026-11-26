# City scaling plan, v2

Draft for Sam, 2026-11-26. This is a plan, so it changes no code. It replaces the direction of
[`perf-architecture-plan.md`](perf-architecture-plan.md) (v1, same day), rewritten around what we
measured on 2026-11-26. v1 stays as the evidence record. §7 lists which of its sections still
stand.

Every number is tagged. **M** means measured, with the device and commit. **E** means an
estimate. "Studio 6×" is headless Chrome on the A16 canvas with the CPU throttled. It is a proxy,
not a phone.

## 0. Summary

1. **Memory is the wall, and we are at it.** Low geometry is 150–178 MB against a 190 MB ceiling
   (M, coordinator). A resident km² of full detail costs about 7.6–7.9 MB of Low geometry (M,
   R16's matched pair), so under that ceiling a phone holds about **20 km² of full detail: today's
   board**. Every km² past that has to be coarse or unloaded. The full square is 1,239 km². The
   190 MB is our budget, not a measured kill limit. Increment 0 measures Safari's real memory.
2. **Headroom is gone on every tier.** That covers High night calls (629 of 630), High programs
   (94 of 100) and Low geometry (above). Until it is restored, a feature that adds to a full
   budget ships with an equal cut in the same PR (§4).
3. **Calls are not the phone lever, and we haven't proven what is.** −143 calls gave +1.5 fps on
   the A16. Merging landmark batches (C) saved 41 calls for +18 MB and was stopped. The
   increments that moved phones also removed triangles or expensive shading. The best-supported
   currency is **triangles**. A device A/B with the existing switches comes first and decides the
   order of everything after it (§5, increment 0).
4. **Baking isn't the lever for today's map.** It saved 21% of brookwood-south's mount and nothing
   on three other rows. Downtown's bakeable ground is about 0.6 s of 7.2 s before ready at 6×. Bake
   only areas whose ground is graded or seated (highway landings, interchanges, rail cuts), and
   only when the saving clears a bar (§3.5).
5. **The felt freeze is boot, and the fix is slicing.** `stage:terrain` (2.3–3.0 s at 6×) and
   streets and freight (1.1–1.3 s) are single tasks before ready. Most of that time goes to
   landmark builders, batching and transport, not ground. The integrator owns the slicing.
6. **Unload doesn't need the bake.** v1 put unload behind joined-seam baking. The hold and revert
   added for sliced mounts already restore a neighbour's ground before a mount commits. Unload
   needs that snapshot kept until the area goes, plus four undo paths that don't exist yet
   (§3.2). That is real work, but it isn't a bake.
7. **Far levels add memory unless something is freed.** Far forms are held beside near forms:
   #613 cost +9 MB and C +18 MB. #613's boxes cost about 0.43 MB/km². Over the square that is
   about 530 MB, so the horizon needs a form about 20× cheaper per km² (§3.3).
8. **The next expansion waits on five things.** Headroom restored to the reserve, boot sliced,
   area unload with the growth check passing, per-view budgets, and the device A/B (§3.6).

## 1. What we measured on 2026-11-26

| Finding | Number | Source |
|---|---|---|
| Headroom, High night calls | 629 / 630 | M, #701's `test:perf` on its rebased head (+3 over its base); to re-measure on 92e71e45 |
| Headroom, High programs | 94 / 100 (93 by day) | M, coordinator; #613 final head |
| Headroom, Low geometry | 150–178 MB / 190 (by view and run) | M, coordinator; #613 final head 175.3 MB |
| Boot, `stage:terrain` | 2,710–2,960 ms at 6× on f0c5ef55 (one task); 2,312 ms median after #705 | M, integrator boot profile; #705 |
| Boot, streets and freight | 1,210–1,270 ms at 6× (one task) | M, integrator |
| Boot, ready | 6.9–7.3 s at 6× (f0c5ef55); 6.4 s after #705 | M, integrator |
| Inside `stage:terrain` | landmark builders ~1.2 s, `batchLandmarks` 0.5 s, `buildScenery` 0.45 s, ground tessellation and map ~0.3 s | M, integrator, unminified 6× |
| Bakeable ground before ready | ≤ ~0.6 s of 7.2 s (re-carve 315 ms plus tessellation) | M, integrator |
| Baked ground, brookwood-south | 2,418 → 1,912 ms of row work at 6× (−21%); 1.8 MB Low / 3.9 MB High download | M, #704 (open) |
| Baked ground, three other rows | within noise at 1× (e.g. midtown-upper 242 → 253 ms) for 1.5–4.5 MB each | M, baked-ground handoff |
| Far board, landmarks kept (#613) | iPhone 23.4 → 26.1 fps (+12%); 378 → ~358 calls, 1.82 → 1.61M triangles; +9 MB Low geometry | M, coordinator iPhone 15 Pro, cdd6d76a |
| Far board, boxed landmarks | iPhone 36.2 fps (+55%); 218 calls, 1.21M triangles; also hid ~90 glass, hooked and lone meshes; **popped** | M, same run |
| Calls alone | −143 calls → +1.5 fps | M, coordinator, A16 (earlier release) |
| C, merged landmark far meshes | −41 calls by day, −2 at night, 0 triangles, +18 MB geometry, +19 MB heap; stopped | M, Studio, far-landmarks handoff |
| C, Int16 over a 3 km area | 5 cm steps; roof caps a few cm proud z-fought | M, far-landmarks handoff |
| Connector traffic (#688) | iPhone traffic 15 → 3.3 ms/frame; fps 18 → 23.5 | M, coordinator iPhone |
| The GPU gap after #688 | 23.5 fps against 24.6–26.6 on release 16, with CPU 15 ms against 23 ms: about 1–3 fps of unattributed GPU time | M, #688 |
| A16 on 2026-11-23 | GPU-bound; post and shadow off +0.2–1.6 fps; **a lower pixel ratio gained nothing**; hiding ground +7, trees +4, landmarks and transport +3 fps | M, build log 2026-11-23 |

Main is now 2026bf31 (#705 merged). No phone run exists on it yet.

## 2. Where v1 was wrong

Plainly, so the next plan doesn't inherit these.

1. **"Ground work is most of the main thread" was wrong for boot before ready (v1 §0.3, §2.6).**
   v1's 1× buckets covered boot plus all 12 area mounts, and put buildings at 0.08 s. The
   integrator's 6× profile of downtown before ready puts landmark builders and batching at about
   1.7 s (roughly 0.3 s at 1×), so v1 under-counted buildings about 3.5×, and bakeable ground
   there is about 0.6 s. Ground does still dominate the graded area mounts (R16, brookwood-south).
   The error was carrying that to downtown's boot, which is where the iPhone freezes. Where v1
   filed the landmark builders is unverified; its "Other, 1.01 s" bucket is the likely place.
2. **Baking as the main-thread lever (v1 increment 5).** It works where ground is graded and seated
   (brookwood-south, R16). Elsewhere it costs 1.5–4.5 MB per row and saves nothing.
3. **Unload had to wait for the bake (v1 §4.2, critical path 0 → 2 → 5 → 6 → 9).** That was the
   wrong dependency. Seam carves can be rebuilt from the yield list (§3.2). The bake was never the
   only way to make unload safe.
4. **"Like the A16, the steady state is draw-bound" (v1 §1, and the Low 250-call end ceiling).**
   −143 calls bought 1.5 fps. Calls are a guard, not the target.
5. **C's estimate.** v1's handoff expected about 240 calls by day with nothing visible changing and
   didn't count memory. C gave 302 calls (−41) for +18 MB. Night saved almost nothing, because 34
   of 38 far groups have lit windows.
6. **Far LOD saves memory (v1 §3: "≤ 150 MB resident, flat").** Far forms sit beside near forms
   until something is freed: +9 MB (#613) and +18 MB (C). LOD without unload makes memory worse.
7. **L2 packed like #575 (v1 §4.3).** Int16 over a 3 km cube z-fights roof caps (C). Packing
   needs cubes of about 500 m or less, or geometry with no near-coplanar parts.
8. **Bake byte estimates.** v1 §4.1a estimated about 0.6 MB per Midtown row on Low. It measured
   1.5 MB (midtown-upper) and 1.86 MB (brookwood-south). The host also sends binaries
   uncompressed, so files ship as .gz.
9. **Runway.** v1 treated "today plus 10%" ceilings as room to grow. Building skins and #613
   spent that room within a day.
10. **Boot had no gate.** #613 added about 0.5 s to boot at 6× and nothing failed. The integrator
    found it by hand (#705). `test:perf` checks long tasks only after ready.

## 3. The path to the full square

### 3.1 The constraint: a memory model per km²

Low (the phone tier). Today's board is 21.2 km² (19.0 plus R16's 2.24).

| Item | Cost | Source |
|---|---|---|
| Full detail, resident, seen from a distance | 7.6–7.9 MB geometry/km²; ~25 MB heap/km² | M: R16 pair (+17.6 MB per 2.24 km²); today's 160 MB / 21 km² |
| Close-camera detail (houses, near ground) | +60 MB per neighbourhood in view; houses never freed (+58 MB after `route:north`) | M, v1 §2.2 |
| #613 far boxes, held beside near | 0.43 MB/km² (9 MB / 21 km²) | M, #613 |
| C merged far meshes, held beside | +18 MB / 21 km² | M, C |
| Coarse horizon needed for the square | ≤ 25 KB/km² on average (≤ 30 MB for 1,219 km²) | E, target |

What follows:

- **The resident window of full detail is about 20 km² on Low, for good.** Today's 21 km² use
  150–178 MB. With 165 MB usable (190 minus the reserve in §4), the room left is 0–15 MB, which
  is 0–2 km² at the marginal 7.9 MB/km². Nothing more fits until something is unloaded or packed.
- **The ceiling is our number, not the phone's.** `geometryMB` is estimated from the scene
  (docs/perf.md), and Safari's real per-tab limit on the iPhone 15 Pro hasn't been measured.
  Increment 0 records Safari's memory at the default view and after `route:north`. If the real
  limit is much higher, the window grows, but the per-km² cost and the need to unload don't
  change. Packing generic buildings and houses (v1: about −18 MB on
  generic buildings alone, E) buys roughly 2–3 km², not a direction.
- **Coarse has to be about 20× cheaper per km² than #613's boxes.** Proposed split (E):
  - an L1 ring (out to about 8 km from the camera, ~200 km²) at ≤ 80 KB/km², about 16 MB;
  - L2 and L3 for the rest (~1,000 km²) at ≤ 10 KB/km², about 10 MB.
- **High** has a second wall in ground maps: 21.8 MB of texture per km² (M, R16). Distance-tiered
  maps (v1 §4.3) come before any High expansion past today's texture ceiling.

### 3.2 Streaming: load and unload

**Unit.** Today's areas (rows of 2.24 km²) first. 800 m tiles (#435's lattice, 1,936 tiles,
~5,808 files, 29% of the free file cap) come before the second expansion step.

**Load.** As R16 does today: lazy, sliced, on approach, behind fog or the coarse form. This
already works. Sliced mounts reach a longest task of 185–335 ms at 6× (M, docs/perf.md).

**Unload, without the bake.** No area unloads today. Dispose runs only at City teardown, so its
undo paths have never been exercised. R16's dispose does undo part of its seam work:
`restoreMaps()`, the seam buildings' `dispose` (which shows the Station's fragments again) and
`seamNormals.reset()` (`city.ts` near line 1127, `north-seam-neighborhood.ts`). The gaps, checked
on main 2026bf31:

| Mount effect | Undo today | Needed |
|---|---|---|
| Seam cut in the Station's ground (`holdGround`, then `release` at commit) | `revert()` does nothing after `release()` | The kept snapshot, below |
| `connect()` → `openJoin` hides each neighbour's joining-edge wall | None: there is no `closeJoin` | `closeJoin`, and removal from `mounted` |
| `northLine.extend(rails)` (`city.ts` 1144) | None | A `retract`. North Line trains stop at the loaded end and draw on the coarse level past it (v1 §4.2's vehicle rule) |
| `preparedBrookwood.mountNorthFreight` (freight edge and height, `brookwood.ts` 731) | None | Restore the edge and height function |
| City-wide tree registration (`commitTrees`) and far boxes | Area dispose unregisters some (yard planting; `terrain/model.ts` near 897) | Verify for every registry in the unload test |

Today the seam cut doesn't matter, because no seam building has a yard and the cut list is empty.
The first yard would leave a cut in the Station after R16 unloads.

**Eviction order.** An area whose seam layers stand on a neighbour (R16 on the Station) unloads
before that neighbour, never after. The ring manager evicts dependants first.

Re-tessellating the neighbour without the unloaded area's yields was the first idea, and it is
wrong. Yields are closures that sample the surface when they are built (v1 §4.1a), so any yield
built after the seam cut holds floors read from the cut ground. Instead:

1. **Keep the hold's snapshot until unload.** `release()` shows the carved ground but keeps the
   pre-carve arrays (and `farBefore`). The area's dispose calls `revert()`, which restores them.
   Cost: one copy of the neighbour's near ground arrays per mounted seam, about 1–2 MB on Low (E).
   That counts against the budget.
2. **If the neighbour was carved again after the seam cut** (by a third area, say), the snapshot
   is stale. Rebuild the neighbour whole as a sliced mount (it builds in steps already), and log
   it in dev and in the perf summary.
3. **Test:** mount R16, commit, unload, and fingerprint the Station (as `sliced-build.test.ts`
   does) against a Station that never had R16: ground, joining walls, fragments, freight edge,
   North Line extent and tree registries. Add a seam building with a yard in the fixture, so the
   test fails with the snapshot dropped.

Eviction then works by distance, with hysteresis and an LRU under the per-tier memory budget,
as v1 §4.2 describes. The near-house leak is fixed first, as the same rule at the smallest
scale: dispose `HouseTile`'s near group a few seconds after it leaves the near band. The leak is
still on main. `house-lod.ts` never frees its near group.

**Joined-seam baking** becomes optional. It applies only where a seam's ground work is itself
heavy (R16-class landings).

**Per-frame work must scale with what is near, not with the board.** This is the lesson of #688:
one O(triangles-per-run) lookup per traffic sample cost the phone 13–50 ms a frame. Every system
updated per frame (traffic, LOD checks, night fan-out, far switches) has to be bounded by a spatial
index or the resident set, and gated by **counts** (samples per car, objects visited per frame),
not by milliseconds. Counts don't move with machine load (docs/perf.md, `_traffic`).

### 3.3 Far levels that don't pop

Sam's rule (v1 §7.3): simple far forms are fine if a blink test at normal views shows no pop.

| Level | Covers | Form | Budget (E) |
|---|---|---|---|
| L0 | Resident window, ~20 km² | Full detail, built or baked | ~7.6 MB/km² today, packed toward ~6 |
| L1 | Ring to ~8 km | #613-style boxes, but oriented boxes per block rather than footprint walls, plus canopy masses; landmarks keep their own far versions | ≤ 80 KB/km², ≤ 2 draws per tile |
| L2 | Beyond L1 | Block masses on a coarse ground, colours from the near palette and season | ≤ 10 KB/km², 1 draw per 3.2 km block |
| L3 | Horizon | #538's very-far ground | 1–2 draws |

Rules carried over from what we measured:

- **Colours come from the near-form functions** (palette, `World.setSeason`, the night window
  share). ce1aed44 failed by computing its own.
- **Int16 only in cubes ≤ ~500 m**, or in geometry with no parts within a few cm of each other.
  Otherwise use float (C finding 1).
- **Night needs its own plan.** Lit windows split draws (C: 34 of 38 groups). L1 and L2 carry
  #613's warm-point night share, not per-window geometry.
- **A far level replaces a near form; it doesn't sit beside it.** A unit either holds its near form
  or its far form. If it holds both (as #613 does inside the resident window), that counts against
  the budget.
- **The blink harness gates every level**: default, wide and dolly cameras, 14:00 and 22:00,
  strips at 0.8×, 1× and 1.2× of the switch distance (v1 §4.3).

**The biggest measured phone prize lives here.** Boxed landmarks reached 36 fps on the iPhone
against 26 with landmarks kept. It popped, so it was rejected. The landmarks it hid included
glass and hooked-shader meshes, likely expensive per pixel. A far form per landmark that matches
the silhouette and colour (fewer triangles, plain kit material), blink-tested, is how to collect
part of that gap without a pop. That comes after increment 0 says whether the gap was triangles,
transparency or shading.

### 3.4 Download per km²

| Item | Bytes | Source |
|---|---|---|
| Area source data (`ground.i16` + `context.json`) | ~0.45 MB/km² on disk (1.0 MB per 2.24 km² row) | M, row files |
| Baked ground, where used | +0.83 MB/km² Low, +1.76 MB/km² High (gz) | M, brookwood-south |
| Statewide `data/ga` | 6.4 MB, fixed | M |
| Coarse levels for the square | ~5–10 MB gz in total | E |

- A visitor downloads the resident window (~9 MB, E) plus the coarse set plus `data/ga`. That is
  about 20–25 MB at the opening view, whatever the square's size (E).
- Hosted in total: about 560 MB of source for the square (E). That is static, at no per-visitor
  server cost, inside the file cap with 800 m tiles.
- Ship binaries as .gz with `DecompressionStream`. The host doesn't compress `.i16` and `.bin`.
- Baking everywhere would triple Low's bytes per km² (0.45 → ~1.3). That is another reason to bake
  only where it pays.

### 3.5 Where baking pays

Bake an area's ground only if it saves **≥ 300 ms of main-thread work at 6×** (the coordinator's
bar; about 30 ms at 1×) and its download stays within the per-km² budget above. That is true
where ground is **graded or seated**: `gradeSouthboundSteps`, `seatLandingEdges`, conformed cut
edges, and joined highway landings. Today that is brookwood-south and R16 only. Ahead it is
likely the heavy areas: the Downtown Connector interchanges (I-75/85 with I-20), I-285's
interchanges (Spaghetti Junction), the airport's runway grading and rail cuttings. That is an
estimate; measure each when it is built.

Downtown's ground isn't one of those areas. Its bake would save at most 0.6 s, and the integrator's
slicing turns that time into frames anyway.

**#704 (brookwood-south): park it (coordinator, 2026-11-26).** It is already merged and ships in
release 19. The saving is 0.5 s of a mount that is already sliced and happens after ready, which
means faster fill, not a shorter freeze. A follow-up PR after increment 0 turns the bake off by
default and stops shipping the bake files. It keeps the code and the CI step for the first heavy
area, so visitors stop downloading 1.8–3.9 MB for that gain.

### 3.6 What must be true before the next expansion

1. **Reserve restored** on every tier (§4): High night calls, High programs, Low geometry.
2. **Boot sliced.** No task before ready over 300 ms at 6×, with a boot gate in `test:perf` so
   another #613 can't add 0.5 s unnoticed.
3. **Area unload works** for R16 and the new area. The growth check (`route:north` out and back,
   geometry and heap within +10%) passes.
4. **Per-view budgets.** Opening, Midtown street, R16 and the new area's showcase camera, per tier.
5. **The device A/B is done** (increment 0), so we know which currency the new area is paying in.
6. **The new area's marginal cost is measured** in MB/km², calls and triangles, and fits under the
   reserve with unload on.

Before South, or any step past about 3 areas: 800 m tiles, the ring manager, and L1 to L3.

## 4. Budget policy: features pay for themselves

**Currencies, in order of what phones pay:**

| Currency | Why | Gate |
|---|---|---|
| Low geometry and heap | The scaling wall (§3.1); a phone tab that runs out is killed | `test:perf` ceilings, plus the growth check |
| Triangles (Low) | The best-supported fps currency on both phones (§1) | ceiling |
| Longest task (6×), boot and after ready | The freeze people feel | `low-north`, `low-r16`, and a new boot gate |
| Per-frame CPU counts (traffic samples and objects visited) | #688 | count ceilings |
| Calls, programs | Guards: High night and programs are at the ceiling, but calls barely move phone fps | ceilings |

**Reserve.** Each tier keeps a reserve under its ceiling that features may not spend. Only Sam
releases it, for an expansion or a decision.

| Tier | Reserve (proposed) |
|---|---|
| Low | geometry ≥ 25 MB (about 13%), heap ≥ 40 MB, triangles ≥ 150k |
| High | programs ≥ 10 free, geometry ≥ 25 MB |
| High night | calls ≥ 40 free |

**Bootstrap.** At 629/630 there is nothing to reserve, so the restore increments come first (§5:
2a–2c). Until each currency is back above its reserve, a PR that adds to it must remove at least as
much in the same PR. Measure that with a same-build A/B in `test:perf`.

**Every PR that changes what City draws or loads** states its cost in each currency it moves
(`test:perf` against main), names its offset if a currency is under reserve, and keeps:

- landmarks adding **0 programs** (the program-rule lint, v1 §4.4);
- per-frame work O(near), with a count gate when it samples the world;
- far forms that replace rather than add (§3.3).

**Ratchet.** When a cut lands, the ceiling moves down (today's rule). Raising a ceiling is Sam's
call.

## 5. Next increments, ranked

The ranking assumes triangles are the phone currency. **Increment 0 can reorder 2d, 5 and 7.**

| # | Increment | Phone win | Cost (agent-h) | Risk | Owner |
|---:|---|---|---:|---|---|
| 0 | **Device A/B** (one perf-only switch, no product change). iPhone and A16 on main 2026bf31: default and Midtown street at 14:00 and 22:00, with `farboard=off`, `shadow=off`, `nopass=ink,grade,tilt,bloom,gtao`, `post=off`, `pr=0.6`, and a `pr=` sweep with `farlandmarks=1` (the boxed landmarks) on and off. One new switch, `?perf&hidelm=glass|hooked`, hides those far landmarks alone, so the boxed result can be split into triangles, transparency and shading. Also a Safari timeline, Safari's memory at the default view and after `route:north`, and an A16 GPU trace for the 1–3 fps GPU gap | None directly; it sets the currency. M: 2026-11-23 found pixel ratio worth nothing | 2–3 + coordinator device time (~2 h) | Low | Coordinator, with a frozen build from me |
| 1 | **Slice boot**: landmark builders, `batchLandmarks`, `createDowntownTerrain`, `createSurfaceTransport` through `runBudgeted`, plus a boot long-task gate | iPhone freeze before ready (~10 s) turned into frames. E: longest pre-ready task 2.3 s → ≤ 300 ms at 6×. No fps change | 6–10 | Medium: keep surface reads and carve order unchanged (bake seam); byte-identical fingerprints as #621 | **Integrator** |
| 2a | **Night windows ride the wall draw** (v1 increment 4) | E: −100–130 High-night calls; Low 22:00 is 521 calls. Restores High night | 6–10 | Medium: night look; matched-frame pixel diff | Materials owner |
| 2b | **Programs phase A plus the lint** (v1 §5) | E: −30 High programs. Restores programs; phone fps ~0 | 8–12 | Medium: side, flat and alpha moves shift pixels | Materials owner |
| 2c | **Free near houses; pack generic buildings and houses** | E: Low geometry −18 MB (packing) and flat after routes (house leak). Restores Low geometry | 6–10 | Low–medium: Int16 cube size ≤ 500 m | Streaming owner |
| 2d | **Per-view budgets, growth check, boot gate** (v1 increment 0) | None; it stops silent regressions (#613's boot cost, the street view over its ceiling) | 6–10 | Low | Streaming owner |
| 3 | **Area unload**: the seam snapshot kept until unload (§3.2), R16 first; eviction by distance with hysteresis | Memory flat with travel; required for any expansion. E: frees ~17.6 MB of Low geometry per row unloaded | 20–30 | Medium–high: five undo paths that have never run (§3.2), eviction order, and follow and deep links into an unloaded area (#682's rules) | Streaming owner |
| 4 | **Close the GPU gap**, from increment 0's traces | E: up to +1–3 fps on the iPhone | 2–6 | Unknown until traced | Me, with the coordinator |
| 5 | **Landmark far forms without pop**: silhouette and colour-matched far versions on the kit material for landmarks past 15 km, glass and hooked included, blink-tested | M upper bound: 26 → 36 fps (boxed, which popped). E: +10–25% iPhone | 15–25 | High: the look of approved landmarks; Sam's sheet | Far-LOD owner |
| 6 | **800 m tiles and the ring manager** (#435's lattice, index, `immutable` static files) | Enables Stage 2 | 25–35 | Medium: pan hitches, file count | Streaming owner |
| 7 | **Coarse levels L1 to L3** to the §3.1 budgets, with the blink harness | Enables the square; E: triangle-neutral at the opening view if L1 replaces today's far boxes | 20–30 | High: the look at the switch | Far-LOD owner |
| 8 | **Programs phase B** (library kinds, data texture, facade array) | E: −15 programs more; batches hooked landmarks (calls) | 20–30 | High: every approved landmark | Materials owner |
| 9 | **Bake per heavy area** (§3.5 bar), reusing #704's mechanism | Per area: M brookwood-south −21% of its mount | 4–8 per area | Medium: stale bakes, bytes | Bake owner |

**Not on the list:** C (stopped: memory for calls), baking downtown or ordinary rows, and any
change whose only win is calls.

**Order.** Increments 0 and 1 run now and in parallel (one needs the device, the other the
integrator). Then 2a–2d, which restore the reserve. Increment 3 is the gate for the next
expansion. 4 and 5 follow increment 0's result. 6 and 7 come before South. 8 and 9 come when a
feature or an area needs them.

**Deploy.** Increments 6, 7 and 9 change pipeline output, so each needs `pnpm data`, a `web/dist`
rebuild and a redeploy, and each PR says so. The others need only a rebuild.

**Integration owners** (per AGENTS.md): streaming (2c, 2d, 3, 6), materials (2a, 2b, 8), far LOD
(5, 7), boot (1, integrator).

## 6. Stages to the square

| Stage | Extent | What carries it | Resident Low geometry (E) |
|---|---|---|---|
| Today | 21 km² | Everything resident; far boxes beside | 150–178 MB |
| 1. Next expansion | ~25–30 km² | Increments 0–3: areas load and unload; the window stays ~20 km² | ≤ 165 MB |
| 2. Inside the perimeter, in part | ~30–300 km² | Tiles, ring manager, L1 and L2 (6, 7) | window ~120 MB + coarse ≤ 30 MB |
| 3. The full square | 1,239 km² | L3 horizon; bake only heavy tiles (9); High ground maps tiered | the same, flat |

Main-thread build stays proportional to what is resident, not to the square: one row of mount
work per row entered, sliced (M: ≤ 335 ms longest task at 6×).

## 7. What stands from v1

- **Still stands:** §1 methods; §2.2–2.5 measurements (memory by layer, programs by bucket); §3's
  extent and file-count arithmetic; §4.2's ring manager, hysteresis and follow rules; §4.3's
  parity and blink-harness rules; §4.4–4.5 (program rule, per-view budgets); §5's program design;
  §7, Sam's decisions.
- **Superseded:** §0's summary and §6's order. §2.6's buckets (see §2.1 above). §4.1's "bake first",
  and the unload-after-bake dependency. §3's "proposed" column where it assumed far LOD saves
  memory or that L2 packs to Int16.

## 8. Decisions (2026-11-26)

1. **#704:** park it. It ships in release 19, and then a follow-up turns the bake off by default
   (§3.5).
2. **High night 629/630** came from #701's rebased head. #613's 587 came before #700 and #701.
   Re-measure on 92e71e45 (release 19).
3. **Sam adopted the reserves in §4:** Low geometry 25 MB, High programs 10, High night calls 40.
   The offset rule includes queued building skins, and PR bodies give before and after numbers.
   They are encoded in `perf-budget.json` and the review charter.

## Architect review (2026-11-26)

I ran `architect-plan-review` on the first draft and checked its claims against main 2026bf31.

- **Significant, fixed (§3.2):** the unload design re-tessellated the neighbour without the
  unloaded area's yields. Yields sample the surface when they are built, so later yields would keep
  floors read from the cut ground. The check also showed that the seam cut's `revert()` does
  nothing after `commit()`, so today's dispose path can't undo it. It is harmless only because the
  cut list is empty. The plan now keeps the hold's snapshot until unload, rebuilds the neighbour if
  it was carved again, and adds a fixture test with a yard.
- **Significant, fixed (§0, §3.1, increment 0):** "memory is the wall" rested on our own 190 MB
  ceiling and estimated `geometryMB`. Increment 0 now measures Safari's real memory. The
  resident-window arithmetic now uses the marginal cost per km².
- **Minor, fixed:** increment 0 adds `farlandmarks=1` (the boxed landmarks are still on main
  behind it), and §5 names which increments need `pnpm data`.
- **Confirmed:** R16's dispose restores maps, seam buildings and normals (`city.ts`,
  `north-seam-neighborhood.ts`). `?perf&farboard=off` exists (`terrain/model.ts`). `HouseTile`
  still never frees its near group. Increments 2a–2d from v1 have not landed.
- **Significant, fixed after a second check (§3.2, increment 3):** the draft said "one gap is
  left" for unload. Main also has no undo for `openJoin`, `northLine.extend` or
  `mountNorthFreight`, and tree registries are only partly unregistered. The plan now lists them
  with an eviction-order rule, and increment 3 is re-rated to 20–30 h, medium–high risk.
- **Fixed:** §2 item 1 compared v1's 1× whole-load buckets with the integrator's 6× pre-ready
  profile. It is now scoped to boot before ready, with the size of the error (about 3.5×).
  Increment 0 gains a `hidelm` switch, because the existing switches can't separate triangles from
  glass and hooked shading.
- **Answered since:** High night is 629 in the brief, but #613's body shows 627 mid-PR and 587 at its final
  head. Which head 629 comes from decides whether 2a is a restore or a nice-to-have. I've asked the
  coordinator.
- **Not folded in:** separate sources for 629/630 and the A16's −143 calls. They are quoted from
  the coordinator and tagged that way. The stage memory figures in §6 stay estimates until 2c and 3
  land.
