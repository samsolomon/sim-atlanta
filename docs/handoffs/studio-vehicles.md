# Handoff: Studio vehicles (2026-11-26)

## Done
- **Semi (#693, merged at 53f84990, for release 19).** A long-hood sleeper tractor in Peterbilt 589 proportions, pulling a generic 53 ft dry van, 22.97 m long. It replaced the 19.16 m rigid semi on City's High tier. The model is in `web/src/vignette/road-semi.ts`, and the notes, sources and estimates are in `docs/road-semi.md`.
  - The traffic form is 1,624 triangles; the Lab-only close form is 7,618.
  - Amber markers are kind 5 inside `vehicleMaterial`. The van box is kind 6, and its paint index rides on the `braking` float as `lamp + 2 × index` (`vanPaintIndex`). Neither added a program.
  - test:perf against 068b32ed: Low unchanged; High +3,620 triangles, programs 98 = 98.
- **Model Lab families (#694, merged at b9a567fc).** Each physical model has one picker entry, with Load, Paint, Scheme and Containers controls (`web/src/models/variants.ts`). Vehicles went from 39 entries to 27.
  - Every former `?v=` id redirects to its family with the matching preset.
  - The app opens Lab ids through `lab.open(labOpenRequest(…))`, and leaving Models clears the control keys (`viewUrl`).
  - The well car has a Lab-only Empty state.
- **Headlight-pool plan (#695, docs only, awaiting review).** `docs/headlight-pools-plan.md`. It costs +1 program and +1 night call; High at night is at 626 of 630 calls.

## Next (each needs Sam's approval)
- Build the headlight pools if #695 is approved.
- Vehicles, one at a time, each with a Model Lab entry that merges even before traffic: F-150, Model Y, Rivian R2, and a Waymo-style robotaxi (an I-Pace-like crossover with a roof dome, no branding). The everyday-cars study on `codex/sedan-rear-polish` has starting silhouettes.
- PR #541's hatch, pickup and van could fold in later. Its rigid semi is superseded.

## Gotchas
- Before any heavy run, check `orca orchestration inbox` for a "Studio busy" notice; timed perf runs only in the integrator's window.
- In zsh, unquoted `$VAR` does not word-split. Write commands out, or use arrays.
- City close-ups: `?dev&mindist=5` now keeps a short near plane. `__cityDev.controls` is exposed, but the orbit target is pinned to terrain, so solve the tilt for street-eye on decks, or pick a semi near grade.
- Headless captures with `scripts/chrome-cdp.mjs` `launchChrome` need `--disable-backgrounding-occluded-windows` and `--disable-renderer-backgrounding`, or rAF stalls.
