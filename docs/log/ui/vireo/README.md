# Vireo Piedmont Park

The 2020 apartment tower at 195 13th Street NE, by Piedmont Park, designed by Smallwood for LMC. City draws the mapped site `osm:way:796360049`: the tower (`osm:way:796360050`) and the garage podium on its south side (`osm:way:886021359`), wholly in midtown-upper. `web/src/city/vireo.ts` builds both from their mapped rings. In City, z grows to the south, so 13th Street is on the north side.

## Heights: lidar, not the mapped 105 m

The 22 April 2019 3DEP lidar (tower p50/p95/max 86.4/88.9/89.8 m over ground at 286.9 m) puts:

| Mass | Lidar, NAVD88 | Over the street | City |
|---|---|---|---|
| Occupied roof and pool deck | 368.3–369.2 | about 82 m | 368.4 m |
| Top-floor amenity block, north half | 375.5–376.6 | about 89 m | 375.8 m |
| Lounge, east middle | 373.5 | about 87 m | 373.5 m |
| Garage podium | 315.6–317.1 | about 30 m | 316.5 m |

Smallwood describes a street-level lobby, six parking levels and 18 residential floors, with the pool and amenities on the top floor. The 2019 lidar matches that.

## Sources

- [Hoar Construction exterior photograph](https://hoar.com/project/vireo/) (`Vireo.jpg`): a white tower with deep stacked balconies, white piers and glass rails on the long face, punched windows on the ends, and a wood-clad entrance porch. Cited only.
- [Smallwood case study](https://www.smallwood-us.com/work/case-study/vireo): the storey breakdown, "oversized balconies", a front porch "with an extended roof reaching the public sidewalk", and the rooftop pool deck, fitness centre and lounge. Its roof-terrace photo shows the glass rail and the deck edge.

## What the model follows

| Element | City |
|---|---|
| Long faces | Glass behind a balcony on every floor: a white slab 1.9 m deep with its edge, a glass rail, and white piers about every 5 m. |
| End walls | White with a punched window column per ~3.4 m bay and a band per floor. |
| Garage | Pale precast with a darker opening band per parking level, on the faces not against the tower. The tower's own lobby and parking floors below 316.5 m carry the same bands, with no rooms. |
| Top floor | Glass amenity block across the north half, lounge on the east, open pool deck with a glass rail at the roof edge. |
| Entrance | Wood-clad porch canopy reaching 5.5 m toward the 13th Street sidewalk, with lit lobby glass. |

**Estimated:** floor pitch (17 floors between the podium and the roof), bay widths, balcony depth, the amenity and lounge footprints (from 4 m lidar cells) and the porch size. The VIREO lettering and logo are left out.

## Night

No full-night exterior photograph was found, so this is an evidence gap. Searched: the builder's and architect's pages and Commons. As residential, it is noticeably lit. On the long faces, about 42% of balcony bays are lit, and each lit room also glows through its glass rail, since the deep slabs hide the room itself from above. On the end walls about 30% are lit. The lobby and amenity glass glow too. There is no decorative lighting.

## Glass

The glass base is `#9eb0b4` (S 12%, V 71%). At 11:30 on the high tier, the sunlit south face renders at a median S 13% / V 73%, against generic glass in the same frame at S 6% / V 76% sunlit and S 34% / V 45% shaded.

## Captures

Taller neighbours hide Vireo from most angles, including the spec starting cam, so the money shot and the close view look from the south over the garage.

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From the south, pulled back (money shot) | `984,-3469,5,58,700` | 11:30 AM / 11:30 PM | [Day](day-before-after.jpg) · [Night](night-before-after.jpg) |
| Spec starting cam | `984,-3469,32,60,450` | 11:30 AM / 11:30 PM | [Day](start-day-before-after.jpg) · [Night](start-night-before-after.jpg) |
| Close, balcony face and garage | `984,-3469,5,58,700` with `&dev`, then `__setView(5, 36, 700, 984, -3482, 2.6)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Low tier | `984,-3469,5,58,700` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

## Budget

About 1,430 triangles: about 610 in the body and about 820 in lit panes and rails.

Four sides at 400 m, tilt 30°, 11:30 AM: [contact sheet](four-sides.jpg), each view `__setView(bearing, 30, 400, 984, -3469, 1)` at bearings 180, 270, 0 and 90. From the east, a taller neighbour hides Vireo at 400 m, so the east end has its own view: [east end](east-end.jpg), `__setView(270, 25, 200, 990, -3472, 1)` with `&dev&mindist=20`. No side shows floating, missing or z-fighting parts.
