# North-row transport greybox

[Full-row greybox](overview.svg) · [Mayson carrier study](mayson.svg) · [Mayson wheel and elevation checks](checks.json)

Offline row **x −1000…1800, z −6500…−5700 m**, relative to Five Points. R16 reference `8678645f1c42d114e4f5c2057e2e4467145d2bcc`, tree `2270cb256942177d884ae662a64db3a20d704005`. The private City integration consumes the portable artifacts below. This directory is outside the public map registry and deployment inputs.

## Mayson first

Two parallel MARTA tracks cross different source roads. A Norfolk Southern yard way meets Mayson only 3.19 m along the road from its intersection with NR.

| Carrier/control | Source relation and location (x, z m) | Upper proxy or yard tread | Road tread | Difference |
|---|---|---:|---:|---:|
| MARTA NR 81137860 v12 / Mayson 9270932 v9 | Disjoint nodes, upper bridge layer 1 at (1291.81, −6202.19) | 268.105 | 258.216 | 9.889 m |
| MARTA NL 319512612 v11 / MARTA Access 429349499 v6 | Disjoint nodes, upper bridge layer 1 at (1287.33, −6203.25). NL misses the Mayson way by 1.33 m. Access is tagged private with permissive walking and cycling. | 268.155 | 258.250 | 9.905 m |
| NS yard 144485857 v9 / Mayson 9270932 v9 | Shared node 4974267722 (1288.72, −6203.00). FRA 717947V records NS at grade. | 258.2351 | 258.2353 | 0.2 mm absolute, each sampled 2 cm inside its endpoint |

Elevation columns are scene tread proxies expressed in metres NAVD88. The Mayson DEM at the NR crossing is 258.136 m; the illustrative road top adds 0.08 m. The upper-surface fits use a dense, continuous elevated band of returns outside LAS classes 2 and 17 within 1.8 m of each track axis. Neither track's crossing window supplies a class-17 deck measurement. The withheld NR crossing median was 268.100 m (60 returns), NL 268.190 m (59 returns). Interpolating adjacent windows gave residuals +0.005 and −0.035 m. The physical railheads, soffits, minimum clearances and surveyed widths remain unknown. The FRA RR Over records on I-85 and the Buford Highway Connector refer to different streets. No observed yard train is assigned here. [Staged FRA and FHWA inventory observations](freeze.json) · [USGS 3DEP source](https://usgs-lidar-public.s3.amazonaws.com/GA_Statewide_B2_2018/ept.json) · [Station windows](mayson-observations.json)

The Spaghetti/Pleasantdale wheel test pattern is applied to these five owner-specific strips. Four synthetic wheel positions per vehicle are raycast on the drawn float32 geometry and compared to City's triangle-height query. All **1,400** wheel probes returned a height. Where an owner's tread crossed the virtual cut through NR, 21 transverse probes agreed between both pieces to less than 0.000001 m. The Mayson road strip uses an inferred 6.2 m width; its unsmoothed DEM-derived peak grade is **10.35%** with a maximum change of 6.42 percentage points over 0.5 m. This remains a grade warning. Only the short published control intervals are supported for local wheel probes.

## Row inventory and civic context

The clipped inventory contains **780 source ways**, including 748 mapped current highway ways (motor and nonmotor, including service roads and paths) and 36 rail-state records; a former rail alignment can also carry a current path. Each record preserves the source ID, version, tags, axis direction and clipped geometry. It carries explicit lane totals and directional counts where available, maneuver tags, sidewalk sides relative to the source direction, and reported incline. Per-piece peak DEM grade is a terrain diagnostic. It cannot establish bridge, tunnel or actual pavement grade. Among the 748 highway ways, 92 explicitly run forward, 28 explicitly allow both directions, and 628 have unspecified direction. Total lanes are tagged on 56 ways, directional lane counts on 14, and a sidewalk side or both-side attribute on 25. There are 186 explicitly tagged separate sidewalk ways. Adjacency to a street alone does not assign a side. The Mayson way 1460400514 reports no sidewalk on its source-left and a separate sidewalk on its right. Those tags do not propagate to crossing way 9270932.

