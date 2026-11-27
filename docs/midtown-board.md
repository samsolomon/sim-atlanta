# Midtown City coverage

City metres increase east and south from Five Points. The completed square spans x = −1000…1800 and z = −1700…1100. Five opt-in rows extend the same 2.8 km width northward. Each 800 m row adds 2.24 km² and shares 561 inclusive ground nodes with the preceding row.

| Row from downtown | City z range (m) | Integration |
|---|---|---|
| North Avenue and Fox Theatre | −2500…−1700 | First opt-in tile, generic streets and buildings |
| Central Midtown | −3300…−2500 | Generic streets and buildings |
| Upper Midtown | −4100…−3300 | Includes the three upper Midtown tower footprints |
| South Brookwood approach | −4900…−4100 | Ground under the southwest rail approach |
| Peachtree Station and north approach | −5700…−4900 | Station and north approach ground, removable depot and road-deck fallbacks |

The Amtrak ATL stop in routes.json is 33.79945° N, 84.39248° W, near City (−81, −5065). The rail owner's approach envelope is 33.7955…33.8035° N and 84.3985…84.3865° W, within the final two rows. The north edge extends about 635 m beyond the station in City z. The full footprint including downtown is 2.8 × 6.8 km, or 19.04 km². Each row mounts after the preceding ground join validates. Brookwood rail owns track, station exclusions and train presentation. Midtown landmarks owns the Bank of America Plaza and Fox Theatre models.

**Architect review, November 23.** A direct camera target can fall beyond the loaded square. Load the north section first, retain the target until its tile mounts, and keep the prior boundary closed through a fetch or checksum failure.

**Product design review, November 23.** Use City's existing pan, picking, About panel and full-board retry under an explicit Midtown URL. Count only the available rows in that view. Keep ordinary City and the square on their existing request paths.

## Bounds and rail handoff

