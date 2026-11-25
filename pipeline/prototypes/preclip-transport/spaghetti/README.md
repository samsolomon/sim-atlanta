# I-285 eastbound to I-85 northbound, Tom Moreland Interchange

Frozen before fitting. The nine OSM one-way sections in source.json are ordered from the I-285 gore at node 68158745 to the I-85 northbound merge at node 68147920. Each record retains the way version, timestamp, directed node sequence and local geometry. Crossing sections extend up to 45 m either side of each intersection. Source snap is in metres. The virtual tile cut is the **easting of the crossing with 41050323**, approximately 985 m into the drive. This deliberately puts the join over a competing carrier.

Local order at all 15 axis crossings is pinned in source.json. The upper way is inferred from the two OSM layer tags, using zero for absent layers. No road connection is inferred from an XY intersection. The layer-3 route crosses under the layer-4 flyover, then over layer-2 and layer-1 flyovers. The 2025 federal inventory independently identifies structure 0890276 carrying an I-285-to-I-85 ramp, 0890272 carrying an I-85 southbound on-ramp, 0890269 carrying an I-85 northbound-to-I-285 ramp, 0890279 carrying an I-285 off-ramp, and Northcrest crossing the freeway complex. Inventory points and facility descriptions corroborate the stack. Individual lower-road identities rely on the OSM topology and layers. [2025 Georgia bridge inventory](https://www.fhwa.dot.gov/bridge/nbi/2025/delimited/GA25.txt) · [OSM departure](https://www.openstreetmap.org/way/9165657) · [OSM central span](https://www.openstreetmap.org/way/41107890)

The fit may use the USGS GA_Statewide_B3_2018 source along the versioned axes. Reserve disjoint stations 10, 30, 50… m for replay. The inventory width, structure length and underclearance in acceptance.json are independent checks. None are fitting inputs. A station cloud may contain multiple treads or a girder; withhold ambiguous observations. Distinguish sampled grade, modeled transverse width, wheel contact, and actual physical clearance. This fixture stays outside City.

## Drive and evidence

Open [the overhead plan](overhead.svg) and [the traveling-low preview](drive.html). Download the HTML and open it locally for playback. It contains the geometry and requires no server. The **Tile cut** button goes to the crossing with 41050323. Play, pause or scrub from the gore to the merge. The preview decimates the drawing mesh to roughly 6 m intervals. The contact check uses the full clipped triangles.

| Check | Result |
|---|---|
| Direction and continuity | 2,168.54 m in source direction across nine connected one-way ways. The drive follows the inferred leftmost lane. |
| Simulated car | Four wheel queries at each 0.5 m station, with a 2.8 m wheelbase and 1.6 m track. All **17,320** queries hit the selected tread. The largest wheel-to-drawn-triangle difference was below 0.000001 m. Road ownership follows the directed route through way joins and never searches for the highest surface in the scene. |
| Cut and width | Both tiles return the same elevation at all 41 transverse probes. Drawn travel width is 10.65 m at the cut, with 0.975 m nominal minimum wheel-to-edge margin during the drive. The model assumes 3.55 m per tagged lane and a 30 m transition at lane-count changes. Physical lane edges and shoulders are unmeasured. |
| Vertical order | All 15 crossing-axis checks match the frozen order. At 742 m the driver passes 8.806 m **below** way 41051928. At the cut the driver passes 13.683 m **above** way 41050323. It passes under both Northcrest road axes before the merge. Separations compare modeled tread tops. |
| Grade | Peak absolute modeled grade is 7.544%. The steepest change in grade was 0.434 percentage points over 2 m, or 0.217 points/m. Ramp design speed and applicable vertical-curve criteria remain unknown. |
| Held-out lidar | 102 of the 108 reserved stations supplied a single qualifying cluster of the expected class. Median absolute residual was 0.008 m, 95th percentile 0.399 m, and the largest was 0.774 m low at station 910 m. Six windows remain unresolved. Spatial holdouts share the acquisition and possible registration biases with the fit. |
| Independent inventory | The mapped central bridge length is 718.14 m versus the reported 723.3 m for 000000008902760. Its reported roadway width is 12.8 m across the roadway versus 10.65 m of modeled travel lanes at the cut. Inventory minimum underclearance is 8.89 m for the structure. There is no identified soffit sample at the cut or survey tying that minimum to a particular crossing. |

The freeze commits are `8d68e98c` (source, cut, inventory checks) and `5cab0cf9` (station observations before fitting). Source acquisition was USGS Georgia Block 3, 29 November 2018 through 22 April 2019. Source elevations use metres NAVD88, GEOID12B. The extractor samples EPT through depth 10 within 4 Web Mercator metres (about 3.32 ground metres) of each station. Each stored cluster lists LAS classification, count, median elevation and vertical range. Candidate tread anchors require at least four returns of the expected class (17 on mapped bridges, 2 elsewhere), a range of at most 1.2 m, and a unique qualifying cluster. Route anchors within 18 m of any crossing are withheld. Crossing sections apply that exclusion around the selected route. The fit interpolates across the resulting gaps with shape-preserving cubics and uses a terminal secant on short crossing ends without a sample. Tread derivatives, steering offset, edge geometry and obscured elevations are inferred. [USGS EPT source](https://usgs-lidar-public.s3.amazonaws.com/GA_Statewide_B3_2018/ept.json) · [USGS acquisition and datum report](https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/metadata/GA_Statewide_2018_B18_DRRA/GA_Statewide_2018_B18_DRRA_WP_Report.pdf)

Run from the repository root with the project Python and web dependencies installed. Baking reads only source.json and fit-returns.json. Only the drive check reads the reserved observations and inventory controls.

```sh
fixture=pipeline/prototypes/preclip-transport/spaghetti
.venv/bin/python -B "$fixture/bake.py" > /tmp/spaghetti-bake.json
node "$fixture/drive.mjs" < /tmp/spaghetti-bake.json
.venv/bin/python -B "$fixture/preview.py" < /tmp/spaghetti-bake.json
```

The [full results](results.json) include the signed height difference at each crossing. To reproduce the lidar windows, run sample_lidar.py with a local cache directory. Overlapping deck returns, absence of a soffit measurement, and the 2018–19 lidar versus later OSM dates bound the physical claims.

## Handoff for the first City/WebGL run

Sam accepted the ramp geometry at `cfaeddf085be50fc71a2ad42a67fc58e861a20db`. The first City/WebGL visibility check is pending. Stations below are metres from the departure gore in the direction of travel.

| Station (m) | Observation and City/WebGL check |
|---|---|
| 899, 905, 983.2, 989.2 | In the offline canvas preview, the road paint drew over the car at each station. Check all four frames and verify that the car body remains visible above its own tread and markings. |
| 985.204 | The car was visible normally at the virtual cut in the offline preview. Use this as the visibility control. |
| 741.592 (about 742) | The selected ramp passes beneath way 41051928. Verify that the upper deck occludes the car where it blocks the camera’s line of sight and that the car reappears as it clears the deck. |
