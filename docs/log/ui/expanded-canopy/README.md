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

## Air checkpoint and reproduction

The Air screenshots above show City’s original 36-triangle deciduous leaf clumps. The Studio comparison below uses the same crown placements and seasonal colors to test eight-triangle clumps.

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

## Mac Studio results

The eight-triangle clumps keep the tree belt around Renaissance Way and the smaller groups along Grant Street recognizable. From the skyline, the largest difference between high and low is the number of crowns around the apartments. Up close, the eight-triangle silhouette is more pointed, especially on isolated low-detail trees in Oakland Cemetery. The King Memorial platforms and guideway remain clear at both settings. Each comparison shows the original mesh on the left and the lighter mesh on the right. [Skyline](studio-skyline.jpg) · [Renaissance Way and Grant Street](studio-north-south.jpg) · [King Memorial and Old Wheat Street](studio-east.jpg)

The M5 Ultra Mac Studio used the Air’s 40 public data files, the pinned October clock and the five cameras above. Each skyline run loaded all seven areas in Orca at 999 × 496 CSS pixels and DPR 2. The two seven-second windows per condition ran in forward and reverse order. The desktop was locked and the display asleep during the initial sweep. Even with a visible tab, 11 of the 12 windows recorded a p95 interval of at least one second. Those callback intervals cannot establish interactive FPS or Galaxy A16 performance.

| Skyline condition | Triangles per frame | Draw calls | Mean frame interval, ms (two windows) |
|---|---:|---:|---:|
| High, earlier 128 crowns | 3,785,279 | 433 | 179.9 / 74.7 |
| High, 3,225 crowns, 36 triangles per clump | 6,432,495 | 459 | 104.5 / 134.6 |
| High, 3,225 crowns, 8 triangles per clump | 4,988,591 | 459 | 1,009.5 / 116.9 |
| Low, earlier 128 crowns | 1,446,308 | 218 | 1,009.5 / 597.1 |
| Low, 1,578 crowns, 36 triangles per clump | 1,804,192 | 231 | 438.6 / 1,009.7 |
| Low, 1,578 crowns, 8 triangles per clump | 1,671,724 | 231 | 104.4 / 163.1 |

The lighter mesh removes 1,443,904 submitted triangles per skyline frame on high (22.4% of the full scene) and 132,468 on low (7.3%). The counts include the rest of City and its render passes.

We also timed 20 complete City render passes per window with WebGL’s disjoint timer query, bracketing the compositor and checking for disjoint results. Two windows per condition ran in reverse order on the second pass. These GPU times exclude the wait for a display refresh, browser compositing and the application’s CPU updates. [All 20 windows and renderer counters](studio-timings.csv)

| Quality | 36 triangles per clump, median GPU ms | 8 triangles per clump, median GPU ms |
|---|---:|---:|
| High | 6.08 / 3.35 | 3.65 / 3.16 |
| Low | 1.21 / 2.01 | 1.12 / 1.23 |

To repeat the GPU sweep, append these arguments to the timing harness command in place of the initial sweep’s conditions.

```sh
python3 docs/log/ui/expanded-canopy/skyline-timing.py --gpu high/full high/simple low/simple low/full low/full low/simple high/simple high/full
```

A Studio bake with the Air’s geospatial libraries (Rasterio 1.4.3 / GDAL 3.9.3, Shapely 2.0.7 / GEOS 3.11.4 and pyproj 3.6.1 / PROJ 9.3.0) reproduced the checked-in SHA-256 byte for byte. A second bake with Rasterio 1.5.2, Shapely 2.2.0 and pyproj 3.8.0 reproduced all 3,225 centers and heights and the 1,578 low-detail selections. One south-band radius at (1619.5, 861.5) measured 3.7 m on this toolchain and 4.0 m in the checked-in Air bake. The latter is used for these comparisons. An independent vector check on the Studio found zero blocked centers and positive clearance around every checked-in radius enlarged by 30%. At that south-band center the nearest hard obstacle was 5.68 m away.

Claude’s visual review raised the join between the downtown and King Memorial leaf meshes. Looking north from (1000, 400) at 0.50 m/px and 47° tilt puts downtown on the left and King on the right. The freeway and the spacing of the trees are visible across the frame. Individual King crowns look more angular in daylight, but the tree shapes do not form a visible line at the board edge on high or low. At 23:00 the crowns on both sides read as dark silhouettes. [Matched seam at 14:00 and 23:00](studio-seam.jpg)
