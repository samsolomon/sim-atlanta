# Two Midtown Plaza

`osm:way:269636880`, 1349 West Peachtree Street. This 1986 office tower is by Smallwood, Reynolds, Stewart, Stewart & Associates, and it is the sister of 14-storey One Midtown Plaza. City code: `web/src/city/midtown-skyline-twomidtown.ts`, with plan data in `fixtures/midtown-skyline/two-midtown-plaza.json`. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- [Midtown Alliance](https://midtownatl.com/view/two-midtown-plaza) and the [leasing site](https://midtown-plaza.squarespace.com) say 20 storeys. [Steinhart](https://jimsteinhart.com/v/USGA/GAAP911.HTM) and [Atlanta Leasing](https://www.atlantaleasing.com/?p=2833) say 17. The photographs show two granite storeys and 15 glass bands, so City follows them. The [Atlanta History Center record](https://dlg.usg.edu/record/geh_byd_2148) names the architect.
- Day: the [Steinhart photograph](https://jimsteinhart.com/i/USGA/GAAP911.JPG) shows the curved end, the granite shaft and the straight wing.
- Dusk: the [Klotz photograph, 2009](https://www.atlantaleasing.com/wp-content/uploads/2014/11/Two-Midtown-Plaza.jpg) shows the curved end with its lobby drum lit. ASD|SKY's [renovated entrance at dusk](https://www.asdsky.com/interiors-repositioning/one-and-two-midtown) shows the red granite piers and the glazed lobby.
- Height: 3DEP lidar (2019-04-22) puts the straight slab (`osm:way:1451185773`) at 78.1 m at the 95th percentile and the half-round end (`osm:way:1456611136`) at 73.2 m. Neither SkyscraperPage nor CTBUH lists a height.

## What City draws

City draws the two mapped parts at their lidar roofs. Both have a 9 m base of red granite with a pink string course. Above it, reflective ribbon glass (`#8c9bab`, shared with One Midtown Plaza) runs up 15 storeys of 4.3 m each, with a thin maroon band at every floor and a granite top band. These figures are estimated from the floor count. Two dark red granite shafts, 4.4 m wide, mark where the curve meets the slab and rise 1 m above the slab roof. Their positions are estimated from the day photograph.

Two details are simplified. City draws the lobby glazing flush rather than the recessed colonnade and drum. The plaid granite inlay and the canopy are too small to read at City distances. The parking deck beside the tower is a separate mapped building that City leaves unchanged.

## Night

Offices light at 10% at 23:30, an estimate. Under the half-round end, the glazed lobby drum is lit, as in both dusk photographs. I found no full-night photograph, and no evidence of crown or facade lighting, so City adds none.

## Captures

| View | Camera | Image |
|---|---|---|
| From the north-west, before and after, 11:30 | `cam=395,-4194,135,52,380` | [compare-day.jpg](log/ui/two-midtown-plaza/compare-day.jpg) |
| Same, 23:30 | same | [compare-night.jpg](log/ui/two-midtown-plaza/compare-night.jpg) |
| From West Peachtree to the west | `cam=390,-4194,70,42,300` | [west-day.jpg](log/ui/two-midtown-plaza/west-day.jpg) |

**Glass, matched with One Midtown Plaza (2026-11-24).** Sam asked for one photo-backed glass on both sisters. The leasing site's 2026 drone photograph of the pair after the ASD|SKY renovation ([twilight drone](https://images.squarespace-cdn.com/content/v1/5fea1dc4dd8c772bce48f9be/1784734181310-NU2S5FW0BH9703RX3A5L/1349-w-peachtree-drn-twi0983.jpg)) shows both in the same mirror glass, reading H202–219, S11–35, V56–62. The strong blue of the pre-renovation Steinhart photograph (S64) is the sky in the mirror. Both towers now use `#8c9bab`: Two Midtown's sunlit curve renders S9 V54 at 11:30 (it was S59 V57 with `#5d82ad`), and One Midtown's sunlit south renders S28 V41. Both are within the sunlit rule. [Day](log/ui/one-midtown-plaza/glass-match-day.jpg) · [night](log/ui/one-midtown-plaza/glass-match-night.jpg), `cam=482,-4220,0,60,400`.
