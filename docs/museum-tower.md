# Museum Tower at Centennial Hill

`2ff341bc-095f-44d6-8360-b3b8a785295a` (Overture), 285 Centennial Olympic Park Drive. This condominium tower was designed by Smallwood, Reynolds, Stewart, Stewart and completed in 2002, with the Children's Museum of Atlanta on its ground floor. CTBUH lists 24 floors and Apartments.com 25; City draws 25. City code: `web/src/city/museum-tower.ts`, mounted in `city.ts` after the College Football Hall of Fame and added to the downtown batcher's `listed` array. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- [CTBUH](https://www.skyscrapercenter.com/building/museum-tower-at-centennial-hill/15014): the architect, the year and a 94 m architectural height. [greenroofs.com](https://www.greenroofs.com/projects/museum-tower-at-centennial-hill/): Centennial Hill phase I, with an intensive green roof and a rooftop pool.
- Day:
  - [Commons aerial, 2025-11-08](https://commons.wikimedia.org/wiki/File:AMuseumTowerDT2511-0821.jpg): the full tower and the roof box.
  - [Commons, from Pemberton Place, 2019](https://commons.wikimedia.org/wiki/File:Atlanta_Skyline_from_Pemberton_Place,_Atlanta,_GA_(47421271342).jpg).
  - [Commons, street corner, 2019](https://commons.wikimedia.org/wiki/File:Museum_Tower,_Atlanta.jpg) and [the base](https://commons.wikimedia.org/wiki/File:Children%27s_Museum_of_Atlanta,_Georgia.jpg).
- Night: the crown was relit on 2012-10-20 with "25 beams from custom-designed lighting" ([Central Atlanta Progress, archived](http://web.archive.org/web/20131007155138/http://www.atlantadowntown.com/article/museum-tower-has-a-new-look)). The article's photograph shows amber vertical uplight on the piers of the cream top floors. Whether the lighting still runs is unconfirmed.
- Height: 3DEP lidar (2019-04-22) reads ring ground 298.1 m, a roof median of 84.4 m and a 95th percentile of 93.9 m. The mapped 94 m agrees.

## What City draws

Heights are NAVD88.

- **Massing:** the mapped 31 × 38 m rectangle, with 3.5 m chamfered corners for the glass bays.
- **Base:** buff brick to 309.1 m (three storeys), with storefronts under a cream cornice.
- **Shaft:**
  - Red-brown brick, `#8b4c3b`, up to a cream crown band from 372.1 to 383.6 m.
  - Punched windows on a 3 m bay. Window glass `#7d9198`, S 16% V 60%.
  - A thin cream band every four or five floors.
- **Corners:** full-height pale blue-green glass, `#9db6b4` (S 13% V 71%), with a light line each floor.
- **Balconies:** two stacks of concrete balconies with white rails on each face.
- **Roof:** a cream penthouse box over the west third of the roof, rising to 392 m, the lidar 95th percentile. The rest is a planted deck.
- **Estimates:** band spacing, the chamfer, and the penthouse's size and side come from the photographs.

## Rendered glass (11:30, high tier)

Median rendered colour of glass pixels, by hue. All four come from the same close frame: [glass-sample.jpg](log/ui/museum-tower/glass-sample.jpg), `cam=-10,-967,30,58,480`, then `__setView(30,70,465,58,-1086,3)`.

| Sample | S | V |
|---|---:|---:|
| Sunlit face windows | 15% | 51% |
| Corner glass bay | 16% | 54% |
| Shaded face windows (advisory) | 66% | 25% |
| Generic glass building, same frame | 9% | 41% |

## Night

Rooms light at 35% (30% in the crown band), chosen by skin-kit `litHash(seedOf(id), face, floor, bay)`. The penthouse is dark.

- **Crown uplighting (reported, 2012):** the evidence is one photograph, from the [Central Atlanta Progress article on the 20 October 2012 relighting](http://web.archive.org/web/20131007155138/http://www.atlantadowntown.com/article/museum-tower-has-a-new-look), so revisit it if newer night photos appear. City runs amber uplight strips up the crown band's piers, matching that photograph. Whether the lighting still runs today is unconfirmed.

## Captures

| View | Camera | Image |
|---|---|---|
| From the park side (south-west), before and after, 11:30 | `cam=-10,-967,30,58,480` | [compare-day.jpg](log/ui/museum-tower/compare-day.jpg) |
| From the east, before and after, 23:30 | `cam=-10,-967,250,58,480` | [compare-night.jpg](log/ui/museum-tower/compare-night.jpg) |
| Day and night | both cameras | [day-night.jpg](log/ui/museum-tower/day-night.jpg) |
