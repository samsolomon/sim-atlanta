# Generic roofs across the whole rectangle

This extends the [Midtown hillside foundations](../midtown-foundations/README.md) to every board in the rectangle: downtown, King Memorial, Sweet Auburn, the north and south bands and corners, and the five Midtown rows. The regression mounts all 12 boards at both quality tiers. It reads each footprint's highest flat roof from the drawn building batches and samples the rendered ground along its edges and on a 5 m interior grid.

The fix follows the same rule as before. Walls reach the lowest footprint sample, and the roof sits on an inferred finished floor. That floor starts at the middle of the footprint's 3DEP range and rises until the uphill edge shows at least 2.4 m of wall, capped at the building's height. Height sources are unchanged: OSM and Overture heights are `reported`, floors × 3.6 m are `inferred`, and the 8 m fallback is `illustrative`. Floor elevations are `inferred`; none of these sites has a surveyed finished floor. [Downtown ground manifest](../../../../pipeline/prototypes/downtown-ground/ground.json)

## Sites

The rendered probe found 12 buried roofs at both tiers. Eleven are downtown Overture footprints, and 8 of those match the inventory. The last is a north-band OSM way. Before the fix, King, Auburn, the corners, the south band and the Midtown rows had none. Their earlier candidates were porch, step and courtyard finish details, not roofs. Grades are NAVD88 metres at the outward-rounded footprint extremes.

| Footprint | Kind, height | Grade range | Buried before | Camera |
| --- | --- | --- | ---: | --- |
| `bceafee8` | 1.4 m structure | 299.8–306.1 | 4.82 m | `/?view=city&cam=-826,-1044,30,52,130` |
| `73eb00d4` | commercial, 7.6 m | 304.4–313.7 | 3.21 m | `/?view=city&cam=922,504,30,52,130` |
| `f128a751` | garages, 3.2 m | 321.3–325.9 | 1.84 m | `/?view=city&cam=-917,390,30,52,130` |
| `osm:way:1312347483` | north band, 8 m fallback | 302.6–310.7 | 1.65 m | `/?view=city&cam=590,-1542,30,52,130` |
| `e308f299` | 8 m fallback | 298.5–307.3 | 1.40 m | `/?view=city&cam=-809,-558,30,52,130` |
| `4c666302` | university, 8 m fallback | 309.0–318.1 | 1.30 m | `/?view=city&cam=531,158,30,52,160` |
| `d21e06e9` | 1.9 m structure | 304.7–306.9 | 1.12 m | `/?view=city&cam=-286,-1250,30,52,130` |
| `20c285f2` | parking, 4.2 m | 315.7–319.6 | 0.52 m | `/?view=city&cam=481,-226,30,52,130` |
| `59df532c` | retail, 6 m | 301.7–307.2 | 0.36 m | `/?view=city&cam=295,-1229,30,52,130` |
| `84ed588d` | 2.7 m structure | 310.4–312.9 | 0.32 m | `/?view=city&cam=471,282,30,52,130` |
| `af881587` | 0.8 m structure | 310.8–311.7 | 0.12 m | `/?view=city&cam=-119,-683,30,52,130` |
| `0feb6547` | hotel, 8 m | 312.2–322.3 | 2.48 m | A landmark replaces it in production. It is graded so the raw-vignette regression stays exact |

The bake's flag is a DEM test with a 0.4 m allowance for low-tier tessellation. It also lifts 5 footprints whose rendered roofs were just clear: downtown `7e26f1a7`, `b6862f5f`, `f1724f9f` and `f3334361`, and north-band `osm:way:269999069`. The 78 existing Midtown grades are unchanged.

The downtown grades are keyed to Overture ids in the staged `web/public/data/scene/downtown/vignette.json`. A test fails if any graded downtown id is missing from the staged file, because a new Overture release would otherwise drop the floor fit without a warning.

## Captures

Each camera ran at 14:00 and 23:00 Eastern on 20 November 2026, at both tiers, on a 999 × 496 viewport. Files are named `<site>-<low|high>-<day|night>.jpg`.

To reproduce the fixture, run `pnpm data` so the downtown vignette is staged, then `python pipeline/scripts/midtown_foundations.py` with NumPy and Shapely 2. The fit now runs inside `createDowntownTerrain`, so every board shares one registration. Publishing needs a web rebuild only.
