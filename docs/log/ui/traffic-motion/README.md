# Fifth Street and Midtown traffic

The before clips replay deployed R14 source `b91f1c0f1445257a82efe56ddba13b1777f49270`. The integrated candidate is `cbef9cf1dd836ac0c1cdfd8bd67907285d22d611`. Both use the same staged data, weekday demand, seed, high tier, 960 × 640 viewport and simulation clock. Each movie frame shows the number of submitted instances in its traffic layer.

| Matched clip | Camera (x, z, bearing, tilt, orbit distance) | November 20, 2026 Eastern | Playback | Layer cap | Submitted per frame, R14 / integrated |
|---|---|---|---|---:|---|
| [Connector at Fifth](fifth.mp4) | 68, −2555, 9, 52, 570 | 17:05:00–17:05:15.75 | 2× | 120 | 6–9 / 8–13 |
| [Northbound brakes](brakes.mp4) | 102, −2438, 0, 70, 135 | same | 2× | 120 | 5–8 / 7–11 |
| [Spring and 10th signal cycle](midtown.mp4) | 222, −3075, 0, 45, 150 | 16:04:58–16:06:25 | 8× | 60 | 2–5 / 1–4 |

## Pinned visibility

Counts below include all submitted road traffic layers. Each submitted instance's actual body mesh was queried at the captured camera and transform, first without depth testing for viewport coverage, then against the rendered scene depth with a small polygon offset for coplanar surfaces. Visible means at least one depth-tested body sample passed. Offscreen means the body produced zero viewport samples. Occluded means it produced viewport samples but none survived depth testing. Counts describe the 3D scene before postprocessing.

| Camera and local time | R14 visible / occluded / offscreen | Integrated visible / occluded / offscreen |
|---|---|---|
| Fifth wide, 17:05:08 | 3 / 0 / 7 | 3 / 2 / 9 |
| Brakes close, 17:05:08 | 0 / 0 / 7 | 1 / 2 / 7 |
| Fifth deck overhead, 17:05:08 | 0 / 0 / 0 | 0 / 2 / 0 |
| Spring near Fifth overhead, 17:05:08 | 1 / 0 / 0 | 1 / 0 / 0 |
| Spring and 10th overhead, 16:05:22 | 4 / 0 / 0 | 3 / 0 / 1 |

The wide candidate frame shows northbound cars in lane 6 on way 316454375 and lane 4 on 119686421, plus a southbound car in lane 1 on 337901434. Each center is within 0.00002 m of its modeled lane path. Numbering starts at the median. Two additional northbound cars occupy lanes 1 and 4 of way 560940891 beneath the Fifth Street deck. The surface car on Spring Street, way 1103152009, is outside the wide frame. Its own overhead shows its center moving from the source axis to 1.55 m left of that axis, the second of four southbound slots. Lane widths and stripe positions are inferred. [Per-instance records](visibility.json) · [Wide diagnostic overlay](overlay-wide.jpg) · [Lower road under deck](overlay-fifth.jpg) · [One-way control](overlay-spring.jpg) · [Two-way control](overlay-spring10.jpg)

## Shared geometry

Six directed OSM ways exercise the pilot. Ground asphalt, divider paint and representative through-course steering consume the segment width and lane offsets. The four same-grade junction arms associate their source ways with crossing points. Marking cutbacks and inferred front-bumper stops use those crossings; turn generation checks the participating arms and directed courses. The existing queue solver consumes the stop stations and its independently timed signal controller. The pilot assigns one representative through slot per permitted direction. Individual curbside parking positions, pavement arrows, stop-bar paint and pedestrian-head coordinates are unknown here. The diagnostic arrows show simulated travel headings. The deck and freeway retain their respective paint and heights. [Actual junction renders](render-spring10.jpg) · [Actual Spring renders](render-spring.jpg) · [Actual deck renders](render-fifth.jpg) · [Seven high-tier bodies](body-details.jpg) · [Body camera targets](body-cameras.json)
