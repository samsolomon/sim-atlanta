# Hanover House

Hanover House (147 15th Street, Colony Square, 1970s) replaces the generic box on `osm:way:536740358`. It is a Brutalist concrete residential slab, about 41 × 24.5 m. Its long faces are a grid of bronze-tinted glass bays and blank concrete panels in an irregular pattern. The end walls are solid concrete with a single window slot, and raked concrete balcony fins run along the base.

**Height basis:** the 22 April 2019 lidar, measured above the median grade (291.3 m NAVD88): roof p50 53.1 m, with parapet and plant up to 55.8 m (max). The mapped 62 m was a guess.

## Evidence

- **Day, the east face:** [Midtown Alliance listing](https://www.midtownatl.com/view/hanover-house-colony-square). It shows the board-formed concrete, the bronze glass bays alternating irregularly with blank panels, the solid end wall with its slot, and the raked balcony fins over the lower storeys.
- **Second angle:** the lidar footprint and the mapped outline place the slab diagonally at Colony Square, with its long faces to the north-east and south-west. Both long faces are modelled the same.
- **Gap:** I found no night photograph. Residential glass bays are lit at about 30% at 23:30 by `litHash`.
- **Estimates:**
  - 14 storeys of 12 bays.
  - About 22% of bays blank concrete. Which bays is set by `litHash` slot 64+, standing in for the irregular pattern.
  - Apron depth 2.2 m over storeys 1–5.

## Model

The model is vertex colours on `landmarkShell` (batchable), under 1,200 triangles on both tiers.

**Glass:** bronze base `#857a6b` (HSV S 20%, V 52%). In sun at 11:30 the panes read S 13–14%, V 40–41%, and the concrete S 26%, V 73%.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| North-west | `906,-3747,300,52,400` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| South-east | `906,-3747,120,52,400` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| Close | `930,-3760,135,30,120` with `&dev&mindist=20` | 11:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
