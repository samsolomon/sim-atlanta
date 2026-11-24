# One Georgia Center

`osm:way:30978402`, 600 West Peachtree Street NW. Code: `web/src/city/one-georgia-center.ts`. The data had no name for this footprint; it was identified from the address of the Nominatim reverse lookup and the OSM tags (28 levels, built 1968, height 113 m).

The tower was completed in 1968 as the headquarters of the Life of Georgia Insurance Company. Its exterior is Georgia marble. Most sources give 24 storeys; the OSM tag says 28.

## Sources

Photos were checked in an Orca browser tab on 2026-11-24. They are linked here, not copied.

| What | Source |
|---|---|
| Day, from North Avenue: white marble eggcrate of fins and floor slabs over pale glass, solid ribbed top band | [Commons, September 2015](https://commons.wikimedia.org/wiki/File:Vertical_panorama_of_One_Georgia_Center_and_Bank_of_America_Plaza_from_North_Avenue,_September_2015.jpg) |
| **Night**, from Spring Street (2020-09-28): the marble grid uplit cool white, a few offices lit | [Commons: One Georgia Center at night](https://commons.wikimedia.org/wiki/File:One_Georgia_Center_at_night.jpg) |
| Second angle and the base colonnade | [Commons (40508046823)](https://commons.wikimedia.org/wiki/File:One_Georgia_Center,_Atlanta,_GA_(40508046823).jpg) · [(32532273557)](https://commons.wikimedia.org/wiki/File:One_Georgia_Center,_Atlanta,_GA_(32532273557).jpg) |
| Name, date and materials | [Wikipedia](https://en.wikipedia.org/wiki/One_Georgia_Center) · [Midtown Alliance](https://www.midtownatl.com/view/one-georgia-center) |

## Heights

From the April 2019 3DEP lidar on a 2 m raster, measured above the 303.5 m NAVD88 ground ring: roof 109.5 m (median), central penthouse 113 m (p95 112.8, maximum 113.6). The mapped 113 m agrees.

## Estimates

- **Floors:** a 9 m lobby, then 21 floor modules of about 4.1 m up to a solid band from 95 m to the roof. The 24-storey count includes the lobby and mechanical levels.
- **Fins:** about 2.35 m on centre, 0.8 m wide, standing 0.9 m off the glass. The slabs project as far as the fins.
- **Colonnade:** marble piers on every second fin, with dark glass 2.5 m back.
- **Glass:** pale grey-blue `#a9b5bc` (base S 0.10, V 0.74). A first try at `#98a6ae` rendered at sunlit V 37, because the fins and slabs shade the recessed panes.

### Rendered-pixel check

Taken at 11:30, high tier, from a zoomed camera on the west face (`341,-1881,300,66,460`, `__setView(300,70,300,341,-1881,4)`). Medians are over glass-hued pixels only, which excludes the marble.

| Patch | S | V |
|---|---|---|
| Sunlit glass | 14 | 41 |
| Shaded glass | 13 | 36 |
| Lobby glass, sun | 11 | 46 |
| Generic glass tower, sun / shade | 15 / 15 | 55 / 36 |

## Lighting

- **Grid:** the floodlit marble uses its own cool-white lit material (`#dfe7ee`) at 0.3 × the night factor, changed only in `setNight`. The 2020 night photo is the evidence.
- **Offices:** about 4% lit at 23:30, from the shared `litHash`.
- Everything is `illustrative` ambient scenery and is not labelled on screen.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| West face, day / night / low tier | `341,-1881,300,66,460` | 11:30 / 23:30 / 11:30 `&q=low` |
| North-west, day | `341,-1881,230,66,520` | 11:30 |
| Close (colonnade and eggcrate) | as above, `&dev&mindist=20` plus `__setView(300,70,300,341,-1881,3)` | 11:30 / 23:30 |
