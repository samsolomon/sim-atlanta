# UI controls and chrome: design brief

Status: approved direction **A2c**, confirmed by Sam on 2026-11-23.
Design canvas: https://claude.ai/artifact/CCsbqwgHy8fTJ2ujri2iSx (private to Sam).
Build the boards under "Round 4", "One app" and "Round 5". The earlier rounds are history.

## Who it is for

- **The main visitor follows a shared link** and has no context. Phone and desktop get
  equal care.
- **They need to see right away** where they are, when it is, what the weather is, and
  how sure the data is.
- **They should then be able to:**
  - move the camera like a map app
  - tap a train or building to learn about it
  - change the time
  - share a view
- **The miniature leads.** The interface is a quiet frame around it.

## One layout, four places

Every view (Map, City and Models) uses the same four places. All glass sits **8 px**
from the screen edges. On phones, the top elements also sit below the status bar.

| Place | Contents |
|---|---|
| **Top-left: subject card** | **Map and City:** the neighbourhood under the camera centre, then time and weather, then a confidence line, for example "● Live · Friday, Nov 20" or "Timetable · illustrative sky · Now". **Models:** the model name with ⌄ to browse, ‹ › to step through its category, a one-line description and a position ("Vehicles · 1 of 3"). |
| **Bottom-left: app bar** | Menu · radio. There is no view switch: the **3D** control in the camera column moves between Map and City, and the Model lab opens from the menu (see "3D is City"). It looks the same in every view. |
| **Right: detail panel** | One slot. It holds the selected train or building, the Key, About & credits, or a model's Details. It is only as tall as its content and grows to full height only for long content such as About, which scrolls inside. |
| **Bottom-right: camera column** | Separate glass pieces, top to bottom: share · zoom + and − · the **3D** button over the tilt slider · a round compass. It never moves. Phones: compass, 3D button, share (no slider, no zoom). In Models it holds reset view, zoom and share. |

There is no "Sim Atlanta" name on screen. The name appears in the tab title, the link
preview and About.

Removed for now: Street view and search. Both are follow-ups.

## Subject card and time

- The neighbourhood comes from `data/ga/neighborhoods.json` at the camera centre and
  updates when the camera settles. Past neighbourhood zoom it reads "Metro Atlanta".
  - **Fix:** today it says "Downtown" even at metro zoom.
- **Time is plain bold text** with a faint ⌄. A light background appears only on hover;
  there is no pill at rest. The faint ⌄ is the tap cue on touch.
- Tapping the card opens **Time & weather**, below the place and time on desktop and as
  a bottom sheet on phones. It contains:
  - **Time:** a date button, plus a slider marked −12 h · Now · +12 h that fills from
    Now to the chosen time.
  - **Speed:** Pause, 1× and 30×. Show only speeds the app supports.
  - **Weather:** Auto, Clear, Rain, Fog and Storm. Auto uses the observed weather at the
    present time and an illustrative sky otherwise.
  - **Back to now:** a quiet button with a return arrow. It has no green dot, because it
    is an action, not a status.
- **Phones:** while the slider is being dragged, the sheet shrinks to just the slider and
  the time so the city stays visible.
- This replaces the hidden `?controls=1` panel (`web/src/main.ts:528`).

## Notices

