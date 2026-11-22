# Four track alignments east of Five Points

**Restore the mapped horizontal alignments together. Keep a common track elevation illustrative.** The open block lies between **Pryor Street SW** on the west and **Shirley Clarke Franklin Boulevard SW** on the east. The bridge inventory calls the eastern crossing **Central Avenue**. Peachtree Street is farther west along the covered route. On the measured CSX chord, the two mapped road centrelines cross at −7.4 and +116.5 m, outside the open freight way at 0–106.1 m. FRA records both streets crossing above the railroad. The 2025 NBI descriptions name CSX at Pryor and CSX and MARTA at Central. [Freight evidence and crossing identifiers](freight-route.md#five-points-east-cut-one-trench-separate-tracks) · [Annotated plan and ground sections](log/rail/2026-11-21-east-trench-sections.png)

## What the imagery and mapping establish

The dated orthophotos show a continuous opening between the two street decks. Several parallel rails are visible on the southwest side, with a retaining edge on that side and a vegetated strip alongside the northeast parking lot. The mapped CSX way runs along that northeast edge. The open way, adjoining tunnel tags and rail-under-road records identify the freight alignment. Shadow and vegetation limit a rail-by-rail identification from the images, particularly for freight. The 2024 county orthophoto was checked against all four registered polylines. The earlier Vantor imagery check gives about ±3 m lateral uncertainty for CSX. The public NAIP image is from 8 October 2023. The other imagery checks were Vantor 27 September 2022 and 2 February 2026. [NAIP crop](log/rail/2026-11-21-naip-2023-five-points-east-cut.jpg) · [Fulton County 2024 orthophoto, exact study crop](https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/Imagery/Pictometry2024_NAIP/MapServer/export?bbox=2228648%2C1364821%2C2229139%2C1365312&bboxSR=2240&imageSR=2240&size=982%2C982&format=png&f=image) · [Rail imagery assessment](freight-route.md#five-points-east-cut-one-trench-separate-tracks)

Each row is a separate OSM way, ordered southwest to northeast. Coordinates below are WGS84 **latitude, longitude**, west to east. Stations are metres projected along the chord from the western CSX node towards the eastern one. Length follows the curved mapped way. Ends are the actual shared nodes with tunnel-tagged neighbours, checked 21 November 2026. Decimal places identify the source vertices. A mapped transition and a bridge face constrain cover in plan. The freight inventory study assigns about ±10 m along track to tag-derived boundaries, and the existing MARTA fixture quotes ±15 m. Portal faces, roof thickness and tunnel depths still need survey or structural evidence.

| Track and version | Western open endpoint | Eastern open endpoint | Stations west–east / length (m) | Tunnel ways west / east |
| --- | --- | --- | ---: | --- |
| MARTA East Line ER · [702258817 v10](https://www.openstreetmap.org/way/702258817/history/10) | 33.7527189, −84.3898253 | 33.7520993, −84.3890070 | 4.1–106.3 / 102.6 | 702258825 / 702258813 |
| MARTA Interline X · [1453238814 v3](https://www.openstreetmap.org/way/1453238814/history/3) | 33.7527434, −84.3897954 | 33.7521766, −84.3890757 | 4.2–95.8 / 91.8 | 1453238819 / 1453238816 and 1453238817 |
| MARTA East Line EL · [702258818 v11](https://www.openstreetmap.org/way/702258818/history/11) | 33.7527728, −84.3897679 | 33.7521287, −84.3889251 | 3.7–109.5 / 106.0 | 702258826 / 702258816 |
| CSX Atlanta Terminal Subdivision · [54032236 v9](https://www.openstreetmap.org/way/54032236/history/9) | 33.7528378, −84.3897489 | 33.7521771, −84.3889207 | 0.0–106.1 / 106.2 | 54032238 / 54032235 |

The Interline's mapped covered branches start **10.3 m before** the freight eastern endpoint on this axis. The Overture 18 November 2026 release gives the same four open intervals to the displayed 0.1 m station precision. The respective GERS segment prefixes are `1a264429`, `64521aed`, `504c99e4` and `425c2519`. Overture and OSM share lineage. This agreement establishes reproducible model geometry, with no independent survey of track position or grade. The retained node and way snapshot credits © OpenStreetMap contributors under ODbL. [Source coordinates, versions and edit dates](../pipeline/prototypes/five-points-east-cut/osm-ways.json) · [OSM attribution and licence](https://www.openstreetmap.org/copyright)

## Five cross-sections

The section axis starts at City **(171.14, 118.11) m**. Along-track points eastward along (0.721517, 0.692396), and positive cross-track offsets point northeast along (0.692396, −0.721517). The first table gives **map-to-map** centreline separations along that perpendicular and the raw bare-earth difference at CSX and EL. The latter is a ground measurement at two mapped positions. Each field is anchored by the CSX coordinate in its row. All 30 geographic sample positions, signed offsets, City coordinates, native heights and packed-grid readings are in the CSV. [Transect data](../pipeline/prototypes/five-points-east-cut/transects.csv)

| Station m / CSX point (lat, lon) | ER–X m | X–EL m | EL–CSX m | CSX ground minus EL ground m |
| --- | ---: | ---: | ---: | ---: |
| 15 · 33.7527406, −84.3896362 | 3.86 | 4.36 | 6.23 | +4.89 |
| 35 · 33.7526081, −84.3894893 | 3.54 | 4.70 | 5.72 | +1.38 |
| 55 · 33.7524809, −84.3893363 | 3.35 | 4.96 | 5.43 | +2.24 |
| 75 · 33.7523594, −84.3891767 | 3.74 | 4.71 | 5.20 | +1.86 |
| 90 · 33.7522720, −84.3890526 | 3.51 | 4.40 | 5.19 | +1.53 |

The native 1 m USGS 3DEP bare-earth raster covers observations from **27 November 2018 to 24 April 2019** and was published 31 May 2022. It uses NAD83 / UTM zone 16N and heights in metres NAVD88. At station 55, the southwest and northeast flanks sample **319.05 and 319.64 m**. The four track positions, southwest to northeast, sample **310.76, 310.10, 310.99 and 313.23 m**. This resolves the trench. Near station 15, moving the CSX sample ±3 m across the northeast flank gives **312.41–319.06 m**. That sensitivity, terrain classification and the different observation years preclude reading the rail-to-rail vertical separation from the DEM. Relative track grades, railhead elevations, deck soffits and as-built wall positions remain unknown. [Ground reference, tile and sampling method](downtown-ground.md#reference-and-binary-layout)

## Same-camera City prototype

At station 55 the smoothed GTFS axis is **3.91 m** from the CSX centre across the section. City draws passenger tracks at ±2.1 m, placing the nearer one approximately **1.81 m** from freight. The mapped EL–CSX separation is **5.43 m** and the outer ER–CSX span is **13.74 m**. Widening the existing opening only to the northeast would retain the misplaced passenger tracks and miss the southwest track. With illustrative outside margins of 2.2 and 2.4 m, the shared footprint at this station extends about **6.8 m farther southwest and 1.1 m farther northeast** than the present 10.4 m-wide slot.

The prototype uses each mapped way's own exposure interval, replacing the local two-track drawing and opening with four strips on an explicitly schematic support plane at **311.1 m NAVD88**. That number is the rounded median of the five EL ground samples. The prototype sets rail treads 0.13 m above the plane. Its modelled rail-to-rail elevation difference is zero. The plane, tread lift and margins are display choices. The production freight renderer and its illustrative clock are reused.

At **14:15:31 Eastern on 20 November 2026**, the original terrain supplies just **4.01 m** of drawn freight tread (westbound freight route metres 957.71–961.72). The standalone study supplies **106.23 m** (855.49–961.72), making **102.22 m** drawable again. The 4 m original remnant cannot place both locomotive trucks. Both images use the same high-detail board, paused time, centre, zoom, bearing and 26° camera tilt. They show the freight movement in context. The comparison does not remap scheduled passenger vehicles. [Current City](log/rail/2026-11-21-east-trench-current.jpg) · [Mapped-track prototype](log/rail/2026-11-21-east-trench-mapped.jpg)

**Production recommendation.** Have the rail and renderer owners ship a shared track-by-track alignment and cover lookup for the static track, terrain openings, freight trucks and passenger poses together. Preserve GTFS path metres for timetable progress. Map them monotonically to the appropriate directional East Line track and test a whole consist straddling both cover boundaries for each service track. Keep the Interline distinct. If a source way, cover interval or mapping is absent, use the current rendering and freight suppression for this block. Keep any shared grade labelled illustrative until a track profile with a known datum is available.

## Reproduction

From the repository root with the pinned native DEM and downtown assets staged, run the following. The analysis uses NumPy, rasterio, pyproj and matplotlib. The Vite launcher applies the study to the development response in memory. Production entry points and data are untouched.

```sh
.venv/bin/python pipeline/prototypes/five-points-east-cut/study.py
node pipeline/prototypes/five-points-east-cut/serve.mjs
```

In Orca open `http://127.0.0.1:5370/?q=high&t=2026-11-20T14:15:31-05:00&speed=0&cut=current#19.1/33.75251/-84.38940/-148` and select City. Repeat with `cut=mapped`. The development-only `window.eastCutStudy` reports the local freight tread intervals and sampled GTFS axis for each view. Obtain the 1 m source from the [terrain reproduction guide](downtown-ground.md#reproduce-the-bake).
