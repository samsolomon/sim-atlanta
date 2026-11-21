# City view: handoff (2026-11-21)

Branch `city-m2a`. This is milestone M2a of the plan below: a static downtown diorama
behind the app's **City** switch, in the East Portal vignette's style. Read `AGENTS.md`
first. Its rules on truth tiers, colour, secrets, build log and review all apply.

## What Sam wants
- sim-atlanta is "just a little model of Atlanta": part game, part simulation, with nothing to build.
- The **first view of the site** will be City: the most beautiful diorama view of downtown.
  - `/` stays on Map until City passes the phone speed gate (below). Then City becomes the default.
- Switching between Map and City keeps you in the same place. WASD/arrows pan, Q/E rotate, +/− zoom.
  The shell (`web/src/ui/shell.ts`) already sends these keys to City.
- City shares the Map's atmosphere: time of day and weather are independent layers, from
  `web/src/core/atmosphere.ts`. Sam loves the rain and snow. Fog should be an edge blur like tilt-shift.
- Phones land on City on the **low** quality tier. Phone portrait layout comes last.
- City v1 will have moving trains, live buses, car traffic and freight. That's M2b, after the speed gate.

## Done on this branch
- `pipeline/scripts/vignette.py` has a `downtown` board: x −1000..1000, z −1300..700 scene
  metres. The origin is Five Points; x points east and z points south.
  - `vignette_traffic.py` and `vignette_trees.py` take the board name as an argument.
  - `pnpm data:city` builds `web/public/data/scene/downtown/{vignette,traffic,trees}.json`.
  - Sizes: 1.17 MB, 85 KB and 21 KB.
  - Contents: 828 buildings, 4067 road runs and 897 real trees.
- `web/src/vignette/world.ts`:
  - `WorldOptions` has `terrain` (`'trench' | 'flat'`), `clumps` and `lightMapMax`.
  - A flat board skips `computeHeights` and uses a 20 m ground grid.
  - `marta` may be null.
  - `buildMarta(al)` draws any alignment, showing only the parts open to the sky (several runs, a portal at each tunnel mouth).
  - East Portal still uses the defaults (`EAST_PORTAL`).
- `web/src/vignette/alignment.ts`: `alignment()` moved out of `vignette/main.ts` so it can be shared.
- `web/src/city/city.ts`, `createCity(container, rf, quality)` returns a `CityView`:
  - It builds the board with the vignette engine and uses the same post chain (ink, GTAO on high, bloom at night, tilt-shift, grade).
  - The shadow box follows the camera target.
  - Double-click glides to a point on the ground plane.
  - `setAtmosphere(atm, now)` drives the sun, sky, cloud, rain and season.
  - The quality tier comes from `pickQuality()`. `?q=low|high` overrides it.
- `web/src/main.ts`:
  - City now uses `createCity` (dynamic import) instead of `scene3d/view`.
  - `updateAtmosphere` pushes the shared atmosphere into City.
  - `?view=city` opens on the framed downtown view.
- First render: `docs/log/ui/2026-11-21-city-first-render.png`.
  - It runs at about 22 fps in a background Orca tab on the Mac. That number isn't a real measurement.

## Next, in order
1. **Look and framing.**
   - The opening view is too close and doesn't show the skyline. Tune `setView(...)` in
     `city.ts` so the Gulch, Five Points and Peachtree Center all read at once.
   - Check MARTA track appears where it surfaces: the west line by the Dome/GWCC, the east line toward King Memorial.
   - Check the streetcar loop. It isn't drawn yet: rail `cls: 'tram'` in `vignette.json`.
   - The board edge may need clipping or a cleaner plinth.
2. **Speed.**
   - Measure build time (the `City: built in … ms` console line) and fps on the desktop.
   - Then the **Galaxy A16 gate: at least 30 fps on `?q=low` at the opening view.** Sam controls the
     A16. Ask before using it, because another agent may have it.
   - Method: `adb reverse tcp:5317 tcp:5317`, `adb forward tcp:9333 localabstract:chrome_devtools_remote`, then
     `node <scratch>/cdp-fps.mjs` (a CDP script that reads requestAnimationFrame fps). Rewrite it if it's missing.
   - If it misses 30, cut in this order: GTAO, then shadows, then tree clumps, then tilt-shift taps. Measure after each cut.
   - Heavy work in the browser: crossing snapping, unmapped-lot stalls and lamp placement are O(n×m).
     Move them into `vignette.py` if the build takes more than about 1.5 s on a phone.
3. **States.** City failures (WebGL missing, data 404) already fall back to Map with a note.
   - Add the loading plate.
   - Make the widget show the neighbourhood under the City target. `shell` asks `center()`, which already maps City targets to lon/lat.
4. **Retire `web/src/scene3d/`.** Keep `scene/downtown/scene.json`: its MARTA `profiles` are still used.
   Stop shipping the `.bin` meshes once nothing reads them.
5. **M2b, motion**, re-measuring the A16 after each step:
   - trains, from `TrainSource`: live at the present time, otherwise the timetable. CQ400 consists come from `vignette/train.ts`.
   - freight, labelled `illustrative`;
   - buses (`DioramaBuses`, using a spatial grid);
   - traffic (`Traffic` with `downtown/traffic.json`, Connector and arterials only).

Then open a PR with `pnpm test`, a browser check and `pnpm review` (Claude reviews Codex's
work). Write a build-log entry in `docs/build-log.md`. Deploy after merge with:

```sh
git checkout --detach origin/main && pnpm --filter web build && cd worker && npx wrangler deploy
```

PR #10 fixes `pnpm run deploy`. Sam has given standing approval to keep deploying.

## Not done or known issues
- The East Portal vignette (`/vignette.html`) hasn't been re-checked since the `buildMarta` rewrite. Look at it.
- `web/public/data/` is gitignored. Run `pnpm data:city`, which needs `.venv` and network access for the canopy tile.
- The `stats()` draw-call count reads only the last pass (it says 1). Use `renderer.info` with `autoReset` off for real numbers.
- Full plan: `docs/city-plan.md` (Milestone 2).
