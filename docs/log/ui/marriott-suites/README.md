# Atlanta Marriott Suites Midtown

The all-suite hotel at 35 14th Street replaces the generic box on `osm:way:269843461`. It is a 19-storey pale rose-beige precast tower with punched windows and a stacked balcony recess, standing over low wings to the south and west and a porte-cochère block on 14th Street, the north side (City's z axis points south). No brand name, logo or brand-coloured canopy is drawn.

**Height basis:** the 22 April 2019 lidar per part, above the median grade (284.8 m NAVD88). The tower roof is 56.4 m (p50), with plant to 59 m, against the mapped 68.4 m. The south wing is about 13 m, the west wing about 6 m and the 14th Street entry block about 7 m.

## Evidence

- **Dusk, the 14th Street front:** the hotel's own exterior photograph on its [photo gallery](https://www.marriott.com/en-us/hotels/atlms-atlanta-marriott-suites-midtown/photos/). It shows the rose-beige precast, the punched windows, the balcony stack over the entry, the projecting bay, and warm, scattered room lighting at dusk.
- **Second angle:** the lidar per part and the mapped outline place the tower's long axis north–south, with the low wings to the south and west and the entry on 14th Street to the north.
- **Gap:** I found no full-night photograph. At 23:30 about 40% of rooms are lit (`litHash`), as a hotel should be, and the lobby glazing is lit.
- **Estimates:** the window module (3.3 m bays, 2.85 m storeys), a single balcony recess per long face, and the plant's size.

## Model

The model is vertex colours on `landmarkShell` (batchable), 1,479 triangles on both tiers.

**Glass:** base `#868e96` (HSV S 11%, V 59%). On the sunlit south and west faces at 11:30, panes read S 12–18%, V 40–43%.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| From the north-east, looking south-west | `477,-3600,200,52,330` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| Start | `480,-3594,32,60,190` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| 14th Street entry | `476,-3615,180,45,110` with `&dev&mindist=20` | 11:30 | [Close](close.jpg) |
| Four sides | `477,-3600,{180,270,0},55,400` and `90,30,400` | 11:30 | [Four sides](four-sides.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
