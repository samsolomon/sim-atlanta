# Capitol Gateway and I-20: register and plan

Registration and plan for the last two Connector repairs, D (Capitol Gateway) and E (I-20), November 26. **No geometry changes.** It follows the B2 method ([stacked ramps](connector-stacked-ramps.md)): a movement and elevation register first, then measured findings, ordered steps and acceptance criteria. [Connector repairs](connector-repairs.md) · [Crossing register](connector-crossing-register.md) · [Bridge plan](connector-bridge-plan.md)

## Method

`pipeline/prototypes/connector-footprint/interchange-register.py` writes `interchange-register.json`:

- **Ways.** Every highway way, walks included, that runs at least 8 m inside each area. They come from the pinned south-band Overpass source (`square-board/source/south-band.json.gz`), so OSM ids and tags are exact. Capitol Gateway is the box x 230–520, z 690–880 (87 ways). I-20 is x −60–330, z 880–1100 (34 ways). The south band stops at z = 1100.
- **Own surface.** Each way's surface is tracked in the 2019 USGS cloud exactly as for B2: class-2 and class-17 clusters every 5 m, walked continuously from the drawn ground.
- **Drawn ground.** Taken from the south-band and downtown grids with underpass edits. For I-20, it also records the class-17 profile `south-connector-decks.ts` already draws.
- **What the City draws.** A browser raycast samples every way every 1 m on both tiers and compares the drawn surface nearest the way's own height. Probes and outputs: [interchanges](log/ui/connector-repairs/interchanges/).

Low and High read the same everywhere below.

## D. Capitol Gateway

### What is there

The mapped deck outline 1451206624 (`man_made=bridge`, 16,181 m², x 281–463, z 685–887) is a **lid**. Its top is landscape and streets at grade: Memorial Drive, Capitol Avenue, the two diagonal links, service roads and walks. The Connector and its branches run concealed beneath (`covered=yes`). The 2019 classifier labels the lid top as ground (54,042 class-2 returns inside the outline, against 160 class-17). So the board's DEM already *is* the lid top.

The lid top is not a plane. It spans about 307–314 m. One fitted plane leaves 1.19 m RMS, and two planes split along the long axis still leave 1.10 and 1.14 m. This is a warped surface that follows the street grades.

### What the City draws today

OSM tags every street and walk on the lid `bridge=yes`. The City draws each one as a **clearance-inferred deck over the concealed freeway**, raised above the lid:

| Measure (32 bridge-tagged ways on the lid) | High | Low |
|---|---|---|
| Samples with a drawn deck within 1 m of the way's own surface | 222 of 1,005 | 222 of 1,005 |
| Where one is within 1 m, drawn minus own (p5 / median / p95) | −0.25 / +0.16 / +0.87 m | −0.25 / +0.16 / +0.87 m |
| Elsewhere | Decks 1–6 m above the lid | Same |

Meanwhile the own surface of every one of those ways tracks the board within ±0.1 m (median 0). That holds for Capitol Avenue, Memorial Drive, 561694953, 563545716, the service roads and walks 755543610–616 and 1451206629–642. The phase-1 fixture failures are two symptoms of the same thing:
- walk 755543611 hanging 196.8 mm over the "receiving cover";
- the joint 1451206626 → 561694953 at (295.08, 779.41), with a +74.6 pp grade change and a 158.9 mm step.

The D1 still shows it: [high](log/ui/connector-repairs/D1-capitol-gateway-high.jpg) · [low](log/ui/connector-repairs/D1-capitol-gateway-low.jpg).

**This replaces the bridge plan's "one asymmetric slab".** The surface those movements need is the lid the board already draws, not a new deck.

### Steps

1. **D1. Draw the lid's streets and walks on the lid.** Inside outline 1451206624, bridge-tagged roads and walks become ground runs on the board: in `southConnectorTransport` for the south band, and in the downtown hook for the part north of z = 700 (the outline spans the seam). Roads and traffic follow the board. The concealed lower lanes stay as they are. Edge cases to settle in the step:
   - walk ends that reach past the lid's edge over a mouth or the garage, where own minus ground reads −4.4 to −5.3 m (755543611 s 25–30, 755543612, 1451206638, 662771226);
   - the street ends where the outline meets land.
2. **D2. Two DEM spikes on the lid top** at (375, 760) and (460, 760). Remove them in the board corrections (an `underpass-floors`-style node patch), and confirm there are no others on the lid.
3. **D3. Stills, day and night**, from the phase-1 camera `cam=357,777,-22,56,470`, plus close views of the 1451206626 joint and walk 755543611.

### Acceptance (both tiers)

