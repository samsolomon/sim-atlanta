# Night occupancy: one lit-window model for every building

**Status: proposal for Sam (2026-11-24). Not merged.** A prototype sits behind `?occ=proposed` on the branch `samsolomon/night-occupancy-proto`. The default render is unchanged.

## The problem

At 23:30, each newly skinned landmark tends to be the darkest tower in the frame:
- The Atlantic
- 171 Seventeenth
- Marquis One
- 1100 Peachtree
- Four Seasons

The skins follow honest occupancy by building type: offices are close to dark, residential runs 16–33%, and hotels about 40%. Fixing each building's lit set at build time gives those numbers.

The generic boxes around them use one rule: about **34% of upper-floor windows and 75% of shopfronts are lit whenever it's dark**, at 20:00 and at 04:00 alike, whatever the building is (`world.ts`, `patchFacades`). They also randomise brightness up to 1.05. As more buildings get skins, the generic boxes will set the look of the night skyline, and that look will be the less truthful one.

## Proposal

Generic and skinned buildings share **one lit-window fraction per use and local hour**. Use comes from the mapped class:
- **office:** commercial, retail, civic, university and hospital classes as well
- **residential**
- **hotel**
- **parking**
- **unclassified:** the mean of the office and residential curves

Street-level storefronts follow a separate shop curve. Values are the share of windows visibly lit on a weekday:

| Use | 18:00 | 20:00 | 22:00 | 23:00 | 00:00 | 02:00 | 04:00 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Office | 0.45 | 0.28 | 0.20 | 0.17 | 0.16 | 0.14 | 0.13 |
| Residential | 0.48 | 0.60 | 0.30 | 0.18 | 0.10 | 0.06 | 0.08 |
| Hotel rooms | 0.38 | 0.56 | 0.38 | 0.20 | 0.08 | 0.05 | 0.05 |
| Parking deck | 0.45 | 0.45 | 0.45 | 0.45 | 0.45 | 0.45 | 0.45 |
| Storefronts | 0.85 | 0.60 | 0.30 | 0.22 | 0.18 | 0.18 | 0.18 |
| Current generic (every use) | 0.34 | 0.34 | 0.34 | 0.34 | 0.34 | 0.34 | 0.34 |

The full 24-hour curves are `OCC_CURVES` in `web/src/vignette/world.ts` on the prototype branch.

## Where the numbers come from

**Energy-model schedules give the shape of each curve.** They are fractions of installed lighting power, not counts of lit windows. The DOE/PNNL ASHRAE 90.1-2019 prototype buildings give these weekday values:

