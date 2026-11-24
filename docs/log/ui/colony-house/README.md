# Colony House

`osm:way:536740360`, 145 15th Street NE, beside Colony Square. Code: `web/src/city/colony-house.ts`.

Colony House is a 14-storey condominium tower completed in 1972–73, with about 193 units ([Highrises.com](https://www.highrises.com/buildings/atlanta_ga/colony-house_145-15th-st_2283), [Midtown Alliance](https://midtownatl.com/view/colony-house-condominiums)). OSM tags it `building=retail` at 62 m.

## Sources

| What | Source |
|---|---|
| Street level, Feb 2022: blank, stepped, board-formed grey concrete end wall on 15th Street | [Street View, 143 15th St NE](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78850,-84.38290&heading=150&pitch=30&fov=100) (viewed in an Orca tab, not copied) |
| Elevated, May 2021: the long bent grey slab with a deep grid of recessed balconies | [Rooftop photosphere, looking north-west](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78753,-84.38219&heading=330&pitch=-40&fov=100) |

**Gap:** no night photograph. Night is drawn from the building type, as residential.

## Heights

April 2019 3DEP lidar, by part:

| Part | Mapped | Lidar roof (NAVD88) | Model |
|---|---|---|---|
| Slab `1451518600` | 62 | 292.5 + 47.7 = 340.2 | 340.2 |
| Cores `1451518597`, `…598`, `…599` | 62 | about 342.6 to 344.3 | 343.5 |
| Wing `1414724126` | 8.9 | 305.3 | 305.3 |
| Wing `1414724125` | 4.4 | 300.7 | 300.7 |

City drew the building 14 m too tall before this change.

## Estimates

- **Floors:** 13 residential floors of about 3.2 m over a 3.6 m lobby, measured from the 15th Street entrance (296 m).
- **Long faces:** at each floor, a recessed balcony band (`#8c9194`) under the concrete slab edge, divided by cross walls about 3.6 m apart.
- **Ends and short jogs:** blank concrete (`#b4b1a9`), as the 15th Street end shows.
- **Materials:** flat vertex colours, because of the shader program budget.

### Rendered-pixel check

Taken at 11:30, high tier, from close cameras with `&dev&mindist=20`. Medians are over glass-hued pixels only.

| Patch | Camera | S | V |
|---|---|---|---|
| Recess band, shaded long face | `840,-3818,150,64,180` | 41 | 24 |
| Neighbouring glass tower, same frame | same | 63 | 31 |
| Sunlit long face (all pixels) | `840,-3818,330,64,180` | 15 | 52 |

The first recess colour, `#5e6569`, rendered S 100 V 13 in shade, the most saturated thing in frame, so it was raised to a neutral grey.

## Lighting

About 30% of balcony bays are lit at 23:30, chosen with the shared `litHash`. Everything is `illustrative`.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| South-west long face, day / night / low tier (money shot) | `854,-3810,225,62,420` | 11:30 / 23:30 / 11:30 `&q=low` |
| Four sides at 400 m ([sheet](four-sides.jpg)) | `853,-3808,{0,90,180,270},64,400` | 11:30. At 0° and 90° neighbouring towers block much of the view; 180° and 270° show the full slab |
| Close, end and balcony face | `840,-3818,150,64,180` / `840,-3818,330,64,180` with `&dev&mindist=20` | 11:30 |
