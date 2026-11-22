# A little model of Atlanta: Map + City views and their UI

## Context
The site has grown into three disconnected things that look like three different products:
- the 2D MapLibre map at `/`, with a dashboard panel;
- a grey extruded-box downtown 3D behind "Explore downtown in 3D" (`web/src/scene3d/`);
- the East Portal diorama at `/vignette`, the only one in the chosen art style.

Sam's direction (2026-11-21):
- "Just a little model of Atlanta, Georgia": part video game, part simulation, with nothing to build.
- The first view is downtown Atlanta at a glance, in the diorama style.
- A small switch between **Map** and **City**. Street (the vignette level) is future work.
- Simple controls. WASD and the arrow keys move the camera.
- A tight frosted-glass status card, top right: neighbourhood · weather · day, date and time.
- Models (the lab) stays public. Add an About/credits/colophon page.
- Map and City work back from the diorama's look and feel.
- Phone is portrait-first, but solved last.
- Later: follow a train or bus, background music (reference saved in `~/Documents/railwatch-reference/`), walking in Street.

Measured on the Galaxy A16:
- The 2D map runs at 89 fps.
- The East Portal diorama runs at 7.6 fps.
- `/?view=3d` didn't finish loading within 14 s.

The City view must be built for phone performance from the start.

## Approach: one app with two views, sharing one shell
`/` becomes the app:
- **City** is the default view.
- **Map** is one tap away.
- Both share the same shell: status card, view switch, menu and train/bus card.
- `/vignette` stays as is: it is the future Street level and a preview of it.
- `/models` gets the shell's menu.
- `/about` is new.
- The old grey `scene3d/` is retired once City replaces it.

Decisions from Sam:
- Time controls are hidden from the UI but kept in code.
- Phones land on City at low quality.
- City v1 moves trains, live buses, car traffic and freight.

### Milestone 1: shell, Map restyle, About (small, lands first)
- **Shared design tokens** in `web/src/ui/tokens.css`:
  - the diorama's warm palette from `vignette.html` / `models.html` (paper `#e9e5dc`, ink `#2a2722`, plates);
  - the service colours (`--live`, `--freight`, …) from `web/src/style.css`.
  - All four pages import it.
- **Shell** (`web/src/ui/shell.ts` + `shell.css`, plain DOM like today):
  - **Status card** (top right, frosted glass: `backdrop-filter: blur()` over a translucent paper fill, with a solid fallback). It reads e.g. "Downtown · Overcast 58° · Sat, Nov 21 · 11:07 AM".
    - Tapping it expands to: live counts (trains, buses), the data's truth tiers, and "updated Ns ago".
    - Neighbourhood: City of Atlanta neighbourhood polygons, added to the pipeline as a small GeoJSON (point-in-polygon on the camera target or map centre). Outside the city it falls back to "Atlanta".
    - Weather: split `fetchLive`/`fromWmo`/`PRESETS` out of `web/src/vignette/weather.ts` into a Three-free `web/src/core/weather.ts`, reused by the vignette. Polled every 10 min.
    - Time: `web/src/core/clock.ts` and `local()` from `vignette/time.ts`, also moved to `core/`.
  - **View switch**: a small segmented control, Map · City, bottom centre. It sets `?view=` and keeps the camera target in sync both ways (lat/lon ↔ scene metres via `makeProjector`).
  - **Menu** (top left, a small icon): Models, About, and a "Key" sheet. The Key holds the legend that's in the panel today, plus what City's vehicles and colours mean.
  - **Vehicle card**: reuse `trainCard`/`busCard` from `web/src/map/card.ts` and restyle them as a glass sheet.
- **Map view**:
  - Remove the big `#panel`. The legend moves to the Key sheet.
  - Time scrub/speed: keep the code as a hidden `TimeControls` component (not deleted), so it can return as a future control. For now it is reachable only via `?t=`, `?speed=` and `?controls=1`.
  - **Restyle the basemap**: a local `web/src/map/style.json` derived from OpenFreeMap positron, recoloured to the diorama palette (cream land, muted water and parks, thin ink roads, quiet labels). Rail layers keep the service-kind colours but get the diorama's ink outline.
  - Keyboard: WASD and the arrow keys pan.
- **About page** (`web/about.html`):
  - the story;
  - how it works, including the truth tiers in plain words;
  - credits: MARTA, Amtrak/GTFS, Overture, OSM/OpenFreeMap, Open-Meteo, Meta/WRI canopy, FHWA HPMS/TMAS, City of Atlanta;
  - colophon.
  - Add it to the Vite `rollupOptions.input`.