- Short status notes appear as one small glass pill directly under the subject card,
  8 px below it. Examples:
  - the existing area note (`shell.setNote`, for example "Showing the nearest loaded
    City area")
  - loading
  - live feed unavailable, showing the timetable
- Only one note shows at a time. Its tier words must stay readable over any background
  (see PR #204).

## Detail panel

- **Selected train:**
  - line accent and service colour
  - destination
  - Follow and Share
  - next stop, with a truth tier on each attribute
  - car count, marked illustrative
  - an "All stops ›" row
- **Two things want the panel:** the newer one replaces the older one. A back row (for
  example "‹ Northbound to North Springs") returns to the previous content.
- **Camera on selection:** selecting something moves the camera so the subject sits in
  the middle of the visible area beside the panel.
- **Key:** two sections, each line short enough for one line.
  - **Colour means the kind of service:** city rail, intercity, freight, bus.
  - **Confidence:** Live (real-time feed, moments ago), Scheduled (from a published
    timetable), Reported (an operator's reported average), Inferred (filled in from
    nearby reports), Illustrative (typical, not observed). No status dot on the labels.
- **About & credits:** the copy from `web/about.html`, the credits list, then "Built by
  Sam Solomon ↗" (solomon.io), with X and Instagram links to @samuelrsolomon.

## Menu

- Opens upward from the app bar. On phones it is a bottom sheet.
- Contents:
  - Model lab › "The trains, buildings and trees, up close" (opens the Models view)
  - Key ›
  - About & credits ›
  - Graphics: Auto, High, Low. Caption: "Low draws at standard resolution with simpler
    shadows, fewer leaves and less rain. Good for older phones." This maps to the
    existing `low` quality path in `web/src/city/city.ts`.
  - Built by Sam Solomon ↗, X, Instagram
  - map data credit in small print
- The menu has no title block.

## Models view (the Model lab moves in)

- The Model lab is a view in the same shell, no longer a separate page. It opens from the
  menu (Model lab ›), not a view switch. In Models, the subject card gets a ‹ back control
  that returns to the Map or City you came from.
- **Details panel:** camera (Front, Side, Rear, Top), line colour, platform, and display
  switches (Night, Ink outlines).
- **"Compare with a photo"** is a modelling tool, so it goes behind a dev-only flag such
  as `?dev`.
- **Browser at scale:** tapping the model name opens a tall panel on the left, or a
  full-height sheet on phones. It contains:
  - search
  - category chips with counts
  - a Recent row, shown only once the catalogue is large
  - a grouped list in which each row has a thumbnail coloured by service, a name and one
    line
- **Phones:** Details is a button on the model card, so the app bar stays identical in
  every view.

## Selected states

- **Segmented controls:** the chosen option is a raised white chip inside a light grey
  track. At night it is a soft lighter tint. Never use a dark primary fill.
- **Night:** the glass is darker and more translucent, with a brighter edge so pieces
  stay visible against the dark scene.

## Camera: move like a map

- **Mouse:**
  - drag pans
  - right-drag or Ctrl-drag rotates and tilts
  - scroll zooms toward the cursor
  - double-click zooms in
- **Touch:**
  - one finger pans
  - pinch zooms
  - twisting two fingers rotates
  - dragging two fingers up or down tilts
  - double-tap zooms in
- **Trackpad (desktop):**
  - click-drag pans
  - two-finger scroll up or down tilts; sideways turns
  - pinch zooms
  - twist turns, in Safari only (its gesture events; other browsers don't receive it)
  - A mouse wheel still zooms. Tell the two apart per gesture: trackpads send small,
    fractional, often sideways deltas; wheels send fixed notches (or `deltaMode` lines).
    A wrong guess only means a smooth-scrolling mouse tilts; + and − still zoom.
  - Two-finger tilt stops at City's top (20°). It never switches between Map and City.
- **Keys:** arrows or WASD pan, Q/E rotate, +/− zoom, N faces north.
- **Implementation:**
  - In `web/src/city/city.ts`, remap the `OrbitControls` mouse buttons and touches and
    turn on `zoomToCursor`. Twist-to-rotate and two-finger tilt need a small gesture
    handler.
  - Re-check the tap-versus-drag threshold in `city/pick.ts`, and Follow.
  - Phones drop the zoom buttons, because pinch covers them.
  - The City studios edit `city.ts`, so coordinate through the Control agent.
- The first-visit hint uses wording that matches the view and the input (trackpad:
  "Two-finger scroll to tilt and turn · pinch to zoom · drag to move"; touch: "Two
  fingers: drag up or down to tilt, twist to turn, pinch to zoom"), so the
  "Drag to look around · WASD to move" hint no longer appears on Map.

## 3D is City (Sam chose C, 2026-11-23)

Boards: the canvas section "B and C — 3D is City" (C rows) and "Camera column — tilt you
can see". The site already opens in City (#297), so first impressions don't change.

- **No view switch.** The app bar is menu · radio.
- **3D button** (top of the tilt piece in the camera column). On = City, drawn as a dark
  chip with light "3D". Off = the flat Map. Turning it on plays the Map → City switch below;
  turning it off plays City → Map.
- **Tilt slider** under the button, one range across both views:
  - top = flat Map (0°); a notch at 20° = City's highest angle; bottom = 70°.
  - In Map, dragging down tilts the map with the pointer. Crossing the notch (it catches
    briefly) starts City. Dragging back up past it returns to Map.
  - The first time, City still has to build, so the switch plays at its own pace like a
    tap. Once City is built this session, the cross-fade follows the pointer.
  - While dragging, the angle shows beside the thumb ("38°").
  - City's default tilt stays 55°.
- **Compass:** round, its own piece. Tap faces north; drag turns.
- **Phones:** compass, 3D button, share. No slider (two-finger drag tilts) and no zoom
  buttons (pinch).
- **Outside City's area** (or zoomed out past City's scale): the 3D button and slider dim.
  Hover or tap shows "3D covers downtown and Midtown." with **Take me there**, which flies to
  City's opening view and plays the normal switch.
- **URLs:** `?view=city` and `?view=map` keep working; 3D on/off is the same state.
- **Models** opens from the menu (see Models view).

## Credits (OSMF attribution guidelines)

Both views show the same line in the same place: 12 px on desktop and 11 px on phones,
"© OpenStreetMap contributors · OpenMapTiles", on the bottom edge with a soft halo and no
glass behind it.

- **Placement:**
  - **Desktop:** right-aligned, just left of the camera column, with its baseline level
    with the bottom of the app bar and camera column.
  - **Phone:** centred under the app bar, in the home-indicator strip.
- **"OpenStreetMap"** links to openstreetmap.org/copyright. **"OpenMapTiles"** links to
  openmaptiles.org.
- **Map view (2D, OpenFreeMap tiles): the credit is permanent.** It never fades. This is
  Sam's decision of 2026-11-23, because the basemap tiles carry their own attribution
  terms beyond OSMF's.
- **City view (3D diorama): the credit fades.** It goes on the first pan or zoom, or
  after 5 s, whichever comes first. After that it lives in Menu › About & credits, as the
  OSMF attribution guidelines allow.
- **Switching back to Map** shows the permanent line again at once.
- **Models view** shows no credit line, because no map data is on screen. About still
  lists every source.

## Loading and arrival: the white model

Sam chose this on 2026-11-23 (canvas boards 7 and 8). City arrives as a neutral **white
study model** of the real scene, then colour and everything else fades in on top. Nothing
moves while it loads: no zoom, no stretching, no rising buildings.

References:
- `docs/ui-a2c/loading/white-model.jpg` and `colour.jpg`: the same camera rendered both ways
  from the real scene
- `docs/ui-a2c/loading/areas.jpg`: areas still arriving as white model
- `docs/ui-a2c/source/L7-white.dc.html` and `L8-areas-white.dc.html`: the playable timing
  mockups

### What the white model is

- **A render mode of the live scene, not a picture.** Draw the scene with one override
  material: matte paper white `#f4efe4`, `MeshLambertMaterial`, no maps or vertex colours.
  Keep the scene's lighting, shadows, ink, ambient occlusion, tilt-shift and grade passes.
  - The quick test set `RenderPass.overrideMaterial` on the composer's first pass.
    Setting `scene.overrideMaterial` does not work, because `RenderPass` overwrites it.
- **It works from any camera,** including shared links, and lines up exactly with the
  coloured scene because it is the same geometry.
- **Trees** kept their colour in the test because their instanced colours bypass the
  override. Make them white too, or leave them out until colour arrives.
- **Ink:** with everything one colour, the ink pass mostly draws silhouettes, so creases
  are faint. Optional refinements: roofs one tone darker than walls, or a stronger ink
  setting while in white-model mode. Judge this in the browser.
- **Night:** the same white model under the night lighting. Add window lights only when
  colour arrives.

### Sequence on first open

1. **Under half a second:** the frame (place card, app bar, camera column) appears over the
   paper background. The notice under the place card reads "Building the city…". The place
   card's tier line shows the date with a grey dot, and does not say Live yet.
2. **As soon as building footprints and heights have loaded:** draw the white model and
   fade it in over about 1.2 s with an ease-in-out curve, so it settles in rather than
   flashing (Sam, 2026-11-23). This needs only the small scene data, not textures or
   terrain detail.
3. **As the remaining stages finish:** cross-fade from the white render to the full-colour
   render over about 1 s. Render both, or render colour into a target and blend in a final
   pass.
4. **Live:** vehicles appear only after colour has arrived. The tier line turns to the
   green "Live" dot, the notice goes away, and the City credit line appears. Its 5 s fade
   timer starts here, at the reveal, not during loading.

### Why nothing moves

- The build blocks the main thread for up to about 2 s per stage (terrain is the longest).
  Any motion would visibly stall.
- A still white model doesn't show a stall.
- Each fade runs only after a stage has finished, while the thread is free.

### Areas that arrive later

- An area whose detail hasn't loaded yet stays white model.
- The notice names it, for example "Building Midtown…". When its data is ready, colour
  fades in over that area only.
- Never scale, rise or stretch geometry into place.
- Whether to load only the areas in view first (progressive) or everything at once (eager)
  is a separate decision. The build log chose eager after desktop measurements and has no
  phone data. Measure on the Galaxy A16 before changing it. The white-model treatment works
  either way.

### Map to City (Sam chose option B, 2026-11-23; triggered by the 3D button or slider)

Reference: canvas board 9 (`docs/ui-a2c/source/L9-map-b.dc.html`), built from real captures.

1. **Turn on 3D: the map tilts first.** MapLibre eases from its current pitch to City's tilt
   over about 1 s, keeping centre and bearing, while City's data downloads. Nothing heavy
   runs yet, so the tilt stays smooth.
2. **White buildings stand on the map.** City draws only buildings (ground, roads, decks and
   table hidden) in the white material, over a transparent background, with the tilted map
   still visible underneath. Fade in over about 1.2 s, ease-in-out. The map is the ground.
3. **Colour replaces the map ground.** When the full scene is ready, the complete coloured
   City, ground included, cross-fades in over about 1.4 s and covers the map. Then live.
4. **Never zoom** during the switch.

**Camera match** (verified by overlaying the captures):
- the same centre, bearing and tilt
- the MapLibre vertical field of view set to City's 22° (`map.setVerticalFieldOfView(22)`)
- the same ground scale. MapLibre zoom uses 512 px tiles, so
  `zoom = log2(78271.517 · cos(lat) / metresPerPixel)`.

**City to Map:** the reverse. Colour fades to white buildings on the map, the buildings fade
out, then the map flattens.

**Edge cases:**
- **Zoomed out past City's scale, or centred off the board:** use a plain cross-fade to
  City's opening view (with the existing area notice).
- **City already built this session:** skip the white stage and cross-fade from the tilted
  map to colour.
- **Reduced motion:** no tilt animation; the map is replaced by City directly.

### Other states

- **Switching back to Map mid-load** cancels the build (this already works). There is no
  white flash; return straight to Map.
- **City fails to load:** fall back to Map with the existing notice.
- **No 3D graphics:** go straight to Map.
- **Reduced motion:** the same sequence with instant swaps in place of fades.
- **Truth:** the white model shows no vehicles, and nothing reads "Live" until the live
  scene is on screen.

### Ownership

- This changes `web/src/city/city.ts` (the build stages and render passes), so the City
  studios should sequence it.
- It comes after the camera-gesture step and its seam with the Follow agent.

## Share

- Share copies the link, or opens the phone's share sheet, for view, camera and time.
- **Two options:**
  - **Live:** no time in the link, so it opens at the viewer's present.
  - **Freeze this moment:** `t=…&speed=0`.
- The camera goes into the URL. Today it is set only through the dev-only
  `__city.lookAt(x, z, {bearing, tilt, metresPerPixel})`.

## Radio

- An icon in the app bar, off until tapped, because browsers block autoplay. While it
  plays, the track title shows next to it.
- Build it against a stub playlist. The music comes later: about 10 calm, SimCity-style
  tracks, around 30 minutes in total.

## Rules that do not change

- **Truth tiers on every fact.** Live appears only at the real present. A shifted clock
  reads Timetable, and its weather reads illustrative.
- **Colour means the kind of service,** not the agency.
- **Free to host.** No per-visitor server work.
- **Accessibility:**
  - touch targets of 44 px or larger
  - visible focus rings
  - honour reduced motion: camera jumps are instant
  - measure text contrast on glass over busy scenes after the build

## Build order (behind `?ui=next` until it replaces the current interface)

1. **Shell:** the four places, glass tokens, 8 px insets, app bar, camera column, the
   corrected hint, and the credit line. Map and City.
2. **Camera gestures:** maps-style mouse and touch input in City, coordinated with the
   City studios.
3. **Subject card and Time & weather:** the neighbourhood lookup, the time panel and
   sheet, and Back to now.
4. **Detail panel:** train card, Key, About, the replace-and-back rule, and phone sheets.
5. **Share** with the camera in the URL.
6. **Menu:** Graphics quality and links.
7. **Models view:** the Model lab merged in, Details, the browser, and `?dev` for the
   photo overlay.
8. **Radio shell.**
9. **Loading and arrival:** the white model, colour fade-in, areas arriving as white model,
   and the registered Map to City switch (see the section above). Sequence it with the City
   studios.
10. **3D is City (option C):** drop the view switch from the app bar, add Model lab to the
    menu and ‹ back in Models, the new camera column (3D button, tilt slider, round
    compass, share on its own), trackpad two-finger tilt, the off-area state, and the new
    hints. The slider crossing into Map comes after option B's switch has landed, since it
    drives that same transition.

## Not yet verified

- The large panels at night.
- Small-text contrast over the scene.
- The phone time sheet while dragging.
- Judge each of these in the running app.

## Appendix: board references and exact values

The canvas is private, so the approved boards are copied into this branch:

- `docs/ui-a2c/*.jpg`: one capture per approved board.
- `docs/ui-a2c/source/*.dc.html`: each board's markup and CSS. These are design mockups:
  images point at canvas uploads and `support.js` belongs to the canvas, so read them
  for values and structure, not to run.

| Board | Shows |
|---|---|
| `A2c-desktop` | City, live, train selected: subject card, content-height detail panel, app bar, camera column |
| `A2c-night` | Night glass, clock shifted, radio playing ("Peachtree Drift") |
| `A2c-menu` · `A2c-phone-menu` | Menu on desktop (opens up from the app bar) and phone (sheet) |
| `A2c-key` · `R5-phone-key` | Key in the detail panel and as a phone sheet |
| `A2c-about` | About & credits: full-height panel that scrolls, stopping above the camera column |
| `A2c-models` · `R5-phone-models` | Models view: model card, Details panel, Details button on phones |
| `A2c-models-browser` · `R5-phone-browser` | Model browser at 100+ (categories and counts are examples) |
| `R5-time` · `R5-phone-time` | Time & weather on desktop (inside the subject card) and phone (sheet) |
| `R5-map` · `R5-phone-map` | Map view in the same layout; Key replacing a selection with a back row; the permanent Map credit line |
| `A2c-phone` | Phone, train selected: sheet, bottom bar hidden |

### Glass

- **Day:**
  - background: `linear-gradient(160deg, rgba(252,250,245,.80), rgba(243,239,230,.68))`
  - filter: `backdrop-filter: blur(22px) saturate(1.35)`
  - shadow: `box-shadow: 0 0 0 .5px rgba(60,45,30,.18), 0 10px 28px rgba(40,30,20,.18), 0 1px 3px rgba(40,30,20,.10), inset 0 1px 0 rgba(255,255,255,.9)`
  - Ink `#2a2722`, secondary ink `#5f5a50`, separator `rgba(60,45,30,.12)`.
- **Night:**
  - gradient `rgba(38,44,56,.70)` → `rgba(20,24,32,.62)`
  - edge `0 0 0 .5px rgba(255,255,255,.16)`, inset highlight `rgba(255,255,255,.22)`
  - shadow `0 12px 32px rgba(0,0,0,.45)`
  - ink `#eef0f3`, secondary ink `#b7bfcb`, separator `rgba(255,255,255,.12)`
- **Panels that hold long text** (menu, About, browser) use slightly more opaque day glass
  (`.84–.92` / `.74–.86`).
- **Radius:** cards and panels 16 px; phone sheets 24 px with a 40×5 px grabber; buttons
  9–10 px.
- **Inset:** 8 px from every edge. On phones the top items sit at `safe-area-top + 8`
  (54 px on the 390×844 board). The app bar sits 34 px from the bottom, above the
  home indicator.

### Type and sizes

System UI sans throughout.

- **Subject card (desktop):**
  - place 30 px / 700 / −0.015em
  - time line 16 px; time bold with a ⌄ at 45% opacity
  - tier line 12 px with a 7 px dot
  - padding 14 / 18 / 14 / 20 px
- **Subject card (phone):** place 22 px, time line 14 px.
- **Panel widths:**
  - detail panel 360 px
  - About 384 px
  - Models Details 312 px
  - model browser 380 px
  - menu 320 px
  - Time & weather card 372 px
- **Heights:** app bar and camera buttons 44×44 (phone app bar 52 px tall); app bar
  48 px on desktop.
- **Selected segment:**
  - day: background `rgba(255,255,255,.95)`, shadow `0 1px 3px rgba(40,30,20,.16), 0 0 0 .5px rgba(60,45,30,.12)`, track `rgba(60,45,30,.12)`
  - night: `rgba(255,255,255,.20)` on a `rgba(0,0,0,.22)` track
  - never a dark fill
- **Camera column (desktop):** 44 px wide pieces, 8 px apart, radius 14 px (compass
  fully round). 3D button 36×30 px, 13 px / 700; on = `#2a2722` fill with `#fbf9f4` text
  (a toggle, not a segment, so the no-dark-fill segment rule doesn't apply); off = ink
  text, no fill. Slider track 4×96 px in the separator colour, filled above the thumb in
  ink at 55%; thumb 18 px white with `0 1px 4px rgba(40,30,20,.35)`; notch 2 px in
  secondary ink. Angle label 12 px / 600 on ink, 30 px left of the thumb.
  Off-area: button and track at 40% opacity; tooltip 13 px on ink, to the left.
- **Truth-tier label:** 11 px / 600, 1 px separator-colour border, fully rounded, secondary
  ink. Fixed width (76 px) in the Key so the descriptions line up.
- **Colour lines in the Key:** 28×5 px. Service colours come from `web/src/ui/tokens.css`.
- **Credit line:**
  - 12 px on desktop, 11 px on phones, colour `#4a463e`
  - halo `text-shadow: 0 0 2px #f4f1ea, 0 0 4px #f4f1ea, 0 0 8px #f4f1ea`
  - no glass behind it
  - **permanent on Map; fades on City** (first pan or zoom, or 5 s); none on Models
  - desktop: `right: 60px; bottom: 9px`, so it sits just left of the 44 px camera column at the 8 px inset
  - phone: centred, `bottom: 11px`, below the app bar
  - night City: use the night secondary ink with a dark halo, `text-shadow: 0 0 2px #0b1020, 0 0 6px #0b1020`
  - the boards show the line on load; on Map it stays exactly as drawn
- **Follow** is the one dark primary button (`#2a2722` on `#fbf9f4`). Every other button
  uses the separator-tint background.

### Share sheet (not redrawn in A2c, behaviour unchanged)

- Title "Share this view", with the line "The link opens on this exact camera in City."
- Two radio rows:
  - **Live:** "Opens at whatever time it is for the viewer."
  - **Freeze this moment:** "Fri, Nov 20 · 9:30 PM, paused. Trains from the timetable."
- A monospace preview of the link, then "Copy link" and "Share…" (the system share sheet).
- Desktop opens it from the share button in the camera column as a small panel; phones
  use a sheet.

### Copy to reuse verbatim

| Where | Text |
|---|---|
| Graphics caption | "Low draws at standard resolution with simpler shadows, fewer leaves and less rain. Good for older phones." |
| Weather caption | "Auto shows the observed weather at the present time and an illustrative sky otherwise." |
| Key, section headings | "Colour means the kind of service", "Confidence" |
| Menu items | "Key: What the colours and labels mean", "About & credits: How it works and where the data comes from" |
| Credit line | "© OpenStreetMap contributors · OpenMapTiles" ("OpenStreetMap" links to openstreetmap.org/copyright) |
