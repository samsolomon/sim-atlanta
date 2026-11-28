# MARTA stations below grade

Research for "ghost stations": platforms drawn in the ghost style at their real depth beside the tunnels. Researched 2026-11-27. No City code changed. The machine-readable copy, with a confidence on each field and platform and track coordinates, is [underground-stations.json](underground-stations.json).

## Summary

- **20 of MARTA's 38 rail stations are fully or partly below grade**: 7 on the City board, 3 within 1.5 km of it, 8 elsewhere inside I-285 and 2 just outside it. The other 18 are listed [below](#stations-left-out). All 81 rail stop ids in the pipeline output are accounted for.
- **Layouts:** island, side, split-level (Ashby) and two combined ones (Five Points, Lindbergh Center).
- **Five Points has the Spanish solution on both levels**: each has two tracks, a centre platform between them and a side platform outside each. East–west (Blue, Green) is above north–south (Red, Gold).
- **Depth is the main gap.** One station has a published depth (Peachtree Center, 36.6 m). Seven platform levels have a rough terrain estimate. The other levels are unknown.

## How to read this

- **Sourced** means a linked reference or an OSM element states it, or the number is measured from that OSM geometry. **Inferred** (*inf.* below) means we worked it out. **Unknown** means no figure; do not fill it from an OSM `layer` or from City's rail profile.
- These are research confidences, separate from the [truth tiers](data-model.md#truth-tiers). A drawn ghost platform with an estimated or chosen depth should be `inferred` or `illustrative` in the data.
- **Scope:** "On board" is inside the City rows' bounding box (x −1000…1800, z −6500…1100). "Near" is within 1.5 km of it. "I-285" is inside the perimeter highway.
- OSM data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL, read 2026-11-28 UTC. Under ground, OSM geometry is hand-placed and unsurveyed.

## Stations

| Station | Scope | Below grade | GTFS stops (`marta:stop:`) | Platforms | Tracks | Depth or level, m |
| --- | --- | --- | --- | --- | ---: | --- |
| Five Points, B1 upper: east-west | On board | Underground | 908981 EB, 908990 WB | combined: centre + 2 sides | 2 | ≈ 10–13 *(inf.)* |
| Five Points, B2 lower: north-south |  |  | 908986 NB, 908976 SB | combined: centre + 2 sides | 2 | **unknown** |
| Peachtree Center | On board | Underground | 908601 NB, 907842 SB | island | 2 | 36.6 |
| Civic Center | On board | Partly | 908912 NB, 908911 SB | side | 2 | **unknown** |
| North Avenue | On board | Underground | 907914 NB, 907913 SB | side | 2 | **unknown** |
| Midtown | On board | Underground | 908375 NB, 908374 SB | side | 2 | **unknown** |
| Arts Center | On board | Underground | 906369 NB, 906370 SB | island | 2 | **unknown** |
| SEC District | On board | Partly *(inf.)* | 908435 EB, 908694 WB | island | 2 | **unknown** |
| Vine City | Near | Partly | 908958 EB, 908959 WB | island | 2 | ≈ 7–9 *(inf.)* |
| Ashby, upper: westbound | Near | Underground | 908964 WB | split: 1 side *(inf.)* | 1 | **unknown** |
| Ashby, lower: eastbound |  |  | 908963 EB | split: 1 side *(inf.)* | 1 | **unknown** |
| West Lake | I-285 | Open cut *(inf.)* | 908023 EB, 907906 WB | side | 2 | ≈ 6–7 *(inf.)* |
| Lindbergh Center | Near | Open cut | 908055 Gold NB, 908054 Gold SB, 907775 Red NB, 907823 Red SB | combined: island + 1 side | 2 | ≈ 5–7 *(inf.)* |
| Lenox | I-285 | Partly *(inf.)* | 906827 NB, 908717 SB | island | 2 | **unknown** |
| Buckhead | I-285 | Open cut *(inf.)* | 908639 NB, 908718 SB | island | 2 | **unknown** |
| Medical Center | I-285 | Partly *(inf.)* | 908885 NB, 908872 SB | side | 2 | **unknown** |
| Sandy Springs | Outside I-285 | Underground | 907845 NB, 907846 SB | side | 2 | **unknown** |
| East Point | I-285 | Open cut | 908628 NB, 908707 SB | island | 2 | ≈ 7–8 *(inf.)* |
| College Park | I-285 | Open cut | 908599 NB, 907844 SB | island | 2 | ≈ 3–5 *(inf.)* |
| Decatur | I-285 | Underground | 908700 EB, 908475 WB | side | 2 | **unknown** |
| Kensington | I-285 | Open cut *(inf.)* | 908634 EB, 908709 WB | island | 2 | ≈ 7–10 *(inf.)* |
| Indian Creek | Outside I-285 | Partly *(inf.)* | 908515 EB, 908516 WB | island | 2 | **unknown** |

EB, WB, NB and SB are travel directions from the timetable headsigns.

### Depth estimates

Estimated depths are **track bed below neighbouring bare ground** in an open part of a cut, from [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs) point samples. They are not platform-to-street depths. (Peachtree Center's 36.6 m is different: MARTA's figure for the platform below Peachtree Street.) A platform floor sits roughly a metre above the track, and streets can cross above on decks. The sample coordinates are in the JSON. Five Points' upper level uses the open cuts on both sides of the station.

## Platform geometry

Length and width are the bounding size of the OSM platform polygon. Several underground ones are well short of the system-wide **183 m (600 ft)** figure, which comes from [one secondary source](https://www.railway-technology.com/projects/atlantametrorail/); the JSON keeps both. For a ghost, the OSM centre and axis with a 183 m length is a reasonable inferred shape.

| Station and level | OSM platform ways (layer / level) | Length × width, m | Axis | OSM track spacing, m | Centre (lat, lon) |
| --- | --- | --- | ---: | ---: | --- |
| Five Points, B1 upper: east-west | [428067989](https://www.openstreetmap.org/way/428067989) (-1 / -1) | 140 × 17.2 | 125° | 8.7 | 33.753888, -84.391594 |
| Five Points, B2 lower: north-south | [428067988](https://www.openstreetmap.org/way/428067988) (-2 / 2) | 100 × 14.0 | 34° | 6.1 | 33.753790, -84.391686 |
| Peachtree Center | [1034672676](https://www.openstreetmap.org/way/1034672676) (-2 / –) | 140 × 6.0 | 0° | 7.7 | 33.759518, -84.387597 |
| Civic Center | none; tracks [702089817](https://www.openstreetmap.org/way/702089817), [1038378472](https://www.openstreetmap.org/way/1038378472), [702089816](https://www.openstreetmap.org/way/702089816), [1038378471](https://www.openstreetmap.org/way/1038378471) | ≈ 183 *(inf.)* × unknown | 1° | 4.9 | 33.766509, -84.387542 |
| North Avenue | [1038378450](https://www.openstreetmap.org/way/1038378450) (-2 / –)<br>[1038378451](https://www.openstreetmap.org/way/1038378451) (-2 / –) | 137 × 5.4<br>137 × 5.2 | 11° | 5.9 | 33.772599, -84.386997 |
| Midtown | [1050018742](https://www.openstreetmap.org/way/1050018742) (-1 / –)<br>[1050018747](https://www.openstreetmap.org/way/1050018747) (-1 / –) | 167 × 11.2<br>167 × 11.3 | 177° | 5.5 | 33.781041, -84.386316 |
| Arts Center | [1035802257](https://www.openstreetmap.org/way/1035802257) (-1 / –) | 156 × 8.8 | 172° | 11.3 | 33.789222, -84.387335 |
| SEC District | [1034650217](https://www.openstreetmap.org/way/1034650217) (-3 / –) | 188 × 12.8 | 101° | 17.2 | 33.756214, -84.397708 |
| Vine City | [1034650221](https://www.openstreetmap.org/way/1034650221) (-1 / –) | 159 × 11.9 | 87° | 13.3 | 33.756538, -84.404326 |
| Ashby, upper: westbound | none; tracks [319512597](https://www.openstreetmap.org/way/319512597) | ≈ 183 *(inf.)* × unknown | 91° | – | 33.756479, -84.417347 |
| Ashby, lower: eastbound | none; tracks [78090744](https://www.openstreetmap.org/way/78090744) | ≈ 183 *(inf.)* × unknown | 92° | – | 33.756479, -84.417347 |
| West Lake | none; tracks [905879516](https://www.openstreetmap.org/way/905879516), [905879517](https://www.openstreetmap.org/way/905879517) | ≈ 183 *(inf.)* × unknown | 68° | 4.1 | 33.753321, -84.445301 |
| Lindbergh Center | [697038157](https://www.openstreetmap.org/way/697038157) (-1 / -1)<br>[697038158](https://www.openstreetmap.org/way/697038158) (-1 / -1) | 189 × 7.8<br>189 × 8.1 | 13° | 12.3 | 33.822356, -84.369576 |
| Lenox | [1033006340](https://www.openstreetmap.org/way/1033006340) (– / -1) | 174 × 9.5 | 58° | 14.2 | 33.845676, -84.357603 |
| Buckhead | [319512573](https://www.openstreetmap.org/way/319512573) (-2 / -2) | 160 × 7.8 | 154° | 11.9 | 33.849106, -84.368474 |
| Medical Center | [697684974](https://www.openstreetmap.org/way/697684974) (-1 / -1)<br>[697684977](https://www.openstreetmap.org/way/697684977) (-1 / -1) | 183 × 3.5<br>183 × 3.1 | 90° | 4.7 | 33.910762, -84.351521 |
| Sandy Springs | [697640433](https://www.openstreetmap.org/way/697640433) (-2 / -2)<br>[697640434](https://www.openstreetmap.org/way/697640434) (-2 / -2) | 176 × 5.6<br>176 × 5.8 | 122° | 5.2 | 33.932163, -84.351975 |
| East Point | [319512586](https://www.openstreetmap.org/way/319512586) (-1 / -1) | 177 × 8.0 | 16° | 11.5 | 33.677058, -84.440684 |
| College Park | [693625260](https://www.openstreetmap.org/way/693625260) (– / -1) | 183 × 10.2 | 175° | 11.3 | 33.651895, -84.448810 |
| Decatur | [1256234408](https://www.openstreetmap.org/way/1256234408) (– / –)<br>[1256234409](https://www.openstreetmap.org/way/1256234409) (– / –) | 184 × 7.8<br>183 × 6.9 | 90° | 2.1 | 33.774609, -84.295994 |
| Kensington | [319512590](https://www.openstreetmap.org/way/319512590) (– / -1) | 178 × 8.8 | 103° | 13.2 | 33.772659, -84.251887 |
| Indian Creek | [319512563](https://www.openstreetmap.org/way/319512563) (– / -1) | 183 × 8.2 | 92° | 12.1 | 33.769832, -84.229668 |

## Five Points

| Level | Lines | Across the level, from one wall to the other | Evidence |
| --- | --- | --- | --- |
| Upper (B1), east–west, roughly 125° | Blue, Green | side platform · westbound track · **centre platform** · eastbound track · side platform (north to south) | [Wikipedia layout](https://en.wikipedia.org/wiki/Five_Points_station) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · centre platform in the [MARTA 2025 update](https://itsmarta.com/uploadedFiles/More/About_MARTA/20250507_Five%20Points%20RAC%20Update.pdf) |
| Lower (B2), north–south, roughly 34° | Red, Gold | side platform · southbound track · **centre platform** · northbound track · side platform (west to east) | Same, plus the end-on [MARTA section render](https://itsmarta.com/uploadedFiles/MARTA%20Five%20Points_EA_AppendixB.pdf), PDF page 46 |

- Above both: a concourse with the faregates, then the street plaza.
- The compass order of the two tracks is **inferred** from right-hand running and the Wikipedia layout table. The platform arrangement is sourced.
- Wikipedia gives doors opening on the left at the centre platform and on the right at the side platforms, on both levels. We found no source for which side riders are meant to board from.
- **Widths are unknown.** Each OSM polygon (ways [428067989](https://www.openstreetmap.org/way/428067989), 140 × 17 m, and [428067988](https://www.openstreetmap.org/way/428067988), 100 × 14 m) covers a whole level. The MARTA render draws the side platforms wider than the centre one, but it is an illustration, not a measured section.
- OSM puts the track centres 8.7 m apart on the upper level and 6.1 m on the lower. With 3.2 m cars, those leave about 5.5 m and 2.9 m for the centre platform. Treat both as rough.
- The upper level's track is about 10–13 m below the ground at the station (inferred). The lower level's depth is unknown.

## Conflicts with the repo

None of these is a change request yet. Each one affects a ghost station.

1. **City heights are stacking order, not depth.** As [data-model.md](data-model.md#rail-elevation-profiles-downtown) says, −10, −16 and −22 m come from OSM layers. Peachtree Center is drawn at −16 m against a published 36.6 m. Five Points draws a 6 m gap between levels that has no source, with the upper level at −10 m against an estimated 10–13 m. SEC District gets −22 m from `layer=-3`. The ground at the station is about 313 m, and the open track either side is at about 298 m (Vine City) and 310–313 m (Gulch), so −22 m is deeper than either end suggests. Nothing surveys the station track itself.
2. **City's track spacing leaves no room for island platforms.** City draws both tracks 2.1 m either side of one smoothed GTFS centreline (`MARTA_TRACK_OFFSET`, [world.ts](../web/src/vignette/world.ts)), 4.2 m apart, leaving 1.0 m between cars. OSM spacing at the island stations is about 8–17 m. Ghost island and centre platforms need their own track positions, or the tracks must flare at stations.
3. **GTFS stop points are not platform centres.** They sit up to about 180 m along the line from the OSM platform centre (table below). [`berthShift`](../web/src/city/trains.ts) applies only where `setBerths` supplies platform ends, which today means the King Memorial join. Ghost platforms placed from OSM would not line up with timetable dwells without berths for these paths.
4. **City has no tunnel track to put platforms beside yet.** It draws track only where the profile is at or above −5.5 m (`PORTAL_E`). The downtown height profile also stops short of Midtown, so Midtown, Arts Center and every station off the board have none. `midtown-tunnel.json` only drives the "underground" follow message.
5. **Stacked tracks share one line.** At Ashby both directions' GTFS shapes pass the same point, so nothing in the pipeline separates the two levels.
6. **OSM geometry has its own limits.** Decatur's tracks are drawn about 2 m apart, which cars can't fit.

| Station and level | Stop → platform centre, along the platform | City profile height, m |
| --- | --- | --- |
| Five Points, B1 upper: east-west | 908981: 18 m SE, 908990: 36 m NW | -10.0 to -4.0 |
| Five Points, B2 lower: north-south | 908986: 36 m NE, 908976: 17 m NE | -16.0 to -15.2 |
| Peachtree Center | 908601: 147 m S, 907842: 159 m S | -16.0 to -16.0 |
| Civic Center | 908912: 30 m S, 908911: 44 m S | -15.6 to -10.0 |
| North Avenue | 907914: 97 m S, 907913: 128 m S | -16.0 to -10.4 |
| Midtown | 908375: 35 m N, 908374: 23 m N | no profile |
| Arts Center | 906369: 50 m N, 906370: 44 m S | no profile |
| SEC District | 908435: 45 m E, 908694: 39 m E | -22.0 to -22.0 |
| Vine City | 908958: 40 m E, 908959: 29 m E | -22.0 to -5.3 |
| Ashby, upper: westbound | 908964: 2 m E | no profile |
| Ashby, lower: eastbound | 908963: 11 m E | no profile |
| West Lake | 908023: 2 m SW, 907906: 26 m SW | no profile |
| Lindbergh Center | 908055: 128 m N, 908054: 116 m N, 907775: 129 m N, 907823: 124 m N | no profile |
| Lenox | 906827: 67 m SW, 908717: 83 m SW | no profile |
| Buckhead | 908639: 147 m SE, 908718: 163 m SE | no profile |
| Medical Center | 908885: 22 m W, 908872: 34 m W | no profile |
| Sandy Springs | 907845: 100 m SE, 907846: 115 m SE | no profile |
| East Point | 908628: 42 m N, 908707: 8 m S | no profile |
| College Park | 908599: 147 m S, 907844: 180 m S | no profile |
| Decatur | 908700: 62 m E, 908475: 53 m E | no profile |
| Kensington | 908634: 25 m E, 908709: 26 m W | no profile |
| Indian Creek | 908515: 70 m E, 908516: 19 m W | no profile |

The offset gives the direction from the platform centre to the stop point. "City profile height" is the range in `scene.json` within 90 m of the stop. Pipeline data compared: generated 2026-11-26 at commit `81db0d05e`.

The pipeline's GTFS shapes run within about 11 m of every platform centre across the line, except one Lindbergh short turn noted below.

## Station notes

### Five Points

- Sam's recollection is confirmed: both levels have a centre platform and two side platforms.
- Wikipedia calls the east-west level "at-grade below the intersecting elevated street viaducts"; OSM maps it as tunnel=yes, location=underground, and docs/data-model.md says underground. Both fit a level at old rail grade, roofed by streets and plaza.
- Non-revenue interline ways (1453238811, 1453238820) pass the station and are not counted.
- Way 428067988 is tagged layer=-2 but level=2, apparently a tagging slip.
- Depth, B1 upper level, ≈ 10–13 m. Track bed in the open cuts on both sides (Gulch 310.4-313.0 m, east cut 310.9-311.4 m NAVD88) against bare ground at the station (320.5-323.8 m). Assumes the track is near level between the cuts.
- Depth, B2 lower level unknown. No published figure. One level below the east-west platforms.
- Levels: B1 upper: Below the concourse; the upper of the two platform levels. B2 lower: Below the east-west level; crosses it at about right angles.
- Sources: [node 318451223](https://www.openstreetmap.org/node/318451223) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370974347) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 428067989](https://www.openstreetmap.org/way/428067989) · [way 428067988](https://www.openstreetmap.org/way/428067988) · [MARTA 2025 update](https://itsmarta.com/uploadedFiles/More/About_MARTA/20250507_Five%20Points%20RAC%20Update.pdf) · [MARTA section](https://itsmarta.com/uploadedFiles/MARTA%20Five%20Points_EA_AppendixB.pdf) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs) · [east-cut study](five-points-east-trench.md) · [data model](data-model.md)

### Peachtree Center

- The OSM platform (centre 33.7595) is about 150 m north of both GTFS stop points (33.7581). Station entrances in OSM run from 33.7579 to 33.7607, so the platform lies between them. The platform position has no independent survey.
- The mezzanine poster quotes a 900 ft station length. That is the station, not the platform.
- Depth, 36.6 m. MARTA profile: platform 120 ft beneath Peachtree Street. The 1978 MARTA paper says the rock tunnel is 115 ft (35.1 m) below the surface "at the deepest point".
- Levels: Street, mezzanine, platform. Rock cavern in gneiss; deepest MARTA station.
- Sources: [node 4170221445](https://www.openstreetmap.org/node/4170221445) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370810928) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [MARTA profile](https://itsmarta.com/pdfs/Peachtree%20Center%20Station%20Profile.pdf) · [way 1034672676](https://www.openstreetmap.org/way/1034672676) · [MARTA 1978](https://digitalcollections.library.gsu.edu/digital/collection/marta/id/7050)

### Civic Center

- Bridges the Downtown Connector trench under West Peachtree Street: the middle is above the freeway, the platform ends are in tunnel (Wikipedia). OSM maps the two bridge ways (130 m) as layer=1 bridge=yes.
- No platform way. The centreline is the station node projected on the tracks, +/- 91.5 m.
- "Underground" in the usual sense is wrong here: the ghost platform should sit at deck level over the Connector, not in the ground.
- Depth unknown. No published figure. One platform level below West Peachtree Street, above the Downtown Connector.
- Levels: Street; platform level; underpass between platforms; freeway.
- Sources: [node 4172450832](https://www.openstreetmap.org/node/4172450832) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370897022) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [MARTA 1978](https://digitalcollections.library.gsu.edu/digital/collection/marta/id/7050)

### North Avenue

- GTFS stop points are about 100-130 m south of the OSM platform centre.
- Levels: Street, mezzanine, platform.
- Sources: [node 4172450833](https://www.openstreetmap.org/node/4172450833) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370962685) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 1038378450](https://www.openstreetmap.org/way/1038378450) · [way 1038378451](https://www.openstreetmap.org/way/1038378451)

### Midtown

- OSM tags the platforms layer=-1 and covered=yes. The 11 m platform widths look generous and are unchecked.
- Levels: Street, platform (Wikipedia layout table).
- Sources: [way 230593407](https://www.openstreetmap.org/way/230593407) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1379966060) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 1050018742](https://www.openstreetmap.org/way/1050018742) · [way 1050018747](https://www.openstreetmap.org/way/1050018747)

### Arts Center

- A stub for the unbuilt northwest branch leaves north of the station (Wikipedia, weakly sourced).
- Levels: Bridge level, street, mezzanine, platform.
- Sources: [node 4172450835](https://www.openstreetmap.org/node/4172450835) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370790157) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 1035802257](https://www.openstreetmap.org/way/1035802257)

### SEC District

- Sources disagree on the word: Wikipedia "open-cut", nycsubway.org "underground" with the west end briefly at the surface under road bridges, docs/data-model.md "covered" under the Centennial Olympic Park Drive bridge and plaza. All agree the track is below street decks.
- Former names include Omni, Dome/GWCC and GWCC/CNN Center; the GTFS name is SEC DISTRICT STATION.
- Depth unknown. No published figure. OSM layer=-3 is stacking order, not depth.
- Levels: Street, platform.
- Sources: [node 6863551312](https://www.openstreetmap.org/node/6863551312) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1386297290) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [data model](data-model.md) · [way 1034650217](https://www.openstreetmap.org/way/1034650217)

### Vine City

- West end open, the rest under cover (nycsubway.org: about three quarters underground; OSM tunnel ways 905946829/905946830 on the east part).
- Depth, ≈ 7–9 m. Open west end only: the south bank stands 7-9 m above the track bed; the north side is about level with it.
- Levels: Street, platform.
- Sources: [node 7745032438](https://www.openstreetmap.org/node/7745032438) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1371105542) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [data model](data-model.md) · [way 1034650221](https://www.openstreetmap.org/way/1034650221) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

### Ashby

- Tracks are nearly one above the other (about 5 m apart in plan in OSM) and diverge just west of the station.
- No platform way.
- Levels: upper: Upper platform level. lower: Lower platform level.
- Sources: [node 6863544212](https://www.openstreetmap.org/node/6863544212) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370790902) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 319512597](https://www.openstreetmap.org/way/319512597) · [way 78090744](https://www.openstreetmap.org/way/78090744)

### West Lake

- Wikipedia: "two below-grade side platforms". nycsubway.org: "ground level". OSM: tunnel=building_passage over 187 m. The terrain shows a cut.
- No platform way.
- Depth, ≈ 6–7 m. Cut floor against both flanks.
- Levels: Street, platform.
- Sources: [node 4170391718](https://www.openstreetmap.org/node/4170391718) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1380628219) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 905879516](https://www.openstreetmap.org/way/905879516) · [way 905879517](https://www.openstreetmap.org/way/905879517) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

### Lindbergh Center

- Northbound trains open doors on both sides. The side platform was added in 2002.
- The short-turn path marta:path:155225 (Red northbound from here) starts at its GTFS stop, about 123 m north of the platform centre, so it never reaches the platform centre.
- Depth, ≈ 5–7 m. South of the platform centre, where the trench is open.
- Levels: Street and bus level above one platform level in a trench.
- Sources: [node 5346210486](https://www.openstreetmap.org/node/5346210486) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1371274390) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 697038157](https://www.openstreetmap.org/way/697038157) · [way 697038158](https://www.openstreetmap.org/way/697038158) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

### Lenox

- Wikipedia: "open-cut" (also "at-grade"). nycsubway.org: "underground". OSM: tracks tunnel=yes, layer=-1. MARTA's station profile says the Resurgens Plaza was built over the trackway, beside a below-grade bus loop.
- Levels: Street, platform.
- Sources: [node 4172164015](https://www.openstreetmap.org/node/4172164015) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1371273066) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 1033006340](https://www.openstreetmap.org/way/1033006340) · [way 83179427](https://www.openstreetmap.org/way/83179427) · [MARTA profile](https://itsmarta.com/pdfs/Lenox%20Station%20Profile.pdf)

### Buckhead

- In the GA 400 median. Wikipedia says "at-grade"; nycsubway.org has riders descend from the street; OSM tags the platform layer=-2. Weakest status in the table.
- Depth unknown. No figure. Bare-ground samples within 50 m are about level with the platform centre, so they neither show nor rule out a wider highway cut.
- Levels: Street, platform. Stairs down from the street.
- Sources: [node 4172164016](https://www.openstreetmap.org/node/4172164016) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370883748) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 319512573](https://www.openstreetmap.org/way/319512573)

### Medical Center

- Both references say ground level; OSM tags the tracks cutting, layer=-1, and the terrain is a sidehill. Borderline: could be treated as at grade.
- OSM offsets the two platforms about 36 m from each other along the line.
- Levels: Mezzanine above one platform level.
- Sources: [node 4172164017](https://www.openstreetmap.org/node/4172164017) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1373096606) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 697684977](https://www.openstreetmap.org/way/697684977) · [way 697684974](https://www.openstreetmap.org/way/697684974) · [way 697684980](https://www.openstreetmap.org/way/697684980) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

### Sandy Springs

- North of I-285.
- Levels: Street, mezzanine, platform (nycsubway.org).
- Sources: [node 5195035485](https://www.openstreetmap.org/node/5195035485) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370894929) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 697640433](https://www.openstreetmap.org/way/697640433) · [way 697640434](https://www.openstreetmap.org/way/697640434)

### East Point

- OSM tags the tracks tunnel=yes, layer=-1 through the platform; the terrain shows open trench beyond a covered middle.
- Depth, ≈ 7–8 m. Open trench at one end of the platform.
- Levels: Street, platform in a trench.
- Sources: [node 4172450829](https://www.openstreetmap.org/node/4172450829) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1376980489) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 319512586](https://www.openstreetmap.org/way/319512586) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

### College Park

- The platform is narrower at the north end (nycsubway.org). OSM tags the tracks building_passage over most of it.
- Depth, ≈ 3–5 m. Weak: two samples near one end.
- Levels: Street, platform.
- Sources: [node 4172450830](https://www.openstreetmap.org/node/4172450830) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370898256) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 693625260](https://www.openstreetmap.org/way/693625260) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

### Decatur

- OSM draws the two tracks only about 2 m apart, closer than the 3.2 m car width, so its tunnel geometry is rough here.
- OSM ref tags put stop 908475 on the north platform and 908700 on the south, offset about 45 m along the line.
- Depth unknown. No published figure. 1978 MARTA paper: platforms one level below the Church Street entrance.
- Levels: Street, mezzanine, platform (Wikipedia). Station roof raised above ground to carry a pedestrian mall (1978 paper).
- Sources: [node 8140627609](https://www.openstreetmap.org/node/8140627609) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370903903) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [MARTA 1978](https://digitalcollections.library.gsu.edu/digital/collection/marta/id/7050) · [way 1256234408](https://www.openstreetmap.org/way/1256234408) · [way 1256234409](https://www.openstreetmap.org/way/1256234409)

### Kensington

- Wikipedia says "at-grade"; nycsubway.org and the terrain show a trench; OSM tags cutting.
- Depth, ≈ 7–10 m. Open ends of the trench.
- Levels: Bus level above one platform level in a trench.
- Sources: [node 4172459856](https://www.openstreetmap.org/node/4172459856) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1375477333) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 319512590](https://www.openstreetmap.org/way/319512590) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

### Indian Creek

- Just east of I-285. nycsubway.org: "ground level/trench"; Wikipedia: "at-grade"; OSM level=-1.
- Levels: Mezzanine above one platform level.
- Sources: [node 4172459857](https://www.openstreetmap.org/node/4172459857) · [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1375476193) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [way 319512563](https://www.openstreetmap.org/way/319512563) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs)

## Stations left out

| Station | GTFS stops | Why not | Sources |
| --- | --- | --- | --- |
| Georgia State | 908696, 908618 | Covered by the Floyd Building and platform canopies, but not below grade (open or elevated track either side). Side platforms, 2 tracks. City already draws it. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370980266) · [data model](data-model.md) |
| King Memorial | 908436, 908693 | Elevated. City already draws it. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1379257112) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Garnett | 908600, 907843 | Elevated; the north end faces the tunnel portal toward Five Points. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1380778792) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| West End | 908704, 908705 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370798188) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Oakland City | 908301, 908302 | Above grade, on embankment. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370964376) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Lakewood-Fort McPherson | 908629, 908706 | Above grade, on embankment (OSM building_passage is the roof). | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1384061271) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Airport | 908695, 906647, 906837 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1369752926) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Hamilton E. Holmes | 907933, 907907 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1371014058) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Bankhead | 907960, 907961 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1387249397) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Inman Park-Reynoldstown | 908437, 908692 | At grade. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1377787453) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Edgewood-Candler Park | 908699, 908476 | At grade (nycsubway.org) or elevated (Wikipedia). | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370912381) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| East Lake | 908566, 908567 | At grade. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1386102283) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Avondale | 908438, 908691 | At grade by both references. Terrain puts the tracks up to about 8 m below ground beside the station, so a viewer might read it as a shallow cut. See [avondale-layout.md](avondale-layout.md). | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1377790458) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) · [USGS 3DEP](https://epqs.nationalmap.gov/v1/docs) |
| Brookhaven-Oglethorpe | 908186, 908187 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370883121) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Chamblee | 908603, 908604 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370891123) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Doraville | 908845, 908862 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370908071) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| Dunwoody | 908047, 908051 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1370910092) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |
| North Springs | 907766, 908480 | Elevated. | [Wikipedia](https://en.wikipedia.org/w/index.php?oldid=1379768379) · [nycsubway.org](https://www.nycsubway.org/wiki/Atlanta,_Georgia) |

## Gaps

- Platform-to-street depth for every station but Peachtree Center. MARTA as-built profiles or station sections would close this; a records request is the likely route. We found none online.
- Platform widths everywhere, and a per-station platform length from MARTA.
- No OSM platform way for Civic Center, Ashby or West Lake.
- Individual platform outlines at Five Points.
- Status wording is disputed at SEC District, Lenox, Buckhead, Medical Center, West Lake, Kensington and Indian Creek.
- The Wikipedia pages are the main layout reference and are only partly cited themselves. nycsubway.org is old enthusiast text that predates later renovations.
