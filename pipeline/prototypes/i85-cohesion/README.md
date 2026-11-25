# Brookwood I-85 corridor

This private fixture connects one southbound GA 13 ramp beneath I-85 and registers the outside face of the northbound approach across the Brookwood board boundary. [Exact-camera baseline with directed axes](annotated.png) · [Camera matrices](camera.json) · [County 2024 overhead export parameters](overhead-url.txt)

## What the picture contains

In Sam’s baseline, from left to right, the five visible roads are the one-lane SB ramp 38981789, five-lane I-85 SB (38983384 → 1409808969), six-lane I-85 NB 369529900, two-lane GA 13 SB 879130781 and two-lane GA 13 NB 187141934. At the NB split, 369529886 carries five continuing lanes and 9238434 receives the outside lane. The GA 13 roads on the right continue along the freeway. The left ramp emerges from the covered passage at the upper rim. The two under-mainline intersections lie beyond this frame. [Frozen OSM ways, versions and node IDs](ways.json) · [GA 13 southbound](https://www.openstreetmap.org/way/879130781) · [I-85 northbound](https://www.openstreetmap.org/way/369529900)

Follow the legal movement from the fork at node 315298968 onto 9238427. It enters tunnel 38981788 at node 69139897, x 996.63, z −5810.29, then emerges onto 38981789 at node 69139888, x 863.12, z −5780.03. At node 5412886844 it continues onto bridge 1257642776. The reverse camera looks back along that same one-way route. No vehicle connection exists to the crossing NB or SB mainline. The OSM tunnel carries one lane and reports layer −1 and lighting. [Entry](https://www.openstreetmap.org/way/9238427) · [Passage](https://www.openstreetmap.org/way/38981788) · [Emergence](https://www.openstreetmap.org/way/38981789) · [Continuing bridge](https://www.openstreetmap.org/way/1257642776)

## Structural chainage

Station zero is the southwest end of the NB Clear Creek bridge, OSM 484857197. Chainage increases northbound. GDOT's October 2020 corridor study uses the 2016 bridge inventory. Figure 3-24 locates potential matches. The 2025 Georgia FHWA inventory gives lengths, carried and crossed features, structure type and span counts. Both matching I-85 records cover the divided highway. Their inventory points lie between its directed axes. [GDOT study, §3.5, printed page 35](https://www.dot.ga.gov/BuildSmart/Studies/Documents/Buford-Spring%20Connector/BufordSpringConnector_FINAL.pdf#page=44) · [2025 FHWA Georgia records](https://www.fhwa.dot.gov/bridge/nbi/2025/delimited/GA25.txt) · [Station register with original fields](register.json)

| NB station, m | Structure and evidence | Fixture treatment |
|---|---|---|
| −190.76 to −180.76 | Beginning of previously accepted modeled road surface. First southern roadside witness is near −180.76. | Preserve tread. Exact wall origin and earlier embankment limits unknown. |
| −180.76 to 0 | Dec 2024 and Mar 2025 roadside views along GA 13 show a panel wall and a grass verge continuing to the southern creek abutment. | Right-side retaining face, continuous across OSM 28038801 → 1416312985. Footing depth, panel sizes and exact toe inferred. |
| 0 to 77.90 | I-85 over Clear Creek, NBI 12105500. Three spans, 78.3 m in inventory versus 77.90 m mapped. Width 56.3 m, longest span 28.3 m. Mar 2025 view shows open girders, supporting columns and end wall. | Keep the existing creek deck and abutment limits; interrupt the retaining face. Independent pier coordinates and underside height unresolved. SR 13 over Clear Creek is separate record 12102060. |
| 77.90 to 397.90 | Mar 2025 through Feb 2026 roadside views show the panel retaining face to the portal approach. NB center crosses the board seam at 261.41; its right edge crosses at 274.83. | Upper surface uses the accepted classified pavement fit. Toe interpolates exterior class-2 windows; wall height at its seam is 9.18 m in the model. |
| 397.90 to 453.15 | Transition into passage and portal treatment. NB intersects the ramp at 414.78. NBI 12105620 reports **one 14 m prestressed slab**, deck width 52 m, highway underclearance 5.51 m. | Small edge fascias placed about the crossing with inferred skew and 0.55 m illustrative thickness. The 14 m is measured along I-85. The 137.43 m OSM bore length is measured along the ramp. Header, wings and interior use Ground's independent adapter. |
| 453.15 to 493.15 | Mainline and exit split; classified upper returns transition to exposed ground. | Preserve the verified six-position modeled taper and terminal. Exact gore paint, wall ends and support details unresolved. |

The October 2025 east portal has a squared header and wing integrated with the panel wall. The February 2026 west portal has the same enclosing form. Interior imagery shows the continuous ceiling, both sides and wall lights. Camera altitudes from panoramas did not enter the height fit. The county overhead is from the 2024 imagery layer; its exact flight day is unknown. [East portal](https://www.google.com/maps/@?api=1&map_action=pano&pano=P-s8vufGWcO5D97iWWWzOg&heading=255) · [West portal](https://www.google.com/maps/@?api=1&map_action=pano&pano=hfShDc2gX46mXcno_DzDPA&heading=70) · [Bore interior](https://www.google.com/maps/@?api=1&map_action=pano&pano=sxyT8dz44WNEafwEbYYwNQ) · [Open creek span](https://www.google.com/maps/@?api=1&map_action=pano&pano=fGIxr-2hLNRerAhtOFBZ_w) · [All dated roadside observations](side-observations.json)

## Surface and wall probes

The lower floor uses class-2 exposed approach returns 252.54 and 252.61 m NAVD88 at the east mouth and 5 m inside it. The next exposed returns near the west are 256.13 and 256.20 m at 5 and 10 m past the exit. A cubic joins the tangents between these observations. At the west source node, 264.12 m is an upper return. The 5.51 m inventory minimum has no station assignment in the bore. The modeled 8.0 m clear width, 5.65 m interior height and 0.45 m roof thickness belong to Ground's portal fixture. [USGS Georgia Block 2 classified points](https://usgs-lidar-public.s3.amazonaws.com/GA_Statewide_B2_2018/ept.json) · [Ramp windows](ramp-windows.json) · [Lateral windows](wall-windows.json)

The portable wall takes a directed edge, side, station bounds, explicit gaps and top/toe sources. Builder.wall emits only the allowed intervals. Brookwood's top samples its own NB tread. The toe uses NAVD88 medians 16–22 m outside the source axis. Core station and outer-edge seam intersections differ because the board cut crosses the roadway obliquely. The private paint pass uses the same physical stationing for dashes at both tiers. The tunnel floor is a separate mesh with its own vehicle-height query. [Wall contract](profile-wall.ts) · [Brookwood application](structure.ts) · [Road paint](pavement.ts) · [Lower surface](lower.ts)

From the worktree root, run the portable checks with the repository's esbuild binary and Node.

```sh
node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild pipeline/prototypes/i85-cohesion/probe.ts --bundle --platform=node --format=esm --define:import.meta.env.DEV=false --outfile=/tmp/i85-probes.mjs
node /tmp/i85-probes.mjs
```

Both tiers emitted 1,380 wall quads, with matching top and toe on the shared seam. No wall panel crossed the cut or entered the creek or portal gaps. All sampled ramp wheel locations hit a floor triangle. Subdividing only the two ground tie-ins reduced the largest wheel-query discrepancy from 51.29 to 1.63 mm. These checks exercise the portable geometry. Mounted camera and occlusion checks belong to the private City comparison. [Probe](probe.ts) · [Per-tier results](checks.jsonl)

### Stock traffic on private mount 6f3e9021

The drive camera follows the modeled floor through the bore. The stock Connector simulation has 103 directed courses across the mounted footprint. None includes the east approach 9238427 or the covered way 38981788. One includes the west exit 38981789. Its synthetic owner uses the source ribbon's point array; the private height adapter registers the board road's distinct point array. As a result its lower-floor lookup returns null. The stock fallback also returns null at the west mouth and at +1, +2, +4, +5, +8, +10, +15 and +20 m. By +25 m, the existing ground and new floor meet within 0.002 mm.

A CPU replay of the stock instancer used the real Low/High slot allocation, approved 48/120 cap, November 20 weekday profile and all mounted board bounds. Brookwood and the north row supplied the source road heights. Other boards supplied their footprint only. The replay sampled actual instance matrices at 0.5 s intervals from 08:01:12 to 08:16:11.5 EST, without view culling. Low assigned one west-course slot; High assigned three. Within the 279 m open exit, 166 Low and 554 High matrix samples passed the lane/opacity filter. The nearest centers were 28.20 m and 27.52 m beyond the west mouth. The Low SUV's bottom tire vertices at that witness ranged from −3.63 to +13.50 cm against its source road. The High sedan ranged from −4.37 to +10.37 cm. The chassis pitches longitudinally; full four-wheel contact on the sloped original terrain remains unverified. These counts are pose samples over time. No stock car was observed on the new lower floor. [Results](stock-results.json) · [Replay](stock-probe.ts)

To reproduce, run `node pipeline/prototypes/i85-cohesion/stock-probe.mjs /path/to/private-mount` from this worktree with the private mount checked out at 6f3e9021. The probe retains the original route caps and seeds.

[Final mounted verification and camera comparisons](evidence/README.md)
