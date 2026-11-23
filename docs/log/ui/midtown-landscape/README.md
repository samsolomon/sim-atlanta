# Piedmont Park from the Midtown rectangle

At Oak Hill, open lawn follows 10th Street between groups of mature trees. The lake bends behind the lawn toward the Active Oval. The Conservancy's fall photographs show the view along the hill and back toward the skyline. A second photographer looks across Lake Clara Meer toward the illuminated towers. Reflections in that photograph establish the skyline lighting but give no survey of individual park lamps. The render uses City's ordinary night lighting. [Fall foliage and Oak Hill](https://piedmontpark.org/tag/pictures/) · [Lake and skyline photograph](https://www.susanjphotography.com/blog/blog_posts/an-atlanta-photographer-gets-painterly-in-piedmont-park) · [Conservancy map](https://piedmontpark.org/maps/)

| Row | Classified canopy | High crowns | Low crowns |
| --- | ---: | ---: | ---: |
| Midtown south | 19.9% | 1,962 | 923 |
| Midtown central | 27.1% | 2,448 | 1,071 |
| Midtown upper | 24.8% | 2,439 | 1,023 |
| Brookwood south | 31.3% | 3,377 | 1,323 |
| Brookwood station | 37.4% | 4,067 | 1,557 |

Atlanta and Georgia Tech's 2023 classification reports cover. Individual stems and crown spreads are inferred from canopy interiors with enough space around mapped buildings, streets, rail and water. The southern boundary respects the spacing of the existing north-band crowns. Low detail takes one dominant crown per occupied 32 m cell in each row. Heights of 4–33 m are estimates from Meta/WRI's canopy height model, with the square-board crown-size estimate where the height model supplies less than 4 m. Species and seasonal foliage are illustrative. [Atlanta canopy study](https://geospatial.gatech.edu/AtlantaUTC/) · [Meta/WRI heights and CC BY 4.0 attribution](https://registry.opendata.aws/dataforgood-fb-forests/)

The five checked-in OSM extracts supply the horizontal boundaries of the lake and paved plazas. Clipping them to the board yields 41 plaza pieces, five grass or artificial-turf pedestrian areas and 16 water pieces. The ground texture paints them on the rendered 3DEP triangles. The trunk base uses the corresponding quality tier's ground sampler. The source DEM has a 5 m grid and a 323.8 m NAVD88 scene zero. Trunk positions between samples are inferred. Water colour represents the mapped extent and follows the terrain. [OSM attribution and ODbL](https://www.openstreetmap.org/copyright) · [Terrain source manifest](../../../../pipeline/prototypes/square-board/midtown-central/ground.json)

The Orca cameras use a 999 × 496 viewport. Oak Hill targets (1365, −3160), bearing −24°, tilt 48°, 0.90 m/pixel. Jack Guynn Plaza targets (672, −3172), bearing 10°, tilt 35°, 0.30 m/pixel. Both clocks use November 20, 2026 at 14:00 and 23:00 Eastern.

| Camera | Low day | Low night | High day | High night |
| --- | --- | --- | --- | --- |
| Oak Hill | [Day](oak-hill-low-day.jpg) | [Night](oak-hill-low-night.jpg) | [Day](oak-hill-high-day.jpg) | [Night](oak-hill-high-night.jpg) |
| Jack Guynn Plaza | [Day](midtown-plaza-low-day.jpg) | [Night](midtown-plaza-low-night.jpg) | [Day](midtown-plaza-high-day.jpg) | [Night](midtown-plaza-high-night.jpg) |

To reproduce the fixtures, run `python pipeline/scripts/midtown_landscape.py path/to/UTCMosaic2023.tif` with the canopy bake's Python dependencies. Stage the checked-in fixtures with `pnpm data:midtown` and rebuild the web bundle. Baking uses the height source over the network. Visitors receive the fixture with the existing row context request.

The outer-row checks target Brookwood station (−90, −5100), bearing 32°, 48° tilt, 0.70 m/pixel, 17th Street (−250, −4190), bearing 20°, 44° tilt, 0.75 m/pixel, and North Avenue (580, −1860), bearing −20°, 45° tilt, 0.65 m/pixel.

[station low day](station-low-day.jpg) · [station low night](station-low-night.jpg) · [station high day](station-high-day.jpg) · [station high night](station-high-night.jpg)

[seventeenth low day](seventeenth-low-day.jpg) · [seventeenth low night](seventeenth-low-night.jpg) · [seventeenth high day](seventeenth-high-day.jpg) · [seventeenth high night](seventeenth-high-night.jpg)

[north-avenue low day](north-avenue-low-day.jpg) · [north-avenue low night](north-avenue-low-night.jpg) · [north-avenue high day](north-avenue-high-day.jpg) · [north-avenue high night](north-avenue-high-night.jpg)

