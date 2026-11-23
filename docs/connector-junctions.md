# Connected approaches and the Folk Art Park decks

Sam’s first new screenshot shows **Peachtree Street NE**. A matched oblique view puts the glazed tower, the fork in the sidewalk and the curve of the Connector in the same frame. His second screenshot shows **Courtland Street NE at Ralph McGill Boulevard**, where the brick building and parking lot sit beside the deck. The remaining references show **Baker Street NE at Piedmont Avenue NE** and its Quilt Tradition plaza. [Peachtree before](log/ui/connector-junctions/peachtree-before.jpg) · [Peachtree after](log/ui/connector-junctions/peachtree-after.jpg) · [Courtland before](log/ui/connector-junctions/courtland-before.jpg) · [Courtland after](log/ui/connector-junctions/courtland-after.jpg)

## Where the dip came from

A terrain sample at a Peachtree deck corner falls roughly 10.5 m below the surveyed deck. The previous transition used that sample to bend the carriageway and both sidewalks toward freeway level before they reached land. The deck now keeps its surveyed profile through the skew abutment. A separate approach carries the curb and pavement out to a terrain cross-section up to 72 m inland. Its geometry and movement queries use the same triangles. The transition length, retaining faces and approach grading are illustrative. Connected ground-level branches follow the upper street down to their own terrain. Through traffic on the Connector keeps its lower grade. [Capitol ramp](log/ui/connector-junctions/cap-after.jpg) · [Grade regression](../web/src/terrain/bridge-approaches.test.ts)

## Sources and estimates

The two mapped deck outlines measure 9,113 m² at Baker and 8,434 m² at Courtland. The survey fits their crossfall and grade using 14,961 and 12,332 accepted USGS class-17 bridge returns respectively. At City (876.72, −922.69) the Baker roadway renders at approximately 300.13 m NAVD88. Each slab ends at its source footprint. At Baker, both slip lanes meet its pavement and both triangular park parcels sit inside the outline. The through-freeway stays open below. [Baker deck](https://www.openstreetmap.org/way/953207661) · [Courtland deck](https://www.openstreetmap.org/way/875253220) · [USGS Georgia lidar](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Fulton orthophotos of both crossings](connector-bridge-sidewalks.md)

The 2024 orthophotos supply the footprint check and estimated lane widths. The Baker model uses 20.5 m on Piedmont, 15 m on Baker and 6.5 m on the slip lanes. The western Quilt Tradition triangle carries the large and small diamond pavement, a dark open canopy, blocks of seating, a red arcade and a perimeter fence. Sam’s daylight photograph supplies their appearance. Heights, spacing, pattern placement and paint widths are illustrative. Downtown Atlanta identifies both intersections as parts of the existing 1996 Folk Art Park. We found no identifiable site-specific night photograph, so the matched night view uses the City lighting. [Downtown Atlanta](https://www.atlantadowntown.com/go/folk-art-park) · [Western parcel](https://www.openstreetmap.org/way/1455345427) · [Eastern parcel](https://www.openstreetmap.org/way/1455345426) · [Quilt detail](log/ui/connector-junctions/quilt.jpg) · [Night](log/ui/connector-junctions/baker-night.jpg)

## Reproduce the views

Open City with `/?view=city&board=square&q=high&t=2026-11-20T14:12:49-05:00&speed=0`. Apply the camera with `window.__city.lookAt(x,z,{bearing,tilt,metresPerPixel})`. For the matching night camera change the hour to 23.

| View | x, z | Bearing | Tilt | m/pixel |
| --- | --- | ---: | ---: | ---: |
| [Baker oblique](log/ui/connector-junctions/baker-oblique.jpg) | 878, −936 | −38° | 52° | 0.32 |
| [Baker overhead](log/ui/connector-junctions/baker-overhead.jpg) · [Before](log/ui/connector-junctions/baker-before.jpg) | 885, −933 | 0° | 10° | 0.38 |
| Quilt Tradition | 854, −950 | −92° | 50° | 0.13 |
| Peachtree | 563, −1274 | −50° | 48° | 0.23 |
| Courtland oblique | 682, −1163 | −50° | 48° | 0.35 |
| [Courtland overhead](log/ui/connector-junctions/courtland-overhead.jpg) | 672, −1155 | 0° | 8° | 0.40 |

The bundled survey ships with the renderer. For a release rebuild the web bundle. To reproduce the survey, save OSM map extracts for Baker (−84.3845, 33.7605, −84.3800, 33.7641) and Courtland (−84.3866, 33.7634, −84.3830, 33.7658), then run the survey with the two paths in that order. It reads the Georgia lidar through the existing pipeline helper. [Generator and dependencies](../pipeline/prototypes/connector-footprint/junction-survey.py) · [Baked geometry](../pipeline/prototypes/connector-footprint/junction-decks.json) · [OSM attribution](https://www.openstreetmap.org/copyright)
