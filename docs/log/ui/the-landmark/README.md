# The Landmark, 215 Piedmont Avenue

The Landmark is a 1963 residential slab, now condominiums, on Piedmont Avenue between Andrew Young International Boulevard and John Portman Boulevard. It replaces the Overture outline `53f15907-13e9-40e0-898e-bec4f841a951`, which has a notched footprint about 50 × 18 m on a −27° axis.

**Height.** The Overture height of 86.2 m is wrong. The 22 April 2019 lidar measures the roof at p50 62.5 m, p95 67.9 m and max 68.8 m above grade (ground 296.9 m NAVD88). Listings give 21 or 22 storeys. The model uses:
- a 4.6 m lobby;
- 20 floors at 2.95 m, to 63.6 m;
- a 1 m parapet;
- a 10 × 7 m penthouse to 67.9 m.

## References

- [AllAtlantaCondos exterior photograph](https://www.allatlantacondos.com/landmark-downtown-atlanta-condos), looking up a long face. It shows a tan-brick slab with paired windows in regular bands, pale concrete vertical fins and end bands, and dark awnings at the base.
- [Street View, Piedmont Avenue, December 2024](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75985,-84.38215&heading=70&pitch=25&fov=90). This is the second angle. It shows the narrow end as a pale concrete wall with a slot of windows, and the parking lot beside it. Viewed in an Orca tab, not copied.
- Listings for floors and units: [HighRises](https://www.highrises.com/buildings/atlanta_ga/the-landmark_215-piedmont-ave-ne_5798).

## Model

- **Walls.** The middle of each long face (|u| < 12 m) is a brick field (`#a38672`): an even window grid, with wider piers between the pairs. The wings either side and the narrow ends are pale concrete (`#d9d4c8`), with a two-column window slot, as the photographs show.
- **Glass.** `#8a9499` (S10 V60). Rendered at 11:30, high tier, the sunlit panes read about H100 S6 V52. A sunlit generic glass tower in the same frame reads H136 S5 V77.
- **Night.** No reliable night exterior was found, so this is the gap. The lighting is illustrative residential occupancy: about 26% of the panes on the long faces are lit (residential), and 20% in the end slots, using skin-kit `litFacade`. The lobby glazing is lit. The crown is unlit.

**Estimated:** window pairing, floor height and penthouse size. The base awnings are omitted; they are too small to read at City's orbit.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| Long face, looking north-northwest | `922,-692,333,58,300` | 11:30 AM EST | [Day](day.jpg) |
| Same | `922,-692,333,58,300` | 11:30 PM EST | [Night](night.jpg) |
| Narrow end, looking northeast | `922,-692,60,52,330` | 11:30 AM EST | [End](end.jpg) |
| Same | `922,-692,60,52,330` | 11:30 PM EST | [End at night](end-night.jpg) |
| Opposite long face, looking south-southeast | `922,-692,153,58,300` | 11:30 AM EST | [North face](north.jpg) |
| End bands and brick (close) | `905,-675,333,62,90` | 11:30 AM EST | [Close](close.jpg) |

The bearing is the camera's heading. Use `/?view=city&cam=<camera>&t=2026-11-20T<clock>`. The close view adds `&dev&mindist=20`.
