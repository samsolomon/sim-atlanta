# Three parking roofs at 99 Gilmer

Georgia State’s directions send drivers to a common entrance on Gilmer Street for S, K and N. The facilities inventory identifies three buildings, with N listed on Piedmont. From above, the shorter S roof sits across a gap from the two long parallel K and N roofs. Each City model follows its own surveyed perimeter. University Lofts and its garage occupy a different block. [Georgia State parking directory](https://parking.gsu.edu/parking/parking-deck-addresses/) · [Gilmer entrance directions](https://efc.robinson.gsu.edu/conferences/directions/) · [Facilities inventory](https://facilities.gsu.edu/files/2026/03/Building_List_03312026.pdf) · [Aerial of the three roofs](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-9393730.964886341,3995334.287259319,-9393448.003696553,3995617.2484491062&bboxSR=3857&imageSR=3857&size=800,800&format=jpg&f=image)

| Deck | Street photographs inspected in Orca, March 2025 | Exterior evidence |
| --- | --- | --- |
| S | [119 Gilmer](https://www.google.com/maps/@?api=1&map_action=pano&pano=Cw3C6-K4LUkRHYxn4pICWw&heading=258.69&pitch=8&fov=88) · [153 Jesse Hill](https://www.google.com/maps/@?api=1&map_action=pano&pano=KnFWgD-7IzQV8CT-EMI3Mw&heading=1.43&pitch=8&fov=88) | The five-level frame has thin slab edges, guard cables and a glazed stair bay on the Jesse Hill side. The older site study also photographed the existing steelwork. [Georgia Tech studio, pp. 50–51](https://repository.gatech.edu/server/api/core/bitstreams/664cad56-5a25-4f7a-ab70-e389215df0b4/content#page=26) |
| K | [80 Jesse Hill](https://www.google.com/maps/@?api=1&map_action=pano&pano=0NI1LBBxDkHxvTvqCe8xHQ&heading=264.43&pitch=8&fov=88) · [152 Decatur](https://www.google.com/maps/@?api=1&map_action=pano&pano=4hMgDsdVzc8iqHXtzuGMKg&heading=61.5&pitch=8&fov=88) | Diagonal steel braces cross the long elevation. The glazed stair end faces Decatur. |
| N | [Along the Decatur sidewalk](https://www.google.com/maps/@?api=1&map_action=pano&pano=LxwQKZVdlwdSoBubvzlMdw&heading=77.91&pitch=8&fov=88) · [Across Decatur](https://www.google.com/maps/@?api=1&map_action=pano&pano=4hMgDsdVzc8iqHXtzuGMKg&heading=11.89&pitch=8&fov=88) | From the street, the stair tower and the neighboring K tower stand apart. The aerial shows more parked cars on N. |

## What the lidar measures

City’s original three footprint rings provide the outlines, heights and level counts. The ground figures below sample the bare-earth grid along each perimeter. Roof quartiles use 2018 returns inside the corresponding polygon, including vehicles. All elevations are metres NAVD88. To estimate the gradients, we compared median roof elevations in small windows on each side of the centerline at 6 m intervals down the long axis. [USGS Georgia B2 lidar](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [USGS bare-earth grid metadata](https://prd-tnm.s3.us-west-2.amazonaws.com/StagedProducts/Elevation/1m/Projects/GA_Statewide_2018_B18_DRRA/metadata/USGS_1M_16_x74y374_GA_Statewide_2018_B18_DRRA.xml)

| Deck and footprint ID | Approximate plan | Ground | Roof Q25 / median / Q75 | Baked roof above foundation |
| --- | --- | --- | --- | --- |
| S · `bdaf3eb3-d438-414b-8fb3-4ca8fff3b752` | 36 × 57 m | 302.8–304.9 | 315.6 / 316.7 / 317.2 (5,190 returns) | 14.6 m, 5 levels |
| K · `1ac40424-9462-48ad-b897-d260ca57dd38` | 35 × 83 m | 303.2–306.9 | 319.5 / 320.3 / 321.0 (7,221 returns) | 18.4 m, 7 levels |
| N · `99b12a07-cc31-4357-bbd6-28e528f5e8a8` | 35 × 82 m | 303.8–306.6 | 319.7 / 320.6 / 321.3 (6,731 returns) | 18.2 m, 7 levels |

S has two long halves. Over 48 m, one side rises from about 316.8 to 317.6 m while the other drops from 316.2 to 315.3 m. The model fits opposing grades of about 2.2%. K’s upper landing is around 321.6 m and N’s around 321.9 m. Both descend toward their ends and expose a lower parking ramp on opposite sides of the central landing. The modeled falls over 27 m are approximately 1.3 m on each upper deck, with a maximum separation from the lower ramp of 2.6 m on K and 2.7 m on N. The fit interpolates between sampled points. Individual curb positions, rail thickness, bay spacing, stair enclosure heights and colors are photographic estimates.

The parked sedans illustrate the difference in occupancy seen in the aerial. S and K have three each and N has ten. The lower ramps and the driving aisles stay clear. Tires and striping follow the local pavement grade. Each wheel has two outer contact points. The geometry test casts rays from those points to the actual parking surface.

## City cameras

High quality in desktop Orca at 1446 × 876, on November 20, 2026 at 14:12:45 EST, speed zero. Before images include the merged arena, Grady Piedmont and GSU M. In the Georgia State train approach the foreground decks screen most of the steelwork. The campus and Decatur views show all three roofs.

| Framing | City target x/z, bearing, metres/pixel, tilt | Captures |
| --- | --- | --- |
| Original rail approach | (749, 400), 55°, 0.23, 72° | [Before](log/ui/gsu-steel-decks/approach-before.jpg) · [After](log/ui/gsu-steel-decks/approach-after.jpg) |
| Across all three roofs | (705, 278), 329°, 0.165, 46° | [Before](log/ui/gsu-steel-decks/roofs-before.jpg) · [After](log/ui/gsu-steel-decks/roofs-after.jpg) · [Same camera at 17:42:45 EST](log/ui/gsu-steel-decks/roofs-dusk.jpg) |
| Decatur stair ends | (684, 306), 28°, 0.116, 69° | [Before](log/ui/gsu-steel-decks/decatur-before.jpg) · [After](log/ui/gsu-steel-decks/decatur-after.jpg) |
| City opening | (−40, −260), 28°, 2.44085, 57° | [Before](log/ui/gsu-steel-decks/opening-before.jpg) · [After](log/ui/gsu-steel-decks/opening-after.jpg) |

Two low oblique inspections on N show the same sedan geometry at different grades. Positions are City x, y, z in metres. The [sloped aisle](log/ui/gsu-steel-decks/slope.jpg) looks from (683.661, −0.381, 263.307) toward (672.671, −1.811, 268.328) at a 55° vertical field of view. The [level landing](log/ui/gsu-steel-decks/landing.jpg) looks from (640.950, −1.410, 297.199) toward (640.787, −2.470, 305.007) at 52°. Both use the daylight clock and a 0.10 m near plane.

The three models contain 1,164, 2,480 and 3,192 triangles respectively, including all 16 cars. City’s opening frame went from 2,158,465 to 2,171,453 submitted triangles (+0.60%) at 145 draws. The close campus view stayed at 61 draws and the rail approach at 85. Deployment needs a web rebuild using the existing City bake.
