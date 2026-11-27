# Brookwood "only with &dev" in production

- **Owner:** Claude (brookwood-prod-gate worktree). The coordinator (Air city-view) has the merge go.
- **Branch:** `samsolomon/brookwood-prod-gate`, PR #718. The coordinator is holding the merge for this report. Nothing has been merged by me.
- **Next action:** the coordinator reviews the combined PR, then merges it. The next release deploys it (a web rebuild and redeploy are needed, but no `pnpm data` and no worker change). The product notes below go to Sam.
- **Status:** stopped. My dev servers, worker previews, headless Chromes and Orca tabs are all closed.

## Causes

`&dev` is not special. The bundle has no `dev` gate, and the Air tab later failed with `&dev` too. A
link to a row that hasn't loaded parks the camera at the nearest loaded edge (downtown), keeps the
destination in `mosaic.remember`, and moves there when the row mounts. Two things threw that
destination away:

1. **A tap.** `startGesture` called `cancelPendingTarget()` on every non-wheel pointerdown, even a
   motionless one. Reproduced on production: the Brookwood or Midtown link plus one tap at 3 s gives "Downtown".
2. **Auto's step-down to Low.** `applyGraphics` rebuilt City with `keepPose` taken from
   `diorama.target()`, which was the clamped downtown point, and `keepPose` wins over the `cam` link.
   The new City then remembered downtown. Reproduced on production at 10× CPU: Auto steps down at
   about 45 s, 12/13 areas load including the Brookwood station, and the view is still Downtown at 180 s.
   This fits the Air tab, which had `a2-graphics-auto=low` set by an earlier run.

Without either, a slow load still lands. At 10× CPU with the step-down flag preset (so no
rebuild), the view reaches Brookwood at about 60 s. The Air tab read 7–10/13 areas at 42 s after
about 40 City loads, so its later failures without a rebuild most likely hadn't finished loading. On
the Studio's Orca browser (1000×500 at 2×, unfocused, with and without the flag, and hidden), plain
links landed.

## Fix

- A press cancels the pending target only after it moves more than 6 px. Presses are tracked per
  pointer, and only for mouse buttons 0–2. A second finger takes the camera at once. A window blur
  clears presses. Wheel zoom still takes the camera at once.
- `City.pendingTarget()` returns the mosaic's remembered destination (or the east or north preview
  target). `applyGraphics` keeps it in place of the clamped target.

## Evidence

- `web/tests/link-target-tap.test.ts`. Both tests hold `brookwood-station/context.json`:
  - The tap test fails with its fix reverted (3754 m short).
  - The step-down test forces Auto with dev's `?slowfps=1000`. It fails with its fix reverted (3754 m
    short), and it skips if City starts on Low.
- Browser tests (camera-input, follow-north, board-exterior, link-target) all pass. `tsc` passes, and
  `pnpm build` passes on head.
- Production build on the worker preview:
  - Link plus tap gives Brookwood, and the Midtown link plus tap gives Midtown.
  - At 10× CPU with the natural step-down, Brookwood arrives at 105 s.
  - 38 drags north from Midtown load R16 (13/13).
- Stills are in `docs/log/brookwood-link-tap/`: tap before/after, step-down before/after, Midtown, and the pan into R16.
- Review:
  - Grok round 1: one multi-touch finding, fixed. Round 2 stopped on Grok's credit limit.
  - Codex gpt-6.2-sol medium, round 1: a small pinch (fixed), a test hanging on Low (fixed), and a parked-distance claim, refuted (measured 3754 m).
  - Codex round 2: pen eraser and a blurred press, both fixed. Per the charter's two-round limit, no third review was run.

## For Sam (not changed)

- While a far link loads, the view sits on a "Downtown" close-up with no hint that it is on its way.
  On a slow device that can last a minute or more. A "Loading Brookwood…" note would help.
- Up close, panning moves about 91 m per drag, so Brookwood is about 25 drags from Midtown. R16
  waits until the camera is within 5 km and looking north (#682).
