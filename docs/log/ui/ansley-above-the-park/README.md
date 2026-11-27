# Ansley Above the Park

Ansley Above the Park is an apartment building at 1130 Piedmont Avenue NE, on the corner of 13th Street and Piedmont Avenue, across from Piedmont Park. It is a white mid-century slab with stacked balconies. A central blue-glass elevator strip rises above its roof, a lower wing with deep balconies runs along Piedmont Avenue, and a semicircular porte-cochère with a blue fascia faces 13th Street.

City draws the mapped site `osm:way:269747490`. Its parts are the slab (`osm:way:886021361`), the east wing (`osm:way:886021362`) and the porte-cochère (`osm:way:886021360`), all in the midtown-upper row. In City, z grows to the south, so 13th Street runs along the building's south side.

## Heights: lidar, not the estimated 52.8 m or the mapped 54 m

The 22 April 2019 3DEP lidar puts the slab part at p50/p95/max 42.9/48.1/49.4 m over a 279 m street. Per mass:

| Mass | Lidar, NAVD88 | City |
|---|---|---|
| Slab roof | 321.2–324.6 | 322 m (about 43 m) |
| Elevator strip, around x 1166–1178 | 326.5–329.3 | 327.5 m |
| Piedmont Avenue wing | 305.2–308.7 | 306.5 m (about 27 m) |
| Porte-cochère | 285.3–286.1 | 285.4 m |

## Sources

Both views are cited only; no imagery is copied.

- [Street View, 299 13th St NE, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78520,-84.37890&heading=0&pitch=25&fov=100), looking north. It shows the white slab with stacked balconies, the central blue-glass elevator strip rising past the roof, and the semicircular porte-cochère on columns with a blue fascia.
- [Street View, 1130 Piedmont Ave NE, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78560,-84.37830&heading=255&pitch=25&fov=100), the second angle. It shows the 9-storey wing on Piedmont Avenue: white walls with deep cantilevered balconies and dark rails.

## What the model follows

| Element | City |
|---|---|
| Slab | White walls with punched windows (a window band per floor behind a white pier per bay) and balcony stacks in alternate bays on the long faces. Each balcony is a white slab with a light rail. |
| Elevator strip | A white core block built in the south face's own frame, from the canopy roof to 327.5 m, glazed in blue across its front. Balconies and piers skip the strip. |
| Wing | The same windows, with 2.2 m balconies and dark rails, including both mapped pieces of the Piedmont Avenue face. |
| Porte-cochère | A thin roof with a blue fascia, on white columns spaced about every 5 m along the curved front. It is open beneath, and a test checks that. |
| Shared faces | A face against the other block carries windows only above that block's roof. |

**Estimated:** floor counts (13 on the slab, 8 on the wing, above a lobby, measured from one site datum so floors line up at the corners), bay width, balcony rhythm and depth, the core and strip footprint, and the canopy's underside height. The "Ansley Above the Park" lettering is left out.

## Night

No night photograph was found, so this is an evidence gap. Searched: Street View (day only) and Commons. The building is residential, so about 30% of rooms are lit, as illustrative occupancy. The elevator strip and the lobby glass also glow.

## Glass

Window glass is `#9ba7af` (S 11%, V 69%). The elevator strip is `#8199b4` (S 28%, V 71%). At 11:30 on the high tier, the sunlit south face renders at S 17% / V 82% for the windows and S 19% / V 84% for the strip. The canopy fascia `#5677ad` is paint, not glass.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From 13th Street, pulled back (money shot) | `1174,-3532,0,58,650` | 11:30 AM / 11:30 PM | [Day](day-before-after.jpg) · [Night](night-before-after.jpg) |
| Spec starting cam | `1174,-3532,32,60,420` | 11:30 AM / 11:30 PM | [Day](start-day-before-after.jpg) · [Night](start-night-before-after.jpg) |
| Close, 13th Street face | `1174,-3532,0,58,650` with `&dev`, then `__setView(0, 58, 400, 1178, -3532, 2.0)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Four sides at 400 m | `__setView(bearing, 42, 400, 1174, -3532, 1)` with bearings 180, 270, 0 and 90 | 11:30 AM | [Sheet](four-sides.jpg) |
| Low tier | `1174,-3532,0,58,650` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

On the four-side sheet, no side shows a floating, missing or z-fighting part.

## Budget

About 2,100 triangles: about 1,660 in the body and about 450 in lit panes. Drawing a window band per floor behind a pier per bay, instead of a quad per window, brought the skin under the 2,400 ceiling.
