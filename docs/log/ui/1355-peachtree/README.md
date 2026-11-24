# 1355 Peachtree

1355 Peachtree replaces the generic box on `osm:way:885332250`. It is a red-brick office tower in a classical manner: three setbacks, each capped by a cream cornice, rising to a pitched crown with pediments and an arched window. Beneath it is a podium of brick wings over a pale limestone base.

**Height basis:** the 22 April 2019 lidar per mapped part (p50 roof). It replaces the floor-count heights.

| Part | Mapped | Lidar p50 (p95 / max) | Role |
|---|---:|---:|---|
| `osm:way:1450754131` | 72 | 74.8 (76.3 / 77.1) | crown tier: eaves 72.6 m, ridge 77.1 m |
| `osm:way:1450754132` | 68.4 | 68.0 | second tier |
| `osm:way:885332247` | 57.6 | 59.9 | third tier |
| `osm:way:1450754134` | 32.4 | 34.9 | podium |
| `…136`, `…137`, `…138` | 32.4 | 38.0, 40.7, 38.3 | podium pavilions |
| `…140`, `…141` | 28.8, 21.6 | 32.4, 28.9 | podium wings |
| `…135` | 21.6 | no clean sample | kept at its mapped height |

The two 3.6 m entrance parts (`…139`, `…142`) are drawn as low limestone blocks.

## Evidence

- **Day, from Peachtree:** [CBRE leasing brochure, March 2024](https://s3.us-east-2.amazonaws.com/media.buildingsondemand.com/sites/9/2024/03/1355-Peachtree-Brochure_v3-UPDATED-MARCH-2024.pdf), cover. It shows red brick with paired white-framed sash windows, cream bands and projecting cornices at each setback, and the crown's pediment with a tall arched window and oculus. The base is limestone, with arched openings at the entrance.
- **Second angle:** the brochure's entrance frame (page 2) shows the limestone base, the balustraded stair and the arched entry. The aerial check is the lidar per part: the stepped roofs and the pitched crown (median 74.8, max 77.1).
- **Gap:** I found no verified night exterior. Offices are mostly dark at 23:30: about one window in twelve, scattered with a seeded random field (no diagonal patterns). No crown lighting appears in any source, so none is modelled.
- **Estimates:** the crown's eave and ridge heights (from the lidar spread), the window module (3.2 m bays, 3.6 m storeys, a 1.5 m sash with a 0.28 m frame), and the 13.2 m limestone base.

## Model

Every surface is a vertex colour on `landmarkShell`'s StaticLandmarkMaterial body and its lamp mesh: brick, limestone, cream cornices, slate crown, window glass and frames. That is deliberate. A library-painted body is a hooked material, which the landmark batcher (#441/#442) can't merge, so it costs its own draw. At the 400 m orbit the brick coursing fades out anyway. The lamp mesh shares the body's shadow flags, so by day the batcher draws both as one (lit windows look like the wall then). Framed windows (glass plus a white frame) are on the podium parts. On the shaft, each window is one quad in a frame-and-glass mean tone. The skin is 3,868 triangles.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Survey start | `599,-4210,32,60,226` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| From the southwest | `599,-4210,60,58,420` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| Peachtree foot | `576,-4197,60,62,140` with `&dev&mindist=20` | 11:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
