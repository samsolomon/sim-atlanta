# 400 Colony Square

The second original Colony Square office tower, at Peachtree and 14th, replaces the mapped parent `osm:way:536737549` and its parts. The parent id is unchanged. It shares 100's module in `colony-square.ts`: a white precast shaft punched with dark windows, a recessed lobby on corner piers, a blank band and a core. It differs in its longer plan, its parapet ring and its two-level core.

## Registration and heights

The registration uses the April 2018 lidar (USGS EPT; ground median 296.1 m NAVD88), sampled on a 2 m grid in the 45° frame.

- The roof is a 38 × 55.5 m rectangle at a uniform 83.3 m. Its centre (796.8, −3752.8) is about 1.5 m off the mapped shaft part `osm:way:1451518632`, on the southeast side.
- The 88–90 m returns that looked like a podium question are two things. One is a parapet ring about 86–89 m along the north and west edges. The other is the core: 91.2 m over an 11 × 8 m block and 89.9 m over the 11 × 6 m block south of it, matching core part `osm:way:1414724134`.
- The returns up to 88.8 m inside low part `osm:way:1414724136` are spill from the tower's edge, so that part and the other low parts stay at their mapped 7.8 m and 3.9 m. They are drawn as pale bases with street glazing, each on its own ground.
- The generated residual `podium` part (86.2 m in the data) lies inside the drawn shaft and is not drawn separately.

## References

- [Wikimedia Commons, dbking, 2007](https://commons.wikimedia.org/wiki/File:Colony_Square.jpg): the tower from the street. It shows the white grid of punched windows, about 19 bays on the broad face, the blank band and the roof equipment.
- [Wikimedia Commons, AtlChampion, 2025](https://commons.wikimedia.org/wiki/File:AColonySq1002511-0966.jpg): the same family of facade on 100 Colony Square, from a second angle.
- [Lead's Colony Square research](https://github.com/samsolomon/sim-atlanta/blob/fee824c6/docs/research/colony-square.md) and the [Urbanize night walk, January 2022](https://atlanta.urbanize.city/post/photos-wandering-reborn-colony-square-midtown-landmark), which shows scattered lit office floors and bright entries. The holiday displays are left out.

## Estimates

- 20 window floors at 3.6 m above a 7.8 m lobby, with the band up to the roof.
- 2.5 m bays: 22 on the long faces and 15 on the short faces. Piers are 1.2 m and spandrels 2.3 m, the same as 100.
- The parapet is 2.7 m tall and 0.6 m thick, drawn all round. Lidar sees it best on the north and west edges.

## Lighting

Everyday office night: about 6% of windows lit warm, from the shared mixed hash with a different seed from 100. The lobby and base glazing are lit, and the crown and parapet stay dark. There is no ordinary-season full-night photograph; only holiday-season images were found, and that gap is recorded here.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| Starting camera, looking north-northeast | `794,-3754,32,60,282` | 11:30 AM EST | [Day](day.jpg) |
| Starting camera | `794,-3754,32,60,282` | 11:30 PM EST | [Night](night.jpg) |
| Whole tower, looking north-northeast | `794,-3754,32,60,560` | 11:30 AM EST | [Wide](wide.jpg) |
| Whole tower | `794,-3754,32,60,560` | 11:30 PM EST | [Wide at night](wide-night.jpg) |
| Roof, parapet and core, looking south-southwest | `794,-3754,200,62,480` | 11:30 AM EST | [Crown](crown.jpg) |
| Colony Square cluster, looking east-northeast | `800,-3710,70,50,1021` | 11:30 AM EST | [Cluster](cluster.jpg) |
| Colony Square cluster | `800,-3710,70,50,1021` | 11:30 PM EST | [Cluster at night](cluster-night.jpg) |
| South corner and grid (close) | `790,-3790,0,66,130` | 11:30 AM EST | [Corner](corner.jpg) |

The bearing is the camera's heading. Use `/?view=city&cam=<camera>&t=2026-11-20T<clock>`. The close view adds `&dev&mindist=20`.
