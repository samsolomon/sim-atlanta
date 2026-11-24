# The Atlantic

The 46-storey Art Deco revival apartment tower at 1380 Atlantic Drive, Atlantic Station (completed 2009). City draws it from the mapped outline `osm:way:269542078`. That outline crosses the board seam at z = -4100. The brookwood-south clip holds the tower (part `osm:way:884897812`, about 67 × 31 m with notched corners). The midtown-upper clip holds the 20 m parking podium (part `osm:way:884897816`) and a 3 m sliver of the tower's south face. `web/src/city/the-atlantic.ts` claims the site in both rows, so neither row keeps a generic box. It builds the tower from the brookwood-south clip, moving the seam vertices out to the tower's south face at z = -4097, and the podium from the midtown-upper clip.

## Sources

- Day, south-west side with the garage: [The Atlantic - panoramio.jpg](https://commons.wikimedia.org/wiki/File:The_Atlantic_-_panoramio.jpg), 2 April 2016.
- Night, same position: [The Atlantic at night - panoramio.jpg](https://commons.wikimedia.org/wiki/File:The_Atlantic_at_night_-_panoramio.jpg), 2 April 2016. This closes the row's night-evidence gap.
- Second angle, both elevations and the crown: [The Atlantic, Atlanta.jpg](https://commons.wikimedia.org/wiki/File:The_Atlantic,_Atlanta.jpg), 8 December 2010.
- Crown detail and podium cladding: [Henry, The Atlantic](https://henryinc.com/portfolio/the-atlantic/). The fabricator built the Deco crown, the garage wall cladding and the entry canopies.
- Construction: [High-rise construction in Atlantic Station, July 2008](https://commons.wikimedia.org/wiki/File:High-rise_construction_in_Atlantic_Station,_July_2008.jpg).
- Heights: USGS 3DEP lidar, 22 April 2019, sampled on 4 m cells over both parts.

## What the model follows

| Element | Evidence | City |
|---|---|---|
| Shaft | Tan precast piers run full height between dark blue glass. Long faces carry stacked balconies in alternate bays. | Piers on a 4.2 m bay (1.5 m wide, 0.35 m proud) and 1.2 m balcony stacks in rail grey. |
| Stepped corners | Both photos show the corners stepping in over the top ten floors. Lidar corner cells read 392–405, then 412–418, then 431 m. | Three setbacks at 398, 410 and 420 m cut the corners back by 4×3, 8×5.5 and 11.5×8 m. |
| Occupied roof | Perimeter lidar 431 m NAVD88 (p50 152.4 m and p95 163.9 m above ring ground 276.3 m). | 431 m. |
| Crown screen | Lidar shows a ring at about 440 m around a lower interior (430–435 m). The Henry photo shows tan ribs with X lattice and pinnacles. | Open screen 54 × 23 m to 440.5 m, ribs every 4.5 m, X lattice, eight pinnacles. Corner pinnacles reach 445.3 m, the mapped 176 m above the lowest grade (269.3 m). A 434.5 m penthouse sits inside. |
| Base | Pale stone base about three storeys high. The lobby glazing is tall and warm at night. | Stone to 290.5 m, tall lobby windows on the street faces and an arrival canopy over the east motor court. |
| Podium | Open parking decks with tan precast spandrels. Trees on the amenity deck by the tower. Lidar puts the roof at 288.4 m and the deck planting at 290–293 m. | Deck openings per 3.2 m level, columns every ~9 m, a roof at 288.6 m and planters along the tower side. |

**Estimated:** bay width and pier depth, balcony depth, setback cuts (from 4 m lidar cells and photos), lattice spacing, the penthouse size, canopy dimensions, podium level height and column spacing. No logos or signage.

## Night

The 2016 night photograph shows scattered warm unit windows, a warm lobby, the crown fins floodlit warm orange, and a brightly lit garage. City lights about 16% of windows on a stable per-building pattern, as illustrative residential occupancy. The crown's ribs, lattice and pinnacles glow as one warm surface. The garage stays dark because its own lamp mesh would be a fourth draw call, over the landmark allowance. One unit in the photograph shows purple light, which City omits as an individual choice, not building lighting.

## Captures

| View | Camera | Clock, 20 November 2026 | Image |
|---|---|---|---|
| South approach, pulled back (money shot) | `-500,-4240,20,66,950` | 11:30 AM | [Before and after](day-before-after.jpg) |
| South approach, pulled back | `-500,-4240,20,66,950` | 11:30 PM | [Before and after](night-before-after.jpg) |
| Starting cam | `-561,-4078,32,60,528` | 11:30 AM | [Before and after](start-day-before-after.jpg) |
| Starting cam | `-561,-4078,32,60,528` | 11:30 PM | [Before and after](start-night-before-after.jpg) |
| East motor court and canopy, close | `-515,-4115,225,58,95` with `&dev&mindist=20` | 11:30 AM | [Entrance](entrance.jpg) |
| Crown, close | `-645,-3843,200,60,900` with `&dev`, then `__setView(200, 60, 900, -645, -3843, 4.5)` | 11:30 AM / 11:30 PM | [Day](crown-day.jpg) · [Night](crown-night.jpg) |
| South approach, low tier | `-500,-4240,20,66,950` with `&q=low` | 11:30 AM / 11:30 PM | [Day](low-day.jpg) · [Night](low-night.jpg) |

Use `/?view=city&cam=<camera>&t=2026-11-20T11:30:00-05:00` (or `T23:30:00-05:00`).

## Budget

The tower uses 2,000 triangles (1,078 in the body and 922 in lit panes and crown), and the podium about 165, for about 2,165 against the 2,400 landmark ceiling. Net of the two generic boxes it replaces, the low-tier board gains 1,816 triangles. The podium's empty lamp mesh is hidden, because three.js still issues a call for it. The skin costs three low-tier draws and no new shader program.
