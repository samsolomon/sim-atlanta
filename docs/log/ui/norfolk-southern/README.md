# Norfolk Southern headquarters

The 2021 headquarters at 650 West Peachtree, at Ponce de Leon. It has a tall and a short glass office tower on a five-level podium, joined by a glass hub. City draws the mapped site `osm:way:1344630139`, which lies wholly in the midtown-south row. OSM maps the towers only as thin roof slabs over narrow end masses, so before this skin City drew floating slabs, and after the lifted-part guard it drew filled boxes. `web/src/city/norfolk-southern.ts` replaces the site with full towers.

## Heights: inferred

The 2019 lidar predates the building, so every tower height here is **inferred**.

- **HOK** (interior architect) gives "10-story and 17-story office towers connected by a five-story podium", which makes 15 and 22 floors in all. CoStar's 22-storey figure agrees for the tall tower.
- **OSM** puts the roof slabs at levels 20 and 13, mapped at 3.6 m per level (72 m and 46.8 m), and the podium at 18 m (5 levels).
- **Uzun+Case** (structural engineer) gives a different breakdown: a 12-storey and a 5-storey tower on an 11-storey podium, 23 storeys in all. It conflicts with HOK and is not used.

City keeps OSM's massing and shifts its level counts up two to HOK's totals. Podium levels are 3.6 m and office floors 4.0 m (estimated):

| Mass | OSM | Inferred over grade |
|---|---|---|
| Tall tower halves | 72 m (level 20) | 86 m (floor 22) |
| Tall tower slot | 70.2 m | 84 m |
| Tall tower end shoulders | 61.2 m | 74 m |
| Short tower halves | 46.8 m (level 13) | 58 m (floor 15) |
| Short tower slot | 45 m | 56 m |
| Short tower end shoulders | 36 m | 46 m |
| Podium | 18 m | 18 m |
| Glass hub | 21.6 m | 21.6 m |

## Sources

- [Norfolk Southern Headquarters, Atlanta 1](https://commons.wikimedia.org/wiki/File:Norfolk_Southern_Headquarters,_Atlanta_1.jpg) and [2](https://commons.wikimedia.org/wiki/File:Norfolk_Southern_Headquarters,_Atlanta_2.jpg), 17 June 2022. These are two angles from West Peachtree and Ponce. They show reflective blue curtain walls on a fine mullion grid, each tower split into two knife-edged halves by a darker recessed slot, and a glass hub between the towers.
- [HOK project page](https://hok.com/projects/view/norfolk-southern-headquarters) for floor counts, terraces and the connecting podium. [Office Snapshots](https://officesnapshots.com/2022/08/01/norfolk-southern-corporation-headquarters-atlanta/) for the design team: Pickard Chilton (design), HKS (architect of record), HOK (interiors). [Uzun+Case](https://uzuncase.com/projects/norfolk-southern-corporate-headquarters/) for the structure.
- OSM parts for the plan of each half, slot and shoulder.

## What the model follows

| Element | City |
|---|---|
| Towers | Each OSM roof slab, slot and shoulder is extruded straight from grade to its inferred roof. Any lean or overhang at the base is not modelled. A floor spandrel runs every 4.0 m above the podium, with vertical mullions on a ~4.5 m module and a cap band. |
| Slot | The darker recessed glass between each tower's halves, 2 m below them. |
| Podium | Darker glass with a floor line per 3.6 m level and a lit street-level lobby. |
| Hub and pavilion | Glass, lit through at night. OSM maps only the hub's roof (21–21.6 m), but the photos show it glazed down to the street lobby, so it starts at grade. |
| Canopies | The two mapped 3.6 m canopies fall under the towers' roof outlines, which City extrudes to grade, so they are not drawn. |

**Estimated:** floor heights, mullion module, slot depth and colours. Logos and the "Norfolk Southern" lettering are left out, and so is the orange arch sculpture in the plaza.

## Night

No full-night exterior photograph was found, so this is an evidence gap. Searched: Commons and the project pages. As an office building at 23:30, it is mostly dark: about 8% of tower bays are lit, as illustrative occupancy. The glass hub, pavilion and street lobby glow. There is no crown or logo lighting.

## Glass

All glass follows the provisional base-value table. Rendered medians are at 11:30 on the high tier.

| Surface | Base hex | Base S/V | Rendered S/V |
|---|---|---|---|
| Curtain wall | `#90a4b5` | 20% / 71% | sunlit (south) 13% / 62%; shaded (west) 59% / 35% |
| Spandrels and mullions | `#7d848b` | 10% / 55% | |
| Slot | `#73777b` | 6% / 48% | |
| Podium | `#83909a` | 15% / 60% | |
| Generic glass, same frame | | | sunlit 7% / 74%; shaded 32% / 44% |

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From the south, pulled back (money shot) | `326,-2132,20,56,650` | 11:30 AM / 11:30 PM | [Day](day-before-after.jpg) · [Night](night-before-after.jpg) |
| Starting cam | `326,-2132,32,60,450` | 11:30 AM / 11:30 PM | [Day](start-day-before-after.jpg) · [Night](start-night-before-after.jpg) |
| Close, short tower and slot | `326,-2132,20,56,650` with `&dev`, then `__setView(20, 56, 650, 318, -2120, 2.0)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Low tier | `326,-2132,20,56,650` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

## Budget

About 2,150 triangles: about 1,910 in the body and 240 in lit panes. That is within the 2,400 landmark ceiling.
