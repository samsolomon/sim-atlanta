# Phone performance

The reference device is a Galaxy A16 (Android 16, Chrome 157, 1080x2340, DPR 2.625, 411x891 CSS px).
The targets at `q=low` are 30 fps sustained and ready in 8 s or less.

## Instrumentation (`web/src/core/perf.ts`)

The module is always loaded, and it is cheap. It stores one timestamp per frame and keeps a list of load phases.
Everything else runs on demand.

- `__perf.report()` in the console returns:
  - fps over 1 s and 10 s, and frame-time p50, p95 and max
  - CPU ms per frame, split into the scene update and the `composer.render()` submit
  - draw calls, triangles and programs
  - memory by category
  - JS heap
  - load phases
  - mounted areas
  - device facts
- `__perf.top(25)` returns the heaviest meshes by triangles, with their category and ancestry.
- `?perf` adds:
  - an on-screen overlay, refreshed every 0.5 s (memory every 15 s; tap to refresh)
  - one `PERF_PHASE name ms heapMB` console line per phase
  - a crash trail in localStorage (`perf-trail`). The next `?perf` load reports a run that never reached `ready`.
- `?perf=run` waits for `ready`, then for area mounts to stay quiet for 5 s, then samples 10 s. It writes the result three ways:
  - a `PERF_RESULT {json}` console line
  - a green on-screen box
  - localStorage `perf-result`

  Then it sets `document.title = 'PERF_DONE'`.

**Ready** means colour is revealed and a frame has been drawn. Without the white model, the reveal happens before the first frame,
so the gap between `city:renderer` and `city:first-frame` is shader compilation.

**Memory** is estimated from the scene, not read from the driver:

- **Textures:** width x height x bytes per texel, plus a third for mipmaps.
- **Geometry:** attribute and index array bytes, including instance matrices and colours.
- **Post:** the shadow map plus every composer and pass render target.
- **cpuMB:** what the page still holds after upload (attribute arrays, canvas backing stores).

Textures that were uploaded but are no longer referenced by any scene material are not counted. The ground-contact
agent's upload meter (`scripts/gpu-meter.mjs`, from #282) counts them.

Categories come from the roots that `city.ts` holds: area boards (terrain), area scenery, surface transport,
vehicle layers, and downtown landmarks (buildings). An object's `userData.perf` overrides its root's category.

### A/B switches (only with `?perf`)

| Param | Effect |
| --- | --- |
| `pr=0.6` | Pixel ratio override |
| `shadow=off` or `shadow=512` | No shadow map, or another map size |
| `nopass=ink,grade,tilt,bloom,gtao` | Disable post passes (`ink` also drops the foliage mask) |
| `post=off` | Render straight to the canvas, with no composer |

## Device protocol

1. Build and serve a **frozen copy** of `web/dist`, so a rebuild never swaps assets under a running test:
   `cp -R web/dist <scratch>/serve-X && npx vite preview --outDir <scratch>/serve-X --host 0.0.0.0 --port 46xx --strictPort`
   (run it from `web/`).
2. Send the coordinator the URLs. The coordinator runs each one in a fresh Chrome process on the A16
   (adb reverse plus a localhost proxy), then returns the `perf-result` JSON or the box text.
   Chrome opened by intent shows its URL bar, so the A16's canvas is **384x692**. That size is the baseline,
   and every result's `summary.drawingBuffer` should match it. Run each URL **twice** and report the median.
   Rerun any result with `summary.areas` below 12.
3. Keep the clock pinned (`t=2026-11-20T14:00:00-05:00`), which also means timetable data and clear weather.
   Use `q=low` and the default UI (no `ui=next`). Use the same four cameras every time:

| # | View | Query, after `?view=city&q=low&t=2026-11-20T14:00:00-05:00&perf=run` |
| --- | --- | --- |
| 1 | Default open | (none) |
| 2 | Downtown skyline | `&cam=150,500,0,66,1900` |
| 3 | Midtown street level | `&cam=640,-3150,250,68,220` |
| 4 | Brookwood | `&cam=-92,-5054,40,58,420` |

A Studio dry run at the A16 viewport (fps there is meaningless, but counts and memory hold):
`node scripts/perf-run.mjs --out <dir> [--eval '__perf.top(30)'] URL...`. It starts a fresh headless Chrome per URL.

## Budgets (`pnpm test:perf`)

`web/src/core/perf-budget.json` holds two levels per tier, for the default open view with all 12 areas loaded:

- **Ceiling:** about 10% above the 2026-11-23 measurement, enforced as a regression guard.
- **Target:** the goal, reported but not enforced. When a cut reaches a target, lower the ceiling.

`scripts/perf-budget.mjs` builds `web/`, serves it, runs both tiers in headless Chrome, and fails if any ceiling is exceeded.
The JS heap is read after a forced GC (`HeapProfiler.collectGarbage`). Fps and the A16's ready time come only from the device runs.

