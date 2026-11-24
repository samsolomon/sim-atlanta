# Luxe

Luxe (222 12th Street, completed 2008) replaces the generic box on `osm:way:269843447`. It is a 22-storey white residential tower with a rounded blue glass corner at 12th Street and the park side, and a recessed balcony slot down the middle of its long faces. It stands over a white-and-grey garage podium with a pool deck on the east.

**Height basis:** the 22 April 2019 lidar. A 6 m grid over the lot shows the tower roof at about 63–72 m above the median grade (279.9 m NAVD88) over x 1048–1096 and z −3430 to −3396, and the podium and deck at 13–16 m. The model puts the roof at 67 m, rooftop plant at 71 m and the podium deck at 13.5 m. The mapped 76 m was a guess.

## Evidence

- **Day, two angles:** the [Apartments.com building listing](https://www.apartments.com/building/luxe-midtown-atlanta-ga/5x39xpm/) has elevated photographs from the south-west and from the park side. They show the white frame, the blue glass corner drum, the recessed balcony slot, and the podium with its pool and cabanas.
- **Entrance:** [Midtown Alliance listing](https://midtownatl.com/view/luxe-midtown), a worm's-eye view of the drum entry and the slot. The building's name sign is not drawn (no logos).
- **Gap:** I found no night photograph. Residential windows are lit at about 30% at 23:30 by `litHash`.
- **Estimates:** the drum's radius (7.2 m) and facet count, the slot width (6 m), the window band module and the pool's position.

## Model

The model is vertex colours on `landmarkShell` (batchable), 1,278 triangles on both tiers: a geometry-lean skin with one glass strip per window run.

**Glass:**
- Window base `#7b8fa5` (HSV S 25%, V 65%). In sun at 14:00 the window bands read S 6%, V 57% (median of the darkest third of the face).
- The drum's photo-backed blue base is `#7a93ad` (S 29%, V 68%). It renders at S 32%, V 60%, inside the 40% photo-backed cap.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Park side | `1072,-3415,20,52,380` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| Start | `1074,-3415,32,60,300` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| 12th Street | `1072,-3415,180,50,420` | 11:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
