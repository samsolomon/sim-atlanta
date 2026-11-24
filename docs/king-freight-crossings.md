# CSX over Grant Street and Boulevard SE

At King Memorial the east–west freight yard sits on an embankment. Grant Street SE and Boulevard SE pass beneath it. City’s 5 m bare-earth DEM retains the depressed roads and removes the decks. Laying the ballast directly on that DEM made the tracks descend nearly six metres at Grant.

| Crossing | Federal inventory | OpenStreetMap road | City centre in metres |
|---|---|---|---|
| Grant Street SE | [643081D, CSX, open, RR Over](https://safetydata.fra.dot.gov/officeofsafety/publicsite/crossing/xinglocresults.aspx?Start=61421&n=Previous&numrow=20) | [144588627](https://www.openstreetmap.org/way/144588627), tertiary asphalt, tunnel=yes, layer −1, maxheight 13 ft 5 in | FRA (1377.52, 498.15). The OSM bore runs from (1381.41, 488.14) to (1382.14, 527.43). |
| Boulevard SE | [717928R, CSX, open, RR Over](https://safetydata.fra.dot.gov/officeofsafety/publicsite/crossing/xinglocresults.aspx?Start=61441&n=Previous&numrow=20) | [44062157](https://www.openstreetmap.org/way/44062157), two lanes, secondary asphalt, tunnel=yes, layer −1, maxheight 13 ft 6 in | FRA (1905.42, 286.88), 105 m beyond the board’s eastern edge. |

Both FRA points resolve to NARN arc 454402. At Grant the two mains and six yard tracks continue across the same roof. OSM’s two mains, ways 144595771 and 539939093, carry neither a bridge nor a layer tag through the crossings. The road tunnel tags locate the portals. The OSM maximum heights are mapped vehicle restrictions. Actual minimum soffit clearance remains inferred.

## What is visible from the roads

From 144 Grant St SE, looking north, the south portal has a pale concrete fascia above a steel beam, painted diamond-patterned walls, a double yellow centreline and sidewalks. Daylight is visible at the far end. Small wall lights are visible inside. The city’s downtown transportation plan also identifies the Grant Street tunnel beneath CSX and MARTA as a pedestrian lighting project. [November 2025 Street View](https://www.google.com/maps/@?api=1&map_action=pano&pano=pUggmPvkahW9Ane43xuETA&heading=0&pitch=0&fov=85) · [Downtown Atlanta Transportation Plan](https://www.atlantadowntown.com/_files/docs/downtown-atlanta-transportation-plan-combined-report-opt.pdf)

At Boulevard the entrance has a steel girder under a concrete deck, painted walls and supports, and a pedestrian passage separated from the vehicle lanes. This differs visibly from Grant’s single opening. [May 2025 Street View](https://www.google.com/maps/@?api=1&map_action=pano&pano=V20_F9nUuCK2qxJrK3c8xg&heading=0&pitch=0&fov=85)

A 200 m position search around each FRA point in the 2025 Georgia National Bridge Inventory found no CSX structure record. The nearby structure 000000012104100 carries **Decatur Street** over Boulevard. Its dimensions belong to a separate deck. [FHWA Georgia NBI file](https://www.fhwa.dot.gov/bridge/nbi/2025/delimited/GA25.txt)

## Elevation evidence

The same April 2019 USGS point cloud used for the King Memorial MARTA profile separates the freight roof from the depressed road approaches. The MARTA guideway passes well above both. The figures below are median return elevations in metres NAVD88. Road beneath the opaque roof is interpolated from the portals. [USGS 3DEP EPT metadata](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)

| Sample | Selection in City metres | Returns | Median elevation |
|---|---|---:|---:|
| Grant freight deck | class 17, within 3 m of x 1382, z [496,522) | 198 | 313.67 |
| Grant north road | class 2, same x, z [483,489) | 123 | 307.66 |
| Grant south road | class 2, same x, z [527,533) | 99 | 307.86 |
| Boulevard freight deck | class 17, within 3 m of x 1906, z [287,320) | 448 | 313.56 |
| Boulevard road glimpse north of CSX | class 2, same x, z [272,278) | 8 | 307.69 |

Reproduce with `ept_points` in `pipeline/scripts/king_memorial_corridor.py`. Read a box ±0.00067° around each FRA point, filter x, z and classification as above, and take the median Z. For the NBI check, decode LAT_016/LONG_017 as degrees, minutes and hundredths of seconds and inspect the facilities carried by structures within 200 m.

## City treatment

Only Grant is inside this board. Its continuous rails and sleeper texture use the freight batch from #334. The formation rises back to the lidar top over the hole left by the removed structure. The pavement follows the interpolated road elevation through the portal. The street, sidewalks and centreline are each painted in one continuous stroke from the north approach to the south. The inferred grade feathers into the original terrain at the verges and portal approaches. Traffic samples those same drawn triangles. Girder depth, span width, painted pattern, lamp placement and warm night intensity are illustrative. As at North Avenue, the road has a drawn soffit, daylight at the far portal and continuous material across the deck. The structure shares an existing board draw on both tiers.

The model provides a minimum sampled headroom of 4.21 m. At both tiers a 25 cm lattice returned ground at all 12,561 roadway and sidewalk probes, including 8,636 under the structure. A regression checks a clear 4.10 m envelope across both lanes, plus the paint strokes across both portal joints. On low, the mounted King group has 13 meshes before and after. Counting geometry including instances gives 51,378 triangles before and 49,779 after: the raised ballast also removes terrain cuts that followed the old depression.

Matched City views use camera `1382,525,0,82,60`, high tier, dev minimum distance 5 m, November 20 at 14:00 and 23:00 Eastern.

| | Before | After |
|---|---|---|
| Day | [Grant Street](log/grant-street/before-14.jpg) | [Grant Street](log/grant-street/after-14.jpg) |
| Night | [Grant Street](log/grant-street/before-23.jpg) | [Grant Street](log/grant-street/after-23.jpg) |

The [300 m yard view](log/grant-street/yard-wide.jpg) uses camera `1390,505,0,55,300` and shows the embankment shoulders beside the station and parking lot.

Release requires rebuilding the web bundle and deploying it. The staged data is unchanged.