| Use | Source | 18h | 20h | 22h | 23h | 00–04h |
|---|---|---:|---:|---:|---:|---:|
| Office | Large office [`BLDG_LIGHT_SCH`](https://raw.githubusercontent.com/NREL/EnergyPlus/develop/testfiles/ASHRAE901_OfficeLarge_STD2019_Denver.idf) | 0.27 | 0.18 | 0.09 | 0.045 | 0.05 |
| Office | 2004 reference large office | 0.50 | 0.30 | 0.10 | 0.05 | 0.05 |
| Hotel rooms | Large hotel [`BLDG_LIGHT_GUESTROOM_SCH`](https://raw.githubusercontent.com/NREL/EnergyPlus/develop/testfiles/ASHRAE901_HotelLarge_STD2019_Denver.idf) | 0.54 | 0.80 | 0.54 | 0.26 | 0.11 → 0.06 |

- **Residential:** the mid-rise apartment schedule ([2019](https://raw.githubusercontent.com/NREL/EnergyPlus/develop/testfiles/ASHRAE901_ApartmentMidRise_STD2019_Denver.idf) and [2004](https://raw.githubusercontent.com/NREL/EnergyPlus/develop/testfiles/RefBldgMidriseApartmentNew2004_Chicago.idf)) peaks at 20:00. Normalised to that peak, it is 0.83 at 18h, 0.38 at 22h, 0.16 at 23h, 0.07 overnight and 0.19 at 04h.
- **Retail:** [standalone retail](https://raw.githubusercontent.com/NREL/EnergyPlus/develop/testfiles/ASHRAE901_RetailStandalone_STD2019_Denver.idf) lighting falls from 0.5 until 21h to 0.05 after closing.

**Lit-window observations set the level.** A camera and street survey of London commercial buildings found 32% of windows lit at 22–23h, 26% at 23–00h and 22% at 02–03h on weeknights ([Di Cesare et al., 2008, Table 7](https://digital.wpi.edu/downloads/wp988k55s?locale=it)). That is far above the 0.05 energy fraction. Corridors, stairs, security lighting and cleaning crews show through windows even when offices are empty. The office curve sits between the two sources: **17% at 23h, falling to 13% overnight**. The London survey dates from 2008. Since then ASHRAE 90.1 has required automatic full-off within 20 minutes of vacancy, 9.4.1.1(h) ([PNNL 90.1-2019 lighting training](https://www.oregon.gov/bcd/codes-stand/Documents/90.1-2019-Lighting-training.pdf)), and that should pull modern towers below London's figure.

**Residential and hotel** use the prototype shapes, scaled so the evening peak is the visible share of units with lights on (0.6 residential, 0.56 hotel). That reflects curtains, and rooms that face away from the street. Hotel *occupancy* is 100% overnight, but rooms are dark because guests are asleep. The curves follow lighting, not occupancy.

**Parking decks** are lit all night. ASHRAE 90.1 9.4.1.2 requires idle zones to dim by at least 50%, never off. I found no source for typical overnight output. The prototype first tried 0.85, which made a generic deck read as a fully lit tower, so it now uses 0.45.

**Storefronts** follow the retail front-zone schedule, plus display and security glow after closing (0.18–0.30).

**Caveats:**
- The schedules don't vary by city, so none of this is Atlanta-specific.
- No residential lit-window time series was found. The citizen-science and VIIRS studies I looked at count light sources, not windows.
- Weekends run lower for offices. The prototype schedules give 0.05 at 23h on Saturday and Sunday. The prototype here is weekday only.

## What changes on screen

These sheets compare **current** (left) and **proposed** (right) at 20:00, 23:30 and 02:00. Both use the high tier, Friday 20 November 2026; the 02:00 frames are Saturday morning.

- [Midtown, `cam=800,-3710,70,50,1021`](log/ui/night-occupancy/mid-sheet.jpg)
- [Downtown, `cam=330,-700,40,55,1150`](log/ui/night-occupancy/dt-sheet.jpg)

- [Default City camera, whole board, no camera link: 20:00 and 23:30](log/ui/night-occupancy/default-sheet.jpg)

**At the default camera the two models look almost the same.** From about 20 km, a window is under a pixel, and street lamps and arterials make up most of the night picture. At 20:00 the proposal is slightly brighter over Midtown's residential towers; at 23:30 the difference is hard to see. The occupancy model matters once someone zooms to a district (the Midtown and Downtown sheets), which is where the generic boxes outshine the skins today.

Under the proposal:
- **20:00** is the brightest hour. Residential and hotel towers glow, and offices still show working floors.
- **23:30** has offices sparse and homes and hotels moderate. The skinned landmarks now sit inside the range of the generic boxes instead of below it.
- **02:00** is the darkest. What's left is mostly corridors, decks, storefronts and a few lit units.

The skyline changes through the night instead of holding one level from dusk to dawn.

## Implementation, if Sam approves

1. **Generic buildings (done in the prototype):**
   - Add one per-vertex attribute (`aUse`, from the mapped class) and four uniforms to the existing facade shader.
   - City sets the uniforms from the clock hour in `setAtmosphere`. The value is shared by every area's `World`.
   - This is not a new shader program. Cost is one float per facade vertex.
   - Each window keeps its stable per-cell hash, so it turns on and off at a fixed rank as the fraction moves, without flicker.
2. **Skinned landmarks:**
   - Today `landmarkShell.facade()` picks lit panes at build time with a random draw against `occupancy`.
   - Instead, every pane would go into the lamps mesh with a stable per-pane rank attribute. A shared `onBeforeCompile` on the lamps material would compare that rank with the building's use curve.
   - That makes one new program shared by all landmark lamps. Low tier now has headroom (79/85 programs), but studio-perf-buildings must agree, because a bespoke hook affects its batcher.
   - The other option keeps today's build-time sets and scales lamp emissive by `curve(hour) / occupancy`. That costs no program, but it changes brightness rather than the number of lit windows, so I recommend the rank version.
   - Each skin's PR records an occupancy class, so the change can be applied mechanically across the 25 or so skinned buildings.
3. **Weekends and holidays:** a weekday/weekend switch from `local(now).weekend`, using the prototype schedules' weekend values for offices and hotels.
4. **Truth tiers:** lit windows stay `illustrative` scenery, described in Key and About, not labelled on screen.
5. **Perf:** no change to draws or triangles. On the prototype branch, `pnpm test:perf` should show identical calls and programs. Run it before merging.

## Decisions for Sam

1. Adopt one shared model for generic and skinned buildings? (Recommended.)
2. Choose the office level at 23h: 17% (the proposal, between the energy schedules and the London survey), 5% (the energy schedules, very dark), or about 25% (London 2008, brighter).
3. Weekend curves now or later?
4. Should holiday decorative lighting stay separate and evidence-only, as it is now? (Recommended.)
