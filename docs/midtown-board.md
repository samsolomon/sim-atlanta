# Midtown City coverage

City metres increase east and south from Five Points. The completed square spans x = −1000…1800 and z = −1700…1100. Extend the same 2.8 km width northward. Each 800 m row adds 2.24 km² and shares 561 inclusive ground nodes with the preceding row.

| Row from downtown | City z range (m) | Integration |
|---|---|---|
| North Avenue and Fox Theatre | −2500…−1700 | First opt-in tile, generic streets and buildings |
| Central Midtown | −3300…−2500 | Planned |
| Upper Midtown | −4100…−3300 | Planned |
| South Brookwood approach | −4900…−4100 | Planned, coordinate rail geometry |
| Peachtree Station and north approach | −5700…−4900 | Planned, mount Brookwood rail with both approach rows present |

The Amtrak ATL stop in routes.json is 33.79945° N, 84.39248° W, near City (−81, −5065). The rail owner's approach envelope is 33.7955…33.8035° N and 84.3985…84.3865° W, within the final two rows. The north edge extends about 635 m beyond the station in City z. The full footprint including downtown would be 2.8 × 6.8 km, or 19.04 km². Stage each row independently, validate its ground join and inspect street crossings before advancing. Brookwood rail owns track, station exclusions and train presentation. Midtown landmarks owns the Bank of America Plaza and Fox Theatre models.

**Architect review, November 23.** A direct camera target can fall beyond the loaded square. Load the north section first, retain the target until its tile mounts, and keep the prior boundary closed through a fetch or checksum failure.

**Product design review, November 23.** Use City's existing pan, picking, About panel and full-board retry under an explicit Midtown URL. Count only the available rows in that view. Keep ordinary City and the square on their existing request paths.

## Bounds and rail handoff

The extension runs from longitude −84.402417 to −84.372130. Row edges from south to north are at latitude 33.769188, 33.776383, 33.783578, 33.790772, 33.797967 and 33.805161. Clipping the scheduled Crescent shape `amtrak:path:242` to the last two rows gives a single line from (704, −5700) to (−1000, −4190). Measured along that shape from the point nearest ATL, 1,011 m fit to the northeast and 1,269 m to the southwest. The rail owner supplies visible alignment, cover and heights. Routes snapshot SHA-256 is `5385af7996d155dde14b199eaffb941fc807b577663af57cf1f014e40edde625`. [Routes snapshot](https://atlanta.solomon.io/data/ga/routes.json)

## North Avenue tile

Three static files add 887,014 bytes (233,275 bytes compressed separately with gzip level 9). The 561 × 161 inclusive 5 m grid has zero masked nodes. The SHA-pinned downtown DEM supplies the southern nodes. The adjacent x74y375 raster supplies the remaining 48,018 nodes. Ground is encoded as absolute NAVD88 decimetres with the same 323.8 m scene zero. Interpolated terrain is inferred. The archived OSM map contributes 756 clipped building pieces, 2,632 street/path runs and 264 land-cover pieces. Horizontal geometry is reported. Tagged heights are reported, floor-derived heights inferred, and fallback heights, foundations and deck clearance illustrative. OSM data and derived context are available under ODbL. [Ground manifest and source URLs](../pipeline/prototypes/square-board/midtown-south/ground.json) · [Archived OSM map](../pipeline/prototypes/square-board/source/midtown-south.json.gz) · [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright)

All 20 distinct named street crossings across 18 names have identical x coordinates on the two clipped edges (to 0.01 m), including Peachtree Street NE at x = 591.09. The generic footprints for Bank of America Plaza (`osm:way:39449840`) and Fox Theatre (`osm:way:208355446`) sit entirely inside the new row. The landmark owner can replace them by ID when building the tile. For Brookwood, reserve source IDs before generating generic geometry, mount rail against both rows' ground samplers, and dispose it with the terrain. Preserve fallbacks while either required area is missing.

## Stage and inspect

On a populated checkout run `pnpm data:midtown`, then `pnpm dev`. Open `/?view=city&board=midtown`, pan north or use **About this City view → Show full board**. A fresh downtown opening requests zero Midtown assets. North Avenue follows the north band, and a failed fetch keeps its edge wall in place until a successful retry. The full-board button loads all eight available areas. To publish, the coordinator stages the data, runs `pnpm build` and deploys the static assets together.

For the street camera open `/?view=map&board=midtown&q=low&t=2026-11-20T14:00:00-05:00&speed=0#16/33.77065/-84.38630/0/46` and choose **City**. The captured City target was (489.99, −1862.52), bearing 0°, tilt 57°, 0.9917 m per pixel. The high-detail overview targets (400, −700), bearing 15°, tilt 35°. [North Avenue in Orca](log/ui/midtown-board/north-avenue.jpg) · [Full board in Orca](log/ui/midtown-board/overview.jpg)

To rebake, download the two GeoTIFF URLs recorded in the manifest. Use the square-board Python dependencies and the command below. The archived OSM extract fixes the context edition. Two bakes reproduced all three output hashes.

```sh
.venv/bin/python -B pipeline/scripts/square_board.py path/to/x74y374.tif --section midtown --north-tile path/to/x74y375.tif
```
