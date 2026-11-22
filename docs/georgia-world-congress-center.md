# Georgia World Congress Center

All **12 numbered exhibit halls and the connecting BC exhibit hall** fit on the downtown board. From the stadium, A is the short eastern wing, B runs north beside the railway, and C follows the western board edge. The exhibit halls within a wing share roof plates. The largest visible breaks are the B/C loading court and the railway between A and B.

| Daylight camera | Previous City | With the exhibition halls |
| --- | --- | --- |
| Across the tracks | [Before](log/ui/congress-center/tracks-before.jpg) | [After](log/ui/congress-center/tracks-after.jpg) |
| Stadium district | [Before](log/ui/congress-center/district-before.jpg) | [After](log/ui/congress-center/district-after.jpg) |

The matched pairs use the stadium from #48. The daylight review frame includes the revised stadium from #49. After deployment, open the paused Map link and select **City**. The map hands City its position, scale and bearing. [Daylight review link](https://atlanta.solomon.io/?view=map&q=high&t=2026-11-20T14:12:45-05:00&speed=0#16.462/33.759818/-84.398587/-18) · [Same view in the production build](log/ui/congress-center/review-daylight.jpg) · [Southern entrances](log/ui/congress-center/plaza-after.jpg)

## Reading the campus

| Building | What appears on the board | Basis |
| --- | --- | --- |
| A | A1–A3 share a pale roof east of the railway. The meeting-room wing steps down the east side. The Sidney J. Marcus Auditorium and the trussed entrance face the southern plaza. | Official plans pp. 5, 7 and 9; A entrance photo. |
| B | B1–B5 run south to north. The southern membrane reads darker than the northern roof. The upper lobby crosses the railway to A, and the Thomas B. Murphy Ballroom has clipped corners. | Official plans pp. 3, 11, 17 and 19; B entrance photo and county aerial. |
| C and BC | C1–C4 share the long western hall roof. A gallery with an upper glazed band and freestanding columns faces Northside Drive. BC joins the northern parts of B and C. The open loading court extends south of BC. | Official plans pp. 21, 23 and 27; C street elevation and county aerial. |

The photo comparison in Orca established the white entrance trusses at A and B and the continuous upper glazing above C's columns. The plans distinguish public lobbies and bridges from the loading court. The aerial supplies the roof breaks, membrane tones and equipment rows. Only the generated City screenshots are included here. [Official floor plans](https://www.gwcca.org/wp-content/uploads/2025/10/GWCC-Floor-Plan-Booklet-10.22.25-compressed.pdf) · [GWCC photo gallery](https://gwcc.com/photo-gallery/) · [A entrance](https://gwcc.com/wp-content/uploads/2026/04/Building-A-Entrance-web-p-1600.jpg) · [B entrance](https://gwcc.com/wp-content/uploads/2026/04/Building-B-Entrance-and-Skyline-web_1-p-1600.jpg) · [C street elevation](https://gwcc.com/wp-content/uploads/2026/04/Building-C-and-MBS-web_2.jpg) · [Fulton County aerial](https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/Imagery/Pictometry2024_NAIP/MapServer/export?bbox=-9396236.07448359%2C3996225.9237660435%2C-9394791.166280419%2C3997309.6958731483&bboxSR=3857&imageSR=3857&size=1200%2C900&format=jpg&f=image)

## Terrain and precision

The baked Overture footprint `46ba7ea2-3735-47a8-b77d-997b486ea866` spans 597.24 × 561.22 m. Its western edge is 10.90 m inside the board. The model clips roof regions to the original 108-vertex exterior and its two interior rings. The larger ring delineates about 10,827 m² of open loading yard and supplies its pavement mask on the terrain. The adjacent Signia footprints retain their existing geometry.

Ground at the loading-yard reference point (−778, −750) is **297.44 m NAVD88** in the 5 m USGS grid. The model samples the foundation perimeter and uses the yard as the common roof-height reference across the sloping site. The source provides one 38.8 m campus height. Individual roof tiers, parapets, canopy spans, dock spacing and equipment sizes are estimates from the plans and photographs. At (−570, −518) the rendered upper lobby clears the DEM by 6.38 m. This is a model-to-ground measurement. Surveyed railhead and structural clearances are unknown.

City registers one static mesh before generic buildings are batched. An absent campus, missing courtyard, mismatched hall footprint or unavailable foundation sample retains ordinary City handling. A web build and deployment pick up the change with the existing downtown bake. The tests sample all thirteen labeled spaces, the two courts, the rail gap and the suspended connector. [Model](../web/src/city/congress-center.ts) · [Geometry tests](../web/src/city/congress-center.test.ts)

## Matched cameras

Open `/?view=city&q=high&t=2026-11-20T14:12:45-05:00&speed=0` in a 1446 × 876 desktop Orca viewport. On a development build, call `__city.lookAt(x, z, {bearing, metresPerPixel, tilt})`.

| Camera | x | z | Bearing | m/px | Tilt |
| --- | ---: | ---: | ---: | ---: | ---: |
| Across the tracks | −705 | −725 | 290° | 0.69 | 46° |
| Stadium district | −725 | −620 | 8° | 1.06 | 26° |
| Southern entrances | −624 | −569 | 342° | 0.45 | 69° |
