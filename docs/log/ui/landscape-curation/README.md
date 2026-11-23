# Curated landscape footprints

Some Overture "buildings" are landscape. `web/src/city/fixtures/curated-landscape.json` lists them by id, with the evidence for each. `web/src/city/curated-landscape.ts` removes each listed footprint's building box inside `createDowntownTerrain`, through the same hook the landmarks use, and draws what is really there:

- `wall` draws a capped retaining wall along the listed line. The wall is 0.4 m thick. Its cap is 0.35 m above the higher side, and its face reaches 0.3 m below the lower side, both read from the rendered ground at each tier.
- `terrace` adds a planted bed draped 6 cm above the rendered ground on 1 m cells, with scattered low shrub clumps.

Truth tiers: the wall's position is `reported` (the footprint edge, checked against aerials). Its heights are `inferred` from 3DEP. Planting is `illustrative`. No fixtures are drawn, because none are documented well enough. A test fails if a curated id disappears from the staged `vignette.json`, since a new Overture release would otherwise bring the box back.

## Entries

| Footprint | Kind | Evidence | Camera |
| --- | --- | --- | --- |
| `bceafee8` (48 × 14 m, Overture height 1.44 m) | terrace | Esri World Imagery z20 [west](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/20/419703/278453) · [east](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/20/419703/278454): retaining wall on the sidewalk edge with planting below. 3DEP falls from about 306 m at the sidewalk to 300 m at the south edge. [Earlier analysis](../small-structure-floors/README.md) | `/?view=city&cam=-826,-1044,30,52,130` · close: `/?view=city&cam=-834,-1044,200,62,60` |

## Other candidates

I searched all 12 boards for generic structures under 2.4 m whose footprint relief is more than twice their height, using the outward-rounded 3DEP extremes from `pipeline/scripts/midtown_foundations.py`. Only `bceafee8` qualifies. With the threshold relaxed to 1× height, two more downtown footprints appear. Neither is curated yet, because neither has had an aerial check:

| Footprint | Height | Relief | Camera |
| --- | ---: | ---: | --- |
| `d21e06e9` | 1.91 m | 2.08 m | `/?view=city&cam=-286,-1250,30,52,130` |
| `af881587` | 0.76 m | 0.82 m | `/?view=city&cam=-119,-683,30,52,130` |

## Captures

Day 14:00 and night 23:00 Eastern on 20 November 2026, low and high quality, 999 × 496 viewport. Files are named `bceafee8-terrace-*` and `bceafee8-close-*`. For the earlier building box, see `../small-structure-floors/bceafee8-after-*`. Publishing needs a web rebuild only.