**States the shell handles** (both views):
- **Weather unavailable** (the A16 showed "live weather unavailable here" today): the card drops the weather and keeps place and time. It never shows a stale or guessed condition.
- **Live MARTA feed down or stale:** the card's dot turns grey, it reads "Timetable", and the expanded sheet says why.
- **Clock pinned with `?t=`:** the card reads "Timetable · not live" with the pinned time.
- **City loading:** a paper plate with the status card already visible, plus a quiet progress line while data streams in.
- **City failure** (WebGL missing, or data fails to load): drop to Map with a one-line note.
- **First run:** a small hint, "Drag to look around · WASD to move", that fades after the first interaction and is remembered in `localStorage`.

**Layout and accessibility:**
- The status card owns the top-right corner, so MapLibre's zoom/geolocate controls are removed. Zoom is pinch, wheel and `+`/`−`.
- The switch is a two-button group with `aria-pressed`, 44 px tall touch targets, and keys `M` / `C`.
- Shortcuts are ignored while focus is in a text field.
- The menu and sheets trap focus and close on `Esc`.
- Contrast: the card's fill stays at least 80% opaque behind its text, so contrast holds over bright skies.
- `prefers-reduced-motion` turns off the camera glide and the rain streaks.
- Picking trains and buses uses the nearest vehicle within 24 px on screen, not an exact mesh hit, so moving vehicles are tappable on a phone. Use the visible car body and the drawn bus position, including any portal clipping. Refresh the shared card even when the basemap has not loaded. A drag, pinch or cancelled touch only moves the camera. The phone card leaves the view switch accessible.

### Milestone 2: the City view (the big build), risk first
A downtown diorama in the vignette's style. It is built by generalising the vignette engine rather than starting over. It is split so the riskiest unknown, phone performance at about 23× the vignette's area, is measured before anything moves:
- **M2a, static city + performance gate.** Board, buildings with facades, streets, ground cover, trees, track, sun/weather and post chain, with quality tiers. Measure on the A16.
  - **Gate:** ≥ 30 fps on the low tier at the opening view.
  - If it misses, cut in this order: GTAO → shadows → tree clumps → tilt-shift taps. Then measure again before M2b.
- **M2b, motion.** Trains, freight, buses, then traffic, in that order, re-measuring the A16 after each.

