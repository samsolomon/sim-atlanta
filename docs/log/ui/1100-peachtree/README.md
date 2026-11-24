# 1100 Peachtree

`osm:way:39450210`, modelled in `web/src/city/midtown-skyline-1100.ts` through the Midtown
skyline registry. It is a 28-storey office tower completed in 1990–91, designed by Smallwood,
Reynolds, Stewart, Stewart & Associates, on the west side of Peachtree Street at 12th Street.

## Sources

Daytime, from two angles:
- [Wikimedia Commons, March 2018](https://commons.wikimedia.org/wiki/File:1100_Peachtree,_Atlanta_March_2018.jpg): the Peachtree sidewalk looking up a main face, with its central glass slot.
- [Wikimedia Commons, from the west](https://commons.wikimedia.org/wiki/File:2_1100_Peachtree.jpg): the whole shaft with the loggia and pyramid.
- [SKYDB gallery (15 photos)](https://www.skydb.net/building/655454807/1100-peachtree-atlanta): crown close-ups (photos 597-459-603 and 533-477-362), the stepped glazed corners (867-209-238), and street-level entrances.
- [Owner's brochure](https://www.1100peachtree.com/uploads/1/5/4/0/154046563/7867550_new_photography_-_brochure_-_custom_-_pm.pdf): the plaza, lobby frontage and garage pavilion on Peachtree.

Night:
- The [owner's brochure](https://www.1100peachtree.com/uploads/1/5/4/0/154046563/7867550_new_photography_-_brochure_-_custom_-_pm.pdf) cover (dusk, aerial from the southeast) shows the crown loggia floodlit warm white and the pyramid dark above it. Office floors are only partly lit.
- The [JLL offering summary](https://res.cloudinary.com/jll-global-cmg/image/upload/v1740000208/Prod/DealX/Doc/95ec8e8c-952d-4aa6-a473-4527c8ecd2ef/_JLL__1100_Peachtree_Offering_Summary.pdf) cover (dusk) shows a lit lobby and plaza.
- **Gap:** I found no full-night photograph taken after 23:00. The office occupancy (8% of panes lit) is a choice that follows the night rule (offices mostly dark). It is not observed.

## What the photos show

- **Plan:** a square of about 47 m with a 4.5 m re-entrant notch at each corner, set on the diagonal street grid. The notched corners are stacked glass with thin stone sills.
- **Shaft:** cream stone spandrels alternate with continuous blue-grey reflective window ribbons, broken by narrow stone piers. A dark glass slot, about 7 m wide, runs up the centre of each face.
- **Crown:** the shaft steps in at a stone ledge to a loggia of tall windows between stone piers, under a cornice. A low stepped pyramid in grey-green metal sits above it, with a small cap.
- **Base:** a two-storey lobby behind stone piers on the Peachtree plaza. A stone-clad garage podium steps down the slope to the west.

## Dimensions

From [3DEP lidar](https://usgs.entwine.io/) collected on 22 April 2019, sampled with the EPT reader in `pipeline/scripts/king_memorial_corridor.py`, NAVD88:

| Element | Height | Basis |
|---|---|---|
| Peachtree sidewalk east of the plaza | 297.1 m | lidar ground, median of class-2 returns |
| Cornice and main roof | 409.8 m (114.5 m above the site's ring grade) | lidar, perimeter returns |
| Pyramid apex | 428.6 m (133.3 m) | lidar, maximum near the centre |
| Garage podium roof | 308.6 m (13.3 m) | lidar median; the mapped 18.6 m is too high |
| Service wing and Peachtree-side pavilions | 8.3 to 11.2 m | lidar medians |
| Raised plaza and round pavilion | 1.2 and 6.6 m | mapped (trees cloud the returns) |

Estimated from photos:
- Lobby height (6.1 m).
- Loggia band (400.3 to 408.6 m).
- Pyramid eave half-width (19.6 m) and its nine treads. The lidar profile rises from about 16 m out from the centre, but the photos show more, finer steps than nine.
- Slot width (7.2 m) and the ribbon proportion (44% glass per floor).
- Notch size, which comes from the mapped footprint.

## Cameras

- Matched day and night: `/?view=city&q=high&weather=clear&speed=0&t=2026-11-20T11:30:00-05:00&cam=800,-3480,45,55,800`, then `__setView(45,55,800,800,-3480,1.4)` in dev. Repeat at `T23:30` and with `q=low`.
- Crown close-up: `cam=918,-3603,45,62,900`, zoom 3.2.

## Budget

- One body mesh of 2,300 triangles, under the 2,400 landmark ceiling, plus a lit mesh of 194 triangles.
- Vertex colours only, through `StaticLandmarkMaterial`, so no shader program is added.
