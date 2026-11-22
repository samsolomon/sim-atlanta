# Raised porches on Irwin Street NE

The King Memorial preview contains 34 mapped building envelopes. Eighteen carry only the generic OSM building tag, twelve are apartments, two are commercial and two are parking. The adjacent Sweet Auburn preview has 179 envelopes, including 98 generic buildings, 32 houses, 17 apartments and five terraces. Marchon, the Pencil Factory and the Edgewood commercial row already have individual treatments. A survey of Irwin and Gartrell streets turned up a smaller recurring form with enough evidence to model three examples on one block. [King context](../../../../pipeline/prototypes/king-memorial/context.json) · [Sweet Auburn context](../../../../pipeline/prototypes/sweet-auburn/context.json) · [Gartrell streetscape, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&pano=9Q1V5thjpbieXogJVdTYfg&heading=354&pitch=4&fov=94)

## Which houses

From Irwin Street, looking south in November 2024, three low houses stand above the street behind covered porches. Their width and spacing agree with the archived OpenStreetMap row and the October 2023 USDA NAIP image. The oblique roof traces and street camera positions distinguish the three fronts from their two-story neighbors. Panorama address labels can refer to the camera's position. The IDs below identify the footprints used in City. [Aerial with the three outlines](registration.jpg) · [USGS image record 41283](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/41283) · [OpenStreetMap contributors and ODbL](https://www.openstreetmap.org/copyright)

| OSM way, west to east | Visible in the street photograph | City treatment |
|---|---|---|
| [270493826](https://www.openstreetmap.org/way/270493826) | Gray-green siding, overlapping front gables, pale trim, small paired attic sash, porch beneath the smaller gable. [Street photograph](https://www.google.com/maps/@?api=1&map_action=pano&pano=IF_pZHq1qbWiFro784wyvw&heading=180&pitch=4&fov=94) | Recessed partial-width porch, front steps, two gables and high sash. |
| [270493832](https://www.openstreetmap.org/way/270493832) | Two overlapping light gables above a broad porch with square piers and a low, continuous projecting roof. Part of the street photograph is obscured. [Street photograph](https://www.google.com/maps/@?api=1&map_action=pano&pano=PoE27D29l6KWPM-sCldJPw&heading=180&pitch=4&fov=94) | Two front gables, shallow shed roof and wider porch piers. The mapped rear wall steps out on the east. |
| [270493845](https://www.openstreetmap.org/way/270493845) | Red siding, dark hipped roof, wide porch, short hipped dormer with a band of small lights. [Street photograph](https://www.google.com/maps/@?api=1&map_action=pano&pano=lYN-5prUfouHaDyUhzM_hQ&heading=180&pitch=4&fov=94) | Four-sided main roof and dormer, pale posts and recessed front openings. |

The map supplies the footprints. The photographs supply the front forms. Porch depth (2.35 m), deck height, eaves, roof pitch, colors, stairs and rear-wing roof are illustrative. Side and rear openings use a schematic sash and service-door pattern. Trees obscure some roof surfaces. The photographs do not establish an architectural date, a rear entrance layout or all the openings. The model omits garden walls, plantings and individual fences. [All twelve model elevations](elevations.jpg)

## Inspect in City

Run `pnpm data:sweet-auburn` after the normal data setup, then `pnpm dev`. Open `/?view=city&east=king-memorial&north=sweet-auburn&q=high&t=2026-11-20T10:15:00-05:00&speed=0`. In the City console, run the following calls in order, allowing each section to appear before the next call.

```js
__city.lookAt(1500, 500)
__city.lookAt(1463, -399, { bearing: 172, metresPerPixel: .108, tilt: 53 })
```

The finish uses the existing building and lit-glass batches in the opt-in Sweet Auburn module. Existing staged data can be reused. For a release with the preview, stage both east packs with `pnpm data:sweet-auburn`, rebuild with `pnpm build`, and deploy the resulting static assets. There is no additional runtime data request for the houses.

The paired desktop Orca captures use the same clock and poses. The City overview uses normal orbit limits. The closer views use an inspection camera. The elevation sheet renders the same three building meshes individually so adjacent buildings and trees cannot hide a wall. [Before and after at street and City scale](comparison.jpg)
