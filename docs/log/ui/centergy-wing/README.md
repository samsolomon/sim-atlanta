# Centergy glass wing, Technology Square

This is the glass curtain-wall wing of the Centergy complex, flush against Centergy One's east wall. It replaces the outline `osm:way:792229254`, which is unnamed in OSM, about 46 × 38 m and mapped at 56 m. The 22 April 2019 lidar measures the roof at p50 52.2 m, p95 57.0 m and max 59.4 m above grade (ground 293.4 m NAVD88), so the model has a 52.2 m roof and plant to 57 m. The coordinator assigned it after the #578 review, so the pair reads as one complex.

## Identifying features

From the [Smallwood aerial](https://www.smallwood-us.com/work/case-study/centergy-at-technology-square):
1. **Green-grey glass**, not the generic pale blue-grey. Base `#6f8580` (S13 V52). At 11:30, high tier, the sunlit glass renders H146 S21 V46. Generic glass in the same frame renders H136 S6 V72.
2. **A bright horizontal spandrel band at every floor**, `#c8ccc8`, over close mullions about 1.5 m apart.
3. **A flat roof with no crown**, lower than the brick tower beside it.
4. A dark lobby base.

The west face is a party wall against Centergy One, so it gets no facade. The test checks that nothing stands proud of it.

## Lighting

Offices: about 7% of panes are lit at 23:30, from skin-kit `litFacade`, drawing only the lit panes. The lobby is lit.

## Checks

The footprint and detachment checks are clean.

## Captures

The captures are taken with Centergy One (#578) applied, so the pair shows together.

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| The pair, looking north | `215,-2632,0,50,500` | 11:30 AM EST | [Day](day.jpg) |
| Same | `215,-2632,0,50,500` | 11:30 PM EST | [Night](night.jpg) |
| South face (close) | `226,-2632,0,40,140` | 11:30 AM EST | [Close](close.jpg) |
| Four sides, ~420 m | bearings 180/270/0/90 | 11:30 AM EST | [Four sides](four-side.jpg) |

The bearing is the view heading. The close view adds `&dev&mindist=20`.

## Rework (2026-11-27)

The facade layers (floor bands, mullions, lit panes, lobby glass) were drawn on the wing's bounding box. The south face therefore stood 0.32 m inside `osm:way:792229255` (h 23 m) from grade+6 m to that block's roof, and missed the true north and east walls by 0.30 and 0.56 m. They now follow the mapped ring edges. The west party wall shared with Centergy One stays bare, and any edge a neighbour covers starts at the first floor band above that neighbour's roof. The wing's lit panes now use Nine15 Midtown's and University House's lamp look (`#f2d6a8` at 0.66, was `#f5d8a8` at 0.5), so they share those buildings' night draw in the same 500 m batch cell. Without that the wing cost one High night call, and night calls are at the 630 cap.
