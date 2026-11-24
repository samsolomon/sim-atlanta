# 1010 Midtown

The 35-storey condominium tower at Peachtree and 12th Street (completed 2008), part of the 12th & Midtown development. City draws it from the mapped outline `osm:way:1427534504`, which crosses the midtown-central / midtown-upper seam at z = -3300. Midtown-upper holds the tower (part `osm:way:234935281`) and most of the podium. Midtown-central holds the rest of the podium and a 4 m bump of the tower part, which is drawn at podium height. `web/src/city/1010-midtown.ts` builds each row's own parts, so neither row keeps a generic box. The code picks the tower row by geometry, not by vertex count.

## Sources

- West side and flat glass block from Midtown's 12th Street park: [Vertical panorama of 1010 Midtown](https://commons.wikimedia.org/wiki/File:Vertical_panorama_of_1010_Midtown_in_midtown_Atlanta.jpg), 18 April 2016.
- Second angle, from 12th and Peachtree, with the convex balcony face, flat glass face and stone podium: [Vertical panorama of 1010 Midtown viewed from 12th & Peachtree](https://commons.wikimedia.org/wiki/File:Vertical_panorama_of_1010_Midtown_viewed_from_12th_%26_Peachtree_in_midtown_Atlanta.jpg), 18 April 2016.
- Earlier view with the curved ribbons: [1010 Midtown, Midtown Atlanta GA](https://commons.wikimedia.org/wiki/File:1010_Midtown,_Midtown_Atlanta_GA.jpg), 23 May 2010.
- Heights: USGS 3DEP lidar, 22 April 2019, sampled on 4 m cells.

## What the model follows

| Element | Evidence | City |
|---|---|---|
| Plan | Mapped tower part: a straight west face and a convex curve toward Peachtree. | Mapped ring, simplified to 0.3 m. The same tolerance applies to every part, so shared walls stay together. |
| Roof | Lidar puts the slab roof at 413.9 m NAVD88 and roof plant on the spine at 417–420 m. Ground is 296–305 m. | Roof at 413.9 m with a pale cap. A plant block reaches 419.5 m behind a 2.2 m glass screen on the west face. |
| Peachtree curve | Continuous balcony ribbons on every floor: white slab edges with grey glass rails over a recessed wall. | One white band per floor, 1.9 m proud. Bands run 0.6 m past each facet so they meet around the curve. |
| Flat faces | Blue-teal glass in a white frame grid. | Glass with a white mullion every ~3.4 m bay and a transom every fourth floor, set in front of the lit panes. |
| Podium | Stone base with storefronts on Peachtree and 12th. Lidar puts the west podium at about 321 m and the retail at about 309 m. | Stone podium to 321.5 m and retail to 309 m, each with a dark storefront band. The 3.3 m strip on 12th Street keeps its mapped height. |

**Estimated:** floor pitch (3.22 m from 31 floors above the 312 m podium line), ribbon depth, mullion spacing, plant block size and screen height. Bank signage and logos at the corner kiosk are left out.

## Night

No full-night exterior photograph was found, so this is an evidence gap. City lights about 20% of units as illustrative residential occupancy. On the curve, the lit panes sit on the recessed wall, so they show as warm slivers between the ribbons. The building gets no decorative or crown lighting.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| From the south-west, pulled back (money shot) | `708,-3341,32,62,650` | 11:30 AM | [Before and after](day-before-after.jpg) |
| Same | `708,-3341,32,62,650` | 11:30 PM | [Before and after](night-before-after.jpg) |
| Starting cam | `708,-3341,32,60,372` | 11:30 AM | [Before and after](start-day-before-after.jpg) |
| Starting cam | `708,-3341,32,60,372` | 11:30 PM | [Before and after](start-night-before-after.jpg) |
| Ribbons and glass, close | `782,-3431,32,62,650` with `&dev`, then `__setView(32, 62, 650, 782, -3431, 2.4)` | 11:30 AM / 11:30 PM | [Day](ribbons-day.jpg) · [Night](ribbons-night.jpg) |
| Peachtree and 12th, close | `742,-3350,215,66,330` with `&dev&mindist=20` | 11:30 AM | [Close](peachtree-12th.jpg) |
| Low tier | `708,-3341,32,62,650` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

## Budget

The tower row uses about 2,170 triangles: about 1,580 in the body and about 600 in lit panes. The central row uses 144 in one mesh and hides its empty lamp mesh. That makes about 2,320 against the 2,400 landmark ceiling, and three low-tier draws.
