# Key buildings for the board extensions

Sam is considering extending City north past Buckhead, south to the airport, and possibly east and west. This doc ranks the buildings in each candidate box so he can pick which ones to model. It is a planning list: nothing here is built yet, and the boxes are the streaming agent's rough extents from 2026-11-24. Its final extents will live in `docs/expansion-plan.md`. Every row has an 800 m tile name on the streaming grid (origin x = −1,000, z = −5,700), so the list still works if the boxes are trimmed to tiles.

## How the list was made

- **Candidates:** Overture `2026-11-18.0` buildings inside each box that are at least 20 m tall, have 6 or more floors, are named, or cover at least 4,000 m². That gives north 815, south 1,561, east 632 and west 569. They are listed in [building-skins-extension.csv](building-skins-extension.csv), along with the picks and additions.
- **Score:** the same weights as the [board survey](building-skins.md):
  - height, 40 points
  - footprint, 16
  - proximity to motorways and trunk roads, 10
  - proximity to rail lines, 10 (standing in for MARTA and freight visibility)
  - a mapped name, 7
  - an office, hotel, university, parking, civic or transport class, 5
- **Lidar:** the top 20 per direction and every addition were measured against 3DEP returns from 18–22 April 2019.
  - Two collections are used: `GA_Statewide_B2_2018`, which covers the current board, and `GA_Statewide_B3_2018`, for Buckhead and the east. B2 has no returns over most of Buckhead.
  - Ground is the median class-2 return 3 to 20 m outside the footprint. The roof is the 95th percentile inside it.
  - A mapped height within 10% of the roof or the maximum stands, marked "lidar agrees". Where the lidar shows an empty or rising site, the mapped height stands, marked "post-2019". Otherwise the lidar value replaces the mapped one.
- **Pick column:**
  - **Y** is a key building worth a landmark or routine skin.
  - **F** is fabric: model it as part of a group, or as good generic massing.
  - **N** is not a key building: a warehouse, a parking deck, a big box or a mislabel.
  - Picks rest on the sources found for each row, and are a recommendation for Sam, not a decision.
- **References:** gathered by web search on 2026-11-24. Every URL appeared in search results, but not every page was opened, so check photos in an Orca tab before modelling, as AGENTS.md requires. **I found almost no night photographs.** The exceptions are a dusk photo of Ponce City Market on Commons, HOK's canopy photos of the Domestic Terminal, and the owner's note that Tower Place 100 has green exterior lighting. Treat night evidence as a gap for every other row.

## What the survey shows

- **North is the only box where the formula works.** Buckhead has about 25 towers over 80 m. But **six of its tallest carry podium-only heights in Overture**, so they ranked low until the lidar fixed them:

  | Building | Mapped | Lidar p95 | Lidar max | Reported |
  |---|---|---|---|---|
  | 3344 Peachtree | 16.5 m | 189 m | 194 m | 202.7 m |
  | Waldorf Astoria | 24.4 m | 178 m | | |
  | 3630 Peachtree | 65 m | 131 m | | |
  | Terminus 200 | 24.4 m | 112 m | | |
  | Realm | 24.3 m | 103 m | | |
  | Monarch Tower | 79.2 m | 111 m | | |

  They are listed as additions below. A North extension would need these heights fixed in the pipeline (the same `building_parts` treatment downtown got) before the generic boxes look right.
- **South is dominated by the airport.** Its key buildings, in order:
  1. The 121 m control tower.
  2. The Domestic Terminal and its 2020 canopies.
  3. The concourse family.
  4. The international terminal, whose footprint was not matched.
  5. Center Parc Stadium.
  6. The Porsche headquarters.
  7. Delta's headquarters and its 1940s hangars.

  Half of the top 20 by score are warehouses and parking decks, so pick from the Y rows and the additions.
