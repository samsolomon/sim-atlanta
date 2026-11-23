# 17th Street Bridge

The complete crossing fits in the existing Brookwood south row of the Midtown board. At the west fascia end the mapped deck centre is City (−169.34, −4146.62). At the east end it is (110.80, −4224.87). The southmost corner clears the row's southern edge by 26.86 m. The end-to-end bearing toward Midtown is 74.4° true. The slight bend near Atlantic Station matters at sidewalk scale. [Archived Brookwood OSM data](../pipeline/prototypes/square-board/source/brookwood-south.json.gz) · [Mapped beam-deck outline](https://www.openstreetmap.org/way/1452444262)

## Footprint and profile

C.W. Matthews reports 830 ft long by 130 ft wide (253 × 39.6 m), six vehicle lanes, bicycle lanes, wide sidewalks, tapered columns, corbelled caps and haunched box girders. Tracing the mapped polygon between the street and sidewalk joins gives 291.3 m along its centre. The paths of the two fascia edges define the render extent, including the skew ends. The sources use different length limits. Three lanes each way, outside bicycle strips and both separate walks are also present in the archived street data. The contractor's reservation for future rail is unbuilt in the street panorama. [Contractor, construction gallery and nighttime side elevation](https://cwmatthews.com/projects/17th-street-bridge/) · [Westbound way](https://www.openstreetmap.org/way/26786744) · [Eastbound way](https://www.openstreetmap.org/way/112508108)

The 37 cross sections store City x/z for each fascia edge. The accompanying NAVD88 metres are medians of USGS class-17 deck returns within 2.5 m of the 32% and 68% positions across each section. Linear interpolation supplies the displayed grade. Extending those two carriageway samples to the outer edges approximates crossfall. The source set contains 37,815 class-17 returns across the whole query box (−84.3937, 33.7909) to (−84.3901, 33.7922), including nearby ramps. The centre climbs from about 276.3 m at the west end to 280.5 m over the freeway and descends to 276.25 m at the east end. The tile's common scene zero is 323.8 m. Heights between samples, crossfall, and the approaches to exposed terrain are inferred. The two directly connecting ramp profiles use the same class and datum. The through interstate keeps its existing road and terrain. The width and location of its individual painted lanes at this latitude are illustrative. [USGS EPT source](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Sampled sections and ramp profiles](../web/src/city/fixtures/seventeenth-street.json) · [Ground grid](../pipeline/prototypes/square-board/brookwood-south/ground.json)

## Exterior references

In the overhead image, the south walk has a continuous narrow lattice between the ramp intersections. The north walk has an exposed paved strip and rectangular planters. The March 2025 panorama looking east shows a pale metal railing over a low solid parapet, a taller open fence on the north, repeated inward-curving frames on the south, seated benches, and double white lines separating the outer vehicle lanes. The highway-side photograph shows the yellow girder below the tread and the light concrete pier faces beneath its lower flange. [Overhead imagery](https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-84.3940,33.7906,-84.3900,33.7925&bboxSR=4326&size=990,560&imageSR=3857&format=jpg&f=image) · [March 2025 sidewalk and carriageways](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79153,-84.39197&heading=75&pitch=0&fov=85) · [Side elevation](https://vmerectors.com/portfolio-view/17th-street-bridge/)

The completed-bridge evening photograph shows pools of warm light below the span and lighter yellow steel against a dark sky. The model approximates reflected light on the girder and pier faces. Aim, intensity and fixture spacing are illustrative. Canopy height (about 4 m), parapet and rail heights (0.73 and 1.17 m), girder depth (1.25–2.5 m), pier stations, sections, bay spacing and furniture are visual estimates. The five support rows sit in gaps between the mapped through roads. The model clearance is for visual separation only. [Contractor's evening photograph](https://cwmatthews.com/projects/17th-street-bridge/)

## Screenshot gallery

Each pair uses the same 999 × 496 City camera, high detail, November 20, 2026 at 14:00 and 23:30 Eastern. Bearing and tilt are degrees. Scale is metres per CSS pixel.

| Camera | Target x, z | Bearing / tilt / scale | Daylight | Full night |
|---|---|---|---|---|
| Midtown skyline | 8, −4204 | 145 / 72 / 1.32 | [Day](log/ui/seventeenth-street/midtown-skyline.jpg) | [Night](log/ui/seventeenth-street/midtown-skyline-night.jpg) |
| Both abutments | −28, −4184 | 12 / 65 / 0.46 | [Day](log/ui/seventeenth-street/skyline-day.jpg) | [Night](log/ui/seventeenth-street/skyline-night.jpg) |
| Street and walks | −28, −4184 | 64 / 72 / 0.19 | [Day](log/ui/seventeenth-street/street-day.jpg) | [Night](log/ui/seventeenth-street/street-night.jpg) |
| Overhead | −28, −4184 | −14 / 22 / 0.43 | [Day](log/ui/seventeenth-street/overhead.jpg) | |

Stage the existing Studio inputs with `pnpm data:midtown` and rebuild `web/dist` with `pnpm build`. Open `/?view=city&board=midtown&q=high&speed=0&t=2026-11-20T14:00:00-05:00`. In development, use `__city.lookAt(-28,-4184,{bearing:12,tilt:65,metresPerPixel:.46})`. The coordinator publishes the static build.