**Data**
- Reuse the existing Overture downtown extract (`extract_overture.py`'s BBOX already covers it; no new download).
- Add a `downtown` entry to `pipeline/scripts/vignette.py` `VIGNETTES`.
- Parametrise the hard-coded `vignette-east` in `vignette_traffic.py` and `web/src/vignette/main.ts`.
- Run `vignette_trees.py` for downtown; expect about 2–5k trees.
- Move the O(n×m) placement work out of the browser and into the pipeline:
  - trees inside buildings;
  - street-light posts;
  - parking stalls.
- Output JSON. If it's over about 2 MB gzipped, switch to binary or split it into tiles.

**Engine refactor:** no file move. Generalise in place in `web/src/vignette/`, which `/vignette` keeps using, and add `web/src/city/main.ts` importing from it. A directory rename can come later as its own commit.
- `World` gets an options object (`terrain: 'trench' | 'flat'`, the tier settings) so East Portal keeps its current look.
- Keep as is:
  - `ink.ts`, `grade.ts`, `tiltshift.ts`, `time.ts`, the `environment()` sun/season/weather block;
  - `buildBuildings` + `patchFacades`, `buildStreets`, `buildFreight`;
  - the vehicle models (`cq400.ts`, `xcelsior.ts`, `vehicles.ts`).
- **Terrain:** City v1 uses a flat board (`terrain: 'flat'`). There is one indexed ground mesh instead of 6 non-indexed vertices per 2.5 m cell, and roads sit at 0. Bridges and overpass decks come from Overture `bridge` flags at a fixed deck height, using `buildStreets`' existing deck code. Tunnels are not drawn. This skips `computeHeights` (O(cells × segments), minutes at downtown scale, with the Connector trench assumed everywhere). East Portal keeps `terrain: 'trench'`. Real USGS elevation is a later step.
- **MARTA:** generalise `buildMarta` to every heavy-rail path in the scene, using the downtown `profiles`:
  - track on the surface and on viaducts;
  - tunnels shown as portals, with trains hidden underground (the status card says so).
- **Trains:**
  - Drive CQ400 consists from `TrainSource` (`web/src/core/trains.ts`): live MARTA when the clock is real time, otherwise the timetable.
  - Truth tiers are unchanged: live versus scheduled positions. The CQ400 body is the illustrative fleet type.
  - Lengths are as now (`typicalUnits`).
- **Buses:**
  - `DioramaBuses` snaps only when a new fix arrives, using a spatial grid over street segments; today it rescans every road every frame.
  - `MAX` goes to about 120.
- **Freight:** trace a continuous mapped freight route from the Georgia State crossing before animating it. Use the rendered freight track to place both trucks of each vehicle, including at the change from bare earth to bridge. The model lab supplies a generic diesel and boxcar. The position, time, consist and paint are illustrative. Identify freight in the City attribution and status sheet. Older bakes without a verified route can still open City and show passenger rail.
- **Traffic:** cars in City v1 run only on the Connector and major arterials (filtered by road class, with volumes from HPMS). That network is simulated in full, with no camera-region level-of-detail. Caps are raised to fit; the phone tier halves volumes.
  - When M2b reaches road traffic, revisit the Connector beneath the Georgia State rail approach.
    Sam’s highway-level reference shows how much of the opening beneath the freight bridge is
    occupied by pavement. Check the lane counts in each direction, median, shoulders and ramp
    merges against dated aerial imagery or roadway records before setting the widths. Compare
    the result from highway level as well as from the City camera.
  - For illustrative traffic, check that vehicles stay in their lanes, flow in the correct
    direction through merges, and form groups with gaps. Use the photo for appearance and
    reported traffic counts for typical volume. Keep the road footprint at both quality levels.

**Loading:** `/` loads only the shell first. City (Three.js plus city data) and Map (MapLibre) are both dynamic `import()`s, loaded for whichever view is open. A simple paper-coloured loading plate shows the status card immediately.

**Switching views outside downtown:** City covers only the downtown box. Switching from a Map position outside it opens City at the nearest point inside, and the status card says "City view covers downtown for now".

**Camera and controls**
- Keep the perspective camera with OrbitControls (gives the tilt-shift miniature).
- Add WASD/arrow panning (speed scales with distance) and Q/E rotation.
- Opening view: downtown at a glance — Five Points, the Gulch and the skyline — framed from the southwest.
- Double-click glides to a point using a cheap ground-plane pick instead of raycasting the merged meshes.

**Quality tiers** (decided once at start from device signals, with `?q=low|high` to override):

| | Phone (low) | Desktop (high) |
|---|---|---|
| DPR | 1 | ≤ 2 |
| GTAO | off | on |
| Shadow map | 1024 | 4096 |
| Tree canopy | 4 clumps | 10 clumps |
| Light map | ≤ 2048 | ≤ 2048 |
| Traffic | sparse | full |
| `preserveDrawingBuffer` | off | off |

- The shadow camera follows the view target in both tiers.
- The light map is capped at 2048 everywhere, at about 2 m per texel.
- `preserveDrawingBuffer` stays on only in `?export`.
- Target: ≥ 30 fps on the A16 at the opening view, measured with `scratchpad/cdp-fps.mjs`.

**Retire `scene3d/`** and the old `#panel` once City is in place.

### Milestone 3 (later, not in this plan)
- Phone portrait layout pass.
- Follow camera (tap a train → ride it).
- Midtown.
- Real terrain.
- Music.
- Street level reached from City.

## Critical files
- New:
  - `web/src/ui/{tokens.css,shell.ts,shell.css}`
  - `web/src/core/weather.ts`
  - `web/src/map/style.json`
  - `web/about.html`
  - (no new engine directory: `web/src/vignette/*` is generalised in place)
  - `web/src/city/main.ts`
- Changed:
  - `web/index.html`, `web/src/main.ts`, `web/src/style.css`
  - `web/vite.config.ts`
  - `web/vignette.html`, `web/models.html`
  - `pipeline/scripts/vignette.py`, `vignette_trees.py`, `vignette_traffic.py`
  - root `package.json` (`data:city`)
- Removed after M2: `web/src/scene3d/*` and the `#toggle3d` path.
- Kept: the Rust `scene` command and `scene/downtown/scene.json`, because the MARTA elevation `profiles` still come from it. Its `.bin` meshes stop shipping only if nothing reads them.

## Verification
- `pnpm test`, plus a contract test that the city data references real `routes.json` paths.
- Browser (Orca tab):
  - `/` opens on City and the switch round-trips to Map with the same place centred.
  - WASD and the arrow keys pan in both views.
  - The status card shows the neighbourhood, weather and time, and updates as you pan.
  - Live trains and buses appear, and a timetable clock (`?t=`) shows scheduled trains labelled as such.
- A16 over adb + CDP: City ≥ 30 fps at the opening view, Map unchanged (~89 fps), and first render in a few seconds on Wi-Fi.
- `pnpm review` per milestone. Build-log entries with screenshots.
- Deploy only after Sam says so. Rollback: `?view=map` always works, and a redeploy of the previous commit restores the old `/`.
- Each milestone lands as its own PR (M1, M2a, M2b), so `/` only switches to City once M2a passes the A16 gate. Until then `/` stays on Map with the new shell.

## Review notes (architect pass)
- **Folded in:**
  - risk-first split with a performance gate;
  - no directory move;
  - lazy-loading both views;
  - the out-of-bounds switch;
  - flat terrain spelled out;
  - keeping the Rust `scene` profiles;
  - simpler traffic (no level-of-detail).
- **Not folded in:** tiling the city data. A single file is fine up to about 2 MB gzipped, which is the measured trigger above, and tiling only matters once Midtown is added.

## Review notes (product-design pass)
- **Folded in:**
  - every state above (weather, feed, pinned clock, loading, failure, first run);
  - the top-right conflict with MapLibre's controls;
  - keyboard and focus rules;
  - contrast floor for the glass;
  - reduced motion;
  - generous pick radius.
- **Not folded in:**
  - portrait layout details (Sam: phone last);
  - a search box for finding a train (out of scope; the follow camera comes later).

## M2a takeover review (2026-11-21)
- **Significant, architecture:** `main.ts` still clamps Map targets to the retired scene's
  larger bounds. Use the loaded City board's bounds for both clamping and the coverage note.
  Count all render passes before assessing desktop performance; the current counter only
  measures the last fullscreen triangle. Record build time and steady-state fps separately.
- **Significant, product:** the opening crop cuts off the skyline and the tilt-shift blurs
  its identifying forms. Widen the southwest framing and keep the skyline readable.
  A loading plate must remain cancellable by switching to Map; late loads must dispose
  without attaching a second canvas. Reduced motion must also disable the double-click glide.
- **Sequence:** finish framing, surface rail and edge checks; measure desktop high/low;
  request Sam's A16 go-ahead; finish loading/target states and retire unused scene code.
  M2b and the City default remain behind the measured A16 gate. No new server work.

## Navigation follow-up (2026-11-21)

Sam chose to preserve viewing direction and approximate zoom between Map and City.
The implementation shares centre, clockwise bearing from north, and ground metres per
CSS pixel at the centre. City remains tilted and Map stays flat. Direct City entry retains
the opening composition; switching uses the active camera's heading and scale. Remember
the City's chosen tilt across a round trip, and clamp scale to its existing camera limits.

- **Architect review:** preserve scale in CSS pixels, independent of quality/DPR; convert
  Map zoom at the actual (possibly clamped) centre latitude. Read Map's camera when City
  finishes loading, since the user may pan or zoom during the load. Cancel any camera glide
  before applying an explicit camera handoff or keyboard move.
- **Product review:** preserve orientation before adding transition motion. Keep the existing
  cancellable loading state and downtown coverage note. A short key tap must move immediately,
  even when a frame is delayed. Verify screen-relative keys after rotation, both switch
  directions, zoomed views, and downtown-boundary clamping in Orca. A tilt/fade animation is
  a later refinement once this spatial continuity feels right.

## Held rotation follow-up (2026-11-21)

Drive held Q/E from the shell's existing animation-frame loop at 60°/s; use degrees at
the camera boundary. Keep an immediate 1° tap and stop on keyup or window blur.
- **Architect review:** key auto-repeat must not add rotation or start another loop;
  opposing keys cancel. Keep the existing 50 ms delta cap to avoid jumps after stalls.
- **Product review:** retain the user's high tier and camera pose during verification.
  Check held input, quick taps, simultaneous WASD, release, blur and typing guards.
  Report measured frame rate separately: smoother input does not make rendering faster.

## Close-up camera response (2026-11-21)

Sample held movement before City updates its shadow target, controls and renderer. Use
the shared animation-frame timestamp to apply movement once, even when Map's keyboard
callback also runs. Keep the immediate tap and the 50 ms movement cap. While City
covers Map, suspend its animated weather and retain the latest shared atmosphere so
a switch back, cancelled load or WebGL failure restores the correct Map weather.
