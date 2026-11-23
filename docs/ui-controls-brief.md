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
| **Bottom-left: app bar** | Menu · view switch (**Map · City · Models**) · radio. It looks the same in every view. |
| **Right: detail panel** | One slot. It holds the selected train or building, the Key, About & credits, or a model's Details. It is only as tall as its content and grows to full height only for long content such as About, which scrolls inside. |
| **Bottom-right: camera column** | Compass, zoom in and out, share. It never moves. In Models it holds reset view, zoom and share. On Map the compass appears only once the map is rotated. |

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
  - Key ›
  - About & credits ›
  - Graphics: Auto, High, Low. Caption: "Low draws at standard resolution with simpler
    shadows, fewer leaves and less rain. Good for older phones." This maps to the
    existing `low` quality path in `web/src/city/city.ts`.
  - Built by Sam Solomon ↗, X, Instagram
  - map data credit in small print
- The menu has no title block.

## Models view (the Model lab moves in)

- The Model lab becomes the third view, no longer a separate page.
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
- **Keys:** arrows or WASD pan, Q/E rotate, +/− zoom, N faces north.
- **Implementation:**
  - In `web/src/city/city.ts`, remap the `OrbitControls` mouse buttons and touches and
    turn on `zoomToCursor`. Twist-to-rotate and two-finger tilt need a small gesture
    handler.
  - Re-check the tap-versus-drag threshold in `city/pick.ts`, and Follow.
  - Phones drop the zoom buttons, because pinch covers them.
  - The City studios edit `city.ts`, so coordinate through the Control agent.
- The first-visit hint uses wording that matches the view and the input, so the
  "Drag to look around · WASD to move" hint no longer appears on Map.

## Credits (OSMF attribution guidelines)

- On load, show a 12 px line "© OpenStreetMap contributors · OpenMapTiles" on the bottom
  edge, with a soft halo and no glass behind it.
  - **Desktop:** right-aligned, just left of the camera column.
  - **Phone:** centred under the app bar, in the home-indicator strip.
- It fades on the first pan or zoom, or after 5 s, whichever comes first.
- After that the credit lives in Menu › About & credits.
- "OpenStreetMap" links to openstreetmap.org/copyright.

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

## Not yet verified

- The large panels at night.
- Small-text contrast over the scene.
- The phone time sheet while dragging.
- Judge each of these in the running app.
