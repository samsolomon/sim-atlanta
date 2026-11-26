# Downtown Connector crossing register

**Open after Step 0, November 25.** Build `1d04eadc` passes 17th Street and north Peachtree on Low and High. Capitol Gateway reproduces both the unsupported walk and the deck/approach kink on each tier. Fixture `439abf84` records the accepted limits. Finish the combined Air 5250 delivery first, including Station/r16 arterial traffic and the Shepherd night correction when ready. Then take ordinary crossings in register order, followed by Capitol Gateway and I-20 as the two interchange projects. Those two table entries retain their visibility ranks. Each rebuild uses the same limits and publishes matched before/after close views. Whenever checker code changes, rerun the full three-site calibration before relying on the new results.

Physical crossings in the City corridor and northern reference area, ordered by estimated visibility. Multiple co-carried streets or paths share a row. The lower mainline search intersects mapped street, rail and link axes with the directed Downtown Connector and checks bridge, cover and layer tags. The southern modeled edge is z=1100. A current Low/High inspection is still due at rows described as checks. Camera links use the local City dev server.

| Priority | Crossing | Finding or acceptance test | View |
|---:|---|---|---|
| 1 | Capitol Gateway, Memorial / Capitol / diagonal roads | Confirmed floating walking strips and kinked roads. Give all upper movements one asymmetric slab and grade the walks into the connected ground. | [City](http://localhost:5173/?view=city&cam=358,777,35,55,430) |
| 2 | I-20 eastbound | 311.1 m at the internal split. Test continuous slab and open lower ramp. | [City](http://localhost:5173/?view=city&cam=190,1018,35,55,430) |
| 3 | I-20 westbound | 310.0 m at the internal split. Trace and test its distinct approaches. | [City](http://localhost:5173/?view=city&cam=204,994,35,55,430) |
| 4 | 17th Street | Reference. Check both full-width ramp mouths, sidewalks and lower envelope. | [City](http://localhost:5173/?view=city&cam=-29,-4186,35,55,430) |
| 5 | Brookwood Peachtree Road | North reference. Confirm the two-span steel structure and separate rail crossing from the lower roadway camera. | [City](http://localhost:5173/?view=city&cam=-249,-4860,35,55,430) |
| 6 | Fifth Street lid | Covered through paths. Verify both portals, landscaped upper walks and train/traffic visibility at the clip. | [City](http://localhost:5173/?view=city&cam=73,-2555,35,55,430) |
| 7 | Georgia State MARTA East Line | Test rail contact and continuity over the lower freeway and feeder movements. | [City](http://localhost:5173/?view=city&cam=736,556,35,55,430) |
| 8 | Georgia State conventional railroad group | Trace the individual track-bearing decks on the Atlanta Terminal alignments and retain the open lower lanes. Shared structures need physical identification. | [City](http://localhost:5173/?view=city&cam=768,532,35,55,430) |
| 9 | Decatur Street SE | Earlier three-piece road and walks replaced by one skew deck. Preserve 3.4/3.0 m walks and test asymmetric landings. | [City](http://localhost:5173/?view=city&cam=859,454,35,55,430) |
| 10 | 10th Street NW | Traffic and deck reference. Verify 3/4 directed lane counts, carriageway continuity and both walk ends. | [City](http://localhost:5173/?view=city&cam=52,-3073,35,55,430) |
| 11 | 14th Street NW | Verify separate three-lane directions, cycle tracks and approaches on the common crossing. | [City](http://localhost:5173/?view=city&cam=41,-3640,35,55,430) |
| 12 | North Avenue NW | Inventory and mapped lane counts differ. Recheck the four mapped travel lanes and the lower-road approaches. | [City](http://localhost:5173/?view=city&cam=124,-1934,35,55,430) |
| 13 | Courtland / Ralph McGill | One common cap. Test both streets, slip, pedestrian parcels and under-deck clearance. | [City](http://localhost:5173/?view=city&cam=682,-1163,35,55,430) |
| 14 | Baker / Piedmont | One common cap. Keep the two slip lanes and Stone Mountain Trail on the surveyed upper slab. Test both freeway mouths. | [City](http://localhost:5173/?view=city&cam=885,-933,35,55,430) |
| 15 | Downtown Peachtree Street NE | Former 10.5 m terrain fall at a corner. Preserve the skew slab, connected approaches and both walks. | [City](http://localhost:5173/?view=city&cam=565,-1279,35,55,430) |
| 16 | Ellis Street NE | Previously corrected 12 cm landing. Confirm physical joint, first metre of grade and 6.120 m lower clearance. | [City](http://localhost:5173/?view=city&cam=1161,-572,35,55,430) |
| 17 | Andrew Young International Boulevard | Prior approach-joint work. Verify full-width end contact on both tiers. | [City](http://localhost:5173/?view=city&cam=1111,-683,35,55,430) |
| 18 | MLK Jr. Drive SE | Two road ways on one 25.5 m deck. Test both walks including the northeast footway. | [City](http://localhost:5173/?view=city&cam=598,624,35,55,430) |
| 19 | Civic Center station / MARTA North Line | Class-17 roof contaminated freeway grade. Preserve the separate exposed-road floor and station support. | [City](http://localhost:5173/?view=city&cam=380,-1404,35,55,430) |
| 20 | West Peachtree Street at Civic Center | Check walking and pavement ownership on the station crossing and free passage underneath. | [City](http://localhost:5173/?view=city&cam=380,-1404,35,55,430) |
| 21 | Ted Turner Drive NW | 21.4 m deck with two 2.6 m walks. Test skew landing and lower clearance. | [City](http://localhost:5173/?view=city&cam=321,-1445,35,55,430) |
| 22 | Spring Techwood Connector | Trace road carried over freeway and the separate location where ramps cross this street. Test both orders independently. | [City](http://localhost:5173/?view=city&cam=243,-1510,35,55,430) |
| 23 | Williams Street | Check the two sides of the freeway and separate the adjacent ramp seams from the street bridge. | [City](http://localhost:5173/?view=city&cam=149,-1571,35,55,430) |
| 24 | Brookwood shared NS / Amtrak | Approved material and clearance control on the northern branch. Preserve both train replays. | [City](http://localhost:5173/?view=city&cam=-320,-4836,35,55,430) |
| 25 | Deering Road | Adjacent road crossing. Inventory 88.7 × 8.5 m. Test two-way carriageway, landings and freeway fork below. | [City](http://localhost:5173/?view=city&cam=-396,-4815,35,55,430) |

## Sam's flagged spots (phase 1, November 25)

These spots were measured on PR #682 head c8e3e34e, both tiers, at 14:00 EST. Full entries, stills and the repair plan are in [Connector repairs](connector-repairs.md). **Calibration on this head:** `--expect combined` passes on Low and High with the 439abf84 limits, byte-identical to 1d04eadc. Export faces only after a warm-up pose: a first-pose export captured a coarse Low board and produced a false 17th failure.

| Repair order | Spot | Signed first failure (Low = High unless noted) | View |
|---:|---|---|---|
| 1 | C. Civic Center lane spikes | North-band node (375, −1425). The drawn surface is 307.0 m against the corrected floor of 294.6 m (+12.40 m), because `underpass-floors.json` overrides `northConnectorGround`. Confirmed: 30 override nodes and 4 rendered peaks. **Repaired** on `samsolomon/connector-c-floors`: (375, −1425) now draws at 294.5 m, the feeder-joint peak is closed. Of the 31 downtown taper candidates, 9 are rejected. The 22 real ones are elevated ramps drawn 1–6 m **low** (MLK SB ramps on their own structure; the Baker exit continuing flyover 38974028), to be drawn as decks with B's stacked-ramp primitive. | [City](http://localhost:5173/?view=city&cam=375,-1425,200,60,300) |
| 2 | A. Sweet Auburn viaduct | Auburn z = −180: adjacent slab treads step +0.488 m at x 1207.85 across a 0.05 m parapet gap. Edgewood z = −60: +0.811 m at x 1179.1. **Repaired** on `samsolomon/connector-a-auburn`: one fused deck, steps ≤ 0.05 m; ramp and NB main carried over Leonard Tate. Was: NB slab 1450889003 started 5.854 m in the air at (1100.81, 244.49). Ramp bridge 1450888999 ends 8.402 m above ground 9239463 at (1087.32, 155.15). | [City](http://localhost:5173/?view=city&cam=1200,-150,150,58,380) |
| 3 | B. Freedom Parkway flyovers | NB 38974038 starts in mid-air at (1045.81, −497.53), 6.864 m above the ground just beyond. Joint 38974034 → 1450884828 steps −0.291 m (High) and −0.307 m (Low). | [City](http://localhost:5173/?view=city&cam=1200,-700,200,55,430) |
| 3 | B. Jackson Street bridge (landmark) | **Repaired** on `samsolomon/connector-b1-jackson`: one measured 18.9 m street deck with a 13.4 m roadway and raised 2.4 m walks (NBI), flush at both ends. Was: a 9.0 m roadway with two 1.95 m walk strips over open 2.05/2.55 m gaps. [Record](jackson-street-bridge.md) | [City](http://localhost:5173/?view=city&cam=1598,-697,250,62,180) |
| 4 | D. Capitol Gateway | Row 1 above, re-measured on both tiers: walk 755543611 at 196.768 mm; joint +74.575 pp with a 158.94 mm step. Also raw DEM point spikes on the cover top at (375, 760) and (460, 760). | [City](http://localhost:5173/?view=city&cam=357,777,-22,56,470) |
| 5 | E. I-20 / Connector | Rows 2–3 and the flyovers below; no new measurement. | [City](http://localhost:5173/?view=city&cam=190,1018,35,52,470) |

**Stacked ramps.** [Movement and elevation register](connector-stacked-ramps.md): 62 Connector ways and 22 crossings, 18 ordered by tracked lidar height. It includes the three-level stack at (1115.8, −591.0).

## Directed flyovers

These OSM axes cross a lower Connector axis in plan and have an upper layer or bridge tag. A source way can occupy only part of a physical structure. Use inventory and imagery to group consecutive spans, confirm order and locate piers before design. Each row needs a full-width signed underside check and a through-vehicle replay.

| Area | Upper source | Camera |
|---|---|---|
| I-20 | [Way 39160303](https://www.openstreetmap.org/way/39160303) | [City](http://localhost:5173/?view=city&cam=193,918,35,55,350) |
| I-20 | [Way 39160308](https://www.openstreetmap.org/way/39160308) | [City](http://localhost:5173/?view=city&cam=138,971,35,55,350) |
| I-20 | [Way 39160309](https://www.openstreetmap.org/way/39160309) | [City](http://localhost:5173/?view=city&cam=184,964,35,55,350) |
| I-20 | [Way 181273020](https://www.openstreetmap.org/way/181273020) | [City](http://localhost:5173/?view=city&cam=122,986,35,55,350) |
| I-20 | [Way 442591112](https://www.openstreetmap.org/way/442591112) | [City](http://localhost:5173/?view=city&cam=159,950,35,55,350) |
| I-20 | [Way 38964506](https://www.openstreetmap.org/way/38964506) | [City](http://localhost:5173/?view=city&cam=32,1095,35,55,350) |
| Downtown ramps | [Way 38974028](https://www.openstreetmap.org/way/38974028) | [City](http://localhost:5173/?view=city&cam=989,-804,35,55,350) |
| Downtown ramps | [Way 38974034](https://www.openstreetmap.org/way/38974034) | [City](http://localhost:5173/?view=city&cam=996,-795,35,55,350) |
| Downtown ramps | [Way 38974058](https://www.openstreetmap.org/way/38974058) | [City](http://localhost:5173/?view=city&cam=1172,-618,35,55,350) |
| Downtown ramps | [Way 38970413](https://www.openstreetmap.org/way/38970413) | [City](http://localhost:5173/?view=city&cam=1156,-659,35,55,350) |
| North-band ramps | [Way 9236719](https://www.openstreetmap.org/way/9236719) | [City](http://localhost:5173/?view=city&cam=251,-1527,35,55,350) |
| North-band ramps | [Way 38976058](https://www.openstreetmap.org/way/38976058) | [City](http://localhost:5173/?view=city&cam=159,-1558,35,55,350) |
| North-band ramps | [Way 38976093](https://www.openstreetmap.org/way/38976093) | [City](http://localhost:5173/?view=city&cam=195,-1607,35,55,350) |

Coverage limits include unnamed or untagged structures and source splits. The aerial and inventory reconciliation, especially the number of Georgia State railway structures and the flyover groupings, remains open. An absent row cannot establish an absent bridge. [Midtown inventory and surveys](midtown-connector.md) · [Downtown bridge footprints](connector-bridge-sidewalks.md) · [Cover and lane survey](connector-south-survey.md)
