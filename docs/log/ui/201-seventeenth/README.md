# 201 17th Street

`osm:way:269542287`, Atlantic Station. This is a 17-storey Class A office building completed in 2007. Code: `web/src/city/201-seventeenth.ts`.

## Sources

| What | Source |
|---|---|
| 17th Street front, Dec 2025: a double-height colonnade of white round columns, a recessed glass lobby, a white soffit, then light-blue reflective curtain glass with pale spandrel lines at each floor | [Street View, 201 17th St](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79120,-84.39467&heading=0&pitch=30&fov=100) (viewed in an Orca tab, not copied) |
| North-east corner, Mar 2025: the same glass and floor lines, a thin vertical mullion rhythm and the colonnade wrapping the corner | [Street View, Commerce St](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79190,-84.39400&heading=220&pitch=22&fov=90) |

**Recognition (coordinator rule, 2026-11-24).** The photos show a fairly plain light-blue curtain wall, so the glass colour is not pushed off generic. The building is identified by its colonnade, its floor lines and the raised central spine, all from the photos and the lidar. The lead confirmed this approach.

## Heights

April 2019 3DEP lidar, above the 276.2 m NAVD88 ground ring. The slab part `1562299333` has a median of 72.6 m, and the central spine `1562299331` measures 77.1 m. Both match the mapped heights (72 m and 77 m). The two 4 m end canopies measure 5.6 m.

## Estimates

- **Floors:** about 3.9 m each above a 9 m lobby. Spandrels are 0.55 m deep; mullions are paired at about 4.5 m.
- **Colonnade:** posts about 9 m apart on the wall line, 0.9 m wide, under a 1 m white soffit. The lobby glass is recessed 1.8 m.
- **Glass:** `#8aa6bd`. Rendered sunlit at 11:30 high tier from `-284,-4215,0,72,200` with `&dev&mindist=20`, it reads H 198, S 23, V 66, inside the sunlit rule.
- **Materials:** flat vertex colours, because a library surface is a hooked material that is not batched.

## Lighting

About 5% of offices are lit at 23:30, chosen with the shared `litHash`. **Gap:** no night photograph. Everything is `illustrative`.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| South-east three-quarter, day / night / low tier (money shot) | `-284,-4187,330,62,420` | 11:30 / 23:30 / 11:30 `&q=low` |
| Four sides at 400 m ([sheet](four-sides.jpg)) | `-284,-4187,{0,90,180,270},64,400` | 11:30 |
| Colonnade on 17th Street (close) | `-284,-4215,0,72,200` with `&dev&mindist=20` | 11:30 |
