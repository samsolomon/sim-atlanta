# 271 Seventeenth Street

`osm:way:269542282`, rank 39 in [building skins](https://github.com/samsolomon/sim-atlanta/blob/samsolomon/studio-building-skins/docs/building-skins.md). Code: `web/src/city/271-seventeenth.ts`.

The tower was designed by TVS and opened in 2009. It is Atlantic Station's tallest office building, at 25 storeys above the street: seven parking levels, a lobby and retail level, and 20 office floors. The roof tenant's sign (formerly BB&T, now Piedmont) and the 18 ft street numbers are logos and lettering, so the model leaves them out.

## Sources

Photos were checked in an Orca browser tab on 2026-11-24. They are linked here, not copied.

| What | Source | Angle |
|---|---|---|
| Aerial, north face: a vertical-mullion mass on the east, a horizontally banded mass on the west, and a glass parapet above | [TVS project gallery, image N6](https://www.tvsdesign.com/projects/project-detail/271-17th-street/) | From the north, elevated |
| Second angle, from the Connector | TVS project gallery, image N10 | From the east, distant |
| Upper floors, with silver bands ending under the parapet | [Commons: BB&T Tower top, Atlanta](https://commons.wikimedia.org/wiki/File:BB%26T_Tower_top,_Atlanta.jpg) | Street level, looking up |
| Dusk, with the Piedmont sign on the parapet and scattered lit offices | [Urbanize, Jan 2026](https://atlanta.urbanize.city/post/atlantic-station-photos-inside-seven-story-bespoke-renovation) | Elevated |
| Text: "materials and form that recall Streamline Moderne design … A twenty foot glass parapet provides a distinctive termination to the offset geometry" | TVS project page | — |

## Heights

April 2019 3DEP lidar on a 2.5 m raster, measured above the 276.2 m NAVD88 ground ring:

| Element | Lidar | Model |
|---|---|---|
| Main roof | median 106.8 m | 107 m |
| Glass parapet rim (all four sides) | 113–114 m (p95 113.4) | 113.5 m. That is 6.5 m above the roof, matching the 20 ft parapet |
| Central penthouse, x −390…−357, z −4193…−4181 | 113 m | 113 m |
| North-west corner notch, about 20 m | 103 m | **Not modelled.** OSM maps it as a 103 m part |

## Estimates

- **Parking levels:** 7 levels at about 3.1 m, up to 22 m. They are drawn as dark spandrel glass with floor lines. The photos show the base under trees and the deck, so this is an **estimate**.
- **Lobby:** 22 to 28.4 m, with 20 office floors of 3.9 m each above it, up to the 107 m roof.
- **Split between the masses:** 38% of each long face, measured from the east, as judged from the N6 aerial. East of the split, vertical mullions stand about 4.5 m apart. West of it, a silver band 0.95 m deep runs at every office floor.
- **Ground:** floors are measured from the lidar ground ring (276.2 m NAVD88), the same datum as the roof, not from the rendered grade.
- **Materials:** flat vertex colours. Every library surface compiles its own shader program, and dark glass, a silver band and a mullion read at the City orbit without texture.
- **Glass:** very dark blue-grey (`#3d505c`). It reads almost black in the aerial.

## Lighting

- **Offices:** about 5% of panes are lit at 23:30, and 3% on the top floors.
- **Crown and parapet:** Urbanize mentions new "lighting meant to make the building stand out at night to Connector commuters" (2026). Apart from the tenant sign, no photo shows what that lighting is. **Gap:** no verified night view of the parapet, so it is not lit.
- All lighting is `illustrative` ambient scenery and is not labelled on screen.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| Start cam, day / night / low tier | `-376,-4188,32,60,339` | 11:30 / 23:30 / 11:30 `&q=low` |
| North face, day / night (the money shot) | `-376,-4188,200,70,600` | 11:30 / 23:30 |
| Base and lower floors (close) | `-376,-4175,200,62,220` with `&dev&mindist=20` | 11:30 |