The extension runs from longitude −84.402417 to −84.372130. Row edges from south to north are at latitude 33.769188, 33.776383, 33.783578, 33.790772, 33.797967 and 33.805161. Clipping the scheduled Crescent shape `amtrak:path:242` to the last two rows gives a single line from (704, −5700) to (−1000, −4190). Measured along that shape from the point nearest ATL, 1,011 m fit to the northeast and 1,269 m to the southwest. The rail owner supplies visible alignment, cover and heights. Routes snapshot SHA-256 is `5385af7996d155dde14b199eaffb941fc807b577663af57cf1f014e40edde625`. [Routes snapshot](https://atlanta.solomon.io/data/ga/routes.json)

## North Avenue tile

Three static files add 887,014 bytes (233,275 bytes compressed separately with gzip level 9). The 561 × 161 inclusive 5 m grid has zero masked nodes. The SHA-pinned downtown DEM supplies the southern nodes. The adjacent x74y375 raster supplies the remaining 48,018 nodes. Ground is encoded as absolute NAVD88 decimetres with the same 323.8 m scene zero. Interpolated terrain is inferred. The archived OSM map contributes 756 clipped building pieces, 2,632 street/path runs and 264 land-cover pieces. Horizontal geometry is reported. Tagged heights are reported, floor-derived heights inferred, and fallback heights, foundations and deck clearance illustrative. OSM data and derived context are available under ODbL. [Ground manifest and source URLs](../pipeline/prototypes/square-board/midtown-south/ground.json) · [Archived OSM map](../pipeline/prototypes/square-board/source/midtown-south.json.gz) · [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

All 20 distinct named street crossings across 18 names have identical x coordinates on the two clipped edges (to 0.01 m), including Peachtree Street NE at x = 591.09. The generic footprints for Bank of America Plaza (`osm:way:39449840`) and Fox Theatre (`osm:way:208355446`) sit entirely inside the new row. The landmark owner can replace them by ID when building the tile. At Brookwood the station row has two independent fallback objects. In the successful City section callback, read `mosaic.areas.get('brookwood-station')` and `mosaic.areas.get('brookwood-south')`. Each supplies `group`, `groundAt(x,z)` and its grid. After the rail owner mounts its replacement, hide the station group's descendants named `osm:way:265350477` (depot) and `osm:way:38978515` (Peachtree Street bridge) with `getObjectByName`. Both stay visible if the rail layer is absent. The sibling rail change owns the island, rail, track cut and train presentation.

## Central Midtown through Brookwood

All four additional rows have 90,321 valid ground nodes from x74y375. Ground spans 239.9–307.0 m NAVD88 across these rows. The base for the Midtown view sits at 234 m NAVD88. Using downtown's original base would have put the tabletop above ground near the station. Each adjoining pair matches at all 561 ground nodes. At low and high detail the two rendered edges agree every 2.5 m. The crossing column counts distinct street names and x positions at each row's southern edge. Every named crossing has a counterpart within 0.01 m.

| Row | Footprint pieces | Road/path runs | Named crossings | Raw bytes | gzip-9 bytes |
|---|---:|---:|---:|---:|---:|
| Central Midtown | 1,035 | 2,308 | 21 | 922,097 | 247,129 |
| Upper Midtown | 940 | 2,256 | 20 | 868,078 | 235,805 |
| Brookwood south approach | 990 | 1,423 | 22 | 717,514 | 212,276 |
| Brookwood station | 908 | 740 | 19 | 588,484 | 190,730 |

A direct Map-to-City jump to ATL loaded downtown, the north band and corner, then five rows in order. A low-detail full-board request with upper Midtown's context unavailable stopped at nine of twelve areas. Retrying after restoring the context mounted all twelve. A fresh low-detail downtown opening fetched zero square-board files.

For the station camera open `/?view=map&board=midtown&q=high&t=2026-11-20T14:00:00-05:00&speed=0#15.7/33.79945/-84.39248/35` and choose **City**. At 999 × 496 the City target was (−81.36, −5064.94), bearing 35°, tilt 57°, 1.2205 m per pixel. **Show full board** targets (400, −2300), bearing 15°, tilt 35°. [Station ground and fallback bridge](log/ui/midtown-board/station-ground.jpg) · [All twelve areas](log/ui/midtown-board/brookwood-overview.jpg)

## Stage and inspect

On a populated checkout run `pnpm data:midtown`, then `pnpm dev`. Open `/?view=city&board=midtown`, and pan north. A fresh downtown opening requests zero Midtown assets. North Avenue follows the north band, and a failed fetch keeps its edge wall in place until a successful retry: the notice under the subject card ("Could not load the north section.") ends in a **Retry** link, which loads the failed areas again without moving the camera. City's hidden `#city-info` button still loads and frames the full board for tests and tools (`board-exterior.test.ts`, `ground-audit.mjs`). The menu no longer offers it (release 20). To publish, the coordinator stages the data, runs `pnpm build` and deploys the static assets together.

For the street camera open `/?view=map&board=midtown&q=low&t=2026-11-20T14:00:00-05:00&speed=0#16/33.77065/-84.38630/0/46` and choose **City**. The captured City target was (489.99, −1862.52), bearing 0°, tilt 57°, 0.9917 m per pixel. The original North Avenue overview targeted (400, −700), bearing 15°, tilt 35°. [North Avenue in Orca](log/ui/midtown-board/north-avenue.jpg) · [Full board in Orca](log/ui/midtown-board/overview.jpg)

To rebake, download the two GeoTIFF URLs recorded in the manifest. Use the square-board Python dependencies and the command below. The archived OSM extract fixes the context edition. Two complete bakes reproduced all fifteen output hashes, including the original North Avenue pack. Append `--row midtown-central` (or another row ID) to reproduce one row against its checked-in predecessor.

```sh
.venv/bin/python -B pipeline/scripts/square_board.py path/to/x74y374.tif --section midtown --north-tile path/to/x74y375.tif
```
