# T Deck (Georgia State University), 29 Peachtree Center Avenue

This is Georgia State's parking deck near Five Points. It replaces the Overture outline `e055f75a-34aa-4c0c-b5c2-8bddedfb58da` (about 7,000 m², mapped at 18.3 m).

## Height and form from the lidar

The 22 April 2019 lidar was sampled on a 6 m grid. It shows:
- a flat top deck at **25.1 m** above grade (ground 313.8 m NAVD88), so the mapped 18.3 m is low;
- stair and elevator cores rising to about 28 m;
- a ramp that falls from 24.8 m to 22.2 m along the east side;
- an **open light well** about 12 × 42 m, down to grade, at x 458–470, z −156…−114.

None of the returns suggest a hidden tower.

## Identifying features

Source: [Street View, 29 Peachtree Center Ave, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75470,-84.38640&heading=330&pitch=15&fov=90), viewed, not copied.

1. Open concrete parking levels: a continuous pale spandrel band at every deck edge over dark openings, with pilasters about 9 m apart.
2. The curved north-east corner, which follows the arc in the outline.
3. A tan stone base with glazed storefronts. The GSU blue film graphics and wordmarks are drawn as plain blue-tinted glazing.
4. The light well, a real void to grade, and the stair cores.

## Lighting

There is no night photo. The storefronts are lit at night. The deck levels are left unlit to avoid the full-face lightbox look.

## Checks

`detachedParts` returns 0 (`t-deck.test.ts`), the well is open to the sky, and `landmark-batch-list.test.ts` passes.

## Captures

| View | Camera | Local time, 20 Nov 2026 | Capture |
|---|---|---|---|
| Curved corner and light well, looking northwest | `452,-127,320,50,450` | 11:30 AM | [Day](day.jpg) |
| Same | `452,-127,320,50,450` | 11:30 PM | [Night](night.jpg) |
| Curved corner and base (close) | `480,-90,320,60,120` | 11:30 AM | [Corner](corner.jpg) |
| Four faces, 450 m | bearings 180/270/0/90 | 11:30 AM | [Four sides](four-side.jpg) |

The bearing is the view heading. The close view adds `&dev&mindist=20`.
