# Connector repairs: Sam's flagged spots

Phase 1 of applying the Brookwood bridge, overpass, sidewalk and lane-transition primitives (PR #682) to the Downtown Connector. This document is measurement and registration only. No geometry changed. Repairs wait for #682 to merge and the coordinator's go.

Measured on `samsolomon/connector-repairs` at **c8e3e34e** (PR #682 head), dev server, both tiers, clock pinned to 2026-11-20 14:00 EST, clear weather, 1200 × 720 viewport. Ground grids are byte-identical to `pipeline/prototypes/square-board/*/ground.i16`. Contexts were restaged with this head's `stage-*` scripts. Stills: [`log/ui/connector-repairs/`](log/ui/connector-repairs/). Camera matrices: `cameras/`. Signed probe output: `evidence/`. Probe scripts (scratch tools, not app code): `probes/`.

## Gate: the three-site calibration on this head

The frozen checker (`pipeline/prototypes/crossing-checks/check.py` at fixture **439abf84**, branch `study/crossing-check-calibration`) ran against faces exported from this head with the step-0 bounds and cameras, using the wide Peachtree export. The head contains both 1d04eadc repairs (Peachtree landing, 17th pier feet), so the mode is `combined`.

| Tier | 17th Street | North Peachtree | Capitol Gateway | `--expect combined` |
|---|---|---|---|---|
| High | pass | pass | walk support + joint grade (expected) | pass |
| Low | pass | pass | walk support + joint grade (expected) | pass |

The result JSON is **byte-identical** to the same checker run on the 1d04eadc fixture exports (`evidence/calibration-c8e3e34e-combined.json`). The registered limits hold on this head.

**Export pitfall.** The first Low export ran 17th as the first pose after page load. That pose exported a coarse board: 659 brookwood-south triangles in bounds, against 4,410. On that export the frozen checker stopped at `Missing shaft foot at (58.28, −4225.48)`, with 15 of 20 feet apparently floating by up to 1.098 m. A 30 s settle did not change it. Exporting 17th as the second pose, after a warm-up camera, gives 4,410 triangles and a clean pass. **Always export after a warm-up pose.** The A, B and C exports and all stills below were redone that way. Their board counts did not change.

## C. Spikes in the Connector lanes at Civic Center (priority 1)

**Site.** NB/SB Connector under the West Peachtree / Civic Center MARTA crossing, beside the large parking deck west of the freeway. The tall dark-blue glass tower in Sam's screenshot fits the tower northwest of the deck in the C1 still. That identification is unconfirmed: Sam to confirm the deck and tower.

| Still | Camera |
|---|---|
| [C1 wide, high](log/ui/connector-repairs/C1-civic-center-high.jpg) · [low](log/ui/connector-repairs/C1-civic-center-low.jpg) | [`cam=375,-1425,200,60,300`](http://localhost:5173/?view=city&cam=375,-1425,200,60,300) |
| [C2 close, high](log/ui/connector-repairs/C2-civic-center-spike-high.jpg) · [low](log/ui/connector-repairs/C2-civic-center-spike-low.jpg) | [`cam=375,-1425,200,66,80&dev&mindist=20`](http://localhost:5173/?view=city&dev&mindist=20&cam=375,-1425,200,66,80) |

**Root cause, with a concrete input.** North-band grid node **row 55, col 275** sits at City (375, −1425), 0.2 m from the NB Connector axis (ribbon 492215616, lane 2).

1. The raw USGS 3DEP 1 m DEM at the node is **308.0 m** NAVD88. Overpass and station-roof returns survive in this "bare-earth" grid.
2. `northConnectorGround` (`web/src/square-board/connector-ground.ts`) correctly floors the node to **294.6 m** (Civic Center NB floor, t = 0.444, side +0.76 m, weight 1). `area.grid.sample(375, −1425)` returns 294.6 in the running app.
3. `nodeHeights` (`web/src/terrain/surface-build.ts`) then overwrites the node from `pipeline/prototypes/connector-footprint/underpass-floors.json`, entry `[31130, 307.0]`. That file was baked by `underpass-floors.py` against the **raw** DEM. Its cover weight tapers from 1 to 0 over 9 m laterally and 16 m longitudinally (`(width+20−|t|)/9`, `(s+44)/16`, `(L+44−s)/16`). Here the cover is 0.067, so the node keeps 93% of the contaminated raw height.
4. The drawn surface reads **−16.8 m scene = 307.0 m**: `area.terrainAt(375, −1425)`. That is 12.4 m above the corrected floor. Two metres away, `terrainAt(380, −1423)` = −29.12 (294.68 m).

So the patch is applied after, and over, a grid correction it never saw. The key is the DEM sha (`b0d6…`), so nothing detects the conflict. `connector-ground.test.ts` stays green because its lane loop samples `grid.sample`, not the drawn surface.

**Where it fires.** Confirmed: **30 override nodes plus 4 isolated rendered peaks** (one shared). Candidates: 31 taper nodes outside Civic Center, not yet verified.

| Mechanism | Count | Where | Worst |
|---|---|---|---|
| 1. The patch overrides a grid correction (patch > corrected + 0.5 m). Node-exact | **30** of the 48 nodes where the patch overlaps the 223 Civic Center floor nodes | North-band only: Civic Center (29) and the Spring/Techwood feeder (1, +1.74 m at 255, −1440). Downtown and south-band have no grid-level correction, so this mechanism cannot fire there | **+12.40 m** at (375, −1425) |
| Isolated rendered peaks: a vertex > 1.5 m above every neighbour, ≤ 25 m from a motorway axis | **4**, identical on Low and High | (375, −1425) mechanism 1. (245, −1455): a raw node at the edge of the Spring/Techwood feeder floor pad (+1.9 m). (375, 760) and (460, 760): raw DEM point returns on the Capitol Gateway cover top (316.0 m against ~310 m) | — |
| 2. Candidates: a partial-cover taper inside a ground lane band sits > 1 m above the plane extrapolated from the patch | 52 nodes. 21 at Civic Center (overlapping mechanism 1, verified there). **31 elsewhere, unverified** | MLK Jr. Dr. 20 (ways 436808889, 755543582, 44698161, 755543580); Baker/Piedmont 2 (38974051); Decatur 8 (316454382); Courtland 1 (337901417) | Unverified: the extrapolated plane may be wrong where raw is a real ramp grade. At MLK the patch moves the node only 0.5 m (312.0 → 311.51) |

Before counting mechanism 2 outside Civic Center, check each site with a close still, the along-lane drawn profile and an overhead-deck raycast. Node lists: `evidence/c-override-nodes.txt`, `evidence/c-taper-nodes.json`. A ±12 m lane-residual census over all ground ribbons (`probes/census.*`) flagged about 1,500 samples. Most are grade breaks, carves, R16's graded southbound board, or ribbons tagged `ground` that are actually elevated (Sweet Auburn). It is a triage list, not a count.

**Repair (primitive: ground yield / graded floor, ordered once).**
- Apply `underpass-floors` **before** grid corrections. Equivalently, rebake it against the corrected grid so its taper blends into the floored values, not the raw DEM.
- Never let a patch raise a node above an earlier correction: `min(patch, corrected)` inside correction footprints.
- If mechanism 2 is confirmed at MLK, Baker or Decatur, the taper's outer weight must read a contamination-masked grid: exclude raw nodes under mapped deck and roof outlines, or interpolate across them from exposed class-2.
- Add a drawn-surface test: sample `GroundSurface.sampleScene` on every ground lane centre of the north-band ribbons on both tiers, and fail on a residual over 0.5 m against the floor profile. The existing test checks only `grid.sample`.
- Rebuild only; no `pnpm data` (the patch JSON is tracked).

## A. Sweet Auburn (priority 2)

**Site.** The Connector viaduct over Auburn Ave (z ≈ −180), Edgewood Ave (z ≈ −58) and Leonard Tate St, on the `auburn` board (x 1000–1800, z −520..280).

| Still | Camera |
|---|---|
| [A1 overview, high](log/ui/connector-repairs/A1-overview-high.jpg) · [low](log/ui/connector-repairs/A1-overview-low.jpg) | [`cam=1200,-150,150,58,380`](http://localhost:5173/?view=city&cam=1200,-150,150,58,380) |
| [A2 Auburn, high](log/ui/connector-repairs/A2-auburn-high.jpg) · [low](log/ui/connector-repairs/A2-auburn-low.jpg) | [`cam=1205,-180,100,66,150`](http://localhost:5173/?view=city&cam=1205,-180,100,66,150) |
| [A3 Edgewood, high](log/ui/connector-repairs/A3-edgewood-high.jpg) · [low](log/ui/connector-repairs/A3-edgewood-low.jpg) | [`cam=1205,-55,80,66,150`](http://localhost:5173/?view=city&cam=1205,-55,80,66,150) |
| [A4 ramp drop, high](log/ui/connector-repairs/A4-ramp-drop-high.jpg) · [low](log/ui/connector-repairs/A4-ramp-drop-low.jpg) | [`cam=1095,150,120,62,200`](http://localhost:5173/?view=city&cam=1095,150,120,62,200) |
| [A5 slab start in air, high](log/ui/connector-repairs/A5-slab-start-high.jpg) · [low](log/ui/connector-repairs/A5-slab-start-low.jpg) | [`cam=1096,240,0,60,70&dev&mindist=20`](http://localhost:5173/?view=city&dev&mindist=20&cam=1096,240,0,60,70) |

**Sources.** The viaduct is mapped as alternating `bridge` and untagged OSM ways. The Connector ribbons (`terrain/connector-corridor.ts`) carry that split:
- SB main: 962288411 (ground) → 38945231 (bridge, 5 then 6 lanes) → 1450888995 (ground) → 38945238 (ground).
- NB main: 337901392 (ground) → 1450888996 / 1003022422 (ground) → 1342094527 → 38945237 (bridge) → 1480458106 → 38945232 (ground).
- Links: 1414809190 (SB HOV, bridge), 38945230 (SB outer entrance, bridge), 1003022423 / 1003022424 (NB, bridge), 1450888998 (SB ramp, ground), 1450888999 (bridge) → 9239463 (ground).

The drawn decks follow `sweet-auburn-decks.json`: USGS GA B2 2018 class-17 returns, 3 m medians, 446 stations on 60 ways. Deck surfaces are 305.4 m (Auburn SB) and 306.6–306.7 m (Edgewood) over a 295–299 m bare-earth DEM. [Survey](connector-auburn-decks.md)

**Signed first failures (identical on Low and High).** Transverse probe of the drawn upper treads: `evidence/lateral-A-*`. Two-track joint probe: `evidence/joints2-A-*`. It follows both the highest road face and the board-level tread from 6 m upstream, because ground-kind ribbons here ride on lidar decks. Open-end probe: `evidence/ends-A-*`.
- **Offset slabs at Auburn, z = −180.** The SB main tread (x 1186.75–1207.85, y −19.201) meets the HOV/link slab (x 1207.90–1211.60, y −18.714) across a 0.05 m parapet gap with a **+0.488 m** step. On the NB side, x 1221.95 → 1222.00 steps **+0.387 m**. The open gaps between neighbouring slabs are 6.45 m and 5.10 m, with 0.881 m and −0.758 m height differences.
- **Offset slabs at Edgewood, z = −60.** SB outer entrance (−18.69) to SB main (−17.879) at x 1179.1: **+0.811 m**. NB link to NB main at x 1213.3: **+0.693 m**.
- **Slab starting in mid-air.** The NB multi-lane deck of 1450889003 starts at (1100.81, 244.49) with its tread 5.854 m above the ground 1 m before it. Its neighbour 1450889004 starts 4.171 m up at (1098.99, 242.80). No ribbon ends within 1 m of either start. See A5.
- Of 79 joint tracks in the A box, all pass the 2 mm step limit except one. **Bridge 1450888999 ends 8.402 m above its receiving ground ramp 9239463** at (1087.32, 155.15), measured 1 mm past the joint.
- Unverified open-end candidates, where the frames are inconclusive: 38970415 SB end at (1151.70, −325.49), 12.1 m above the ground 1 m beyond; 1081674705 SB end at (1201.04, −357.24), 9.0 m. Upstream, ground ramp 1450888998 dips 5.65 m below its neighbours under the deck at (1107, 120). Together these are Sam's "off-ramp dips with the ground then jumps onto the deck". Camera: `cam=1088,156,110,75,75&dev&mindist=20`.
- **"Road underneath stops at the carve" is not reproduced numerically.** The board under Auburn and Edgewood is continuous (largest 1 m jump 0.04 m). This is a visual-only finding. Sam, please confirm the spot in A2/A3. Candidates are the street paint at the Leonard Tate portals (1096, 134) and (1119, 240), or the streetcar slab ending at the deck carve.

**Repair.** Deck continuity: one slab per physical viaduct, grouped across OSM way splits and both lanes of a split. Fit one cross-section with crossfall, not per-way level profiles. Put parapets only on the structure's outside edges and at physical gores. The 17th Street slab is the pattern. Under-road pass-through: Auburn, Edgewood and Leonard Tate keep their street, walks and streetcar under the slab, with soffit clearance checked over the full width. Ramp grading with a maximum grade: carry 1450888998 → 1450888999 → 9239463 on one graded profile from the exposed class-2 ends, with no terrain dip under the deck. Retarget its ribbon kind from `ground` to deck where the lidar measured a deck.

## B. Freedom Parkway interchange and the Jackson Street bridge (priority 3)

| Still | Camera |
|---|---|
| [B1 interchange, high](log/ui/connector-repairs/B1-freedom-overview-high.jpg) · [low](log/ui/connector-repairs/B1-freedom-overview-low.jpg) | [`cam=1200,-700,200,55,430`](http://localhost:5173/?view=city&cam=1200,-700,200,55,430) |
| [B2 flyover ends, high](log/ui/connector-repairs/B2-flyover-ends-high.jpg) · [low](log/ui/connector-repairs/B2-flyover-ends-low.jpg) | [`cam=1235,-680,160,62,200`](http://localhost:5173/?view=city&cam=1235,-680,160,62,200) |
| [B3 Jackson bridge, high](log/ui/connector-repairs/B3-jackson-bridge-high.jpg) · [low](log/ui/connector-repairs/B3-jackson-bridge-low.jpg) | [`cam=1598,-697,250,62,180`](http://localhost:5173/?view=city&cam=1598,-697,250,62,180) |
| [B5 flyover start in air, high](log/ui/connector-repairs/B5-flyover-start-high.jpg) · [low](log/ui/connector-repairs/B5-flyover-start-low.jpg) | [`cam=1046,-498,90,60,70&dev&mindist=20`](http://localhost:5173/?view=city&dev&mindist=20&cam=1046,-498,90,60,70) |
| [B4 skyline eye, high](log/ui/connector-repairs/B4-jackson-skyline-eye-high.jpg) · [low](log/ui/connector-repairs/B4-jackson-skyline-eye-low.jpg) | Eye on the west walk, explained below |

**Interchange sources.** The flyovers are generic `bridge` runs without a lidar profile (`deckNavd88M` absent). `createSurfaceTransport` infers their height from the highest ground under the deck width plus 5 m clearance (+1 m) over crossed routes, carried flat between abutments placed at the OSM way ends. Ways:
- NB 38974058 (1058, −607) → (1228, −656) into ground 38974043.
- SB 38970413 (1239, −697) → (1145, −376) from ground 9239701.
- 38974028 / 38974034 (the register's "downtown ramps").
- 38974038, 462253885, 9236432 at the auburn edge, z ≈ −493.

**Signed first failures (identical on Low and High except where noted).** Two-track joints: `evidence/joints2-B-*`. Open ends: `evidence/ends-B-*`.
- **Flyover starting in mid-air.** NB 38974038 starts at (1045.81, −497.53). Its tread at (1046.05, −494.70) is −19.57 m, and 1 m beyond the start the only surface is the ground, **6.864 m** lower. No abutment, fill or preceding ribbon. See B5.
- **Joint steps over 2 mm.** 38974034 → 1450884828: −0.291 m on High, −0.307 m on Low. 9236432 → 38974053: −0.277 m. 462253885 → 9235919: −0.145 m. 38974028 → 38974051: unsupported, the next surface 0.714 m below.
- The other flyovers are as tall as their inferred clearance requires (5–7.5 m over the ground under the span). That is height, not a defect; the defect is the flat profile and the abrupt ends.

**Jackson Street bridge as drawn.** At z = −697 the roadway is 9.0 m wide (x 1593.95–1602.90, y −10.5). Two 1.95 m walk strips (x 1589.65–1591.60 and 1605.50–1607.45) are separated from it by **open 2.05 m and 2.55 m gaps**. The west walk sits 0.6 m below the road at z −697 and 0.79 m below it at z −715. The NBI record has one deck: 18.9 m out to out, a 13.4 m roadway and 2.4 m raised sidewalks on both sides behind a curb, with no barrier. Landmark record: [Jackson Street bridge](jackson-street-bridge.md).

**Skyline camera.** The eye stands on the drawn west walk at City (1590.6, −690). The walk tread is at y −10.936, and the eye is 1.6 m above it at y −9.336. It looks along bearing 285° (clockwise from north) with +2° pitch and a 40° vertical field of view. Matrices are in `cameras/B4-jackson-skyline-eye-*-camera.json`. The classic frame spans about 255–320°, from Georgia-Pacific to Bank of America Plaza. The orbit camera cannot reach eye height. The nearest orbit framing is B3.

**Repair.** Ramp grading with a maximum grade: profile every flyover from exposed class-2 and class-17 returns, as Sweet Auburn does, replacing the clearance-inferred flat deck. Land each end on its receiving way's tread across the full mouth, using the 17th/Peachtree terminal-edge primitive. Wherever a flyover starts or ends without a continuing ribbon (38974038, A's 1450889003/04), carry the deck to an abutment with fill or a retaining face, or to its real continuation. Sidewalk landing / one slab for Jackson: one 18.9 m deck carrying the roadway and both 2.4 m raised walks, with walk landings graded into the drawn ground at both ends. Sam's note says "separate sidewalks", but the NBI shows raised sidewalks on the same deck, so confirm with Sam before considering separate walk bridges. **New: stacked multi-level ramps.** 38974028 and 38974034 cross each other and the mainline at three levels. They need a movement and elevation register, like Capitol Gateway, before profiles.

## D. Capitol Gateway (hard case 1)

Unchanged from the register and the bridge plan. High on this head reproduces the frozen first failures exactly:
- Walk 755543611 at station 2.0248 m, offset −0.99 m, has its underside **196.768 mm** above the receiving cover.
- The joint 1451206626 → 561694953 at (295.08, 779.41) changes grade by **+74.575 pp**, against an envelope of −5.75..+2.50, with a **158.94 mm** step.

Low matches the same first failures (combined calibration above). This head also adds two raw DEM point spikes on the cover top at (375, 760) and (460, 760).
Stills: [D1 high](log/ui/connector-repairs/D1-capitol-gateway-high.jpg) · [low](log/ui/connector-repairs/D1-capitol-gateway-low.jpg), [`cam=357,777,-22,56,470`](http://localhost:5173/?view=city&cam=357,777,-22,56,470). [Plan](connector-bridge-plan.md#hard-case-1--capitol-gateway)

## E. I-20 / Connector (hard case 2)

Unchanged; see the plan and the six directed flyovers in the register. Stills: [E1 high](log/ui/connector-repairs/E1-i20-high.jpg) · [low](log/ui/connector-repairs/E1-i20-low.jpg), [`cam=190,1018,35,52,470`](http://localhost:5173/?view=city&cam=190,1018,35,52,470). [Plan](connector-bridge-plan.md#hard-case-2--i-20--connector)

## Repair order and primitives

| Order | Spot | Existing primitive | New work |
|---|---|---|---|
| 1 | C | Ground yield / graded floor (order fix), drawn-surface lane test | Verify the mechanism-2 candidates; contamination-masked taper if confirmed |
| 2 | A | Deck continuity (one skew slab), under-road pass-through, ramp grading with max grade, abutment at open ends | Grouping alternating bridge/ground ways into one viaduct; per-structure crossfall |
| 3 | B | Ramp grading, sidewalk landing, terminal-edge landing, one-slab walks for Jackson (landmark) | Stacked multi-level ramps (38974028/34 over the mainline), lidar profiles for the north-corner flyovers |
| 4 | D | Asymmetric slab, walk grading (planned) | As planned |
| 5 | E | Continuous slab, open lower ramp (planned) | Spaghetti-fixture movement register |

Every rebuild reruns the three-site calibration on both tiers with the unchanged 439abf84 limits and publishes matched before/after stills from the cameras above. The A, B and C probes reuse the checker's `faces.py`/`Layer` primitives with its 1 mm open and 2 mm flush-step limits at new sites. The checker itself was not changed.
