# The M by Radius

`osm:way:536899754`, 1080 West Peachtree Street at 12th Street. This 23-storey, 320-unit apartment slab was built in 2012–13 for Novare Group and Batson-Cook as SkyHouse Midtown. RADCO bought it in 2022 and renamed it. City code: `web/src/city/midtown-skyline-mradius.ts`, with plan data in `fixtures/midtown-skyline/m-by-radius.json`. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- [Patch, 2012](https://new.patch.com/georgia/midtown/skyhouse-midtown-reaching-for-finish): construction began in January 2012, with opening in January 2013 and the roof deck "230 feet above street level". [Midtown Alliance](https://midtownatl.com/view/the-m-by-radius) gives the address. [GlobeSt, 2022](https://www.globest.com/2022/02/17/radco-acquires-atlanta-high-rise-multifamily-for-131m) covers the sale and rename. The architect is not confirmed; Smallwood, Reynolds, Stewart, Stewart designed the SkyHouse series ([CTBUH, SkyHouse South](https://www.skyscrapercenter.com/building/skyhouse-south/15702)).
- Photographs: [a daytime aerial of the tower and crown](https://assets.aptamigo.com/GA/Atlanta/Apartment/the-m-by-radius/ext00.jpeg), [the arched crown up close](https://assets.aptamigo.com/GA/Atlanta/Apartment/the-m-by-radius/amt24.jpeg), the roof deck and stair towers, and [Urbanize's 2024 aerial](https://atlanta.urbanize.city/node/24415). I found no night photograph that identifies it.
- Height: 3DEP lidar (2019-04-22), six years after opening. The roof edges read 77 m at the 95th percentile, and the crown and stair towers 78.4 m at the maximum. The mapped 90.1 m is 15% too high.

## What City draws

The frame uses City axes, with the origin at the slab centre (City 302.4, −3420).

- **Massing:** the mapped tower part (`osm:way:1464967894`) with its serrated bays, up to a 76.5 m roof. The one-storey west wing (`osm:way:1429394327`) stands at its mapped 8 m.
- **Glass:** floor-to-ceiling pale blue-green glass, `#93aeb0` (S 17% V 69%).
- **Piers and floors:** light silver aluminium piers about every 3.5 m, running full height and 1.2 m past the roof. A slab edge each floor and glass balcony rails on the long bays.
- **Base:** shopfront glass with blue awnings at the street.
- **Crown:** the arched SkyHouse crown screen in light grey with a teal edge, centred on the south face (v 12.1) and spanning 26 m to the 78.4 m crown. Two stair and lift towers stand on the roof deck.
- **Estimates:** the pier spacing, and the arch's span, rise and face, come from the listing photographs.

## Rendered glass (11:30, high tier)

Median rendered colour of glass pixels, by hue, from [the north-west view](log/ui/m-by-radius/compare-day.jpg) (`cam=230,-3460,300,55,450`):

| Sample | S | V |
|---|---:|---:|
| Sunlit west face | 21% | 42% |
| Shaded south face (advisory) | 39% | 32% |
| Generic glass tower, same frame | 46% | 44% |

## Balcony fix (2026-11-24)

As first opened, each glass balcony rail was a plate 0.55 m off the slab edge, with nothing joining it back. #562's detachment check found 253 detached parts, the worst 0.43 m off. Each rail now stands on a balcony floor that runs back to the wall, and the check finds none. At City distances the gap is under a pixel; the [before, after and amplified difference](log/ui/m-by-radius/balcony-fix.jpg) shows where the geometry changed.

## Recognition audit (2026-11-24)

The audit flagged The M as borderline at 450 m: faint piers, and the arch not showing.
- **From the south, where the arch is:** 1072 West Peachtree (228 m) stands directly south and hides The M, arch included, at 400–600 m from bearings 330°, 0° and 30° ([0°](log/ui/m-by-radius/south-occluded-0.jpg), [330°](log/ui/m-by-radius/south-occluded-330.jpg), [30°](log/ui/m-by-radius/south-occluded-30.jpg), `cam=302,-3440,<bearing>,55,500` at 15:30). Taller generic boxes also close in on the north and west. From most sides it is a hemmed-in building, not a plain one.
- **Clearest exposure:** the north-west. There the [listing aerial](https://assets.aptamigo.com/GA/Atlanta/Apartment/the-m-by-radius/ext00.jpeg) shows the light aluminium piers as the facade's strongest lines, so the piers are now 0.7 m wide (from 0.5 m) and light silver, `#dfe2e3` (from `#c9ccce`). The triangle count is unchanged. The arch's curved edge is visible from that side. [Before and after at 450 m](log/ui/m-by-radius/piers-audit.jpg)

## Night

Apartments light at 34%, chosen by skin-kit `litHash(seedOf(id), face, floor, bay)`. With no night photograph, City adds no crown lighting.

## Captures

| View | Camera | Image |
|---|---|---|
| From the north-west, before and after, 11:30 | `cam=230,-3460,300,55,450` | [compare-day.jpg](log/ui/m-by-radius/compare-day.jpg) |
| From the south, with the arched crown | `cam=302,-3491,0,55,450` | [compare-south.jpg](log/ui/m-by-radius/compare-south.jpg) |
| Afternoon, 15:30, with the west face sunlit | `cam=230,-3460,300,55,450` | [afternoon.jpg](log/ui/m-by-radius/afternoon.jpg) |
| Night, 23:30 | `cam=230,-3460,300,55,450` | [compare-night.jpg](log/ui/m-by-radius/compare-night.jpg) |
