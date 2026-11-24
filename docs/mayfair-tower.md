# Mayfair Tower Condominiums

`osm:way:536728181`, 199 14th Street NE, by Piedmont Park. This 30-storey condominium tower was designed by Smallwood, Reynolds, Stewart, Stewart, finished in 1989 and renovated in 2005. ASD|SKY later added the pool deck. Its taller sister, Mayfair Renaissance (2002), is a separate building. City code: `web/src/city/midtown-skyline-mayfair.ts`. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- [Midtown Alliance](https://www.midtownatl.com/view/mayfair-tower-condominiums): 30 floors and 323 units. [CTBUH](https://www.skyscrapercenter.com/building/mayfair-tower-condominiums/20643) gives the architect but 34 floors and 112.8 m. The lidar and other sources contradict both figures.
- Day:
  - [Commons, November 2025](https://commons.wikimedia.org/wiki/File:AMayfairI2511-0978.jpg): today's pale grey-white colour, the corner balconies and the pool podium.
  - [Flickr, 2019](https://www.flickr.com/photos/swampzoid/48932899488/): the earlier taupe and cream colours.
  - [Flickr, 2009](https://www.flickr.com/photos/onset/4177247392/): the cones, lanterns and finials up close, with the dark penthouse and roof terrace.
- Night: Piedmont Park skylines from [2009, at dusk](https://www.flickr.com/photos/fkehren/4113598569/) and [2011](https://www.flickr.com/photos/sayednairb/5559646883/). I identified the tower by its four cones. The cones are unlit; the lanterns glow white under red beacons.
- Height: 3DEP lidar (2019-04-22) reads 90.8 m at the median, 97.0 m at the 95th percentile and 102.2 m at the maximum. The mapped 113 m is 16% too high.

## What City draws

The frame uses City axes, with the origin at the tower centre (City 1005.9, −3588.6).

- **Massing:** the mapped near-square outline, about 36 m a side. The corner bays project 1.6 m.
- **Walls:** pale grey-white walls, `#e1dfd8`, up to a 92 m roof with a white top cornice.
- **Windows:** punched, as one strip per 2.9 m bay with a wall spandrel at each floor.
- **Bands:** white cornice bands every six floors.
- **Balconies:** black iron balconies on every floor, across each corner-bay face.
- **Crown:** four octagonal drums (3 m) and dark green-grey cones over the corner bays, reaching 100.5 m. Each carries a glazed lantern and finial to 102.2 m, the lidar maximum. A dark metal penthouse sits between them.
- **Estimates:** the cone pitch, band spacing and bay width come from the photographs.

The pool podium, gates, pediments and roof terrace are too small or too low to read at City distances.

## Rendered glass (11:30, high tier)

The window base is `#76838c` (S 16%, V 55%), lifted from `#5d676e`, whose sunlit faces rendered at V 32%. Median rendered colour of window pixels, by hue:
- **Sunlit south face:** S 14%, V 45%, within the cap of S ≤ 36% and V ≥ 40% ([south-close.jpg](log/ui/mayfair-tower/south-close.jpg), `cam=1006,-3589,340,50,230`).
- **West face, in shade at 11:30:** S 44%, V 24%. This reading is advisory ([west-close.jpg](log/ui/mayfair-tower/west-close.jpg), `cam=985,-3589,90,40,150`).
- **Generic glass tower in the same frames:** S 38%, V 42% (west frame) and S 9%, V 55% (south frame).

Both sample cameras use `&dev&mindist=20`.

## Night

Condominium windows light at 32%, chosen per window by skin-kit's `litHash(seedOf(id), face, floor, bay)`. The lanterns glow and the cones stay dark, as in the park photographs. City adds no beacons.

## Captures

| View | Camera | Image |
|---|---|---|
| From the north-north-east, before and after, 11:30 | `cam=1006,-3589,210,58,520` | [compare-day.jpg](log/ui/mayfair-tower/compare-day.jpg) |
| Same, 23:30 | same | [compare-night.jpg](log/ui/mayfair-tower/compare-night.jpg) |
| Crown, day and night | same, then `__setView(210,70,825,869,-3351,3)` | [crown-day-night.jpg](log/ui/mayfair-tower/crown-day-night.jpg) |
