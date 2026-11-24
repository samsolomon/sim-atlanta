# Whole-way tread pilot

Frozen before fitting on f0de61a3: Williams 1450813223/225 and the neighbouring ground 1450813220 at z=−1300. The holdout is 9235148 at z=−300. Its axis and lane count are catalogued. The south Connector survey already contains exit248c stripe picks for it. Exclude those picks, edited terrain and rendered heights from the solve. This is a blind interior split on a catalogued alignment.

A source run has a directed provider ID, original vertex sequence, station in metres, mode, and separate provenance for width, elevation, and connectivity. Represent crossing order independently of routing. Solve on full geometry before any tile owns a fragment. Generate each tread triangle once; cut its 3D vertices and station attributes at tile boundaries. Render probes raycast the emitted geometry; wheels use City's triangleHeight on the owning surface.

Architecture review, November 24: independent axis clips lose skew corners. Clip faces, retain source station and constrain connected approach endpoints before splitting. Product review: source sidewalks can have connected endpoints without measured widths; report the path and leave its physical edges unknown. A posted vehicle restriction is a separate field from modeled and surveyed soffit clearance.

## Running the pilot

From the repository root with the project Python environment (Shapely), web dependencies and Node 24 installed:

```sh
.venv/bin/python pipeline/prototypes/preclip-transport/pilot.py > /tmp/preclip-transport.json
node pipeline/prototypes/preclip-transport/probe.mjs < /tmp/preclip-transport.json
```

The bake emits 24 identified surfaces. The probe constructs Three.js meshes, raycasts their clipped faces, and runs the City's wheel-height function against the same triangles. This exercises two geometry consumers locally. Production City drawing, routing and train assignments remain outside the experiment. Each warning in the output survives a successful probe exit. Success checks the fixture invariants, including that the recorded observations can be replayed.

## Williams and the held-out split

Existing High-tier Williams samples straddle the board edge at z = −1300. The holdout reference is a single Sweet Auburn board on 650ccca8 with a virtual cut at z = −300. Its Low and High results agree. The existing step below is the largest height difference between the nearest available samples on opposite sides of the cut. Where samples are missing it includes the intervening distance. The pilot can query both tile owners at the exact same point.

| OSM way | Missing original wheel samples | Existing step across cut | Missing at original XY after bake | Inferred pilot width | Pilot grade change across cut |
|---|---:|---:|---:|---:|---:|
| Williams 1450813223, two lanes | 33/265 | 1.690 m | 0/265 | 7.10 m | 0.2095 pp |
| Williams 1450813225, one lane | 85/405 | 0.561 m | 0/405 | 3.55 m | 0.0354 pp |
| Williams 1450813220, three lanes | 5/405 | 0.021 m | 0/405 | 10.65 m | 0.0006 pp |
| Sweet Auburn 9235148, two lanes | 0/165 per tier | 0.0005 m | **18/165 per tier** | 7.10 m | <0.0001 pp |

On each revised strip, all 85 center, wheel and near-edge samples return a height. Across 41 transverse samples per strip the worst tile-to-tile step is below 0.000001 m. Grade change compares 0.2 m intervals on either side. The original two Williams bridge center tracks differ by 1.670 m and 0.561 m across missing tread. Their grade through the gap is unknown. On the three-lane control, only two reference tracks support a grade-change calculation at the cut (worst 19.99 percentage points).

**The holdout failed carrier identification.** At the 147 original positions per tier where both meshes provide a height, the frozen result is 9.835–10.438 m below the independent reference. Its strip also misses original edge samples. The observed reference span at the cut is 7.486 m. Fit inputs omitted the prior exit248c imagery stripe picks and the Sweet Auburn deck catalog. After freezing, matching both source ends in the catalog exposed a lidar-backed deck profile from 305.30 to 303.57 m NAVD88 across the 203.82 m link. The existing board applies that profile in auburnTransport. The blind solver treated the register's ground classification as sufficient. The reference and deck evidence conflict with that choice. Its crossing order and actual soffit clearance remain unresolved. Surface rows and clipped vertices for all 24 surfaces match the frozen bake at a142fad858332c5b4dd681089135d488e6690d7f.

## Vertical checks and evidence gaps

- At Williams, original rendered tread-to-tread separations over OSM 39449296 are 5.074 m and 2.392 m on the two- and one-lane bridges. With an assumed 0.95 m structural depth, the revised **sampled minimum soffit openings** across the overlap are 5.835 m and 5.146 m. The trial opening is 5 m. Surveyed soffits, structural depth and minimum real clearance are unknown.
- The Williams approaches meet modeled ground at all four outer ends within 0.001 m. Both bridge profiles still reach 8%. The sharpest transition on 1450813223 is **15.20 percentage points over 1 m**. On 1450813225 it is **11.64 points over 0.903 m**. These abrupt changes keep the vertical fit open. The 8% envelope is a numerical assumption. The probe reports transition distance and rate and flags an approach that runs out of length above its ground tie-in.
- At Ellis, ways 115789929 and 38974057 meet at node 69117204 with zero center step using the accepted inferred joint height. The earlier rendered joint had a 0.12 m step. The accepted height preserves local work and provides a regression anchor. Real approach slope remains unknown.
- Spring/10th has a common height on four incident roads at node 69616397. Crossing 1001561467 joins both mapped sidewalk axes at shared OSM nodes. Physical sidewalk widths, edge positions, permitted lane connections and surveyed stop positions remain unresolved. The probe validates the mapped endpoint continuation.
- At Grant Street, FRA crossing 643081D places eight rail axes above road 144588627. The smallest sampled modeled opening is 4.215 m, consistent with the earlier 4.21 m render sample. The 4.10 m regression threshold and 4.0894 m posted vehicle restriction serve different purposes. Railhead, soffit, concealed road and true minimum clearance lack direct measurements. The eight axes use the existing local rail fixture. Rail station here is local to that fixture. The rail probe is synthetic. [Grant crossing evidence](../../../docs/king-freight-crossings.md)

Use road class, **design** speed and terrain together for plausibility checks on inferred geometry. Two supported examples are 4% for a rolling freeway at 65 mph and 9% for a rolling urban arterial at 30 mph. Ramps need ramp-specific criteria and rails need rail-specific criteria. These fixtures lack verified design speeds. Report unmatched cases as unresolved, retain independently measured heights, and carry a conflict when available approach length cannot connect anchors plausibly. [GDOT Design Policy Manual, Table 4.5](https://www.dot.ga.gov/PartnerSmart/DesignManuals/DesignPolicy/GDOT-DPM.pdf)

## Next bounded slice

The repository already supplies OSM IDs and nodes, terrain samples, local deck corrections, and a triangle-based wheel query. This prototype adds whole-strip stationing, structural relationships, clipping across a common boundary, and paired render/wheel checks. Before adjusting any slope limit, resolve carrier identity and crossing order on the full source interval using independently sourced deck returns and topology. Withhold a fitted vertical profile where order remains ambiguous. Then check vertical curves, approach length, surveyed widths where available and clearance on an independently selected corridor.

For future expansion, Spaghetti Junction would exercise ramp connectivity through several levels where a plan-view intersection alone gives no route connection. Inman Yard would exercise parallel axes on a shared graded track bed, with routing restricted to verified switches. Both are design references for later work.
