# City Heights

City Heights is an 18-storey condominium tower at 375 Ralph McGill Boulevard NE in Old Fourth Ward, built in 1980 with 257 units. City draws it from the mapped site `osm:way:270356883`, which lies wholly on the north-corner square-board area. Its skin is dispatched from `terrain/model.ts`.

## Heights: lidar, not the mapped 78.4 m

The 22 April 2019 3DEP lidar puts the roof at p95 60.0 m and max 62.2 m over ground at 304.6 m. Eighteen storeys at about 3.1 m agree.

| Mass | Lidar, NAVD88 | City |
|---|---|---|
| Roof | 358.4–362.2 | 360 m (about 55 m) |
| Crown parapet ring | about 362 | 362 m |
| Central penthouse | 364.0–366.6 | 365.7 m |

## Sources

- The [allatlantacondos.com gallery](https://www.allatlantacondos.com/?p=4298), photos 1 and 3 (cited only), show:
  - a red-brown brick shaft;
  - stacked white concrete balconies wrapping the stepped corners;
  - white stucco-like end walls;
  - a white stepped crown with a small pediment;
  - a podium plaza with garden-style brick buildings.
- The same page gives the storey count ("18-story") and the unit count.
- Street View could not reach the tower: the panos from Ralph McGill show only the garden buildings and trees. That is recorded as a gap.

## What the model follows

| Element | City |
|---|---|
| Shaft | Brick, with a dark window band per floor behind a brick pier per ~3 m bay: a double-height lobby and 17 floors above it make the 18 storeys. |
| Stepped corners | The mapped outline is a stepped octagon. Its 3.5–6.5 m stepped faces carry a white balcony on every floor: a slab with a solid white front, 1.3 m deep, wrapping the corner. |
| End walls | The four broad faces (7.5 m and more) are white, with the same punched windows. |
| Crown | A white band at the roof, a raised white roof slab set back about 1.5 m, and the central penthouse with a pediment on its south face. |

**Estimated:** floor pitch, bay width, balcony depth, the assignment of white and balcony faces by face length, and the penthouse size. No signage is drawn.

## Night

No night photograph was found; Commons and the listing galleries were searched. As residential, City Heights is noticeably lit: about a third of homes, as illustrative occupancy; lit panes match the unlit windows by day. The lobby glows too.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From the south-east, pulled back (money shot) | `1453,-1089,330,60,650` | 11:30 AM / 11:30 PM | [Day](day-before-after.jpg) · [Night](night-before-after.jpg) |
| Spec starting cam | `1453,-1089,32,60,420` | 11:30 AM / 11:30 PM | [Day](start-day-before-after.jpg) · [Night](start-night-before-after.jpg) |
| Close, from the north | `1453,-1089,330,60,650` with `&dev`, then `__setView(200, 60, 500, 1453, -1089, 1.6)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Four sides at 400 m, labelled by the face shown | `__setView(bearing, 42, 400, 1453, -1089, 1)` with bearings 0, 90, 180 and 270 | 11:30 AM | [Sheet](four-sides.jpg) |
| Low tier | `1453,-1089,330,60,650` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

## Budget

About 2,050 triangles, against the 2,400 landmark ceiling. Windows are drawn as one band per floor behind piers, not one quad per window. `detachedParts` finds no loose parts.
