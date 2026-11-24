# Two Peachtree Pointe

Two Peachtree Pointe (1545 Peachtree, 2007, 18 floors) is the second phase of Peachtree Pointe, beside the low first-phase building to its south. Its mapped outline `osm:way:269391972` crosses the brookwood-south / brookwood-station board seam at z = −4900. Each board builds the parts it holds, and walls on the seam are skipped.

The photographs show three parts:

- **Curved bay:** blue glass ribbon windows between silver spandrels, under a swept metal crown that rises toward the west.
- **Main block:** a cream precast grid of punched windows.
- **Podium:** a lower precast block with window bands to the north.

[SKYDB: south-west face and crown](https://www.skydb.net/file/416210026/two-peachtree-pointe-atlanta/), [from Peachtree](https://www.skydb.net/file/441174472/two-peachtree-pointe-atlanta/), [from the Connector](https://www.skydb.net/file/724752301/two-peachtree-pointe-atlanta/), [south face over phase one](https://www.skydb.net/file/772809535/two-peachtree-pointe-atlanta/) · [Building facts: 77.1 m, roof 65.5 m](https://www.skydb.net/building/13001243/two-peachtree-pointe/)

The tenant's rooftop sign is left out (no logos).

## Heights from lidar

All heights are NAVD88, from the USGS `GA_Statewide_B2_2018` point cloud:

- **Grade:** 287.7 m.
- **Block roof:** 353.9 m, 66 m above grade (SKYDB roof: 65.5 m).
- **Curved bay roof:** 357.1 m.
- **Crown:** rises from about 360 m at its east end to 365.5 m at the west, which matches SKYDB's 77.1 m.
- **Podium:** 309.2 m.

## Estimates

- **Floor module (estimated):** 3.68 m.
- **Block:** a precast pier every 3 m and a spandrel every floor.
- **Curve:** a silver spandrel band every floor. The ring is simplified to a 0.5 m tolerance.
- **Crown:** one sloped screen quad per curve edge, rising linearly toward the west.
- **Podium:** one window band per floor and a storefront band at grade.

## Glass

Vertex colour only, so the building batches. The ribbon glass base is `#7f9fb0` (S 28%, V 69%) and the punched windows are `#6c8594`. Rendered sample at 11:30 from `318,-4910,20,52,480` ([frame](curve.jpg)):

| Face | Rendered S | Rendered V |
|---|---|---|
| Curved glass, sunlit (blue pixels) | 27 | 60 |
| Block windows, shaded (blue pixels) | 34 | 49 |
| Generic low block, sunlit | 16 | 93 |

There is no generic glass tower in the frame, so I have no shaded reference.

## Lighting

As an office, it is mostly dark at 23:30. About 6% of window bays are lit, using skin-kit `litHash`. This is illustrative, and I found no night photograph.

## Captures

Use `/?view=city&cam=<camera>&t=2026-11-20T<time>-05:00`.

| View | Camera | 11:30 AM | 11:30 PM |
|---|---|---|---|
| South-east: curve, block and podium | `318,-4910,-60,52,480` | [Day](day.jpg) | [Night](night.jpg) |
| Spec starting camera | `320,-4929,32,60,231` | [Day](start-day.jpg) | [Night](start-night.jpg) |
| Close: the day camera with a 2.4× lens (`&dev`, then `__setView(-60,52,480,312,-4905,2.4)`) | | [Close](close.jpg) | |
| South-west: curve and crown | `318,-4910,20,52,480` | [Curve](curve.jpg) | |

## Crown and base strengthening (2026-11-24)

The lead's audit rated the first version BORDERLINE. The curved plan read, but the building had no distinct crown or base. The changes below are all photo-backed. The coordinator confirmed them, and the glass is unchanged.

- **Crown:** in the photographs the curved bay's top two floors are a solid cream metal band, not glass, with a concave top edge sweeping up toward the west ([SKYDB 416210026](https://www.skydb.net/file/416210026/two-peachtree-pointe-atlanta/), [441174472](https://www.skydb.net/file/441174472/two-peachtree-pointe-atlanta/)). That band (`#d6d3cb`) now replaces the top two glass ribbons, rising to the lidar's 365.5 m. It sits on the curve faces.
- **Base:** the photograph from Peachtree shows a flat projecting canopy over the drive at the block's foot ([441174472](https://www.skydb.net/file/441174472/two-peachtree-pointe-atlanta/)). City adds a 2.4 m canopy seated on the longest Peachtree run, on the south board's clip only so it is not doubled, over a dark 5.3 m lobby storey.
- **Not added:** the round glass drum with a ring canopy in [772809535](https://www.skydb.net/file/772809535/two-peachtree-pointe-atlanta/) belongs to phase one, One Peachtree Pointe, in front of Two.

[Curve before and after](crown-cmp-curve.jpg) · [South-east before and after](crown-cmp-day.jpg) · [Night](crown-night.jpg) · [Close](crown-close.jpg) · [Four sides](crown-four-sides.jpg)
