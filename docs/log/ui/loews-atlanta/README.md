# Loews Atlanta Hotel

The 2010 hotel tower at 1065 Peachtree Street, on the 12th & Midtown block. City draws it from the mapped site `osm:way:234935283`, which lies wholly in the midtown-central row. Its parts are a west wing (`osm:way:1434982550`), three 8 m arrival and retail pieces, and the tower: the largest tall part, which the import calls `podium`. `web/src/city/loews-atlanta.ts` builds all of them from their exact mapped rings. The code finds the tower by area, not by name.

**Shared development boundary.** The tan block against the hotel's east side is 1075 Peachtree's garage, modelled in PR #416. It is a separate site, and the two models meet along the mapped edge.

## Sources

- Street view up the Peachtree face, with the residence balconies on the top floors and the stone base with retail: [LoewsMidtown.jpg](https://commons.wikimedia.org/wiki/File:LoewsMidtown.jpg), 16 February 2019.
- Second angle across the park, with the north and west faces and the framed pale glass: [1010 Midtown, Midtown Atlanta GA](https://commons.wikimedia.org/wiki/File:1010_Midtown,_Midtown_Atlanta_GA.jpg), 23 May 2010. The hotel is at the right edge.
- Heights: USGS 3DEP lidar, 22 April 2019, sampled on 4 m cells.

## What the model follows

| Element | Evidence | City |
|---|---|---|
| Tower | Lidar puts the roof at 404–405 m NAVD88 over ground of about 295 m, with the Peachtree (north-west) half at 411.5 m. The mapped 79.9 m is the lower parapet over the podium line, so it matches. | Prisms to 405 m and 411.5 m, split 2 m east of the tower's centre line. |
| Wing | Lidar puts the west wing at 367–371 m. | 369 m. |
| Curtain wall | Pale blue-grey glass in a light frame grid, with room-width bays. | Glass with a light mullion every ~3.2 m bay, a transom every second floor and a pale cap. |
| Residences | The 2019 photo shows a stack of balcony slabs on the top floors of the Peachtree face. | Twelve horizontal slabs with front edges, on the face most squarely toward Peachtree. |
| Base | Stone-clad base with storefronts. | Stone to 310 m, dark storefronts on exposed street faces, and the 8 m retail and arrival pieces at their mapped height. |

**Estimated:** the split line between the two tower heights, the floor pitch (3.3 m), the bay width, the balcony depth (1.6 m) and count, and the stone base height. The arrival canopy is omitted because the photos don't fix its position. Signage and logos are left out.

## Night

No full-night exterior photograph was found, so this is an evidence gap. City lights about a third of room bays on a stable pattern, as illustrative hotel occupancy, and lights the street storefronts as a warm lobby. Faces that stand against another mass of the hotel are left unlit. The building gets no crown or decorative lighting.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From the south-west, pulled back (money shot) | `764,-3269,32,62,600` | 11:30 AM | [Before and after](day-before-after.jpg) |
| Same | `764,-3269,32,62,600` | 11:30 PM | [Before and after](night-before-after.jpg) |
| Starting cam | `764,-3269,32,60,355` | 11:30 AM | [Before and after](start-day-before-after.jpg) |
| Starting cam | `764,-3269,32,60,355` | 11:30 PM | [Before and after](start-night-before-after.jpg) |
| Close, from the north-east, over the 1075 boundary | `770,-3272,60,40,420` with `&dev&mindist=20` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Low tier | `764,-3269,32,62,600` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

## Budget

About 2,210 triangles: about 1,150 in the body and about 1,060 in lit panes. That is within the 2,400 landmark ceiling and costs two low-tier draws.
