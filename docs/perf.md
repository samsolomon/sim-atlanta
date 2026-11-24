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

| Low (phone), main 3526f38 + far-tree LOD | Measured | Target |
| --- | --- | --- |
| Triangles | 3.33M (3.70M before the far-tree LOD, 4.77M before tree-species #306 and parks #315) | 2.0M |
| Draw calls | 541 | 500 |
| Programs | 76 | 80 |
| Texture MB | 109 (160 before ground-contact #308) | 100 |
| Geometry MB | 195 | 200 |
| JS heap after GC | 411 MB | 400 MB |
| A16 fps (default view, still camera) | 15.9 with the far-tree LOD, before #315 (12.8 on main this morning) | 30 |
| A16 ready | 20 s | 8 s |

| High (desktop) | Measured | Target |
| --- | --- | --- |
| Triangles | 13.2M | 12M |
| Draw calls | 1,128 | 1,000 |
| Programs | 138 | 140 |
| Texture MB | 808 | 500 |
| Geometry MB | 270 | 350 |
| JS heap after GC | 514 MB | 600 MB |

### Galaxy A16 tree mask sign-off (2026-11-23, #348)

Fresh Chrome with cooldowns, low tier, all 12 areas loaded. Ten-second FPS on the pre-rollout baseline (d1411a9e), candidate (fb699bbb), and candidate with the far mask forced on:

| Camera | Baseline | Candidate | Mask on |
| --- | --- | --- | --- |
| Default | 27.3 | 25.9, 26.2 | 23.0 |
| Pan | 27.0, 25.2 | 24.6, 25.7, 25.6 | 23.0, 22.3, 22.3 |

The coordinator accepted the 3–5% gap to baseline and Sam accepted the far-crown appearance.
