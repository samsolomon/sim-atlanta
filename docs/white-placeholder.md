# The white placeholder

Sam's decisions (2026-11-27):

- Anything not loaded yet draws as the white study model, so the board never shows an empty square.
- Areas fade from white to colour as they load, as City's opening does.
- Content is buildings only: white masses with ink on one plain paper ground, seated at true height. Streets,
  trees, rail and water arrive with the colour.
- At night the masses take a bluish tone (City's night blue, a little lifted) with cream ink.
  By day they stay white with dark ink.
- Unloading (increment 3, later) drops an area back to white, never to blank.

Code: `web/src/city/placeholder.ts` (City layer), `placeholder-data.ts` (file format),
`placeholder.node.ts` and `web/scripts/placeholder.bake.ts` (the bake). The opening's white model is
`white-model.ts`. The night ink is in `vignette/ink.ts`.

## What it draws

There is one mesh per area: a coarse paper ground (40 m grid), a skirt down to the plinth's bottom, and the
area's building masses. Each mesh is one draw plus its shadow. The masses are the area's own far form, so
each white mass stands where its coloured building lands:

- the far-board boxes of generic buildings and houses (`area.farBoxes`);
- a box stack per landmark part, taken before landmark batching, glass included (`boxesFromObject`,
  `seeThrough`).

Rings are simplified to 0.75 m and at most 40 vertices. Masses are seated on the drawn ground as the far form
seats its boxes. A part standing clear of the ground (a skybridge, a canopy) is dropped, unless it rests on a
kept part of the same landmark: a tower's upper bands start where the band below ends. The bake fails if any
landmark's masses stop short of its top. The 12 areas hold 7,371 masses.

A landmark's masses are its far-board box stacks, so an L-shaped podium fills its rectangle. That is visible
in `06-midtown-towers-white-colour.jpg`, a matched white and colour pair. Generic buildings keep their
footprints.

Coverage check (in the bake): 4,588 of 4,601 footprints of 150 m² or more have a mass. The 13 without one are
buildings that City builds outside the area builders:

- Ebenezer and Heritage Sanctuary (`auburn-sanctuaries.ts`);
- The Brookwood and the Brookwood station structures;
- a handful of R16 seam buildings (`north-seam-neighborhood.ts`).

Downtown has no placeholder. It is built at boot, before any frame, so its placeholder could never show.
Increment 3 adds it if downtown ever unloads.

## The file

`web/public/data/scene/placeholder/board.bin.gz` is written by `pnpm data:bake`, which runs after the rest of
`pnpm data` because it reads the staged areas. It is gzipped because the host sends binaries without
Content-Encoding; City inflates it with `DecompressionStream` (`bakeBytes`).

The format is per area: a ground grid, then building rings with y0 and y1. It is source-agnostic. The
bake fills it from each area's far form. A tile City never builds, the rest of the I-285 square, can be
filled from Overture footprints and heights alone with the same reader.

| | Measured (17.3 km², 12 areas) |
| --- | --- |
| Download | 227 KiB gz, 13 KiB/km² (scaling plan §3.1: L1 ≤ 80, L2 ≤ 10 KB/km²) |
| Low geometry, resident | 2.81 MB (0.16 MB/km²) |
| Triangles, every area shown | 140k (all areas loaded: 0 drawn) |
| Fetch and decode | 2 ms at 1×, 52 ms at 6× |
| Mesh build (one task, before the first frame) | 11 ms at 1×, about 130 ms at 6× |
| New programs | 0 on Low and High (shares the mosaic plinth's plain Lambert program) |
| Draws | one per area shown, plus its shadow |

At 1,239 km² the same density is about 16 MB of download and 200 MB of geometry, so the full square needs
the L2 form (scaling plan §3.3). The format carries that form unchanged.

## Budget: same-build A/B (`test:perf`, 2026-11-27)

The build is the same for both columns. `PERF_QUERY='&placeholder=off'` is the B side. The views are
`test:perf`'s: the default open view, with 12 areas mounted. R16 loads only when looked at, so it is white
at the default view.

| | Low on | Low off | Δ | High on | High off | Δ |
| --- | --- | --- | --- | --- | --- | --- |
| Geometry MB | 163.0 | 160.2 | +2.8 | 274.3 | 271.5 | +2.8 |
| Triangles | 1,692,511 | 1,679,265 | +13,246 (R16's white) | 6,494,177 | 6,480,931 | +13,246 |
| Calls | 346 | 346 | 0 | 440 | 439 | +1 |
| Calls, High at 22:00 | | | | 630 | 629 | +1 (ceiling 630) |
| Programs | 80 | 80 | 0 | 94 | 94 | 0 |
| Texture MB | 108.7 | 108.7 | 0 | 772 | 772 | 0 |
| Heap after GC MB | 433 | 430 | +3 | 551 | 548 | +3 |

Low geometry stays inside the 25 MB reserve: 27 MB is left under 190.

The +1 call on High is R16's white mass at the default view. High at 22:00 is at its 630 ceiling, and under
its reserve, so it needs an offset (scaling plan §4) or Sam's word. Night windows in the wall draw (2a) is
expected to free 100 or more of those calls.

The moving checks were single runs, so they are noisy:

| Check | On | Off | Ceiling |
| --- | --- | --- | --- |
| `low-north` longest task | 207 ms | 191 ms | 650 |
| `low-north` load longest task | 188 ms | 164 ms | 300 |
| `low-north` route task | 373 ms | 336 ms | 500 |
| `low-zoomout` longest task | 59 ms | 59 ms | 500 |
| Studio ready, Low | 1,486 ms | 1,377 ms | |
| Studio ready, High | 1,617 ms | 1,487 ms | |

Both runs report one late compile at 17:30 on both tiers ("no owner found"). It happens with the placeholder off too, so it
isn't this layer, and nothing in this change compiles at dusk. It's probably already on main.

Partial boards, where the layer actually draws, cost less than the full board in every currency except
geometry: each white area replaces the area that would stand there. Every area shown draws 140k triangles in
12 draws.

## One system with the opening

- **The same white.** The material is `WHITE_MODEL` at `WHITE_ALBEDO`, on the same Lambert shading the opening
  swaps onto the scene.
- **The same ink.** Ink is one pass over the frame. `WHITE_INK` and the normal strength are both 0.9.
- **The same fade.** The fade takes `WHITE_FADE_MS` (1 s) on the opening's ease-in-out (`WHITE_EASE`,
  `easeInOut`).

The opening leaves placeholder meshes alone: they are white already. In map mode (white buildings over the
2D map) the placeholder draws its masses only, so no paper ground covers the map.

## The dissolve

If the file arrives more than 400 ms after City reaches its first frame, each area dissolves in the same way in reverse,
rather than popping in.

When an area mounts, `addArea` calls `reveal(id)`. Its placeholder dissolves from the next frame drawn, so a
first-draw shader compile doesn't eat the fade, and is then hidden.

The dissolve draws no blending, so phones get a stippled dissolve and every tier gets the same one. The
index is ordered skirt, ground cells, masses. Masses and ground cells are each in a stable shuffled order.
The draw range shrinks over the fade:

1. Masses disappear one at a time over the first 65%.
2. Ground cells disappear over the rest.
3. The skirt goes last.

The material has a small polygon offset toward the camera, so where a white surface and the area arriving
under it coincide, white wins until it leaves. Nothing pops: each mass that remains sits on its coloured
building.

Trees, lamps and anything taller than the paper ground show in colour from the first frame of the dissolve.
That is Sam's "they arrive with the colour". The 40 m ground lets the real ground show through in places
where it stands higher, and only mid-dissolve.

## Night

The material colour moves from white to `#47547c`, and the emissive from 0 to `#2b3554`, with City's darkness.
The values were chosen against the 22:00 stills (`docs/log/white-placeholder/03-day-night.jpg`).

The ink pass draws its lines cream (`#efe6cf`) where the nearest surface under a line lies inside an area
still drawn white. It reconstructs that surface from depth through the inverse view-projection, and tests it
against at most 16 area rectangles. This costs no program and no extra pass, and runs only after dark.
Lines on coloured areas stay dark.

## The far boxes and the >15 km view

The two are never drawn together. Loaded areas keep their coloured far boxes beyond 15 km, as before. A
loaded area's placeholder is hidden once its dissolve ends, at every distance. An area not loaded draws white
at every distance.

The >15 km view (the full-board frame is about 22 km) therefore changes only while areas load or after one
fails: those areas are white instead of bare table (`04-full-board-mid-load.jpg`). Fully loaded, it is unchanged.

The placeholder geometry stays resident for loaded areas too, so unload can show it with no work. That
2.81 MB is held beside the far boxes, which cost about 9 MB.

The other choice is to make the placeholder the far form of loaded areas too: drop the far boxes and save
about 9 MB of Low geometry. The cost is that the >15 km view of a loaded board turns white and loses #613's lit
windows at night. That is Sam's call; it isn't built.

## Streaming hooks

These are all show and hide. Nothing is torn down:

| Call | Effect |
| --- | --- |
| `show(id)` | whole (at boot, and on unload later) |
| `appear(id)` | dissolve in (a file that arrives late) |
| `reveal(id)` | dissolve into the mounted area |
| `hide(id)` | at once |
| `ids` | the areas the file covers |
| `rects(out)` | the areas drawn white now, for the ink |

Increment 3 calls `show(id)` when an area unloads. A failed area stays white, and its area note still
tells the visitor why.

## Switches

| Switch | Where | Effect |
| --- | --- | --- |
| `?perf&placeholder=off` | any build | No placeholder, for A/B runs |
| `?perf&placeholder=flat` | any build | Shared vertices, flat shading: 1.37 MB instead of 2.81, one more program |
| `?placeholderhold` | dev only | Load no area past downtown, to review the placeholder |
| `?placeholderfade=0.3` or `=brookwood-station:0.3` | dev only | Hold dissolves at that progress, for stills |
| `PERF_QUERY='&placeholder=off' pnpm test:perf` | script | Same-build A/B |

## Deploy

The change needs `pnpm data` (its last step, `pnpm data:bake`, writes the file), a `web/dist` rebuild and a
redeploy. Older data has no file: City logs "City placeholder unavailable" and runs as before.

The bake reads the far form, so the placeholder is only as fresh as the last `pnpm data:bake`. A building
that changes shape keeps its old mass until the next bake. Unlike the ground bake, there is no code hash yet.

## Known gaps

- Coloured trees and rail drawn by City-wide layers float over white areas that aren't loaded. Before this
  change they floated over bare table.
- The 13 buildings listed under coverage have no mass.
- There is no downtown placeholder (see above).