- Every bridge-tagged way on the lid draws within 0.15 m of its own surface, on the board, with no deck more than 0.5 m above the lid.
- The two frozen phase-1 failures are gone: walk 755543611 has no gap to the lid, and the 1451206626 → 561694953 joint has no step over 2 mm and stays inside the class-2 grade envelope.
- Cars on Memorial, Capitol and the diagonals ride the lid (`cityRoadHeight`), with no gaps.
- Concealed lanes are unchanged.
- **Gate:** the 439abf84 fixture records Capitol Gateway's current first failures as accepted limits. D removes them, so the `capitol` site's result will change. Before D ships, the coordinator should decide whether to re-baseline that site's expectation. The 17th Street and Peachtree sites must stay byte-identical.
- Triangles should fall, since about 30 decks become board pavement. Record the change.
- Deploy: `web/dist` rebuild. D2 regenerates `underpass-floors.json`, so it needs `pnpm data` only if it touches staged ground. Say which in the PR.

## E. I-20

### What is there

Thirty-four ways, twenty of them already drawn on class-17 profiles (`south-connector-decks.ts`). The flyovers stack up to about 319 m (442591112) over the I-20 mainlines (310–315 m), the lower ramps (about 302–303 m) and the Connector (about 291–294 m).

### What the City draws today

| Measure | Result (High; Low the same) |
|---|---|
| Profiled ways: drawn minus own, p5 to p95 | Within −0.19 to +0.24 m on every way (the 0.12 m deck lift plus profile noise) |
| Register rows 2–3: the eastbound split at (190.06, 1018.38) and the westbound split at (204.40, 994.33) | Joints −0.001 m and +0.036 m over 0.97 m (that is the grade). Continuous |
| The lower ramp 39160308 under eastbound I-20 | Open, drawn at 302.91 against 303.02 measured, 11.22 m soffit clearance |
| Crossings with both levels drawn (11) | Soffit to lower tread 7.91 to 18.18 m |

**What is still wrong:**
1. **Washington Street SW (39160883) is drawn on the ground** under the 442591112 flyover. Its own surface is 307.3–310.0 m along x −5 to −34, z 882–926, and the City draws it at 302.4–305.2 m. OSM gives it no bridge tag, but the lidar shows a structure. Its sidewalk 1388990213 (`bridge=yes`) is a clearance-inferred deck about 5.5 m low (304.4–305.0 against 307.9–310.4). The walk beyond it, 1388990214, is about 3 m low. Neither crossing under 442591112 can be measured until they are lifted. With the flyover at 319.1 m, about 8 m would remain.
2. **Two profile joints step.** 316454361 → 39160300 at (260.46, 1022.97) steps +0.22 m. 181273020 → 39160311 at (110.84, 939.22) steps −0.11 m. These are partial-range profiles that do not end on their neighbour's height.
3. **Beyond z = 1100.** Several ramps (38964489, 38964506, 39160316, 39160317, 39160321, 181273020, 316454371, 358753576) run past the south band's edge, where nothing is drawn. That is the board limit, not a defect.

### Steps

1. **E1. Washington Street over I-20.** Survey it as a street bridge, the Jackson (B1) primitive in `street-bridge-survey.py`: measured rows, integral walks. No `man_made=bridge` outline is mapped, so the deck edge has to come from the road axis plus the inventory width. Look up the NBI record first and link photos, per the landmark rules, if it qualifies. Its walks 1388990213 and 1388990214 land on its rows.
2. **E2. Close the two profile joints.** Pin 39160300's start to 316454361's end height, and 39160311's start to 181273020's, in `south-connector-decks.ts`. Or extend the partial ranges to the shared vertex. No new survey is needed.
3. **E3. Stills, day and night**, from `cam=190,1018,35,52,470` and close views at the two joints and under 442591112.

### Acceptance (both tiers)

- Washington Street and its walks draw within 0.3 m of their own surface. The two crossings under 442591112 keep their order with soffit clearance of at least 4.5 m.
- Both joints are under 2 mm, and no other E joint moves.
- Every profiled way stays within its current drawn-minus-own band. All 11 resolved crossings keep at least 4.5 m.
- The 439abf84 gate is byte-identical (its sites lie outside E).
- `pnpm test` and `pnpm build` pass. Deploy: `web/dist` rebuild only.

## Order, ownership and dependencies

D first (higher on the crossing register, and more visible), then E. Each step is its own commit with matched stills, as in B2. I own both.

- **Code they touch.** D1 and E2 touch `south-connector-decks.ts`, the downtown hook in `ramp-decks.ts` or a sibling, and possibly `transport.ts` for draping bridge-tagged runs. E1 touches `street-bridge-survey.py` and `street-bridges.json`.
- **Integrator overlap.** The integrator is slicing `loadNorth` and `loadEast` (`sweet-auburn-board.ts`, `king-memorial-board.ts`, `city.ts`, and an `inConnectorLanes` prefilter). B2 needs a rebase onto that first. Check their branch before editing `transport.ts` or `sweet-auburn-transport.ts`.
- **Open before building.** The coordinator's call on re-baselining the gate's Capitol site (D). The Washington Street inventory record and photographs (E1).
