# Bethel Towers

Bethel Towers is a 13-storey brick apartment slab at 210 Auburn Avenue NE in Sweet Auburn. It stands behind Big Bethel AME Church, and a low garage-and-shops building faces Auburn Avenue in front of it. City draws the tower from `osm:way:102162996` and the podium from its own mapped polygon, `osm:way:841048591` ("Big Bethel Parking"). Both sit on the sweet-auburn board and are dispatched from `terrain/model.ts`.

**The podium is its own mass.** It is mapped separately, so it gets its own skin (`createBethelPodium`) rather than being folded into the tower.

## Heights: lidar, not the mapped 62.7 m

The 22 April 2019 3DEP lidar puts the slab roof at 342.5 m NAVD88, over ground at 295.8 m: about 47 m, matching 13 storeys and a lobby. The mapped height is 62.7 m.

| Mass | Lidar, NAVD88 | City |
|---|---|---|
| Slab roof | 342.5 | 342.5 m (about 47 m) |
| Mechanical box, west end of the roof (x 998–1004, z −252 to −244) | 347.6 | 347.6 m |
| Garage deck | 300.5 | 300.5 m |
| Auburn Avenue frontage strip (x 1000–1011, z −200 to −193) | 303 | 303 m |

## Sources

- [Commons, "Bethel Towers, Atlanta, GA" (2019-03-23, Flickr 32532878677)](https://commons.wikimedia.org/wiki/File:Bethel_Towers,_Atlanta,_GA_(32532878677).jpg). It shows a plain orange-red brick slab with a regular grid of punched windows, brick between every window, a thin light concrete parapet band and a brick box on the roof. Its sunlit brick median is #b78669.
- [HABS GA-1170 C-13, 212 Auburn Avenue (1979), partial view of the south facade](https://commons.wikimedia.org/wiki/File:212_AUBURN_AVENUE_(Bethel_Towers)_PARTIAL_VIEW_OF_SOUTH_FACADE_(Parking_Garage_and_Shops_in_front_of_Bethel_Towers_at_210_Auburn_Avenue.)_-_126-255_Auburn_Avenue_(Commercial_HABS_GA,61-ATLA,1C-13.tif). This is the second angle: the concrete-framed garage and shops in front of the tower on Auburn, with shopfronts, a garage portal and a slotted parapet.
- Both photos are cited only. Neither is copied into the repo.

## What the model follows

| Element | City |
|---|---|
| Slab | Orange-red brick, `#b07a5e`: the photo median, a touch darker for City's grade. A lobby and 13 floors. Each floor is one glass band behind a brick pier per ~2.1 m bay, so it reads as punched windows with brick between. |
| Parapet | A thin light concrete band at the roof. |
| Roof | A brick mechanical box on the west end, at the lidar's 347.6 m. |
| Podium | A concrete deck at 300.5 m, with a column every ~6 m. The open sides are dark between the columns. |
| Auburn frontage | The taller 303 m strip, with shopfronts, one dark garage portal and slots in the parapet. The mapped edge is two collinear pieces, laid out as one face. |

**Estimated:** floor pitch, bay width, the lobby height, the podium's column spacing, the position of the portal and the slots in the parapet. No signage is drawn.

## Night

No night photograph of the tower was found; Commons and Flickr were searched. That is recorded as a gap. As housing, it is noticeably lit: about a third of homes, as illustrative occupancy, and lit panes sit where the unlit windows are by day. The lobby and the Auburn shopfronts glow too, while the garage portal stays dark.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From the south, pulled back (money shot) | `1018,-253,0,58,500` | 11:30 AM / 11:30 PM | [Day](day-before-after.jpg) · [Night](night-before-after.jpg) |
| Spec starting cam | `1012,-253,32,60,420` | 11:30 AM / 11:30 PM | [Day](start-day-before-after.jpg) · [Night](start-night-before-after.jpg) |
| Close, from the south | `1018,-253,0,58,500` with `&dev`, then `__setView(0, 60, 400, 1018, -253, 1.6)` | 11:30 AM / 11:30 PM | [Day](close-day.jpg) · [Night](close-night.jpg) |
| Four sides at 400 m, labelled by the face shown, skin outlined | `node scripts/four-side-sheet.mjs --id osm:way:102162996 --ground 295.8 --top 52 --dist 400` (target 1018,-253, tilt 55°, bearings 0, 90, 180 and 270) | 11:30 AM | [Sheet](bethel-towers-four-sides.jpg) |
| Low tier | `1018,-253,0,58,500` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

## Budget and checks

The tower is about 660 triangles and the podium about 190, against the 2,400 landmark ceiling.

The sweet-auburn board is outside the square-board footprint audit, so the same audit was run on it by hand at both tiers. All four checks (two masses, two tiers) came back empty: nothing past the footprint and no detached parts. The unit test also asserts that `detachedParts` is empty for both masses, and that nothing on the podium rises above the deck except the Auburn strip. A first draft put parapet slots over the deck's inner south edge, and the audit's 0.3 m tolerance didn't catch them.