- **East and West are low-rise.** The formula surfaces big boxes and decks. The keepers are:
  - **East:** Ponce City Market, whose roughly 70 m central tower is missing from the flat 50 m footprint; 725 Ponce; the Carter Center; and the additions (Hotel Clermont's sign, Krog Street Market, the Old DeKalb Courthouse, Fernbank, Agnes Scott Hall).
  - **West:** the Atlanta University Center landmarks (Fountain Hall, Harkness Hall, Sisters Chapel, Rockefeller Hall, the Woodruff Library) and Georgia Tech's Olympic aquatic roof.

  These are recognition picks, not height picks.
- **Data issues to fix before modelling:**
  - The Domestic Terminal may be counted three times (Domestic, North and South Terminal).
  - The Transportation Mall footprint names an underground space.
  - Piedmont Hospital's 2020 Marcus Tower postdates the lidar.
  - Atlanta Medical Center Deck B was probably demolished in 2025.
  - Porsche's 6.6 m and 765 Echo's 14 m are podium heights.
  - The international terminal, Gateway Center Arena and West End station have no matched footprint yet.
  - The Spelman Campbell Center (2025) postdates the lidar.

## North: Buckhead past Lenox and Phipps

City-frame box x −1,000 to 4,600, z −13,300 to −5,700 (rough, from the streaming agent).

| Rank | Building | Overture id | Height, m (basis) | Tile | Pick | Reference | Notes |
|---:|---|---|---|---|:-:|---|---|
| 1 | Salesforce Tower | `37815827` | 130 (mapped; lidar agrees) | tile:5,-6 | Y | [source](https://en.wikipedia.org/wiki/Salesforce_Tower_(Atlanta)) | Dark bronze glass slab with ribbon windows and a chamfered corner; formerly Atlanta Plaza. |
| 2 | Atlanta Financial Center, East Tower | `f1fa50c0` | 82 (mapped; lidar agrees) | tile:4,-6 | Y | [source](https://en.wikipedia.org/wiki/Atlanta_Financial_Center) | Stepped, faceted dark-glass blocks with pyramidal glass caps; bridges GA 400. |
| 3 | Building 1 | `243260b5` | 77 (lidar 2019 p95 (max 106)) | tile:0,-1 | N | [source](https://www.skyscrapercenter.com/building/marcus-tower-at-piedmont-atlanta-hospital/38311) | Piedmont Atlanta Hospital. The 2019 lidar caught the Marcus Tower (2020) under construction; check the height before using it. |
| 4 | Paramount at Buckhead | `93ea588b` | 144 (mapped; lidar agrees) | tile:4,-7 | Y | [source](https://commons.wikimedia.org/wiki/File:The_Paramount_at_Buckhead.jpg) | Tan masonry with corner balcony stacks and a stepped flat top. |
| 5 | Terminus 10 Place | `b48dc0ce` | 104 (lidar 2019 p95 (max 109)) | tile:3,-6 | Y | [source](https://en.wikipedia.org/wiki/Terminus_(office_complex)) | Glass residential slab with a grid curtain wall and a curved wing. |
| 6 | InterContinental Buckhead Atlanta | `84fbc1e8` | 82 (mapped; lidar agrees) | tile:4,-6 | Y | [source](https://www.forbestravelguide.com/hotels/atlanta-georgia/intercontinental-buckhead) | Hotel tower over a broad podium; facade unverified. |
| 7 | Buckhead Grand | `0d2d2729` | 135 (mapped; lidar agrees) | tile:3,-7 | Y | [source](https://en.wikipedia.org/wiki/Buckhead_Grand) | Blue-green glass, a vertical balcony slot and an open steel-truss crown. |
| 8 | Three Alliance Center | `c6794f10` | 122 (mapped; lidar agrees) | tile:4,-7 | Y | [source](https://commons.wikimedia.org/wiki/File:AThreeAllianceCentrBH2510-0389.jpg) | Faceted glass curtain wall with angled pop-out windows. |
| 9 | Park Place on Peachtree | `924052b3` | 128 (mapped; lidar agrees) | tile:1,-4 | Y | [source](https://en.wikipedia.org/wiki/Park_Place_(Atlanta)) | Grey slab with dark ribbon windows between two plain end shafts. |
| 10 | Terminus 100 | `7120570c` | 148 (lidar 2019 p95 (max 148)) | tile:3,-6 | Y | [source](https://www.architectmagazine.com/awards/al-design-awards/2009-al-design-awards-terminus-100-atlanta_o/) | Diagonally cut tower with a translucent glass V crown; the lidar maximum of about 148 m includes the crown. |
| 11 | The Grandview | `4f704dd5` | 98 (lidar 2019 p95 (max 103)) | tile:5,-7 | Y | [source](https://www.skyscrapercenter.com/building/the-grandview/20647) | Residential tower; facade unverified. The mapped 141 m is wrong. |
| 12 | Two Alliance Center | `57fb2d5a` | 118 (mapped; lidar agrees) | tile:4,-7 | Y | [source](https://commons.wikimedia.org/wiki/File:ATwoAllianceCentrBH2510-0390.jpg) | Blue grid glass with a curved blade rising to a cantilevered glass sail. |
| 13 | Tower Place 100 | `81794195` | 122 (mapped; lidar agrees) | tile:3,-6 | Y | [source](https://commons.wikimedia.org/wiki/File:Tower_Place_100.jpg) | Faceted blue-green glass with dark diamond notches near the top. The owner says it has green exterior lighting. |
| 14 | SkyHouse Buckhead | `bbd9eac5` | 87 (lidar 2019 p95 (max 87)) | tile:4,-7 | Y | [source](https://commons.wikimedia.org/wiki/File:ASkyhouseBH2510-0385.jpg) | White frame, teal glass grid and a winged canopy roof. |
| 15 | One Alliance Center | `010e6a28` | 94 (lidar 2019 p95 (max 94)) | tile:4,-7 | Y | [source](https://commons.wikimedia.org/wiki/File:AOneAllianceCentrBH2510-0380.jpg) | Blue glass with spandrel bands and a curved glass top floor. |
| 16 | Atlanta Financial Center, South Tower | `2cd79e0a` | 51 (mapped; lidar agrees) | tile:4,-6 | F | [source](https://en.wikipedia.org/wiki/Atlanta_Financial_Center) | Part of the AFC group; model with the East Tower. |
| 17 | Atlanta Financial Center, North Tower | `84861c9b` | 51 (mapped; lidar agrees) | tile:4,-6 | F | [source](https://en.wikipedia.org/wiki/Atlanta_Financial_Center) | Part of the AFC group; model with the East Tower. |
| 18 | Park Avenue Condominiums | `3eedf5b5` | 152 (lidar 2019 p95 (max 152)) | tile:4,-7 | Y | [source](https://en.wikipedia.org/wiki/Park_Avenue_Condominiums) | Cream concrete with rounded balcony bands, twin rounded shafts and two masts. |
| 19 | Resurgens Plaza | `bd4d183d` | 94 (lidar 2019 p95 (max 99)) | tile:5,-6 | Y | [source](https://www.skydb.net/building/466514932/resurgens-plaza-atlanta) | Postmodern office tower over Lenox MARTA station; facade unverified. |
| 20 | parking | `522d096e` | 109 (mapped; lidar agrees) | tile:4,-7 | N | — | The Three Alliance Center deck, about 20 m (lidar median). The mapped 108.6 m caught the tower beside it. |

**Recognition additions.** These rank lower on the formula but are places a resident would expect to see:

| Building | Matched footprint | Rank in box | Height, m (basis) | Reference | Notes |
|---|---|---:|---|---|---|
| 3344 Peachtree | 3344 Peachtree `e8b37734` (16 m from the approximate point) | 85 | 189 (lidar 2019 p95 (max 194)) | [source](https://en.wikipedia.org/wiki/3344_Peachtree) | Tallest in Buckhead; reported 202.7 m. |
| Waldorf Astoria Buckhead | Waldorf Astoria Atlanta Buckhead `b4b8e9b5` (7 m from the approximate point) | 115 | 178 (lidar 2019 p95 (max 179)) | [source](https://en.wikipedia.org/wiki/Waldorf_Astoria_Atlanta_Buckhead) | Reported 176.8 m. |
| 3630 Peachtree | 3630 Peachtree Road `e686c84b` (5 m from the approximate point) | 52 | 130 (lidar 2019 p95 (max 133)) | [source](https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Atlanta) | Ritz-Carlton Residences; reported 143 m. |
| Terminus 200 | Terminus 200 `ae93895c` (3 m from the approximate point) | 178 | 112 (lidar 2019 p95 (max 115)) | [source](https://en.wikipedia.org/wiki/Terminus_(office_complex)) | Angled-blade office tower. |
| Realm | Realm Condominiums `9bf737a5` (14 m from the approximate point) | 82 | 103 (lidar 2019 p95 (max 114)) | [source](https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Atlanta) | Residential tower; reported 113.7 m. |
| Monarch Tower | Monarch Tower `212ad381` (4 m from the approximate point) | 30 | 111 (lidar 2019 p95 (max 116)) | [source](https://en.wikipedia.org/wiki/List_of_tallest_buildings_in_Atlanta) | Reported 118 m. |
| Lenox Square | Lenox Square `cc35c42c` (96 m from the approximate point) | 49 | 22 (lidar 2019 p95 (max 27)) | [source](https://en.wikipedia.org/wiki/Lenox_Square) | The mall everyone knows. |
| Phipps Plaza | Phipps Plaza `cb113932` (45 m from the approximate point) | 38 | 21 (lidar 2019 p95 (max 26)) | [source](https://en.wikipedia.org/wiki/Phipps_Plaza) | Mall at Peachtree and Lenox. |

## South: West End to the airport

City-frame box x −6,500 to 1,800, z 1,100 to 15,000 (rough, from the streaming agent).

| Rank | Building | Overture id | Height, m (basis) | Tile | Pick | Reference | Notes |
|---:|---|---|---|---|:-:|---|---|
| 1 | ATL West Parking Deck | `1c7bf3ec` | 24 (mapped; lidar agrees) | tile:-7,22 | N | — | Generic airport deck. |
| 2 | Coca-Cola Atlanta Syrup Plant | `7e84ea18` | 37 (lidar 2019 p95 (max 38)) | tile:1,20 | N | — | Industrial plant. |
| 3 | Terminal North Daily | `baca0d5c` | 11 (mapped; lidar agrees) | tile:-5,22 | N | — | Airport deck. |
| 4 | Atlanta Tower | `e081ae2a` | 121 (mapped; no lidar) | tile:-3,22 | Y | [source](https://www.atl.com/about-atl/atl-factsheet/) | FAA control tower, 398 ft (121 m) per ATL; tallest in North America. The airport's vertical landmark. |
| 5 | Concourse T | `0127d531` | 24 (mapped; lidar agrees) | tile:-5,22 | F | [source](https://www.georgiaencyclopedia.org/articles/business-economy/hartsfield-jackson-atlanta-international-airport/) | Part of the Domestic Terminal; model the concourses as one family. |
| 6 | Terminal North Hourly | `a024b1f6` | 13 (estimated; lidar agrees) | tile:-5,22 | N | — | Airport deck. |
| 7 | Packaging Corporation of America | `afac8456` | 9 (mapped; lidar agrees) | tile:-3,15 | N | — | Box plant. |
| 8 | Center Parc Stadium | `82e143ab` | 44 (mapped; lidar agrees) | tile:1,9 | Y | [source](https://en.wikipedia.org/wiki/Center_Parc_Stadium) | Former Olympic stadium and Turner Field, converted for football in 2017; about 24,000 seats. |
| 9 | Domestic Terminal | `74006670` | 18 (lidar 2019 p95 (max 21)) | tile:-5,22 | Y | [source](https://hok.com/projects/view/hartsfield-jackson-atlanta-international-airport-domestic-passenger-terminal-improvements) | Boxy terminal fronted by the 2020 HOK curbside canopies. Check for duplicate footprints with North and South Terminal. |
| 10 | South Hourly | `10998295` | 12 (mapped; lidar agrees) | tile:-5,23 | N | — | Airport deck. |
| 11 | Terminal South Daily | `4b61bbd2` | 11 (mapped; lidar agrees) | tile:-5,23 | N | — | Airport deck. |
| 12 | International Terminal Park-Ride | `604e0771` | 17 (mapped; lidar agrees) | tile:-1,22 | N | — | This is the international terminal's deck, not the terminal (see additions). |
| 13 | South Yard Shops | `8951937d` | 16 (mapped; lidar agrees) | tile:-7,23 | N | — | Probably airline maintenance shops; identity unverified. |
| 14 | Concourse E | `1b064149` | 15 (lidar 2019 p95 (max 16)) | tile:-3,22 | F | [source](https://www.georgiaencyclopedia.org/articles/business-economy/hartsfield-jackson-atlanta-international-airport/) | Concourse family: long low piers with jet bridges. |
| 15 | North Terminal | `dd28005d` | 20 (lidar 2019 p95 (max 22)) | tile:-5,22 | F | — | Probably half of the Domestic Terminal; check for a duplicate. |
| 16 | Americold Logistics | `8db596c2` | 8 (lidar 2019 p95 (max 17)) | tile:-3,14 | N | — | Cold-storage warehouse. |
| 17 | Transportation Mall | `a8fda82b` | 25 (lidar 2019 p95 (max 26)) | tile:-4,22 | N | — | The Transportation Mall is underground, so this footprint is suspect. |
| 18 | South Terminal | `55080606` | 24 (mapped; lidar agrees) | tile:-5,22 | F | — | Probably half of the Domestic Terminal; check for a duplicate. |
| 19 | The Clorox Company - Atlanta Main | `729294b8` | 8 (mapped; no lidar) | tile:1,24 | N | — | Warehouse. |
| 20 | Porsche Cars North America | `bc70f636` | 24 (lidar 2019 p95 (max 25)) | tile:0,21 | Y | [source](https://hok.com/projects/view/porsche-cars-north-america-experience-center-and-headquarters) | HOK headquarters and experience centre with a test track. The mapped 6.6 m looks like a podium; check the massing. |

**Recognition additions.** These rank lower on the formula but are places a resident would expect to see:

| Building | Matched footprint | Rank in box | Height, m (basis) | Reference | Notes |
|---|---|---:|---|---|---|
| Maynard H. Jackson Jr. International Terminal | not matched | — | — | [source](https://corgan.com/projects/atl-maynard-h-jackson-jr-international-terminal) | Curved glass front door (2012). **Footprint not matched**; find its Overture id before modelling. |
| Delta Air Lines HQ | Delta World Headquarters `f7834407` (25 m from the approximate point) | 55 | 30 (mapped; lidar agrees) | [source](https://www.delta.com/content/www/en_US/support/corporate.html) | Delta world headquarters campus. |
| Delta Flight Museum | Delta Flight Museum `a987187f` (178 m from the approximate point) | 82 | 22 (mapped; lidar agrees) | [source](https://www.deltamuseum.org/about-us) | 1941 and 1947 hangars from the original airport. |
| Georgia International Convention Center | Georgia International Convention Center `94f8f85c` (1059 m from the approximate point) | 49 | 16 (lidar 2019 p95 (max 17)) | [source](https://collegeparkga.com/departments/georgia_international_convention_center/arena___gateway_center) | College Park's convention centre. Matched 1 km from its approximate point, so verify. |
| Gateway Center Arena | not matched | — | — | [source](https://en.wikipedia.org/wiki/Gateway_Center_Arena) | Atlanta Dream arena (2019). **Footprint not matched** (the nearest named was a Marriott). |
| Tyler Perry Studios | Cicely Tyson Soundstage (#4) `6fe8b934` (55 m from the approximate point) | 336 | 19 (mapped; lidar agrees) | [source](https://www.ajc.com/news/things-know-about-tyler-perry-studios-atlanta/p0Keh9FxmTRqoJTF8KkNoO) | Twelve soundstages at Fort McPherson; matched one soundstage. |
| Lakewood Amphitheatre | Cellairis Amphitheatre at Lakewood `d29fc2f2` (359 m from the approximate point) | 365 | 19 (lidar 2019 p95 (max 19)) | [source](https://exploregeorgia.org/atlanta/arts-culture/music/lakewood-amphitheatre) | Outdoor amphitheatre (1989). |
| The Wren's Nest | The Wren's Nest `92a3828e` (113 m from the approximate point) | 693 | 21 (lidar 2019 p95 (max 24)) | [source](https://en.wikipedia.org/wiki/Joel_Chandler_Harris_House) | National Historic Landmark; Queen Anne cottage. |
| West End MARTA station | not matched | — | — | [source](https://en.wikipedia.org/wiki/West_End_station_(MARTA)) | Elevated Red/Gold station. **Footprint not matched**; the station structure likely comes from the rail data. |

## East: toward Decatur

City-frame box x 1,800 to 9,500, z −2,600 to 1,100 (rough, from the streaming agent).

| Rank | Building | Overture id | Height, m (basis) | Tile | Pick | Reference | Notes |
|---:|---|---|---|---|:-:|---|---|
| 1 | Ponce City Market | `0547496c` | 44 (lidar 2019 p95 (max 84)) | tile:4,4 | Y | [source](https://en.wikipedia.org/wiki/Ponce_City_Market) | Red brick Sears building with steel windows and a central tower (about 69–71 m reported) that the flat 50 m footprint misses. Dusk photo on Commons: Ponce_City_Market_1.JPG. |
| 2 | 619 Ponce | `32472f84` | 3 (lidar 2019 p95 (max 7)) | tile:4,4 | F | [source](https://www.jamestownlp.com/news/619-ponce-georgia-grown-sustainable-mass-timber-building-debuts-at-ponce-city-market) | Four-storey mass-timber office. |
| 3 | Kroger | `e743aaf7` | 52 (mapped; post-2019, lidar shows site) | tile:4,4 | F | [source](https://en.wikipedia.org/wiki/725_Ponce) | The Kroger at the base of 725 Ponce (12 floors). The mapped heights of this and 725 Ponce look swapped. |
| 4 | Courthouse Parking | `8a212a75` | 13 (lidar 2019 p95 (max 23)) | tile:12,4 | N | — | Decatur deck. |
| 5 | Station R | `7444db93` | 23 (lidar 2019 p95 (max 24)) | tile:6,6 | N | — | Five-storey apartments. |
| 6 | Lowe's | `6b9eeb96` | 9 (lidar 2019 p95 (max 12)) | tile:6,6 | N | — | Big box. |
| 7 | 725 Ponce | `00d3b27a` | 60 (lidar 2019 p95 (max 63)) | tile:4,4 | Y | [source](https://coopercarry.com/?p=5158) | 12-storey office over the Kroger; modern industrial. |
| 8 | The Home Depot | `684b1d00` | 10 (mapped; lidar agrees) | tile:4,3 | N | — | Big box. |
| 9 | Studioplex | `c9485844` | 9 (mapped; lidar agrees) | tile:4,6 | F | — | Converted cotton warehouse from about 1904, on Auburn Ave. |
| 10 | Ford Factory Lofts | `1519a7b5` | 23 (lidar 2019 p95 (max 32)) | tile:4,4 | F | [source](https://en.wikipedia.org/wiki/Ford_Factory_Lofts) | 1914 brick factory, now lofts. |
| 11 | Best Buy | `93cfc1f4` | 8 (lidar 2019 p95 (max 12)) | tile:6,6 | N | — | Big box. |
| 12 | Atlanta Medical Center Parking Deck B | `2a4c08ed` | 24 (lidar 2019 p95 (max 30)) | tile:3,5 | N | — | Probably demolished with the hospital campus by 2025; check it still stands. |
| 13 | Carter Presidential Library | `a244d0b6` | 20 (mapped; lidar agrees) | tile:5,5 | Y | [source](https://en.wikipedia.org/wiki/Jimmy_Carter_Library_and_Museum) | Crescent of low circular drums in the hillside, with a pale stone colonnade and a reflecting pool. |
| 14 | 755 North | `d0517c99` | 25 (mapped; lidar agrees) | tile:4,4 | N | — | Apartments. |
| 15 | Stove Works | `673bad69` | 8 (lidar 2019 p95 (max 12)) | tile:4,6 | F | — | Atlanta Stove Works, Krog St; industrial brick. |
| 16 | Edge on the Beltline | `d304f4dc` | 25 (mapped; lidar agrees) | tile:4,7 | N | — | Apartments. |
| 17 | Decatur High School | `ec598834` | 16 (lidar 2019 p95 (max 24)) | tile:12,4 | N | — | School. |
| 18 | AMC | `b62f4447` | 17 (mapped; lidar agrees) | tile:5,8 | N | — | AMC Madison Yards cinema. |
| 19 | Chase | `7d703331` | 7 (lidar 2019 p95 (max 8)) | tile:6,6 | N | — | Bank pad. |
| 20 | Target | `6ca50682` | 8 (lidar 2019 p95 (max 10)) | tile:6,6 | N | — | Big box. |

**Recognition additions.** These rank lower on the formula but are places a resident would expect to see:

| Building | Matched footprint | Rank in box | Height, m (basis) | Reference | Notes |
|---|---|---:|---|---|---|
| Hotel Clermont | unnamed `ecad93fa` (5 m from the approximate point) | 304 | 20 (mapped; lidar agrees) | [source](https://gardenandgun.com/step-inside-hotel-clermont) | Rooftop neon sign and radio tower (65 ft) on a 5-storey brick hotel; matched an unnamed footprint. |
| Krog Street Market | Krog Street Market `b2f1aac7` (5 m from the approximate point) | 41 | 10 (lidar 2019 p95 (max 18)) | [source](https://en.wikipedia.org/wiki/Krog_Street_Market) | Food hall by the Krog Street Tunnel. |
| Plaza Theatre | Plaza Theatre `82bbb5fc` (18 m from the approximate point) | 301 | 6 (lidar 2019 p95 (max 8)) | [source](https://en.wikipedia.org/wiki/Plaza_Theatre_(Atlanta)) | Neon marquee on Ponce. |
| Old DeKalb County Courthouse | DeKalb County Courthouse `28140c48` (4 m from the approximate point) | 143 | 43 (lidar 2019 p95 (max 45)) | [source](https://dekalbhistory.org/exhibits-dekalb-history-center-museum/historic-courthouse-history/) | Granite neoclassical (1898) on Decatur Square; the lidar maximum includes the dome. |
| Fernbank Museum | Fernbank Museum of Natural History `313725b8` (15 m from the approximate point) | 77 | 17 (lidar 2019 p95 (max 23)) | [source](https://en.wikipedia.org/wiki/Fernbank_Museum_of_Natural_History) | Druid Hills museum. |
| Agnes Scott Hall | Agnes Scott Hall `2c114c73` (5 m from the approximate point) | 276 | 23 (lidar 2019 p95 (max 32)) | [source](https://en.wikipedia.org/wiki/Agnes_Scott_College) | Victorian tower on the Decatur campus. |

## West: toward H.E. Holmes

City-frame box x −7,600 to −1,000, z −2,600 to 1,100 (rough, from the streaming agent).

| Rank | Building | Overture id | Height, m (basis) | Tile | Pick | Reference | Notes |
|---:|---|---|---|---|:-:|---|---|
| 1 | 765 Echo | `ef8af58d` | 22 (lidar 2019 p95 (max 25)) | tile:-1,4 | F | [source](https://rebusinessonline.com/lincoln-property-co-tops-out-300000-sf-office-building-at-echo-street-west-in-atlanta/) | Timber-and-steel spec office, 2024; low recognition. |
| 2 | Public Storage | `c5d8bb6c` | 18 (mapped; lidar agrees) | tile:-1,4 | N | — | Self-storage. |
| 3 | North Avenue Research Area (NARA) | `0a293ecc` | 11 (lidar 2019 p95 (max 11)) | tile:-1,4 | N | — | Area label. |
| 4 | Storehouse Lofts | `13e4c2e0` | 13 (lidar 2019 p95 (max 17)) | tile:-1,8 | F | — | Castleberry Hill warehouse lofts. The point may be south of its address. |
| 5 | West Lumber Lofts | `4a887280` | 9 (mapped; lidar agrees) | tile:-1,8 | F | — | Castleberry Hill fabric. |
| 6 | Technology Enterprise Park | `affad39c` | 28 (lidar 2019 p95 (max 31)) | tile:-1,4 | N | — | Georgia Tech research park, now Science Square. |
| 7 | Morehouse Parking Deck | `aae00468` | 12 (mapped; lidar agrees) | tile:-2,8 | N | — | Deck. |
| 8 | Campus Recreation Center | `a7378a6a` | 34 (lidar 2019 p95 (max 37)) | tile:-1,4 | Y | [source](https://en.wikipedia.org/wiki/Georgia_Tech_Campus_Recreation_Center) | 1996 Olympic aquatic venue with a sweeping curved, solar-panelled roof. |
| 9 | 310 Studios | `b484c619` | 10 (lidar 2019 p95 (max 13)) | tile:-1,8 | N | — | Unidentified. |
| 10 | Campus Recreation Parking Deck | `aa354e7e` | 8 (lidar 2019 p95 (max 24)) | tile:-1,4 | N | — | Mostly below grade. |
| 11 | Wellness Center at Read Hall | `1ac1e5ff` | 15 (mapped; lidar agrees) | tile:-1,8 | N | — | Spelman; low priority. |
| 12 | Albro-Falconer-Manley Science Center | `bad4be64` | 18 (lidar 2019 p95 (max 21)) | tile:-1,8 | F | [source](https://www.spelman.edu/academics/stem-at-spelman/) | Spelman science centre (2001); large but not iconic. |
| 13 | Amélie's French Bakery | `8bf983cc` | 6 (lidar 2019 p95 (max 6)) | tile:-1,4 | N | — | Shop name on a footprint. |
| 14 | Tech Way Building | `2c9d741e` | 7 (mapped; lidar agrees) | tile:-1,4 | N | — | Lab building. |
| 15 | Paloma West Midtown (Building 1) | `d7cb1f6e` | 24 (lidar 2019 p95 (max 29)) | tile:-1,4 | N | — | Apartments. |
| 16 | The Beverly Daniel Tatum Suites | `4d1ad4f6` | 25 (lidar 2019 p95 (max 27)) | tile:-2,8 | N | — | Dorm. |
| 17 | commercial | `c0dc114c` | 10 (lidar 2019 p95 (max 14)) | tile:-1,4 | N | — | Unidentified shed. |
| 18 | 745 Echo | `2955f00d` | 17 (lidar 2019 p95 (max 19)) | tile:-1,4 | N | — | Echo Street West companion building. |
| 19 | Structural Engineering and Materials Research Lab | `8358c862` | 16 (lidar 2019 p95 (max 16)) | tile:-1,4 | N | — | Lab shed. |
| 20 | Zinn Aerospace Combustion Laboratory | `afd6636a` | 11 (lidar 2019 p95 (max 15)) | tile:-1,4 | N | — | Lab shed. |

**Recognition additions.** These rank lower on the formula but are places a resident would expect to see:

| Building | Matched footprint | Rank in box | Height, m (basis) | Reference | Notes |
|---|---|---:|---|---|---|
| Harkness Hall, Clark Atlanta | Harkness Hall `e2eaeae2` (613 m from the approximate point) | 145 | 23 (lidar 2019 p95 (max 29)) | [source](https://artsandculture.google.com/asset/harkness-hall/WAHdwiqye3XgGA) | 1933 administration building with a gilded clock tower. Matched about 600 m from its approximate point, so verify. |
| Fountain Hall, Morris Brown | Fountain Hall `a3a9cdd9` (354 m from the approximate point) | 68 | 23 (lidar 2019 p95 (max 29)) | [source](https://en.wikipedia.org/wiki/Fountain_Hall) | 1882 National Historic Landmark with a steepled clock tower. |
| Sisters Chapel, Spelman | Sisters Chapel `2eda403e` (185 m from the approximate point) | 168 | 17 (lidar 2019 p95 (max 17)) | [source](https://www.spelman.edu/news/2026/07/rough-draft-atlanta-showcases-spelmans-architectural-legacy-and-campus-transformation.html) | Chapel (1927) where King lay in state. |
| Rockefeller Hall, Spelman | Rockefeller Hall `f35bd08f` (82 m from the approximate point) | 90 | 18 (lidar 2019 p95 (max 21)) | [source](https://www.spelman.edu/news/2026/07/rough-draft-atlanta-showcases-spelmans-architectural-legacy-and-campus-transformation.html) | Spelman's oldest building (1886). |
| Mary Schmidt Campbell Center, Spelman | Spelman College Center for Innovation and the Arts `3eaf3f4f` (427 m from the approximate point) | 171 | 1 (lidar 2019 p95 (max 3)) | [source](https://studiogang.com/project/spelman) | Studio Gang, 2025. Post-2019, so the lidar shows the empty site. |
| Graves Hall, Morehouse | Samuel T. Graves Hall `0e0f18d4` (208 m from the approximate point) | 260 | 19 (lidar 2019 p95 (max 28)) | [source](https://morehouse.edu/life/locations/housing/graves-house) | Historic Morehouse residence hall. |
| Robert W. Woodruff Library, AUC | Robert W. Woodruff Library, Atlanta University Center `c562a24a` (171 m from the approximate point) | 72 | 18 (lidar 2019 p95 (max 22)) | [source](https://en.wikipedia.org/wiki/Robert_W._Woodruff_Library,_Atlanta_University_Center) | Shared library of the four AUC colleges. |
