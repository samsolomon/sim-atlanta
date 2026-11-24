# Piedmont House

Piedmont House is a 22-storey apartment tower at 205 12th Street NE, built by Wood Partners in 2018, at the Piedmont Park end of 12th Street. City draws it from the mapped site `osm:way:886024372`, which has two parts: an L-shaped tower (`osm:way:886024370`) and a parking podium on the west side (`osm:way:886024369`). The outline crosses the midtown-central / midtown-upper seam at z = -3300. `web/src/city/piedmont-house.ts` builds the whole building from the midtown-upper clip, moving its seam vertices out to the true south face at z = -3295. The midtown-central clip is a 5 m sliver; it is claimed with an empty group, so neither row draws a generic box and the facade has no break at the seam. In City, z grows to the south.

## Heights: lidar, not the estimated 72.6 m

The table's height was estimated from floor counts. The 22 April 2019 3DEP lidar puts the site at p50/p95/max 75.5/78.1/79.4 m over a 281 m street. Per mass:

| Mass | Lidar, NAVD88 | City |
|---|---|---|
| Tower roof | 357.9–358.7 | 358.2 m (about 77 m) |
| Central penthouse where the two wings meet | 359.8–360.3 | 360.2 m |
| West parking podium | 301.3–305 | 302.5 m |

## Sources

Both views are cited only; no imagery is copied.

- **Street View, 222 12th St NE, March 2025** ([pano](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7843,-84.3804&heading=180&pitch=25&fov=100)). Looking south at the entrance: a cream precast base about five storeys high with tall windows, and the "Piedmont House" entrance. Above it, blue glass on a white grid with stacked balconies.
- **Street View, 225 12th St NE, March 2025** ([pano](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78450,-84.37990&heading=215&pitch=28&fov=100)). The second angle, from the park end: the full shaft, white edge columns at the corners, and balcony stacks at the ends and middle of the long faces.
- Listings give 22 storeys, 198 units and a 2018 completion; Bisnow (2017) describes a high-end tower with street-level retail.

## What the model follows

| Element | City |
|---|---|
| Base | Cream precast up to 302.5 m, with windows between the piers, a precast band per floor, and a lit lobby and retail at street level. |
| Shaft | Blue glass with a white mullion per ~3.2 m bay and a white slab edge per floor. Wider white columns stand at the corners. |
| Balconies | Stacks at both ends of each face, plus the middle of the long faces. Each has a 1.5 m slab and a glass rail. |
| Inner L faces | The shaft detail continues above the podium. |
| Roof | A central penthouse at 360.2 m. |

**Estimated:** floor pitch (17 floors between the base and the roof), bay width, balcony positions and depth, the penthouse footprint, and base floor bands. The lettering is left out.

## Night

No full-night photograph was found, so this is an evidence gap. Searched: the leasing pages, Street View (day only) and Commons. The tower is residential, so about 30% of rooms are lit, as illustrative occupancy. Only the street-level lobby and retail glow in the base; the parking and amenity floors above them stay dark.

## Glass

The base colour is `#9aaebc` (S 18%, V 74%). At 11:30 on the high tier, the sunlit east (park) face renders at a median S 25% / V 47%, including mullions. A shaded generic tower in the same frame renders at S 15% / V 53%.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From over the park, pulled back (money shot) | `1032,-3332,270,60,750` | 11:30 AM / 11:30 PM | [Day](day-before-after.jpg) · [Night](night-before-after.jpg) |
| Spec starting cam | `1032,-3332,32,60,420` | 11:30 AM / 11:30 PM | [Day](start-day-before-after.jpg) · [Night](start-night-before-after.jpg) |
| Close, park face | `1032,-3332,270,60,750` with `&dev`, then `__setView(270, 60, 650, 1032, -3332, 2.0)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Low tier | `1032,-3332,270,60,750` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

Four sides at 400 m, tilt 42°, 11:30 AM: [contact sheet](four-sides.jpg). Each camera targets `1032,-3332` at a 400 m distance, using bearings 180 (camera north), 270 (east), 0 (south) and 90 (west) via `__setView(bearing, 42, 400, 1032, -3332, 1)`. None of the four sides shows a floating, missing or z-fighting part.
