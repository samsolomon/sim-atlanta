# Small structures on steep grades

Generic buildings keep the [hillside floor rule](../midtown-foundations/README.md): the floor sits at the middle of the footprint's 3DEP range and rises until the uphill edge shows a 2.4 m door. A structure shorter than 2.4 m has no door to keep, so the rule raised its whole roof above the high ground. On a steep grade, that left a tall wall on the downhill side. For these structures, the floor now sits at the middle of the grade range, raised only until the roof is flush with the high ground: `max((low + high) / 2, high − height)`. The roof is never below terrain, and the whole-rectangle roof test is unchanged and still passes at both tiers. Floor elevations are `inferred`. The midpoint of the outward-rounded grade extremes stands in for a true footprint mean.

Three graded structures are affected. All are downtown Overture footprints with `reported` heights.

| Footprint | Height | Grade relief | Downhill wall before → after | Camera |
| --- | ---: | ---: | ---: | --- |
| `bceafee8` | 1.44 m | 6.3 m | 7.7 → 6.3 m | `/?view=city&cam=-826,-1044,30,52,130` |
| `d21e06e9` | 1.91 m | 2.2 m | 4.1 → 3.0 m | `/?view=city&cam=-286,-1250,30,52,130` |
| `af881587` | 0.76 m | 0.9 m | 1.7 → 1.2 m | `/?view=city&cam=-119,-683,30,52,130` |

## What `bceafee8` is

Esri World Imagery tiles at zoom 20 (about 0.12 m per pixel), centred near 33.7633 N, 84.4005 W, cover the 48 × 14 m footprint: [west tile](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/20/419703/278453) · [east tile](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/20/419703/278454) (linked, not copied into the repo). They show a planted terrace, not a building. A retaining wall runs along the sidewalk, with overgrown planting behind it and a row of fixtures along the inner edge, in front of a large white-roofed building. A 1.44 m height plausibly matches the wall. It is not a building that steps down the hill, so its height stays as reported, and rule A's result stands. I could not get street-level imagery without an API key, which is a gap. A later data-curation pass could render this footprint as ground rather than as a building.

Imagery: Esri, Maxar, Earthstar Geographics and the GIS User Community.

## Captures

Day 14:00 and night 23:00 Eastern on 20 November 2026, low and high quality, 999 × 496 viewport.

- `bceafee8`, before: [low day](bceafee8-before-low-day.jpg) · [low night](bceafee8-before-low-night.jpg) · [high day](bceafee8-before-high-day.jpg) · [high night](bceafee8-before-high-night.jpg)
- `bceafee8`, after: [low day](bceafee8-after-low-day.jpg) · [low night](bceafee8-after-low-night.jpg) · [high day](bceafee8-after-high-day.jpg) · [high night](bceafee8-after-high-night.jpg)
- `d21e06e9`, after: [low day](d21e06e9-after-low-day.jpg) · [high day](d21e06e9-after-high-day.jpg) · [high night](d21e06e9-after-high-night.jpg)
- `af881587`, after: [low day](af881587-after-low-day.jpg) · [high day](af881587-after-high-day.jpg) · [high night](af881587-after-high-night.jpg)

Publishing needs a web rebuild only.
