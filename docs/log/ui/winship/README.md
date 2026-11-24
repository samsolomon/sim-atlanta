# Winship Cancer Institute at Emory Midtown

Winship Cancer Institute at Emory Midtown (SOM with May Architecture, opened 2023) stands on Peachtree at Linden. It replaces the mapped outline `osm:way:886044296` and its parts. The 22 April 2019 lidar shows the site under early construction (roof p50 1.2 m, p95 13.3 m), so heights come from the architect instead. SOM gives 292 ft (89 m) and 17 storeys.

## OSM parts, as modelled

| Part | Data | Model |
|---|---|---|
| `1338346574` | Tower, reported 80 m | Pale glass slab: roof 84 m (estimated), mechanical screen to 89 m (SOM's 292 ft) |
| `1456370827` | 18 m, with two holes | The podium. Its holes are the tower and hall footprints, so the outer ring is drawn at 18 m. |
| `1338346571`, `1456370826` | 25.2 m | Timber-clad hall rising out of the podium beside the canopy (`…571`), and a brick-based strip along the canopy's north side (`…826`) |
| `1338346572`, `1456370825` | 18 m on a 17.4 m `min_height` | The drop-off **canopy**: a 1.8 m timber slab with a white fascia from 17.4 to 19.2 m, open underneath on slender columns (column positions estimated). This is why OSM lifted them. |
| residual `podium` | 18 m | The canopy's **oculus**, a round opening about 24 m across, left open to the sky |

## References

The photographs are Dave Burk (© SOM) and David Kresses (© May Architecture), via [The Architect's Newspaper](https://www.archpaper.com/?p=338792) and the [SOM project page](https://www.som.com/projects/winship-at-emory-midtown/) (height, storeys, completion).

- **Street view up Peachtree:** the narrow end of the slab, with timber sunshade shelves at every floor and timber louvres on its corners. The long faces are pale glass with dense vertical fins. The low podium carries a screen of white vertical fins.
- **Drop-off view:** the timber canopy with its oculus, the timber-clad hall beside it, the brick wall at the entry and the slender columns along its free edge. The wordmarks are left off.
- **Close view of the narrow end:** two-storey glass bays (the two-storey care communities) with cantilevered sunshades.

## Estimates

- Roof 84 m below the 89 m screen.
- A 6 m lobby, then 16 floors at about 4.9 m, with a floor line every second storey.
- Fin pitch: 1.5 m on the long faces and 3 m on the narrow ends. The podium screen fins sit at 1.6 m, 0.4 m proud of the glass.
- The hall height is the mapped 25.2 m.
- Timber is a muted vertex colour.

## Lighting

There is no full-night exterior. This is an inpatient and research building, so the night view lights about a third of the panes, through skin-kit's `litHash(seedOf(id), face, floor, bay)`. That is more than an office tower and less than housing. The podium storefront is lit, and downlights dot the canopy soffit (an estimate: the photographs are daytime only). The crown stays unlit.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| Campus, looking north-northeast | `530,-1813,32,60,450` | 11:30 AM EST | [Day](day.jpg) |
| Campus | `530,-1813,32,60,450` | 11:30 PM EST | [Night](night.jpg) |
| Narrow end and sunshades, looking north-northwest | `575,-1760,340,62,260` | 11:30 AM EST | [End](end.jpg) |
| Narrow end | `575,-1760,340,62,260` | 11:30 PM EST | [End at night](end-night.jpg) |
| Canopy and oculus (close) | `505,-1805,120,48,110` | 11:30 AM EST | [Canopy](canopy.jpg) |
| Canopy and oculus (close) | `505,-1805,120,48,110` | 11:30 PM EST | [Canopy at night](canopy-night.jpg) |

The bearing is the camera's heading. Use `/?view=city&cam=<camera>&t=2026-11-20T<clock>`. The close views add `&dev&mindist=20`.
