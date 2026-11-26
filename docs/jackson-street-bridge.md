# Jackson Street bridge

This is the downtown skyline photo spot: Jackson Street NE over John Lewis Freedom Parkway (SR 10), just east of the Connector. Because it is a landmark, its repair follows the landmark rules in AGENTS.md. This page records sources, dimensions and lighting before any model work. It is phase 1 of the [Connector repairs](connector-repairs.md), spot B. No images are committed here; every reference is a link.

**Location.** NBI and photo geotags put the bridge at 33.7601 N, −84.3743 W. That is City ≈ (1599, −689), which matches the drawn `bridge` run of Jackson Street from (1597.82, −663.46) to (1599.07, −730.51) in `north-corner/context.json`.

## Structure (sourced)

From the federal bridge inventory, structure **000000012104290**, "JACKSON STREET over SR 10" ([NTAD NBI query](https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Bridge_Inventory/FeatureServer/0/query?where=STRUCTURE_NUMBER_008%3D%27000000012104290%27&outFields=*&f=json), [summary](https://bridgelookup.com/bridge/99345)):

| Attribute | Value | Tier |
|---|---|---|
| Built | 1963, no reconstruction recorded | reported |
| Type | Continuous steel stringer/multi-beam, cast-in-place concrete deck, asphalt surface, no skew | reported |
| Spans | 4; longest 22.6 m; total length 67.4 m | reported |
| Width | Deck 18.9 m out to out; roadway 13.4 m curb to curb | reported |
| Sidewalks | 2.4 m raised sidewalks on both sides, behind a curb, no barrier; no median | reported |
| Lanes | 4, two-way, in the inventory. The 2025 restriping makes the current count unknown | reported, stale |
| Under-clearance | 5.23 m over Freedom Parkway; 7 lanes beneath | reported |
| Railing | "Meets standards"; press describes a low rail with no fence ([AJC](https://www.ajc.com/news/how-take-good-photo-from-the-jackson-street-bridge/01J4C2h0M8RnO5zhsFDWWO)) | reported, form unknown |

ATLDOT project 1126 (construction scheduled June–November 2025) adds a protected cycle track, more pedestrian space and ADA ramps. It also plans a parklet with seating and planters on the western edge overlooking downtown. As of 2025-11-18 the parklet was not built, and no completion report was found for 2026. Sources: [ATLDOT](https://atldot.atlantaga.gov/?p=7423) · [Rough Draft](https://roughdraftatlanta.com/2025/07/08/atlanta-jackson-street-bridge-improvements/) · [Fox 5](https://www.fox5atlanta.com/news/atlanta-jackson-street-bridge-updgrades-safety-groundbreaking) · [Urbanize Atlanta, 2025-11-18, construction photos](https://atlanta.urbanize.city/post/jackson-street-bridge-old-fourth-ward-redo-iconic-downtown)

## Estimated, not documented

- Parapets about 0.35 m each, from the deck width minus the roadway and sidewalks.
- Rail height about 1.0–1.1 m, assumed to be a concrete parapet with a metal top rail. Check in Street View.
- Girder depth about 0.9–1.1 m, from a span/depth ratio of roughly 1/22 at 22.6 m.
- Deck about 6.3–6.5 m above the parkway: 5.23 m clearance plus girder and deck depth. The drawn deck is about 6.5 m above the parkway (roadway y −10.5 over ground near −17.0), which agrees.
- Pier spacing about 15 / 22.6 / 22.6 / 7 m if symmetric. Not documented.

## Photographs (links only)

- Day, on the deck: [Segways on the Jackson Street Bridge, 2020-11-27, CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:Segways_of_Atlanta_assemble_on_Jackson_Street_Bridge.jpg).
- Day, view from the bridge (camera reference): [Atlanta skyline from Jackson Street Bridge, 2020](https://commons.wikimedia.org/wiki/File:Atlanta_skyline_from_Jackson_Street_Bridge_2020.jpg).
- Day, second angle: Street View [on the deck looking west](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.76027,-84.37436&heading=285&pitch=0&fov=80) and [from Freedom Parkway looking east at girders and piers](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7604,-84.3755&heading=90&pitch=5&fov=80). Neither link has been opened yet; verify both before modelling.
- Night: [Kyber 2016, 15 s](https://commons.wikimedia.org/wiki/File:Jackson_Street_Bridge_and_Atlanta_Night_Skyline_(Unsplash).jpg), [Kyber 2016, 441 s](https://commons.wikimedia.org/wiki/File:Jackson_Street_Bridge,_Atlanta,_United_States_(Unsplash_vXtX07KVcE8).jpg), [ViewBug about 21:00](https://www.viewbug.com/photo/68290041), and archival AJC night views from [1980](https://dlg.usg.edu/record/gsu_ajc_3868) and [1986](https://dlg.usg.edu/record/gsu_ajc_4017). All show light trails and the lit skyline taken *from* the bridge.

**Gaps.** No reliable night image of the deck, railing or luminaires was found. Bridge lighting is undocumented: pole positions, luminaire type and colour temperature are unknown. The only lighting note is the AJC's "row of lights down the middle of the freeway below." The research notes on what each photo shows come from Commons captions, EXIF and geotags, not from viewing the images. Review the images in an Orca tab before modelling.

## Drawn (branch `samsolomon/connector-b1-jackson`)

Before (main, phase 1): a 9.0 m roadway with two 1.95 m walk strips standing off it over open 2.05–2.55 m gaps. The west walk was 0.6–0.79 m below the road.

Now the bridge is one measured street deck, using the same primitive as Decatur, MLK and the downtown Peachtree crossing (`terrain/street-bridges.ts`). `street-bridge-survey.py` gained an Overpass-source mode (`--source pipeline/prototypes/square-board/source/north-corner.json.gz --only 1451196894`). It bakes only this entry and leaves the five Connector spans byte-identical.

- **Outline** 1451196894: 18.7–19.7 m wide, 67.1 m long. NBI: 18.9 m by 67.4 m.
- **Lidar rows** (USGS 2019 class-17 medians, crossfall extrapolated to the edges): the deck falls from 314.7 m NAVD88 at the north abutment to 312.8 m at the south.
- **Cross-section:** a 2.75 m edge-to-curb on each side (2.4 m raised sidewalk + ~0.35 m parapet, NBI) leaves a 13.4 m roadway. That gives 0.27 m raised walks with curbs, a centre line, 1.0 m parapets and a dark fascia.
- **Replaced runs:** the road 43520078 and both sidewalks (637636159, 1389424703). Their approaches land on Jackson Street and its mapped sidewalks at both ends.
- **Seams (25 samples across each end row, both tiers):** none open, all within 0.1 mm. The exception is the 16 mm yellow centre line ending at the north joint, which is paint.

Not modelled, with no source: bridge luminaires, the 2025 protected cycle track (current striping unknown), and the planned west-edge parklet. Night frames therefore show an unlit deck.

Matched stills, both tiers, day 14:00 and night 23:00 on 2026-11-20 (the after frames reuse the before orbit matrices):
- Orbit [day, High](log/ui/connector-repairs/b1-jackson/J1-jackson-high-day-before-after.jpg) · [Low](log/ui/connector-repairs/b1-jackson/J1-jackson-low-day-before-after.jpg) · [night, High](log/ui/connector-repairs/b1-jackson/J1-jackson-high-night-before-after.jpg) · [Low](log/ui/connector-repairs/b1-jackson/J1-jackson-low-night-before-after.jpg)
- North abutment [day, High](log/ui/connector-repairs/b1-jackson/J2-north-end-high-day-before-after.jpg) · [night, High](log/ui/connector-repairs/b1-jackson/J2-north-end-high-night-before-after.jpg)
- Skyline eye [day, High](log/ui/connector-repairs/b1-jackson/J3-skyline-eye-high-day-before-after.jpg) · [Low](log/ui/connector-repairs/b1-jackson/J3-skyline-eye-low-day-before-after.jpg) · [night, High](log/ui/connector-repairs/b1-jackson/J3-skyline-eye-high-night-before-after.jpg)

The eye stands 1.6 m above the walk it finds, so it now sits about 1.3 m higher, on the raised walk at the surveyed deck height.

## The skyline camera

Photographers stand on the **west sidewalk near mid-span**; the Commons geotag is 33.760266, −84.374356. The frame is centred near **285°** (west-northwest) and spans about 255–320°. Bearings from that point, computed from published building coordinates (estimated):

| Building | Bearing | Distance |
|---|---|---|
| Georgia-Pacific Tower | 257° | 1.25 km |
| 191 Peachtree Tower | 262° | 1.15 km |
| Westin Peachtree Plaza | 266° | 1.31 km |
| Truist Plaza | 285° | 1.21 km |
| Bank of America Plaza | 317° | 1.59 km |

City eye: (1590.6, −690) on the drawn west walk, 1.6 m above its tread (y −9.336). Bearing 285°, pitch +2°, vertical field of view 40°. Matrices: `log/ui/connector-repairs/cameras/B4-jackson-skyline-eye-{high,low}-camera.json` (phase 1) and `log/ui/connector-repairs/b1-jackson/cameras/`. A common lens is about 49 mm full-frame equivalent, roughly a 40° field.
