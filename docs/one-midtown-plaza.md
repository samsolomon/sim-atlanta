# One Midtown Plaza

`osm:way:269637564`, 1360 Peachtree Street. This 14-storey office tower is the sister of Two Midtown Plaza (1986, Smallwood, Reynolds, Stewart, Stewart), and the pair were renovated together by ASD|SKY. City code: `oneMidtownPlaza` in `web/src/city/midtown-skyline-twomidtown.ts`, built by the same function as Two Midtown, with plan data in `fixtures/midtown-skyline/one-midtown-plaza.json`. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- [Midtown Plaza leasing site](https://midtown-plaza.squarespace.com): One Midtown is 14 storeys at 1360 Peachtree. [ASD|SKY](https://www.asdsky.com/interiors-repositioning/one-and-two-midtown): the joint renovation. The drone photograph on the leasing site shows both towers in the same skin. The facade description follows [docs/two-midtown-plaza.md](two-midtown-plaza.md).
- Height: 3DEP lidar (2019-04-22) over 285.9 m ring ground. The straight slab (`osm:way:1451185774`) reads 55.5 m at the 95th percentile, and the rounded part (`osm:way:1456611137`) 49.8 m. OSM maps neither height.

## What City draws

- **Massing:** both mapped parts, each at its own lidar roof.
- **Base:** two storeys of red granite with a pink string course.
- **Glass:** ribbon glass with a maroon band at every floor, in 12 glass bands over the base. The band count is estimated from the 14 floors.
- **Joint shafts:** dark red granite shafts at the two seams where the curve meets the slab. Their positions are estimated.
- **Glass colour:** base `#8c9bab` (S 18%, V 67%), set to meet the rule for new skins. On the sunlit south face at 11:30 it renders S 28%, V 41%. A first try at `#7a93ad` rendered S 47%, over the cap. Two Midtown keeps its merged `#5d82ad` until Sam picks a palette; the held branch moves it to `#6a87a6`.
- **Budget:** under 2,400 triangles. A test holds every vertex within 1.5 m of the footprint, and the shared detachment check finds nothing loose.

## Night

Offices light at about 10%, chosen by skin-kit `litHash`, and the lobby glows. These follow Two Midtown's dusk photographs. I found no night photograph of One Midtown itself.

## Captures

| View | Camera | Image |
|---|---|---|
| From the south, before and after, 11:30 | `cam=482,-4220,0,60,400` | [compare-day.jpg](log/ui/one-midtown-plaza/compare-day.jpg) |
| Same, 23:30 | same | [compare-night.jpg](log/ui/one-midtown-plaza/compare-night.jpg) |
| Four sides by day (checked: nothing floating, missing or z-fighting) | south `482,-4220,0,60,400` · west `517,-4185,90,60,400` · north `482,-4150,180,60,400` · east `447,-4185,270,60,400` | [four-side.jpg](log/ui/one-midtown-plaza/four-side.jpg) |