The inventory records 1,272 point intersections between distinct transport ways; 41 involve a road and rail-state axis. Eleven of those have a shared OSM node, 16 have inferred layer order, and 14 have unresolved order. Shared road/rail nodes and decommissioned or proposed axes do not grant a road-to-rail route. Carrier IDs follow only locally evidenced relationships. Six FRA and six NBI records have inventory points within the box; matching facilities and locations is necessary before using them. [Compressed inventory](inventory.json.gz) · [OSM snapshot and independent sources](freeze.json)

Rail-state counts are five ordinary rail ways, one siding, nine yard ways, ten subway mains, one subway yard way and ten abandoned rail ways. The rail owner identifies service on the MARTA North Line and the existing scheduled Crescent on its supported route. Yard activity, service on former rail alignments, physical switches, and the proposed trail at Mayson remain outside those claims.

The standalone views reuse ground's 5 m DEM and 771 generic building records. Within Piedmont Atlanta Hospital campus polygon 34845384, Marcus Tower adds OSM building part 887724918 with 16 tagged levels and an illustrative 3.5 m per level. The 150 and 134 Ottley Drive footprints (268895222, 268895265) use the same 5 m warehouse mass and roof detail. This is a repeatable industrial treatment; tenancy, roof equipment and actual heights are unverified. Other surroundings use generic footprint masses. Unresolved raised structures are omitted from the perspective view and retained in the inventory. Use the carrier probes for vertical tests.

## Continuous rail and the R16 seam

The two rail-owner axes reach from z −5700 to −6500. Northbound NR crosses the seam at x 731.48, source-forward bearing 50.34°. NL crosses at x 726.12, source-forward bearing 229.34°. All 561 terrain seam elevations match the previous Brookwood Station grid. Both tier measurements at the rendered rail endpoint are scene Y −62.6289363311 (261.17106 m NAVD88). The first 2 m preserve the endpoint gradients measured by the private mount owner. Each track's profile then interpolates uniquely supported along-axis lidar anchors, with the Mayson segment tied to the local fitted overlay. Raw 5 m lidar windows use Block 2 EPT through depth 10 and include class, count, median and elevation spread.

NR has a **5.96%** rise from station 2–4 m after the level seam and a peak absolute grade of **6.85%** elsewhere. NL drops **7.80%** over stations 514–516 m; its longest anchor gap is 62.52 m and its largest withheld difference is 0.475 m. Those short transitions are model uncertainty. The R16 3.5% design comparator is not a surveyed limit. The scene-height match establishes position continuity at the seam. It does not certify car pitch or actual design grade.

The rail owner's offline scheduled replay uses `marta:trip:25-27300-20261120`, Red northbound, path `marta:path:155235`. On November 20, 2026, the train moves from (723.5, −5693.4) at 08:00:51 EST to (751.2, −5716.3) at 08:00:52 and (1337.0, −6288.4) at 08:01:15. The private mount owner verifies selection/follow and rendered carrier contact separately.

## Consumer contract and reproduction

- [Local Mayson geometry](mayson.json) supplies `way`, `version`, full-source station range, rows and two triangle lists per owner. Each vertex is `[x, sceneY, z, sourceStationM]`. Tile 0 is west of cutX, tile 1 east, with coincident boundary vertices. Query only the owning way and relevant tile. For the road-only control, travel in increasing station on 9270932 between stations 2 and 32, wheelbase 2.8 m and track 1.6 m.
- [Continuous rail profiles](north-line-profile.json) contain rows `[chainageM, x, sceneY, z]` for each track. Both tables run from south to north, regardless of operating direction. Interpolate sceneY by chainage and use the same function for guideway and train; apply the City's body placement offset once. Segments name the contributing way and version. The elevation is already relative to the 323.8 m scene zero.
- The source freeze was `61bcf598`; the ground/DEM and local lidar observation pins were `e2058adc` and `dfc16245`. Continuous axes and raw windows were pinned at `ee963b2e`. Source acquisition is separate from the offline commands. The shared raw OSM decompressed SHA-256 is `1c4daabb914a6884f532324f8f1a87df18e417e45f6484b8e5ec0bf496740ebf`.

