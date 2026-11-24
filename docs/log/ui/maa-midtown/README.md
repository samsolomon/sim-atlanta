# MAA Midtown

The 25-storey apartment tower between West Peachtree and Peachtree Walk, with its north end on 11th Street. City draws it from the mapped site `osm:way:536886485`, which has two parts: the tower (`osm:way:886034008`) and the 20 m parking garage (`osm:way:886034000`) on its east side. The site lies wholly in the midtown-central row. `web/src/city/maa-midtown.ts` builds both parts from their exact mapped rings.

## Heights: lidar, not the mapped 98 m

The 22 April 2019 3DEP lidar disagrees with the mapped 98 m. On 4 m cells:

| Mass | Lidar roof, NAVD88 | Over the 302.6 m street | City |
|---|---|---|---|
| North slab on 11th Street | 385.6–387.6 | about 84 m | 386.5 m |
| Rooftop pavilion | 389.7 | about 87 m | 389.7 m |
| South block toward Peachtree Walk | 379.6–382.7 | about 79 m | 381.5 m |
| Garage | 321–327.6 | 20–24 m | 327 m |

Tower part p50/p95/max: 77.2/84.9/87.3 m.

## Sources

- Elevated view of the west face, with the brick slab, seven white-framed balcony stacks, glass corner tower, banded garage base and rooftop pavilion: [MAA Midtown (AMAAMT2511-0867.jpg)](https://commons.wikimedia.org/wiki/File:AMAAMT2511-0867.jpg), 5 October 2024, CC BY-SA 4.0.
- Second angle at street level, with the glass corner tower and its white frame from 11th Street: [Street View, 31 11th St NE, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78310,-84.38690&heading=60&pitch=30&fov=100). Cited only; no imagery copied.
- Brick base and recessed balconies on Peachtree Walk: [Street View, 1003 Peachtree Walk NE, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78270,-84.38600&heading=250&pitch=25&fov=90).

## What the model follows

| Element | Evidence | City |
|---|---|---|
| Brick slab | Red-brown brick around a regular window grid. | Vertex-coloured brick, a glass strip per ~4.6 m bay and a brick band per 3.1 m floor. Every fourth band is darker. |
| Balcony stacks | Recessed balcony columns in white frames, set in from each face's end bays. | Every third bay is a recessed stack between full-height white jambs. |
| Glass corner | Blue glass with a white frame grid on the 11th Street end, returning one bay down the west face, with a white fin. | Glass on the north face and one bay of the west face, a white band every third floor, and a white fin from the West Peachtree sidewalk to past the roof. |
| Base and garage | Brick base with pale parking bands; precast garage with horizontal bands. | Brick base to 327.5 m with parking bands on the street faces; garage to 327 m with a band per 3.4 m level. |
| Roof | Glass amenity pavilion under a brick parapet. | 8 × 20 m pavilion to 389.7 m on the north slab, where lidar puts it. |

**Estimated:** bay width, floor pitch, balcony-stack rhythm, pavilion footprint, fin width and the garage level pitch. The MAA sign and logo are left out.

## Night

No full-night exterior photograph was found, so this is an evidence gap. Searched: Commons and Street View (day only). City lights about 30% of rooms as illustrative residential occupancy, including the rooms behind the glass corner and the pavilion glass. The garage stays dark. Lit windows use skin-kit `litHash(seedOf(id), face, floor, bay)`.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From 11th Street, pulled back (money shot) | `458,-3215,200,62,560` | 11:30 AM | [Before and after](day-before-after.jpg) |
| Same | `458,-3215,200,62,560` | 11:30 PM | [Before and after](night-before-after.jpg) |
| Starting cam | `458,-3215,32,60,400` | 11:30 AM / 11:30 PM | [Day](start-day-before-after.jpg) · [Night](start-night-before-after.jpg) |
| 11th Street base, close | `452,-3240,200,62,560` with `&dev`, then `__setView(200, 62, 560, 452, -3240, 2.4)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Low tier | `458,-3215,200,62,560` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

## Budget

About 1,350 triangles: about 810 in the body and about 540 in lit panes. The facade skips the seam between the blocks and the face behind the glass corner. Glass bases are within the provisional glass rules, and so is the rendered glass. In City's shade, the bluish ambient light pushes cool, dark bases to rendered saturations of 54–81%. So the glass is near-neutral, and the balcony recess is slightly warm:

| Surface | Base hex | Base S/V | Rendered S/V, 11:30 (median) |
|---|---|---|---|
| Slab glass | `#adb5b9` | 6% / 73% | shaded west 26–27% / 33–34%; east 32% / 40% |
| Corner glass | `#b0b8bd` | 7% / 74% | shaded north 26% / 36% (no sunlit patch at 11:30) |
| Pavilion glass | `#aab6ba` | 9% / 73% | |
| Balcony recess | `#a29a92` | 10% / 64% | neutral grey-brown in shade |
| Generic glass in the same frames | | | shaded 27–34% / 44–46%; sunlit 28% / 44% |
