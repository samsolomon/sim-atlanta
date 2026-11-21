# Downtown surface transport

[Connector study](log/ui/2026-11-21-transport-connector.jpg) · [Streetcar study](log/ui/2026-11-21-transport-streetcar.jpg)

The two freeway carriageways follow the 5 m USGS terrain. Six separate mapped standard-gauge railway spans cross them. Decatur Street crosses farther north. Control and Rail Accuracy supply the Blue/Green structure above the corridor. Marlin's standalone study draws the road, freight and streetcar layers.

## Crossing check

Local x points east and z points south from Five Points. Heights below are metres NAVD88. The freeway figures are bilinear grid samples. The deck values are the tops of schematic meshes sampled with downward rays. The MARTA figure comes from Control's existing crossing study using the east bank at (820, 555), 314.1 m, plus the existing 7 m profile offset.

| Location | x, z (m) | Ground | Modelled top |
| --- | --- | ---: | ---: |
| Freight over western Connector carriageway | 743.71, 532.17 | 304.08 | 312.30 |
| Decatur Street over western carriageway | 835.80, 453.68 | 302.39 | 309.8 |
| Blue Line at the freight comparison easting, s = 8284.4 m on marta:path:155177 | 743.71, 557.07 | — | 321.1 |

The Blue Line and freight check points are 24.9 m apart in plan. The rows establish the modelled order at these crossings. Subtracting their heights does not measure physical clearance. Roadway width, deck height and thickness, rail detailing and freeway lane guides are illustrative. The DEM resolves the broad freeway depression. At steep banks it can give adjacent bridge endpoints visibly different elevations. Surveyed abutments, railheads and tunnel cover require independent evidence.

## Attaching to City

```ts
import { createSurfaceTransport } from '../terrain/transport';

const transport = createSurfaceTransport(city, grid, terrain.groundAt);
scene.add(terrain.group, transport.group);
// On City teardown, alongside the terrain owner's cleanup:
transport.dispose();
```

The function is synchronous. Give both modules the same downtown extract, grid and triangle-surface sampler. The ground texture paints ordinary roads and the at-grade portions of partially bridged ways. The transport module supplies the raised decks, open freight track and embedded tram rails. The City renderer can use this group in place of its former street, freight and tram geometry. Attach the MARTA owner's group separately.

The builder draws each mapped structural span as a chord between its endpoint ground proxies. Each side meets the local cross-slope within one deck width of its end. A bridge over a slot keeps its chord. A missing grid endpoint omits that span. Ground track samples the rendered triangles every 2 m and at every source vertex, with gaps where sampled ground is missing. The source crop clips centrelines to the board rectangle. The 5 m DEM and road widths limit fidelity at embankments and narrow openings.

## Reproducing the data and view

`pnpm data:city` writes version 1 of `terrainTransport` into downtown's `vignette.json`. Given a previously baked City and its matching raw road and rail extracts, the following command updates just that field.

```sh
.venv/bin/python pipeline/scripts/terrain_transport.py
.venv/bin/python pipeline/scripts/test_terrain_transport.py
pnpm test
pnpm dev
```

Open `/terrain-transport.html` or `/terrain-transport.html?at=streetcar` in Orca on the dev server. Both use the low-detail board. An older cached City extract needs the updater before attaching transport. Stage the new static JSON with the City bundle and rebuild the web distribution for release.

The extractor splits Overture's November 18, 2026 road and rail features by their flag and level intervals along the full WGS84 ellipsoidal length, then intersects the resulting pieces with the board. Tunnels, disused rail and abandoned rail are omitted. Positive levels and bridge flags identify supported geometry. Roads without either bridge or tunnel tagging already appear on the board. The supplement keeps 175 road approaches, 238 road or pedestrian deck runs, 41 ground freight or standard-gauge runs, 10 rail spans and four embedded tram runs. Some standard-gauge sidings have no published service flag. The model assigns no train movements to them. [Overture linear referencing](https://docs.overturemaps.org/guides/transportation/linear-referencing/) · [Terrain source and vertical reference](downtown-ground.md)

The extra JSON section takes 66,265 bytes, 17,658 bytes gzip-compressed on its own. With the group toggled on and off in Orca, the colour pass adds two draws and 37,388 triangles downtown. One directional shadow pass adds one draw and 24,820 triangles. Together they add three draws and 62,208 submitted triangles. These counts cover the static transport group across the board. City's postprocessing, trains and frame rate are separate measurements.
