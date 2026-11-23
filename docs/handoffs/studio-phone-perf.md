# Handoff: phone performance (studio-phone-perf)

Written 2026-11-23 by the Claude session `orca_session_id:3126b1a7-8882-498c-a5ff-7b65d626cf91`.
Sam approved phone performance as a dedicated workstream that day. The reference device is a Galaxy A16
(Mali-G68, 4 GB, Chrome; its canvas is 384x692 with the URL bar showing). The targets at q=low are 30 fps
sustained and ready in 8 s or less.

## Where it stands

**On the A16 against production (bc32b09, Wi-Fi):** default view ~24-26 fps, panning ~25, and 2.34M
triangles. Ready is 10.6 s, and all areas have loaded by ~22 s. The morning baseline was 12.8 fps,
4.77M triangles and ~20 s to ready.

**Merged to main:**

| PR | Change |
| --- | --- |
| #307 | `?perf` instrumentation, protocol and `pnpm test:perf` budgets (`docs/perf.md`) |
| #311 | Tree limbs dropped beyond 800 m on low |
| #318 | Low shadow map moves in 80 m steps, at most every 250 ms (replaces #314) |
| #312 | Device auto tier (`core/device-tier.ts`) |

Owners' work merged into the same push:

| PR | Owner | Change |
| --- | --- | --- |
| #308 | ground-contact | Ground textures |
| #315 | parks | Houses by distance |
| #323 | ground-contact | Far ground mesh, the biggest win: +10 fps |
| #321 | UI | Auto steps down from High below 20 fps |

**Open, mine:**
- **#326:** `samsolomon/studio-phone-budgets`. Tightens the low ceilings after #323, adds the load phases
  `city:built` / `city:atmosphere` / `city:placed`, and adds `perf-run --cpu N`. Not yet code-reviewed.
- **`samsolomon/studio-phone-load`:** stacked on #326. There's no PR yet; open one with base main once
  #326 merges, or with base `samsolomon/studio-phone-budgets` now. Not yet code-reviewed or checked on the A16.
  - Far mosaic areas wait for the white-model reveal, or 8 s. A `lookAt` to an off-board target, or a
    study or profile camera, still loads at once.
  - `core/prefetch.ts` starts City's code and first data at boot when a visit lands on City.
  - Byte-identical hot-spot fixes: Builder colour memo (`vignette/geom.ts`), numeric `PlacementIndex`
    keys (`vignette/spatial.ts`), a walkways bbox precheck, and an early exit in `distToLine` (`city.ts`).
    `__perf.hash()` showed the scene unchanged: d7c8973d, 591 meshes, both builds, q=low.
  - Measured at 6x CPU on the Studio: ready 9.07 -> 6.6 s, sidewalks stage 750 -> 290 ms, first frame to
    ready 2.2 -> 0.7 s.

## Next steps, in order

1. Run the code-review skill on #326 and on the load branch, fix the findings, and open the load PR.
2. Ask the coordinator for an A16 run of the load branch against production. The protocol is in
   `docs/perf.md`: serve a frozen build with
   `vite preview --outDir <copy> --host 0.0.0.0 --port 46xx`, then send
   `http://100.78.214.26:46xx/?view=city&q=low&t=2026-11-20T14:00:00-05:00&perf=run`, two runs each,
   median. Compare ready to 10.6 s.
3. Load time, remaining. On the A16, terrain takes 2.4 s and streets+freight 1.1 s. Profile with
   `scratchpad`-style tooling: a CDP Profiler under `Emulation.setCPUThrottlingRate`, resolved through
   source maps. The last profile's hot spots, in 6x CPU time:
   - `subtractSlot` in `terrain/openings.ts` via `terrain/surface.ts` (~0.3 s). That's ground-contact's
     module, so ask them.
   - First-use uniforms on the first frame (~0.3 s).
   - The `quad`/`tri` callers in `terrain/transport.ts` and `city/landmark-shell.ts`.
4. Fps 25 -> 30 at the default view. On low at bc32b09 it draws 2.33M triangles against a 2.0M target.
   Use `hide=` A/B on the A16 to rank what's left (transport, downtown landmarks). Draw calls cost
   little on this phone; triangles and their shadow-pass copies cost the most.
5. Once a cut lands, lower the matching ceiling in `web/src/core/perf-budget.json`.

## Promises to other agents

- **tree-species** (`orca_session_id:6b76e039-f4f6-472d-b827-e2a3fdf94a0a`): sign off their tree
  rollout PR. The agreed terms:
  - species honour `setDetail({ farTrees })` (limbs, leaf tips and the leaf-disc carpet drop)
  - carpet tagged `userData.perf='landscape'`
  - real bounding spheres
  - at most +45 calls and +150k triangles at the low default view, or a single-clump far crown
  - `pnpm test:perf` passes
  - default, skyline and pan numbers in the PR
- **ground-contact** (`orca_session_id:1df827bc-6e12-4e74-b7da-83ee8931ec4b`): owns terrain. Their masked
  near-mesh merge (`:4601`) was dropped because it broke the Brookwood ballast and underpass clearance
  tests. Route `subtractSlot` load cost to them.
- **UI** (`orca_session_id:d577649d-8640-473a-8c9b-461abf2b616a`): tell them if the `device-tier.ts`
  rules change, because their Auto label depends on them.
- **parks** (`orca_session_id:eee32d1c-9a81-4fc4-b25f-64c0efd863df`): offered to free far house tiles'
  CPU attribute arrays if heap stays over 400 MB (it's 424 MB after GC now).

## Servers

None are running. I stopped 4610-4615 and 4619-4621. Coordinator rounds used Tailscale 100.78.214.26.
A `vite preview` started in the background dies at the default 30 min, so use a 2 h timeout.

## Rules that bit me

- **Stacked PRs:** merging a PR deletes its branch, and GitHub then closes any PR stacked on that branch
  for good (#314). Retarget children to main before merging their base. When restacking, use
  `git rebase --onto <new-base> <old-base-tip> <child>`.
- **Stale builds:** never rebuild `web/dist` while a device test is loading it. Serve a frozen
  `--outDir` copy.
- **Device runs:** a fresh Chrome per run, check `summary.areas === 12`, and compare medians. The first
  "crash" reports were a reused crashed tab.
- **Proxy timings:** load times through the Tailscale proxy overstate the network by ~6 s, so measure
  ready against production.
- **Agent shells:** cargo isn't on PATH. Use
  `export PATH="$(dirname $(ls ~/.rustup/toolchains/*/bin/cargo | head -1)):$PATH"` before `pnpm test`.
