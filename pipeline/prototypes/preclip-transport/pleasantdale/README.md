# Pleasantdale Road fork

A car on the 60 m approach can take one of two directed branches at node 330630047. Both branches continue for 205 m under the Northcrest Road decks. The OSM axes, allowed and forbidden lane requests, four disconnected crossings, inventory record, and separate fitting and acceptance lidar windows were frozen at `54a51131a4f8ef26de880e83bd1ac792b91eea50` before the bake.

| Incoming lane, left to right | Assigned branch and receiving lane | Wheel contacts | Minimum wheel-center distance inside modeled lane edge |
|---|---|---:|---:|
| 1 | I-85 North / Greenville, lane 1 | 2,092 / 2,092 | 0.952 m |
| 2 | I-85 North / Greenville, lane 2 | 2,092 / 2,092 | 0.952 m |
| 3 | Pleasantdale Road, only lane | 2,092 / 2,092 | 0.893 m |

The frozen request for lane 3 to continue toward Greenville was rejected at the fork. Requests from lanes 1 and 2 to take Pleasantdale were also rejected. These are connector permissions at the split. Lane changes farther upstream were outside the fixture.

## Source and surface decisions

Approach way 537071431 v3 supplies three ordered lane destinations and the maneuver tags `none|none|slight_right`. Its endpoint is the start node of each outgoing one-way road. Outgoing destinations and lane counts establish branch eligibility. Assigning the two Greenville lanes to receiving lanes 1 and 2 in order is inferred. Pleasantdale has a single receiving lane. Dated stripe observations, gore boundaries, shoulders and measured lane widths remain unavailable. [Approach](https://www.openstreetmap.org/way/537071431/history/3) · [Greenville v10](https://www.openstreetmap.org/way/9164544/history/10) · [Pleasantdale v6](https://www.openstreetmap.org/way/30027936/history/6)

The bake starts each receiving lane at the two edges of its incoming lane on the shared cross-section. While both outgoing OSM axes are too close for their tagged lane counts, the model separates the strips in proportion to branch width. It then follows the respective axes. Width is 3.55 m per lane on cross-sections normal to the incoming direction. All three joins match in XYZ at both edges to the precision of the emitted data. Neither the branch separation model nor these widths are surveyed.

Both lower roads intersect both upper axes in plan, with no shared source node. The drive tests each upper tread along the actual driven lane and rejects road-to-deck routing in both directions. The 2025 inventory independently identifies Northcrest Road over the interchange. It lists 4.87 m minimum underclearance for the structure; no station or lower lane in the fixture has been matched to that minimum. [Northcrest 67968161 v8](https://www.openstreetmap.org/way/67968161/history/8) · [Northcrest 172322577 v5](https://www.openstreetmap.org/way/172322577/history/5) · [FHWA Georgia NBI, structure 000000008902090](https://www.fhwa.dot.gov/bridge/nbi/2025/delimited/GA25.txt)

| Upper way | Greenville axis station from fork | Pleasantdale axis station | Smallest sampled upper-minus-lower tread height on the drives |
|---|---:|---:|---:|
| 67968161 | 176.71 m | 170.76 m | 7.553 m |
| 172322577 | 189.72 m | 183.60 m | 7.663 m |

The pre-fit lidar snapshots replay the preceding ramp's USGS Block 3 EPT extractor on the five clipped axes, using cached tiles only. Each observation records source way, station from the cropped start, and groups of LAS class, return count, median elevation and vertical range. Odd 10 m stations are reserved. The fit interpolates unique class-2 medians along the lower roads and class-17 medians on the decks, requiring four returns and at most 1.2 m vertical range. The datum is NAVD88 metres. At 25 of 29 held-out windows a qualifying cluster exists; the largest absolute difference from the interpolated profile is 0.040 m. Four lower-road windows, two on each branch, lack a qualifying observation. Concealed tread heights are interpolated. The holdout shares the lidar acquisition, and the separate NBI record does not measure lane-level elevations or soffits here. [USGS acquisition and datum](https://rockyweb.usgs.gov/vdelivery/Datasets/Staged/Elevation/metadata/GA_Statewide_2018_B18_DRRA/GA_Statewide_2018_B18_DRRA_WP_Report.pdf)

## Reproduce offline

From the repo root with project Python and web dependencies:

```sh
fixture=pipeline/prototypes/preclip-transport/pleasantdale
.venv/bin/python -B "$fixture/bake.py" > /tmp/pleasantdale.json
node "$fixture/drive.mjs" < /tmp/pleasantdale.json
```

The bake reads only source.json and fit-returns.json. The drive checks the frozen requests, computes contact for a 2.8 m wheelbase and 1.6 m track every 0.5 m, and queries the selected lane triangles using Three.js ray intersection and City's triangle-height sampler. Wheel centers are tested across the join, including poses with axles on different owners. Minimum edge margins exclude tire width. Moving lane 3 to Greenville or removing the Pleasantdale tread fails the replay. [Per-drive and held-out results](results.json)
