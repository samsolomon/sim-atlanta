# Handoff: far board C, area far meshes for landmark batches (2026-11-26)

Owner: the Opus perf agent, worktree `studio-far-landmarks`. Coordinator: the Air city-view Claude
(run run_348717205e38).

**Status: stopped, not merged.** The coordinator judged the trade wrong after the measurements
below: −41 draw calls by day only, no triangle change, for +18 MB geometry and +19 MB heap, within
12–13 MB of the Low ceilings. Memory is the scaling constraint, and the phone has been GPU- and
fill-bound more than call-bound (earlier A16 data: −143 calls gave +1.5 fps). The branch
`samsolomon/far-landmark-merge` (b07f28af, on main fb118c6b) is pushed for reference. There is no PR.

## What C did

On Low, beyond the far-board switch (15 km), each area's landmark batch groups draw as **one mesh
per class look** (`materials/landmark-batch.ts`: `areaFar` option, `setAreaFar`, `buildMerges`):
- **Members:** each group's existing far version, or its full range when it has none. Also plain
  meshes that were "alone in their cell", if their look never changes at night. Textured (uv),
  hooked and transparent meshes stay as they were.
- **When it shows:** only while the area is far and every member looks as it does by day.
  Otherwise each member draws as before. Members are hidden from the view only, so shadows are
  unchanged.
- **Build:** after `farReady`, sliced in 30k-vertex steps. It stops if the area is disposed, and
  City downtown's batches join through `terrain.addFar(…, batches)`.
- **Switch:** `?perf&farmerge=off`.
- **Tests:** two in `landmark-batch.test.ts`. One checks that the same triangles are drawn on and
  off, by day and at night; the other checks that a disposed area builds nothing. Both fail with
  the implementation reverted.

## Measured

Prod build on the Studio, Low, phone viewport, matched URLs from one frozen build, with
`farmerge=off` as the "before":

| | Calls | Triangles | Programs | Geometry MB | Heap after GC MB |
|---|---:|---:|---:|---:|---:|
| Default view 14:00, off → on | 343 → 302 | 1,674,001 (same) | 80 → 80 | 159.7 → 177.8 | 428 → 447 |
| Default view 22:00, off → on | 521 → 519 | same | 80 → 80 | 159.7 → 177.8 | 428 → 446 |
| 14 km view 14:00, off → on | 331 → 290 | same | 80 → 80 | | |

- **Where the calls are.** The 48 batch draws at the default view are 24 area far versions, 14
  downtown far versions, and 10 full draws for groups with no far version. They became 14 meshes.
- **Why boxed landmarks reached 205–218.** It also hid about 90 unbatched landmark meshes: glass
  (transparent), hooked facade shaders, and lone plain meshes. Sam ruled out changing glass and
  hooked landmarks (the pop).
- **Night saves almost nothing.** 34 of the 38 far-drawing groups have lit-window runs, which must
  draw separately at night.
- **Phantom draws.** `__perf.captureDraws` counts the full meshes that `hideFromView` skips: three
  still calls `setProgram` for them, then returns at the negative draw range. That is CPU cost the
  `calls` figure doesn't show: 38 such calls at the default view.

## Findings worth keeping

1. **Int16 at area scale z-fights.** Packing an area-wide mesh like a class buffer (Int16 in one
   cube, about 5 cm steps over a 3 km area) collapsed roof caps that sit a few cm proud of their
   roof. A white Midtown roof broke into grey speckle at 14 km
   ([int16-roof-zfight.jpg](../log/far-board-c/int16-roof-zfight.jpg)). The 500 m class cubes step
   7.6 mm, which is why the batches never showed it. Sharing one cube across all of a batch's
   merges did not help, so the cause is the step size, not cube mismatch. Float positions fixed
   most of it, but at +6 MB over Int16.
2. **Floats leave a small residue.** With float positions, day diffs at the switch were 0.038% of
   pixels over 8/255, against a control of 0.010%. At the default view they were 0.023% against
   0.005%. Night was at control.
   - The residue is a reshuffle of an existing near-coplanar fight on the same roof
     ([float-roof-residue.jpg](../log/far-board-c/float-roof-residue.jpg)), plus two specks.
   - My explanation: the GPU rebuilds packed positions as `c + s·q` in float32, and JS doubles then
     float32 round differently, at sub-millimetre scale.
   - Not proven. The next check would be both sides with `&quant=off&colours=float`.
   - Draw order is ruled out: per-merge material clones, created in member material-id order,
     changed nothing.
   - Full sheets: [off | on | diff×4](../log/far-board-c/sw14-day-off-on-diff.jpg),
     [control](../log/far-board-c/sw14-day-control.jpg).
3. **Rain needs care.** `World.setWet` darkens every vertex-coloured Lambert material in the
   group. A frozen material clone drifts from a non-baked run's material, because `sync()` resets
   that run's colour from its source. A plain Lambert alone mesh would darken once its colour moved
   into the vertices. The final commit draws with the groups' live material and skips such alone
   meshes. Rain stills were never taken.
4. **Not measured before the stop:** the long-task gate at 6× (`low-north` / `low-r16`), and
   `test:perf`. No Grok review either.

## If someone revisits it

- **Memory first.** The far versions themselves are most of the bytes (1.05M vertices; downtown
  alone is 600k). A memory-neutral variant would need the area mesh to *replace* per-cell far data,
  for example by building it lazily on the first far switch and freeing it near. That only helps
  views that never go far.
- **Gating.** `city.ts` gates downtown's `areaFar` on `low && !FAR_LANDMARKS`, not on `farboard`,
  so with `farboard=off` it still builds an unused mesh (~11 MB). Gate it on the far board too.

## Cleanup done

- Dev server and preview stopped. No browsers left open (perf-run and img-diff close their own).
- Scratch: frozen builds and stills are in this session's scratchpad (`dist-c`, `shots1`–`shots4`).
