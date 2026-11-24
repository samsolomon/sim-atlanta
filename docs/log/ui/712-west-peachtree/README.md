# 712 West Peachtree

712 West Peachtree is a 23-floor office tower completed in 2021 between West Peachtree and Spring Streets. It uses the mapped outline `osm:way:996610147` and its parts. The photographs show a near-square shaft of deep blue reflective glass with dark vertical reveals about 4 m in from each corner. Under the roof are two paler floors, and the base adjoins a grey precast parking deck with an open band on each level. [SKYDB: from Spring Street](https://www.skydb.net/file/750011963/712-west-peachtree-atlanta/), [over the deck](https://www.skydb.net/file/523294996/712-west-peachtree-atlanta/), [with its neighbours](https://www.skydb.net/file/504553608/712-west-peachtree-atlanta/) · [Building facts](https://www.skydb.net/building/447177345/712-west-peachtree/)

## Heights

The tower postdates the 2018 USGS lidar this repo samples, so City keeps the mapped part heights. These are inferred, not measured. The shaft is 88 m (23 floors at about 3.83 m), a core sliver on Spring Street is 60 m, and the parking deck along the north edge is 25.2 m. The skins table marks the height as "post-2019", and the photographs show a flat roof with no crown, so the 88 m roof stands. Gap: no measured height.

## Estimates

The first version was mostly flat navy. The coordinator's review called it a recoloured block, so the shaft now carries the curtain-wall rhythm in geometry:

- **Glass value:** a mid blue-grey (`#66819c`) in plain vertex colour (no library surface, so the body batches), close to its neighbours' value so it doesn't read as a dark hole.
- **Spandrels (estimated):** a 0.9 m grey-blue band at every 3.83 m floor line. The two crown floors use a pale cap colour.
- **Mullion fins (estimated):** a 0.24 m pale fin every 3 m.
- **Corner reveals (estimated):** a 0.9 m dark reveal 4 m in from each end of every mapped edge 16 m or longer, between the first spandrel and the cap.
- **Base and deck transition:** the street faces have a 6 m lobby storey under the first spandrel. Where the north face rises from the deck roof, its first floor is darker glass.
- **Crown:** two paler floors, a 1.3 m pale parapet cap and a 20 × 16 × 4.6 m set-back penthouse.
- **Garage:** one dark open band per 3.2 m deck on the north, east and west faces. In City the north face abuts its neighbour.
- **Lobby:** a glazed band on the West Peachtree (east) face, lit after dark.

## Lighting

I found no verified night exterior (gap). As an office, it is mostly dark at 23:30: about 6% of the 3 m fin bays are lit, chosen by skin-kit `litHash`, and the West Peachtree lobby is lit. This lighting is illustrative.

## Captures

Use `/?view=city&cam=<camera>&t=2026-11-20T<time>-05:00`, clear weather.

| View | Camera | 11:30 AM | 11:30 PM |
|---|---|---|---|
| From the east-south-east, both broad faces | `357,-2258,-75,52,520` | [Day](day.jpg) | [Night](night.jpg) |
| Spec starting camera | `357,-2258,32,60,380` | [Day](start-day.jpg) | [Night](start-night.jpg) |
| Close: the day camera with a 2.4× lens (`&dev`, then `__setView(-75,52,520,357,-2258,2.4)`) | `357,-2258,-75,52,520` | [Close](close.jpg) | |

Glass bases (provisional rules: V ≥ 40%, S ≤ 36%): shaft `#66819c` (S 35%, V 61%), crown floors `#97adc2` (S 22%, V 76%), deck-level transition `#4a5d70` (S 34%, V 44%).
