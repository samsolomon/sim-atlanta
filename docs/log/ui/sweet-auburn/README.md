# Sweet Auburn terrain preview

The second opt-in section fills the square immediately north of the King Memorial strip. Its 800 × 800 m take in the Downtown Connector, Edgewood Avenue, Auburn Avenue and Irwin Street, with Hilliard, Jackson and Boulevard running across the main east–west streets. The bounds stop at x 1000–1800 m, z −520–280 m. King Memorial remains the first extension. [Section view](section-high.jpg) · [2023 aerial](naip-2023.jpg) · [Matched crossings](joins.jpg)

## Ground and registration

The same SHA-pinned USGS 3DEP 1 m bare-earth tile supplies all three boards. The source horizontal CRS is NAD83 / UTM zone 16N (EPSG:26916). Elevations are orthometric metres on NAVD88 (EPSG:5703). City uses local equirectangular metres from Five Points at 33.7539° N, 84.3916° W, x east and z south, radius 6,371,008.8 m. Subtract 323.8 m from NAVD88 to get scene y. The survey ran from November 2018 to April 2019. [USGS tile metadata](https://prd-tnm.s3.us-west-2.amazonaws.com/StagedProducts/Elevation/1m/Projects/GA_Statewide_2018_B18_DRRA/metadata/USGS_1M_16_x74y374_GA_Statewide_2018_B18_DRRA.xml)

The grid holds 161 × 161 inclusive nodes at 5 m spacing. Each little-endian signed int16 stores absolute NAVD88 decimetres, row-major from minimum z and x. The bake reads the nearest native DEM pixel. GroundGrid interpolates valid samples and returns null outside the extent or where a required sample is missing. The drawn surface omits cells touching the −32768 sentinel. This square has zero missing nodes and ranges from 293.2 to 319.8 m NAVD88.

The west edge matches all 161 downtown nodes and the south edge matches all 161 King nodes byte for byte. The three boards share 305.4 m NAVD88 at (1000, 280). The desktop high and forced-low meshes retain all 321 distinct shared nodes. Tests compare each node and 2.5 m midpoint on the actual rendered triangles, check the four hidden skirt sections and confirm the remaining vertical geometry stays outside the join. The walnut perimeter follows the combined footprint. A bad north asset leaves both previously mounted boards navigable. The browser check restored the missing context and retried the approach successfully.

## Streets and buildings

The archived OpenStreetMap response contributes 179 clipped building footprints, 693 road/path runs and 56 ground-cover polygons. The 24 mapped above-ground bridge runs use City’s existing schematic road-deck treatment. The aerial is a 2023 USDA NAIP mosaic in the same square at one pixel per scene metre. Seventy-seven representative crown centers were selected on the October 8 image (USGS 41283), and two smaller street trees were placed from the March 2025 photographs. Two ambiguous centers falling inside building footprints were excluded. The remaining canopy is incomplete. Crown spread, height and seasonal color are illustrative. [2023 NAIP mosaic](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage?bbox=-9393225.849060316%2C3995467.3441738295%2C-9392262.57692487%2C3996430.6284357114&bboxSR=3857&imageSR=3857&size=800%2C800&format=jpg&adjustAspectRatio=false&mosaicRule=%7B%22where%22%3A%22Year%3D2023%22%7D&f=image) · [Source image metadata](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/41283) · [OpenStreetMap attribution and ODbL](https://www.openstreetmap.org/copyright)

At Edgewood and Hilliard the March 2025 photographs show a low brick commercial row with dark display windows. Behind it the mapped Brushworks Lofts footprint has two recorded levels. The preview gives that conversion a brick tint, retains one mapped envelope along the storefronts, and uses a schematic 5.3 m height for that envelope. Its bay pattern is illustrative. No tenant signs are reconstructed. Elsewhere only one building has a usable explicit OSM height and eight have floor counts. The generic fallback is 8 m. Many landmarks, individual storefronts, ramps, internal building details and streetcar track are unresolved. Road-deck elevations are illustrative. The preview introduces no rail or vehicle alignment. [Edgewood photograph, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&pano=DftBSfMwzSngHTDlKVYJlw&heading=155&pitch=7&fov=88) · [Hilliard photograph, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&pano=C2fwVDuivFd-uADvqZrLtQ&heading=158&pitch=8&fov=88) · [City street-eye study](edgewood-street-eye.jpg) · [Normal orbit](edgewood-high.jpg) · [Hilliard side of the corner](edgewood-hilliard.jpg)

## Rebuild and preview

Starting with normal downtown data and the repository Python environment, run the following from the repository root. The baker reads the archived OSM response from the source subdirectory and checks the DEM against the existing tile SHA. Neither raw source is staged for visitors.

```sh
.venv/bin/python pipeline/scripts/sweet_auburn.py data/raw/terrain/USGS_1M_16_x74y374_GA_Statewide_2018_B18_DRRA.tif
pnpm data:sweet-auburn
pnpm dev
```

Open `/?view=city&east=king-memorial&north=sweet-auburn&q=high&t=2026-11-20T10:15:00-05:00&speed=0`. Approach either edge. With the King flag alone the camera stops at King’s original footprint. For release, run `pnpm data:sweet-auburn` before `pnpm build`. That opt-in stage copies King and Sweet Auburn together. The northern stage uses the committed bake.

| North asset | Raw bytes | Gzip −9 bytes |
| --- | ---: | ---: |
| Ground manifest | 1,646 | 864 |
| Elevation grid | 51,842 | 20,041 |
| Neighborhood | 167,871 | 35,904 |
| **Total** | **221,359** | **56,809** |

Production desktop Orca loaded seven downtown scene assets and zero extension assets or extension-specific JS chunks at opening on both tiers with both flags. Default City, the north flag alone and King alone also opened with those seven scene requests. Approaching King fetched its three existing files. Approaching the new square fetched the three files above once plus its lazy JS chunk (1.51 kB gzip in this build). The section uses static assets throughout.

The three matched cameras use the dev helper `__city.lookAt(x,z,{bearing,metresPerPixel,tilt})` with the following values. The street-eye evidence temporarily lowered the desktop orbit distance and near clipping plane in memory and widened the field of view. Normal City retains its diorama orbit.

| View | x, z (m) | Bearing | m/px | Tilt |
| --- | --- | ---: | ---: | ---: |
| West join | 970, −55 | 85° | 0.45 | 58° |
| South join | 1450, 302 | 350° | 0.44 | 58° |
| Shared corner | 1000, 280 | 43° | 0.56 | 55° |
| Section | 1395, −154 | 8° | 0.98 | 35° |
| Edgewood from normal orbit | 1353, −37 | 155° | 0.104 | 72° |
