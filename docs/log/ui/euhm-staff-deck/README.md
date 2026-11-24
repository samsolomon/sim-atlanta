# Emory University Hospital Midtown staff deck

The staff parking deck (HRD Architects, about 2020) fills the block between Spring Street, Linden Avenue and West Peachtree Street. It replaces the mapped outline `osm:way:1021839184` and its parts, `osm:way:1456370792` (the deck, mapped at 54 m) and `osm:way:1338470417` (the low south wing, 14.4 m). The 2019 lidar predates the deck, so the height follows the survey estimate: the screen tops out at 348.8 m NAVD88, 49.5 m above the low Spring Street corner and about 41 m above West Peachtree.

## Identity

OSM names this outline "Emory University Hospital Midtown Staff Parking", and it is the only large deck on the block west of West Peachtree and south of Linden. The hospital's other deck, "Emory University Medical Office Tower Parking" (`osm:way:381169159`, 10 floors), stands east of West Peachtree beside the Medical Office Tower. It is probably the visitor and outpatient deck, so it isn’t this one (an inference; the deck isn’t signed in the photographs). The mapped stair-tower projection toward Linden Avenue matches the glass stair tower in the photographs.

## References

- [Garey Gomez photographs for HRD Architects](https://www.gareygomez.com/hrd-euhm-parking-deck) supply the evidence below:
  - a dusk aerial with every deck lit behind the screen and the stair tower glowing;
  - a close view of the white pleated fin panels;
  - a street elevation showing the glass storefront, the dark louvre band and the fin screen;
  - a plaza view at the stair tower entrance.
- The dusk aerial and the street elevation are the two angles compared.

## Model

- **Fin screen:** white folded-metal fins in two alternating widths (1.1 m and 0.8 m) on a 2 m world grid, set 0.75 m in front of the deck edge. Slab lines sit at every 3.2 m level behind them, ten levels from 315 m to 347 m NAVD88, with a parapet to 348.8 m. The pleated diamond pattern is simplified to alternating fins because it is finer than City's orbit can resolve.
- **Base:** a dark louvre band from 312.5 m to 315 m. On Linden Avenue and West Peachtree there is a storey of street glazing below it. Spring Street and the south side have open levels above a concrete plinth instead, because the site falls 8 m from West Peachtree (307.8 m) to Spring (299.7 m).
- **Stair tower:** blue glass with a frame grid, rising to 352.2 m.
- **Low south wing:** three open concrete levels to 316 m.

Estimated: the level count, the plinth and glazing heights, the fin spacing and the low wing's openings.

## The row seam

The mapped outline is cut by the row seam at z = −1700. north-band holds the deck south of the seam and the low wing, and midtown-south holds the rest and the stair tower. Each row builds its own physical part, following the same convention as The Atlantic (skins-5). Both rows share one NAVD88 base and the same world fin grid, so the halves meet without a step whichever row mounts first, and neither ever draws the generic box. The seam was checked close up on both tiers.

## Lighting

The dusk photograph shows every parking level evenly lit, a warm-white band behind the fins, and the glass stair tower glowing. Garages stay lit all night, so City lights each deck face as one even plane behind the screen and lights the stair tower and street glazing. The values are illustrative: there is no full-night (23:30) photograph, only dusk.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| Starting camera, looking north-northeast | `310,-1681,32,60,150` | 11:30 AM EST | [Day](day.jpg) |
| Starting camera | `310,-1681,32,60,150` | 11:30 PM EST | [Night](night.jpg) |
| Stair tower and Linden face, looking southwest | `330,-1700,215,58,420` | 11:30 AM EST | [Wide](wide.jpg) |
| Stair tower and Linden face, looking southwest | `330,-1700,215,58,420` | 11:30 PM EST | [Wide at night](wide-night.jpg) |
| Spring Street face and south wing, looking east | `290,-1700,80,64,300` | 11:30 AM EST | [West](west.jpg) |
| Row seam on Spring Street, high and low (close) | `262,-1700,80,70,90` | 11:30 AM EST | [High](seam-high.jpg) · [Low](seam-low.jpg) |

The bearing is the camera's heading. Use `/?view=city&cam=<camera>&t=2026-11-20T<clock>`. The seam views add `&dev&mindist=20`, and the low-tier one adds `&q=low`.
