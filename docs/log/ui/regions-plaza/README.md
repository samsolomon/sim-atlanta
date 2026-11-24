# Regions Plaza

Regions Plaza (1180 West Peachtree, completed 2001, formerly Atlantic Center Plaza; Smallwood, Reynolds, Stewart, Stewart) replaces the generic box on `osm:way:269843399`. It is a square, 24-floor office tower: pink granite piers framing paired dark windows, a heavier band every third storey, and notched corners that stop at 84 m. Above them, a cross-shaped top storey has tall round-headed windows and corner pinnacles, under a truncated hip roof with a rail.

**Height basis:** the 22 April 2019 lidar per mapped part. The mapped 94.1 m sits between the measured levels.

| Part | Lidar p50 (p95 / max) | Model |
|---|---:|---|
| Notched corners `…1281`–`…1284` | 84.0–85.1 | 84.4 m |
| Cross wings `…8612`–`…8615`, `…1286` | 96.4–96.8 (to 99.6) | parapet 96.8 m, pinnacles +2.6 m |
| Hip roof `…1278`–`…1280` | 101.4–103.0 (104.7) | slopes to a 104 m deck |
| Crown deck `…1285` | 102.9 (109.2) | rail to 105.2 m; the 109 m returns are rooftop plant, not modelled |

## Evidence

- **Day, from the south:** [Midtown Alliance listing](https://www.midtownatl.com/view/regions-plaza). It shows pale pink granite piers, two dark window panes per bay, a heavier band every three storeys, the arched round-headed top storey, the hip roof with a rail, and the arched entrance in a two-storey granite base. The crown carries the tenant's name sign, which is not drawn (no logos).
- **Night, second angle (from the north-east, elevated):** [Wikimedia Commons, *Atlantic Center Plaza 3 NightPhoto*](https://commons.wikimedia.org/wiki/File:Atlantic_Center_Plaza_3_NightPhoto.jpg). The hip roof is floodlit as one even warm glow, the arched top storey is lit, and the office floors show scattered lit windows.
- **Estimates:** the window module (3.4 m bays, 20 storeys between the base and the corner roofs), the 9.2 m base, the band rhythm, the hip roof's footprint and the size of the pinnacles.

## Model

Everything is vertex colours on `landmarkShell` (batchable, no library surfaces). The shaft uses `litFacade`, so at night about 9% of office windows are lit by `litHash`. The hip roof sits in the lamp mesh, so it glows as one even surface at night, as in the photo.

**Piers:** warm, light granite (`#dcc3ae`), so the pier-and-window rhythm holds on shaded faces. On the shaded west face at 11:30, piers read V 42% against panes at V 12%.

**Glass:** base `#737c86` (HSV S 14%, V 53%). Rendered at 11:30, sunlit panes measure S 12–16%, V 43–46%. Shaded west face: S 20%, V 30%, against a generic glass tower in the same frame at S 35%, V 45%. Panes inside a neighbour's cast shadow read darker navy (S 82%, V 20%).

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Survey start | `304,-3679,32,60,300` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| From the north-west | `290,-3700,120,52,600` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| South face | `304,-3679,0,45,200` with `&dev&mindist=20` | 11:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
