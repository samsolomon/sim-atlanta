# Ghost vehicles

Approved by Sam on 2026-11-27 for release 21: approaches 1 and 2 from the hidden-vehicles sketch,
with the track-window change from the same day.

1. **Ghost tunnels.** A MARTA train that City hides in tunnel shows through the ground as a flat
   silhouette of its real CQ400 cars: city-rail blue, a thin ink line, no windows or livery. Deeper
   runs are fainter, so the two levels at Five Points read apart (Blue/Green above, Red/Gold below).
   Each ghost train carries a short window of ghost track, 1.5 train lengths ahead and behind
   (120–320 m, sized on the whole consist), fading toward its ends. At night the fill stays blue, and the ink and track turn
   cream, matching the white placeholder's night look.
2. **X-ray.** The selected or followed train, bus or streetcar draws as the same ghost, in its own
   service colour with a soft outline in that colour, wherever it is hidden: behind a tower, under a
   deck, or underground. Only that one vehicle gets it. Its visible parts are left alone.

Positions are the existing live or timetable ones. The ghost changes no tier, and no card text.

## Where a ghost shows

A ghost covers exactly what City doesn't draw (`ghostHidden` in `city/trains.ts`): track inside its
line that `trackVisible` says is hidden. That includes tunnels and the spans City hides under a deck
or roof (`covered`, `roofed`), so a ghost never blinks out at a tunnel-to-deck boundary while the
train is still out of sight. To ghost tunnels only, also require
`al.coverAt?.(s) === undefined || 'open'` there (a look call for Sam).

A car straddling a portal is drawn whole, as before, and also ghosted with a per-instance clip plane
at the mouth (`carCover`), so its ghost starts exactly where the open part ends. As the train moves,
each car is drawn, ghosted or both, and never neither (the portal test in `ghosts.test.ts`).

## How it draws (no new program)

- **Batches.** Each source geometry is one `InstancedMesh` (`city/ghosts.ts`). Its geometry shares the
  vehicle's own position and normal attributes, so no vertex bytes upload twice, and adds a level
  and a clip plane per instance. Trains in tunnel use two batches (cab and middle cars) and the
  track window one, so the cost with nothing selected is at most three draws. A selected bus adds
  one, a streetcar up to three (its sections), and a rail car from another source one per geometry.
- **Program.** The batches draw with the bus material (`vignette/xcelsior.ts`) and its `ghost` uniform
  at 1. That program is already compiled at boot on both tiers, instanced and custom-keyed. Its ghost
  branch discards the clipped side and writes only a code, level / 16, into the scene target's alpha.
- **When.** From `scene.onAfterRender` during the scene pass, after the transparent objects, while three
  still holds the scene's lights (the program key matches). The batches sit in the scene with no
  instances while three walks it, which uploads their buffers but draws nothing. The hook resets
  alpha to 1, then draws with an alpha-only write mask and MIN blending: the lowest level wins
  where ghosts overlap, and each pixel takes one code however many faces cover it, so inner
  detail never shows. It syncs three's blending and colour-mask state first and restores what it
  changed by hand.
- **Look.** The ink pass (`vignette/ink.ts`) reads the codes: it fills each level in its service colour,
  under the scene's own lines (see-through), and outlines levels 1–9 where the code changes. For the
  x-ray it rebuilds the surface point from depth and skips pixels within the vehicle's radius of
  its centreline (`pushCarEnds`), sized from the car's own geometry: those are the vehicle's own
  visible faces. The test is a body, not a ball, so a deck just over the roof still shows the x-ray.

| Level | What | Fill | Line |
|---|---|---|---|
| 1–3 | X-ray bus, streetcar, train | its service colour (`MODE_COLOR`: bus teal, streetcar blue, city-rail blue, intercity violet), 50 % | its colour |
| 4–9 | Train in tunnel, shallow to deep | city-rail blue, 56 % to 26 % | ink (cream at night) |
| 10–15 | Track window, at the train to its ends | city-rail blue (cream at night), 60 % to 15 % | none |

Ghosts draw only while ink runs and colour is up: not during the opening's white stages, beyond
ink's 4.2 km fade (the default far view) or with `?perf&nopass=ink`.

## Switches

- `?perf&ghost=off` (also in dev): no ghost layer, for same-build A/B runs.
- Dev: `__cityDev.ghosts.enabled = false` turns ghosts off in a running page, for matched stills.

## Known gaps

- The North Line in Midtown and the Brookwood cars have no tunnel ghosts. They x-ray when selected
  while drawn, but a North Line train that its own portal has dropped isn't ghosted.
- Ghosts show through buildings in front of a tunnel as well as the ground. That is the x-ray reading.

## Cutaway (step 2b, 2026-11-28)

Sam's picture: Roller Coaster Tycoon's underground view, but local. The ground around a train in
tunnel opens, and through it you see the real train in its own materials and livery, its track,
and the tunnel's floor and far wall. The rest of the map stays shut.

- **Where it opens.** Not straight above the train: through a ground-level hole above a 10–16 m
  deep tunnel, a camera at City's usual tilt sees only the far wall. The opening is the hull of the
  rim and of the floor seen from the eye (projected up its view rays), so it lies where the ground
  stands between the eye and the train (`cutSection`). It's recomputed every frame as the camera
  moves.
- **What's inside.** An open-top tunnel box per 6 m section: a ballast floor with flat rails and ties,
  and one wall, mirrored to the side away from the eye (no near wall to hide the train), concrete
  with a lamp strip and a band of Georgia clay where the cut shows the ground. One end wall, at
  the far end. The real CQ400 cars, with each train's own line colour on its LEDs and chevron
  (`aLine`). Station platforms wait on the platform table.
- **Occlusion.** A tower in front of the opening keeps it shut. The lid is tested against the scene's
  depth and marks stencil only where the ground in front is what shows. The box then paints that
  stencil and resets depth to itself, and the cars draw inside with an ordinary depth test.
- **Ghosts.** A train with a cutaway shows no ghost (Sam: ghosts are for trains without a hole). The
  selected train keeps its x-ray wherever its opening is shut, so it is never lost. Ghosts draw
  with a stencil test that keeps them out of any opening.

### Cost (0 programs)
Everything draws with the bus's compiled instanced program: lid, box, cab cars and middle cars,
four draws however many trains open. The scene's depth goes D24S8: the same 32 bits a pixel, read
by ink and AO as before. A matched pixel diff with no opening on screen is identical on Low, and
on High it's within the run-to-run noise. With no train in tunnel in view, or beyond ink's fade,
nothing is built and nothing draws. The ground program is untouched (no discard), so the A16 keeps
its early depth test.

### Review switches (dev or `?perf`)
- `cutaway=cut` (default) or `lens` (the opening tapers to its ends), or `off` (#737's ghosts only,
  plain depth).
- `holes=all` (default: the 4 trains in tunnel nearest the camera's target) or `selected`.
- `holeghost=1`: cutaway trains keep their ghost where the opening is shut (three more draws).
