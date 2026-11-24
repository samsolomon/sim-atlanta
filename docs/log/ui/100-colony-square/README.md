# 100 Colony Square

The 1970 office tower at Peachtree and 14th replaces the mapped parent `osm:way:536737548` and its parts. The parent id is unchanged. It is a 22-storey square shaft of white precast, punched with dark windows on the 45° Peachtree grid. A blank band runs under the roof, and a core penthouse sits on top.

## Registration and heights

These come from the [lead's Colony Square research](https://github.com/samsolomon/sim-atlanta/blob/fee824c6/docs/research/colony-square.md) and its April 2018 lidar returns (USGS EPT, ground median 296.1 m NAVD88).

- **Footprint.** Returns 88 m or more above ground form a 45° square with corners at (822.0, −3645.2), (850.5, −3673.5), (822.3, −3701.9) and (793.8, −3673.5). That matches the mapped shaft part `osm:way:1451518631` to within about 1.5 m. The shaft is drawn as a 39.4 m square around the lidar centre, so it reaches about 1.5 m past the mapped edge on the northeast.
- **Low part.** The roughly 94.5 m returns inside the low part `osm:way:1414724141` fall in that sliver. They are spill from the tower's edge, not a tall mass over the low part.
- **Roof heights.** The histogram shows the main roof at 88–90 m (2,982 returns) and the core at 94–96 m (1,425 returns). The model uses 89.3 m and 96.3 m, after the core part `osm:way:1414724139`.
- **Low parts.** These stay at their mapped 8.7 m and 4.4 m as pale bases with lit street glazing. The redeveloped retail and plaza roofs postdate the lidar and are not modelled here.

## References

- [Wikimedia Commons, AtlChampion, 9 November 2025](https://commons.wikimedia.org/wiki/File:AColonySq1002511-0966.jpg) gives the current tower from an elevated angle. It shows the white grid of near-square punched windows, about 16 per face, the blank top band and the solid corners.
- [Wikimedia Commons, dbking, 2007](https://commons.wikimedia.org/wiki/File:Colony_Square.jpg) shows the 400 tower in the same family from the street, as a second angle on the grid.
- [Urbanize Atlanta night walk, January 2022](https://atlanta.urbanize.city/post/photos-wandering-reborn-colony-square-midtown-landmark): the skating-rink photograph shows this tower at night. Scattered office floors are lit warm and the crown is dark. The rink, the Christmas tree and the coloured accents are seasonal, so they are left out.

## Estimates

- 21 window floors at 3.62 m above an 8.7 m recessed lobby on corner piers.
- About 16 bays per face at 2.5 m, with 1.2 m piers and 2.3 m spandrels. That leaves the near-square openings seen in the 2025 photograph.
- Blank band to the 89.3 m roof. Core penthouse 16 × 11.6 m.

## Lighting

Everyday office night: about 6% of windows lit warm, a stable pattern, plus the lobby and base glazing. The crown and grid stay unlit. No holiday colours or invented floodlighting. There is no full-night photograph outside the holiday season, so that gap is noted here.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| Starting camera, looking north-northeast | `819,-3670,32,60,288` | 11:30 AM EST | [Day](day.jpg) |
| Starting camera | `819,-3670,32,60,288` | 11:30 PM EST | [Night](night.jpg) |
| Crown and two faces, looking south-southwest | `819,-3670,200,62,480` | 11:30 AM EST | [Crown](crown.jpg) |
| Crown and two faces, looking south-southwest | `819,-3670,200,62,480` | 11:30 PM EST | [Crown at night](crown-night.jpg) |
| South corner and grid (close) | `815,-3700,0,68,130` | 11:30 AM EST | [Corner](corner.jpg) |

The bearing is the camera's heading. Use `/?view=city&cam=<camera>&t=2026-11-20T<clock>`. The close view adds `&dev&mindist=20`.
