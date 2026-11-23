# Tree cover on the expanded City square

Look southwest from Old Fourth Ward. Trees now form a belt around the Renaissance Way apartments, with shorter gaps at the parking aisles. Across town, the Grant Park houses have smaller groups behind and beside them. The six expansion areas previously supplied 128 selected crowns around King Memorial and Sweet Auburn, and zero in the four outer sections. [Matched skyline, high and low](skyline.jpg) · [Four neighborhoods, high](blocks-high.jpg) · [Four neighborhoods, low](blocks-low.jpg)

## Compare the aerial to the map

Each sample is a 280 × 280 m square. The percentage is the share of one-metre City cell centers classified as canopy in Georgia Tech's 2023 WorldView-2 analysis for the City of Atlanta. USDA's October 8, 2023 NAIP photography provides an independent view of the streets, buildings and crowns. The yellow circles show nominal modeled crown spread. Real branches frequently reach across pavement and roofs, so the model represents less cover than the raster. Several residential yards also contain connected crowns whose individual stems cannot be distinguished from above. [Aerial, classification and model side by side](aerial.jpg) · [Georgia Tech study](https://geospatial.gatech.edu/AtlantaUTC/) · [Published classified raster](https://tiles.arcgis.com/tiles/I9cUOJUZvdGAJncI/arcgis/rest/services/Canopy_Raster_2023/MapServer)

| Sample | West x, north z (m) | Classified cover | High-detail crown centers | What to look for |
|---|---:|---:|---:|---|
| Renaissance Way, Old Fourth Ward | 1070, −1520 | 38.4% | 118 | An arc of canopy outside the apartments, broken by internal drives |
| Grant Street and Woodward Avenue | 1300, 745 | 23.8% | 73 | Small front and rear yard groups around the houses, open pavement beside the larger buildings |
| King Memorial and Oakland Cemetery | 1430, 360 | 10.8% | 48 | Scattered cemetery crowns and a narrow group north of the station, with the guideway clear |
| Old Wheat Street, Sweet Auburn | 1330, −395 | 23.3% | 123 | Larger contiguous groups behind buildings and small pockets along street edges |

The first, third and fourth samples use NAIP frame 41283. The south sample uses frame 41313. Both were acquired the same day. Imagery can miss a small street tree, hide a trunk or show vegetation that has since been removed. The reference skyline photograph guided the viewing angle. The mapped crown positions come from the georeferenced sources. [USDA frame 41283](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/41283) · [USDA frame 41313](https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/41313)

## How the bake works

The 2023 raster reports horizontal canopy cover. The pipeline resamples its positive cells from NAD83 / UTM 16N to the same one-metre local x/east, z/south grid used by City. The earlier downtown detector supplies the projection and windowed Meta/WRI height data. Two adjacent tiles cover this square. The height map is an ML estimate published in 2024 from separate satellite imagery. It has no guaranteed common survey date with the 2023 classification. The bake ranks crown interiors by available radius and nearby estimated height. It retains 56 existing photo-traced centers first where clear of obstacles and each other. New centers must fall inside classified cover. The resulting locations and radii are inferred. Height comes from a nearby height-map maximum of at least 4 m or a crown-size estimate where heights are missing or smaller. Species, growth form, seasonal colors and leaf loss use City's illustrative tree models. [Meta/WRI source and CC BY 4.0 license](https://registry.opendata.aws/dataforgood-fb-forests/) · [Earlier downtown detector](../../../../pipeline/scripts/vignette_trees.py)

The bake masks mapped buildings, vehicle lanes, active surface rail and the King guideway and platforms. Walks exclude trunks and allow overhead branches. An independent vector-distance check found zero of the 3,225 centers inside the obstacles, and zero nominal crowns enlarged by 30% reaching the mapped roadway, rail or building masks. Footprint dates, lane-width estimates and missing small buildings limit that check. All heights are above the local ground mesh.

| Area | Classified cover | High | Low |
|---|---:|---:|---:|
| North band | 22.9% | 1,169 | 541 |
| Northeast corner | 22.3% | 672 | 324 |
| South band | 12.8% | 702 | 376 |
| Southeast corner | 17.6% | 41 | 23 |
| King Memorial | 7.2% | 117 | 68 |
| Sweet Auburn | 14.7% | 524 | 246 |
| **Total crowns** | | **3,225** | **1,578** |

## Cost and reproduction

Low detail keeps the largest modeled crown in each occupied 32 m cell of each neighborhood, and uses the existing three leaf clumps per deciduous crown. High can draw eight. Staging embeds the selected centers in six existing context files. The combined increment is **68,673 bytes raw or 21,030 bytes at gzip-9**, compressing each file separately. Opening the full square requested 26 scene assets before and after. Ordinary downtown loads its own existing canopy pack.

With the initial 36-triangle leaf clumps at the skyline camera, desktop Orca reported 3.81 → 6.46 million triangles on high and 1.46 → 1.82 million on low, including the rest of City. Draw calls went from 476 to 502 and 241 to 254 respectively. These are single-camera renderer counters. Desktop readings alone cannot establish frame time or thermal performance on a Galaxy A16. The full square remains opt-in.

On a populated checkout, stage the checked-in bake with `pnpm data:square-board`, run `pnpm build`, and deploy the bundled code and static data together. Open `/?view=city&board=square` and choose **Show full board** in **About this City view**. To repeat the captures in a development build, pause on `t=2026-10-20T14:00:00-04:00&speed=0` and call `__city.lookAt(x, z, {bearing, metresPerPixel, tilt})` after all seven areas mount.

| Camera | x | z | Bearing | m/px | Tilt |
|---|---:|---:|---:|---:|---:|
| Skyline | 1195 | −1240 | −142° | 1.03 | 72° |
| Renaissance Way | 1210 | −1390 | 29° | 0.67 | 41° |
| Grant and Woodward | 1460 | 880 | 52° | 0.63 | 42° |
| King Memorial | 1600 | 472 | 20° | 0.48 | 40° |
| Old Wheat Street | 1490 | −255 | 20° | 0.56 | 40° |

To regenerate the crowns, use the repository Python environment with NumPy, SciPy, Rasterio, Shapely and pyproj. The first run caches two small windows of the public height data. The script checks the classification GeoTIFF SHA-256 before sampling. The King OSM snapshot matches the original corridor context's raw SHA-256. Other obstacle geometry comes from the existing board packs and archived maps. [Baker](../../../../pipeline/scripts/expanded_canopy.py) · [Crown data and King archive](../../../../pipeline/prototypes/expanded-canopy) · [OpenStreetMap attribution](https://www.openstreetmap.org/copyright)

```sh
mkdir -p data/raw/canopy
curl -fL https://cura.design.gatech.edu/UTC/UTCMosaic2023.zip -o data/raw/canopy/UTCMosaic2023.zip
unzip -o data/raw/canopy/UTCMosaic2023.zip -d data/raw/canopy
.venv/bin/python -B pipeline/scripts/expanded_canopy.py data/raw/canopy/UTCMosaic2023.tif
pnpm data:square-board
pnpm build
```

## Mac Studio handoff

The photographs, crown bake, clearance audit, payload figures and screenshot pairs above are complete. The screenshots show the first canopy implementation using City's existing 36-triangle deciduous leaf clumps. The branch also contains an **unverified eight-triangle clump variant** for the expanded packs, preserving their crown placements and seasonal color. The last full test suite and build passed before the mesh substitution. Repeat the tests, build, skyline and close-up visual verification, frame timings and cross-model review on the Studio before opening a PR.

Two interleaved seven-second desktop windows per condition on the M5 Air used an active Orca tab at 1296 × 726 CSS px, DPR 2, all seven areas mounted, the same pinned October clock and a three-second camera settle. Each cell gives mean frame time and effective FPS. High's second canopy run had a 650 ms p95 interval; desktop load varied materially. The slower low-detail runs and the high outlier warrant the simpler-mesh comparison. These measurements do not establish mobile performance.

| Skyline condition | Window 1 (ms / FPS) | Window 2 (ms / FPS) |
|---|---:|---:|
| High, earlier 128 crowns | 36.4 / 27.4 | 36.6 / 27.3 |
| High, expanded crowns and original mesh | 34.7 / 28.8 | 96.8 / 10.3 |
| Low, earlier 128 crowns | 26.7 / 37.4 | 34.5 / 29.0 |
| Low, expanded crowns and original mesh | 34.0 / 29.4 | 55.1 / 18.2 |

The checked-in bake is sufficient for staging on the Studio. Use an existing complete City dataset or populate the gitignored `web/public/data/ga/` and `web/public/data/scene/downtown/` with the normal data build, then run `pnpm data:square-board`. To rebake from source, the only canopy-specific gitignored inputs are `data/raw/canopy/UTCMosaic2023.tif` and the four cached CHM/mask files under `data/raw/meta_chm/expanded-square_*`. The download instructions above can recreate these on the Studio. Repeated bakes on the Air produced SHA-256 `fb394fe1fd7e3177a48090e45cea40166e9b45410adec8676453d68edad1810b` for `crowns.json`.

Start Vite on loopback port 5377. Run the following from the checkout root. The harness selects the original, full-canopy original-mesh, or simplified-mesh responses inside its own Orca tab. Existing City files on disk stay intact. It reports frame intervals, draw calls, triangles, viewport and actual camera pose. [Timing harness](skyline-timing.py)

```sh
python3 docs/log/ui/expanded-canopy/skyline-timing.py high/old high/full high/simple low/simple low/full low/old low/old low/full low/simple high/simple high/full high/old
```
