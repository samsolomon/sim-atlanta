# Grady Memorial Hospital from the Connector and Jesse Hill Jr. Drive

The original City building was a single 20.69 m extrusion over a 165.18 × 202.31 m bounding box. From the Grady Curve, the jogs in the outline survived, but the four patient wings and the raised E wing disappeared. The replacement uses the main hospital’s 71-vertex perimeter. The separately baked Correll Pavilion and Piedmont Deck stay in the foreground of the Jesse Hill view. [Original City frame](log/ui/downtown-landmarks/grady-before.jpg) · [Grady visitor guide](https://www.gradyhealth.org/patients-and-visitors-guide/) · [Grady campus inventory, pp. 2–3](https://www.gradyhealth.org/wp-content/uploads/HB-321-2D-GHS-REAL-ESTATE-INVENTORY-3.pdf#page=2)

Facing the hospital from Jesse Hill, A is on the right and B on the left. C and D occupy the left and right arms on Pratt Street. E crosses between them. Grady's plan shows the light well, the projecting ward ends and the attached clinical wing. The 1958 hospital was designed for segregation, which accounts for its paired blocks. The later Jesse Hill frontage has its own roofline, two roof pads and a glazed entrance at the Gilmer end. [Emory guide, p. 9](https://med.emory.edu/about/faculty/faculty-development/_documents/emory-at-grady-faculty-onboarding-guide-final1.pdf#page=9) · [Grady sixth-floor plan, sheet GMH-06](https://www.gradyhealth.org/wp-content/uploads/F2023062-Grady-Health-System-OR-PLATFORM-RFP_FinalwExhibits.pdf#page=35) · [SAH architectural history](https://sah-archipedia.org/buildings/GA-01-121-0074)

## Exterior references and dimensions

The photograph from Auburn Pointe shows the buff piers, inset window ribbons and successive roof steps across the freeway. The Jesse Hill elevation has two banks of square panels above the ward windows, a central vertical bay and the Grady name on the crown. Gresham Smith's entrance photograph shows the darker curved glazing and stone corner at pedestrian height. The tower owner's reverse view places Grady across the tracks and freeway. [Connector elevation](https://commons.wikimedia.org/wiki/File:Grady_Memorial_Hospital_viewed_from_the_Veranda_at_Auburn_Pointe_in_downtown_Atlanta.jpg) · [Street elevation](https://commons.wikimedia.org/wiki/File:Grady_Memorial_Hospital,_Atlanta_02.jpg) · [Entrance photograph](https://www.greshamsmith.com/wp-content/uploads/2024/04/28132-grady-hospital-exterior-1800.jpg) · [View across the rail corridor](https://coreycompanies.com/wp-content/uploads/2023/09/CT_back-view-copy-1280x720.jpg)

| Element | Evidence in metres |
| --- | --- |
| Main footprint | Overture ID `b17dc236-2262-42f8-bb5b-f4d1ad993d9a`, OSM way 270880941. Its long street frontage runs at roughly 41° to the City axes. |
| Bare earth | Approximately 302–306 m NAVD88 at the perimeter in City's USGS 3DEP terrain. |
| Ward roofs | Lidar returns around 376–377 m NAVD88, with inner setbacks around 380–381 m. The shorter projections toward Pratt step down to approximately 364 and 361 m. |
| E wing | The crossbar steps from approximately 382 m NAVD88 to 387 m and the highest penthouse roof at approximately 391 m. |
| Other roofs | The Jesse Hill roof returns cluster near 372 m NAVD88. The southern clinic has a main read near 347–348 m and an outer step near 340–341 m. Grady lists 22 floors in the hospital including basement, ground and mechanical levels, and ten in the clinic. |

For the roof readings, project the 2018 B2 EPT returns into City's local equirectangular metres, rotate 41° about (880, 240), and compare upper returns in 5 m cells with the roof breaks in the overhead photograph. Roof elevations in the table are rounded readings. The stepped geometry approximates the return clusters and the OSM building-part outline. Facade bay widths, floor spacing, end piers, pads, hardware, entrance canopy and individual lit rooms are illustrative estimates. All geometry ships in the web build. [USGS B2 point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [OSM hospital](https://www.openstreetmap.org/way/270880941) · [OSM upper part](https://www.openstreetmap.org/way/536753208) · [Esri overhead at Grady](https://www.arcgis.com/apps/mapviewer/index.html?basemap=satellite&center=-84.38207,33.75173&level=19)

## Matched City views

Use a 1446 × 876 Orca viewport, high quality and a paused November 20, 2026 Atlanta clock. Daylight is 14:12:45 and dusk is 17:19:00. On the development build use `__city.lookAt(x, z, {bearing, metresPerPixel, tilt})`.

| Camera | Target (x, z) | Bearing | Scale | Tilt | City frames |
| --- | --- | ---: | ---: | ---: | --- |
| Pratt Street across the Connector | (880, 240) | 270° | 0.34 m/px | 53° | [Before](log/ui/downtown-landmarks/grady-before.jpg) · [Daylight](log/ui/grady/connector-day.jpg) · [Dusk](log/ui/grady/connector-dusk.jpg) |
| Jesse Hill entrance and Correll | (856, 215) | 105° | 0.30 m/px | 66° | [Before](log/ui/grady/jesse-before.jpg) · [Daylight](log/ui/grady/jesse-day.jpg) · [Dusk](log/ui/grady/jesse-dusk.jpg) |