| Low (phone), main 63d7e332 | Measured | Ceiling | Target |
| --- | --- | --- | --- |
| Triangles | 1.87M with the landmark day LOD (2.17M before; 4.77M on the morning of 2026-11-23) | 2.06M | 2.0M |
| Draw calls | 395 with lit panes in the body batch (414 after landmark batching and house blocks; 541 before) | 435 | 500 |
| Programs | 85 | 90 | 80 |
| Texture MB | 118 | 125 | 100 |
| Geometry MB | 174 | 190 | 200 |
| JS heap after GC | 394 MB | 460 MB | 400 MB |
| A16 fps (default view, still / panning), production bc32b09 | 24.8 / 25.1 (12.8 on the morning of 2026-11-23) | | 30 |
| A16 ready, production bc32b09 | 10.6 s, all areas by ~22 s (#359 later cut ~1.85 s from data to ready) | | 8 s |

Low triangle headroom on 2026-11-23: 2.6M − 2.36M = 240k. About 30 building skins due that night add up to
2,400 low triangles each, so at most ~72k, which leaves ~168k. Geometry headroom is 16 MB.

| High (desktop), main 2447d8c0 (after #421) | Measured | Ceiling | Target |
| --- | --- | --- | --- |
| Triangles | 6.22M with the landmark day LOD (6.54M before; 13.90M before #421) | 6.85M | 6.5M |
| Draw calls | 432 with lit panes in the body batch (462 after landmark batching; 597; 1,199 before #421) | 475 | 550 |
| Programs | 89 | 140 | 140 |
| Texture MB | 808 | 890 | 500 |
| Geometry MB | 286 | 300 | 250 |
| JS heap after GC | 510 MB | 570 MB | 500 MB |

#421 halved high draws and triangles: GTAO had re-rendered the whole scene with a normal override.
The draw ceiling leaves room for about ten building skins at +1 to +4 draws each.

`high-night` repeats the high check at 22:00, where lit windows and lamps add draws and programs:
640 calls, 6.82M triangles and 99 programs measured, against a 720-call ceiling; 569 calls after landmark batching
and house blocks, against a 630-call ceiling.

### Long tasks while moving (`low-north`, `low-zoomout`)

These two entries run the low tier on the A16 canvas (384x692 at DPR 1) with 6x CPU throttle while the camera flies a route
(`?perf=run&motion=route:<name>`, out and back over a 20 s sample). They fail if any main-thread task
(PerformanceObserver `longtask`) exceeds the ceiling. Every run reports `longestTaskMs` and `longTasksOver100`.

- `route:north`: Five Points to Brookwood at a 700 m orbit. Areas and rings change under the camera.
- `route:zoomout`: a 3 km to 25 km orbit over Midtown. It crosses the 10 km build distance early, which triggers far-level builds and swaps.

Ceilings: `route:north` 650 ms and `route:zoomout` 500 ms, both ratcheting toward 300 ms as swap and build steps are sliced. The target is 150 ms.
`summary.longTasks` lists each task over 100 ms in the sample as `[start, ms]` in page time, for attribution against a CPU profile.
Calibration on the Studio (2026-11-24, load average ~30):

- `route:north`: 920–945 ms with #538's whole-board very-far ground built in one idle task; 268–589 ms over 7 runs after #586 made it opt-in.
- `route:zoomout` to 25 km: 72–190 ms.
- At 1x, nothing exceeded 50 ms.


### Mounting R16 (`low-r16`, `high-r16`)

R16 is the one area the default view leaves unloaded. `route:r16` flies north from z=-5200 to z=-6100 at a 900 m orbit and
back over a 40 s sample, after the default view has settled. A run fails unless all 13 areas are mounted and R16 finished
mounting inside the sample (`r16BuiltInSample`). Only `longestTaskMs` is a ceiling. The targets repeat the default view's
ceilings, so each run prints how far R16 takes memory, calls and programs past them; those ceilings are not raised.

### Sliced area builds

King Memorial, Sweet Auburn and the rows beyond downtown (the north and south patches, Midtown, Brookwood and R16) build
in steps, as do Brookwood's rail and the North Line (the last of its row's build); `?slice=0` builds each in one task.
Downtown builds in one task, before the page is ready.

While the camera is in use (a drag, or input within the last second) building takes 2 ms a frame. Otherwise each frame
gives it what the rest of the last frame cost, from 4 to 50 ms, split between the builds under way. A run settles only
once no build is under way (`__perf.building`).

Studio, 6x CPU on the A16 canvas, Low, two runs each (2026-11-26; not an A16 or an iPhone). Fill is all 12 areas mounted
with nothing building; frame rate is counted from ready to fill.

| Build | Board filled, s | Frames/s while filling | Longest task after ready, ms |
| --- | --- | --- | --- |
| `8678645f`, nothing sliced | 20.0 / 20.2 | 2.0 / 1.9 | 2,459 / 2,392 |
| `66b8a295`, rows sliced | 36.0 / 35.5 | 35 / 35 | 986 / 972 |
| Boards sliced too, half the rest, cap 24 | 34.3 / 34.6 | 35 / 37 | 328 / 318 |
| The same, the whole rest, cap 50 | 28.3 / 29.3 | 27 / 27 | 335 / 334 |
| The same, twice the rest, cap 80 | 27.2 / 27.1 | 20 / 21 | 332 / 320 |
| **Whole rest, cap 50, the follow-ups in steps too** (three runs) | 30.0 / 29.6 / 30.3 | 27 / 28 / 26 | 185 / 193 / 209 |

The share does not move the longest task; splitting the work does. The whole rest, cap 50, is the share in use (the
coordinator's choice). At 1x the same build fills in 4.6 s on Low (longest task 91 ms) and 5.7 s on High (65 ms), and R16
mounts at 6x with a longest task of 214 to 217 ms in 11.3 to 11.9 s.

`pnpm test:perf` fails if any task between ready and the sample of `low-north` (6x) passes 300 ms (`loadLongestTaskMs`),
and reports when the last area mounted (`lastAreaMs`). The same run with `&slice=0` read 2,358 ms, and
the sliced build 181 to 237 ms across three runs. At 300 ms the gate catches the North Line going back into the Station's
mount; it does not catch the streetcar, Connector traffic or east-rail deferrals being undone, which each stay under it.

While the camera is moving, building takes 2 ms a frame: on `route:r16`, which flies the whole time, R16 builds in
15.3 to 15.6 s at 6x, inside the 40 s sample (11.3 to 11.9 s with the camera still).

`src/square-board/section-steps.test.ts` mounts the Station (with the North Line) and R16, loads King Memorial and Sweet
Auburn and prepares Brookwood's rail as a page would, and fails if the main thread is held over 32 ms at 1x between two frames, which also catches work moved back
outside the steps.

### Galaxy A16 tree mask sign-off (2026-11-23, #348)

Fresh Chrome with cooldowns, low tier, all 12 areas loaded. Ten-second FPS on the pre-rollout baseline (d1411a9e), candidate (fb699bbb), and candidate with the far mask forced on:

| Camera | Baseline | Candidate | Mask on |
| --- | --- | --- | --- |
| Default | 27.3 | 25.9, 26.2 | 23.0 |
| Pan | 27.0, 25.2 | 24.6, 25.7, 25.6 | 23.0, 22.3, 22.3 |

The coordinator accepted the 3–5% gap to baseline and Sam accepted the far-crown appearance.

## Houses on the low tier: shadows and byte attributes (2026-11-24)

Measured on main at low, Nov 20 14:00, with 3,430 houses at about 41 triangles each in the far form. Every mesh under `houses` was frustum-tested after a forced shadow redraw.

| View | Main pass | Shadow pass per redraw |
|---|---|---|
| Default, houses 18–22 km away | 141k triangles, 22 draws | 100k triangles, 8 draws |
| Ansley 900 m | 157k, 7 draws | 231k, 12 draws |
| Ansley 420 m | 172k, 6 draws | 218k, 15 draws |

- **Shadows.** Past a 9 km orbit (back at about 7.6 km), houses stop casting. An 8 m house shadow is under 2 px on the A16 there; at 2.5 km it is still about 7 px, so the trees' 2.5 km threshold would show. At the default view this takes the shadow pass from 100k triangles and 8 draws to 0. Nearer views are unchanged.
- **Byte attributes.** Far house blocks store colour as normalized `Uint8`, normals as normalized `Int8`, and the facade style id as `Int8`. That cuts 16 bytes per vertex: geometry 186.2 → 177.7 MB, CPU buffers 251.5 → 243.0 MB. The shader programs stay the same, and the low sweep peaks at 86.
- `&perf=1&housefar=0` keeps the old path (float attributes, shadows always on).
- [Matched frames](log/ui/house-far/shadows-bytes.jpg).

### Houses' far-far form past 12 km (PR B)

Past the very-far ground orbit (12 km out, 10.8 km back, measured to the board box exactly as the ground measures it; low tier only), each area's far house blocks and tiles give way to one merged mesh. That mesh draws each house as a single box of 10 triangles: four walls in the wall colour and a top in the roof colour. It reuses the far blocks' own material and attribute layout (byte colours and normals, plain facade style), so no shader program is added. It casts no shadow; houses already stop casting at 9 km. The box is built in `buildHouseLod`, yielding every 200 houses.

I tried flat roof paint in the ground map first. In 4× crops of the default view it read flatter than the old houses: it lost the dark specks that ink outlines and side shading give each house. The boxes keep both.

| View (low tier, Nov 20 13:00) | Calls / triangles, old → box |
|---|---|
| Default (about 20 km) | 373 / 2,084,463 → 361 / 1,977,313 |
| Ansley 14 km | 253 / 1,751,501 → 245 / 1,649,785 |
| Ansley 12 km (boundary) | 205 / 1,538,347 → 203 / 1,487,340 |
| Ansley 10 km | 176 / 1,456,817 → 175 / 1,456,397 |
| Pan at 13 km, 3 targets | 367 / 279 / 333 → 359 / 270 / 325 calls, about −101k triangles each |

Old path: `&perf=1&housefar=0`. Sheets: [default view at 4×, morning / midday / low sun](log/ui/house-far/far-far-default-4x.jpg), [10 / 12 / 14 km boundary and pan strip](log/ui/house-far/far-far-boundary.jpg).