Run from the repository root:

```sh
fixture=pipeline/prototypes/north-row-transport
.venv/bin/python -B "$fixture/inventory.py" > /tmp/north-row-inventory.json
.venv/bin/python -B "$fixture/mayson.py" > /tmp/mayson.json
.venv/bin/python -B "$fixture/north_line.py" > /tmp/north-line-profile.json
cmp /tmp/mayson.json "$fixture/mayson.json"
cmp /tmp/north-line-profile.json "$fixture/north-line-profile.json"
node "$fixture/probe.mjs"
.venv/bin/python -B "$fixture/preview.py"
```

### Scheduled Red wheel contacts at the south seam

The private City run at `d732fc91` retained the scheduled northbound train, its six cars and camera follow across all 130 samples. The original clip and direct rail-triangle controls at `ffadf4f5` remain the baseline. Run `python3 contact_controls.py <original-log-directory>` from this fixture to compare both wheel centers with the drawn rail, the NR carrier and the best possible single rigid lift/pitch at the recorded footprints.

| EST, November 20 | Car (one-based) | Local axle | Left/right signed gap | Smallest worst error across four axles with one rigid line |
|---|---:|---:|---:|---:|
| 08:00:49.701 | 1 | +5.95 m | −7.59 / −7.59 cm | 1.59 cm |
| 08:00:50.401 | 2 | +8.05 m | +7.31 / +7.31 cm | 2.39 cm |

Positive means the wheel bottom is above the rail. At both times the northern rail triangle heights under the forward axles agree with the frozen proxy bed plus the modeled 7 cm running rail to within 0.01 mm. The old mount placed the wheel plane at bed height and pitched the full car from heights 2 m either side of its center. Its rear and forward bogies straddle different grades. Separate truck poses must use the running rail beneath their respective axles. These samples concern the rendered NR running surface. The physical railhead and clearance remain unknown.

Original log SHA-256 digests, in time order, are `f64d4f4e108f4e61db04001884b4916a301e2ac1c903d4bb7b69e601f7fad36a` and `76b3b1f87e72be583ebb30cde78e484adccc1e1993139b1fb00ff837d9fba1fd`.

The private mount at `d0251f98` uses the articulated wheel geometry from `977481c4`. Independent reduction of its 81 snapshots at 100 ms spacing (08:00:47–55 EST) and the four exact controls found all 4,080 tread centers on drawn rail triangles. Across 21,466 successful width rays the signed gaps ranged from −0.01402 to +0.01465 mm. Of the tread widths, 3,014 had five of nine rays on steel and 1,066 had six. At the two original failing controls, both centers were within 0.000001 mm of modeled rail top. All 44 centers within 1 m of the nominal tile plane hit. The witness checks both adjacent meshes within 2 m because the rail cross-section intersects the plane obliquely. This verifies the sampled NR wheel poses. The separate Mayson road control had 244 hits with signed gaps of −11.21 to +30.27 mm.

Rail independently accepted the repeat scheduled Red follow on the corrected mount at `d0251f98`. Across all 130 samples, the selected and followed trip remained `marta:trip:25-27300-20261120` on northbound path `marta:path:155235`, with the scheduled tier and all six cars drawn. No car stepped backward. The maximum horizontal difference from the independent scheduled pose was 0.795 m. The consist midpoint passed the seam at 08:00:51.359 EST and Mayson at 08:01:12.390 EST on November 20, 2026.
