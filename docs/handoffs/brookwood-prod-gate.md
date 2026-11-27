# Brookwood "only with &dev" in production

- **Owner:** Claude (brookwood-prod-gate worktree). The coordinator (Air city-view) has the merge go.
- **Branch:** `samsolomon/brookwood-prod-gate`. Nothing is merged.
- **Next action:** the coordinator reviews the PR, then merges it and deploys it with the next release (a web rebuild and redeploy are needed, but no `pnpm data`).

## Cause

The bundle has no `dev` gate. Release 19's HTML is byte-identical with and without `&dev`, and the
only `has('dev')` calls are in the Models view and `minOrbitDistance`. In a clean headless Chrome,
plain links reach Brookwood and Midtown on High, on Low and under 4× CPU throttle.

The trigger is any canvas pointerdown made before the link's row mounts. `lookAt` clamps the camera to
the nearest loaded area and calls `mosaic.remember` to keep the target. City's `startGesture`
(`controls 'start'`, city.ts) then called `cancelPendingTarget()` on every non-wheel press, including
a motionless tap. The target was dropped, so the camera stayed on the downtown edge for good.

Reproduced on production: the Brookwood link plus one tap at 3 s gives "Downtown". Without the tap it
gives "Brookwood". The `&dev` correlation was most likely when the click or focus happened in the
Orca tab.

## Fix

A press cancels the pending target only after it moves more than 6 px, the same slop picking uses.
Wheel and dolly still call `manualCamera()` at once. Explicit rotate, pan and zoom calls are
unchanged.

## Evidence

- `web/tests/link-target-tap.test.ts`: holds `brookwood-station/context.json`, taps, then releases.
  It fails with the fix reverted ("still 3754 m from the link target") and passes with it (6 s).
- Web suite: 313/314 files pass. The two `ground-bake.test.ts` failures come from the stale bake in
  data copied from studio-far-landmarks (92e71e45). They are unrelated.
- `pnpm build` passes. On the worker preview (`wrangler dev` serving `web/dist`):
  - The Brookwood link plus a tap at 3 s gives "Brookwood".
  - The Midtown link plus a tap gives "Midtown".
  - 38 drags north from Midtown at 420 m give "Brookwood Hills", and R16 loads (13/13).
- Stills are in `docs/log/brookwood-link-tap/`.

## Not changed

R16 still loads only once the camera comes within 5 km and looks north, or with Show full board
(#682, by design). A close-up pan takes about 91 m per drag, so Brookwood is about 25 drags from
Midtown.
