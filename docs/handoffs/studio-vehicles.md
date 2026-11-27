# Handoff: Studio vehicles (2026-11-26, stopped)

The vehicles agent builds road vehicles from reference photos, first in the Model Lab and then in City traffic. It works one vehicle at a time, and each needs Sam's approval. The Air coordinator relays Sam's decisions and merge go-aheads. Reply to the coordinator's latest message with `orca orchestration reply --id <their msg id>`. Send only decisions, blockers and completion.

## Done
| Work | PR | State |
|---|---|---|
| Peterbilt 589-like sleeper semi and 53 ft van (`road-semi.ts`, `docs/road-semi.md`) | #693 | Merged 53f84990 |
| Model Lab families: one entry per model, with Load, Paint, Scheme and Containers controls (`models/variants.ts`) | #694 | Merged b9a567fc |
| F-150 SuperCrew-like pickup in the Lab (`road-pickup.ts`, `docs/road-pickup.md`, shared `face-kit.ts`) | #698 | Merged f259f243 |
| Headlight pools for every lit vehicle at night on High, with freight lamps lit (`city/headlight-pools.ts`, `docs/headlight-pools.md`) | #700 | Merged b7234ed4, rides release 19 |
| This handoff, plus the pools plan that `headlight-pools.ts` links to | #695 | Docs only, open |

**Headlight pools in numbers.** Pools add +1 program and +1 call at night on High; Low is unchanged. After Sam's tweak, street pools are power 0.7 with reach of 12 m (car), 15 m (truck) and 14 m (bus and streetcar); rail is 20 m at power 0.65. Each pool starts 0.5 m under the front bumper. `?pools=0` (dev) turns them off for matched stills.

## In flight (stopped at Sam's wind-down, 2026-11-26)
**F-150 in City High traffic: draft #706**, branch `samsolomon/f150-traffic`, head **fc0dc7b5**. The head is **untested**.
- **What happened.** Sam adopted budget reserves mid-task. High night calls sit inside the 40-call reserve, so the first design's separate work-trim mesh (+1 call) would have needed an offset.
- **The rework (fc0dc7b5).** Both trims come from one mesh, adding 0 draws and 0 programs:
  - `packFaces(…, alt)` writes the XL colours and kinds as `aAlt` (rgb, kind + 10).
  - `roadPickupGeometry({ alt: 'xl' })` builds that alternate colourway.
  - Work slots carry `slot.work` and write index 1 into `braking`.
  - `vehicleMaterial(…, true)` swaps `vKind`/`vRaw` from `aAlt` when the index is set and `aAlt.w > 9.5`.
- **Not run yet.** The commit was written during the release 19 hold, so tsc, vitest, a City still, Grok on the rework and test:perf have not run.
- **Earlier evidence still holds.** Grok round 1 on the two-mesh design (9fea8402) was MERGEABLE. Its matched stills are in `docs/log/road-pickup/f150-city-traffic.jpg`.

**Exact next steps:**
1. Check the inbox for holds.
2. Rebase onto main, then run `npx tsc --noEmit -p web` and `npx vitest run src/city/road-traffic-mix.test.ts src/city/arterial-traffic.test.ts src/vignette/road-pickup.test.ts src/city/road-traffic-equivalence.test.ts src/city/headlight-pools.test.ts` (from `web/`).
3. Shoot a City still of a work truck to confirm the shader swap renders: dark grille and steel wheels, white, silver or grey. Use `?view=city&q=high&t=2026-11-20T12:30:00-05:00&speed=0&dev&mindist=5` with `__setView(look, 62, 26, 784.5, -3623.3, 1)` (a work slot on main's timing). If the trim shows XLT colours, check the `#include <begin_vertex>` ordering in `vehicleMaterial`: the `aAlt` override must run after `vKind = aKind`.
4. Run self-run Grok on the rework (round 2), then fix any confirmed findings.
5. Ask the integrator for a test:perf window, A/B against the merge-base. Put the before and after numbers for each budget in the body, per Sam's reserve rule. Expect High calls and programs flat and High triangles up by about 746 per visible pickup.
6. Mark #706 ready and send the coordinator the head.

**Scratch worktrees to remove after #706.** All three are plain git worktrees, so use `git worktree remove --force`, run from the studio-vehicles worktree:
- `…/scratchpad/f150` (branch checkout)
- `…/scratchpad/base` (detached at b7234ed4, merge-base)
- `…/scratchpad/plan` (this branch)

## Next (each needs Sam's approval)
1. **Model Y-like crossover.** Lab first. Traffic can wait for Sam's go.
2. **Rivian R2-like.**
3. **Waymo-style robotaxi.** An I-Pace-like crossover with a roof sensor dome and no branding.

Pattern that worked for the F-150:
- Gather daytime and night photos in a fresh Orca tab, and record the links and estimated dimensions in a `docs/road-<model>.md`.
- Build a near form for the Lab and a far form for traffic, under about 1,400 triangles, using `face-kit.ts`.
- Use `vehicleMaterial` kinds (0 paint, 1 headlamp, 2 tail, 3 glass, 4 fixed, 5 amber) so no program is added.
- Write a raycast winding test with a 30 s timeout.
- Add a Lab family entry in `models/main.ts` and `variants.ts`.
- Send Sam a side-by-side with the reference (raw.githubusercontent links, not blob pages).

Sam took three passes on the F-150 before calling it real: belt height, tyre fill in the arches, and the grille and lamp graphic carried most of it.

## Gotchas
- **Shared Studio.**
  - Check `orca orchestration inbox` for holds before any build, test, install or browser run. vitest and tsc count.
  - Run test:perf only in the integrator's window.
  - Kill only PIDs you started, and drive only a Chrome you launched (`scripts/chrome-cdp.mjs` `launchChrome`).
- **Review.** Run Grok yourself with the diff file inside the worktree; opencode rejects paths outside it. Stop after two rounds.
- **City close-ups.**
  - Use `?dev&mindist=5` and `__setView(bearing, tilt, dist, x, z, zoom)`.
  - A target in a cut or on an undrawn surface aims high. Accept a frame only when `__cityDev.controls.target.y` is within about 1 m of the subject's y.
  - Traffic instance indices aren't stable. For matched before/after frames, record the world position in the after run and frame the same point in the before run, with `speed=0`.
- **Captures.** Headless needs `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding` and `--disable-background-timer-throttling`, or rAF stalls.
- **zsh.** Unquoted `$VAR` does not word-split. Write commands out.
- **Rebases.** Every PR appends to `docs/build-log.md`, so rebases conflict there. Keep both entries.
