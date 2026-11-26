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

## Built

### D1: the lid's streets and walks on the lid

`lids.py` writes the lid outline (`lids.json`, from the pinned Overpass source), and `web/src/terrain/lids.ts` uses it:

- **South band.** `lidRoads` runs before `southConnectorTransport` builds its decks. Bridge-tagged roads that lie wholly on a lid (all 35 there) become ordinary roads on the board, so no deck is built for them.
- **Downtown.** `applyLids` cuts baked bridge runs at the lid outline, and the pieces on the lid become ground runs. Downtown's board ends at z = 700 in the lid's northern tip, so this flips three short service runs; a run that only touches the outline at a corner stays a bridge.

The concealed lower lanes are unchanged.

**Measured (both tiers identical; [d-lid](log/ui/connector-repairs/d-lid/)):**

| Check | Before | After |
|---|---|---|
| Lid ways: drawn surface minus the way's own lidar surface, every 1 m (1,005 samples) | Decks 1–6 m above the lid; 783 samples with nothing within 1 m | p5 −0.10, median 0.00, p95 +0.15 m. 26 samples over 0.5 m, all on the two DEM spikes (D2) |
| Checker, Capitol joints (its own method, walk tops read from the board where no walk deck exists) | All six outside the class-2 envelope: 59–95 pp, steps up to 0.60 m | All six inside: −2.2 to +1.7 pp, steps ≤ 0.1 mm |
| Checker, walk support (1,398 samples) | First unsupported: 755543611 at 197 mm; largest walk gap 6.69 m | No gap anywhere |
| 439abf84 gate, 17th Street and Peachtree, Low and High | — | Byte-identical to the reference |
| Triangles at the Capitol camera | — | −7,020 High, −7,080 Low (about 30 decks gone) |

**The gate's Capitol site.** `check.py`'s Capitol check reads the walk and street *deck* layers. With the decks gone it stops with "Empty mounted selection" in every mode, `--expect repaired` included, because that mode assumed a deck repair. The numbers above come from the same function run in a scratch copy (`evidence/lid_probe.py.txt`) in which an empty layer becomes an empty selection and a walk's top falls back to the board. Re-baselining the Capitol site therefore needs a lid-aware Capitol check in the study branch's `check.py`. That is a checker change, and the register's rule applies: rerun the full three-site calibration after it.

**Stills** (day, matched frozen cameras; BEFORE is B2): [L1 High: the lid](log/ui/connector-repairs/d-lid/L1-high-before-after.jpg) · [L1 Low](log/ui/connector-repairs/d-lid/L1-low-before-after.jpg) · [L1 night High](log/ui/connector-repairs/d-lid/L1-night-high-before-after.jpg) · [L1 night Low](log/ui/connector-repairs/d-lid/L1-night-low-before-after.jpg) · [L2 High: the 1451206626 joint](log/ui/connector-repairs/d-lid/L2-high-before-after.jpg) · [L3 High: walk 755543611](log/ui/connector-repairs/d-lid/L3-high-before-after.jpg) · [L4 High: Memorial and Capitol](log/ui/connector-repairs/d-lid/L4-high-before-after.jpg), with the Low versions beside them. Cameras: `cam=357,777,-22,56,470`, `298,782,60,62,60`, `370,778,250,62,60`, `350,778,20,60,90`, with `&dev&mindist=20`.

**Deploy.** A `web/dist` rebuild only.

### D2: the lid's ground edits

`lids.py` checks every south-band grid node inside the lid outline against the class-2 returns within 2.5 m of it. `underpass-floors.py` merges the results into `underpass-floors.json`, which the City already applies before tessellation:

- **Spikes.** A node more than 1 m above the median, or more than 0.5 m above it where the returns are contaminated (90th percentile 3 m above the median), takes the median. That catches five nodes near (365–375, 760–765). Something overhead was classified as ground there, so the grid read 311.3–316.0 m over a 310.3–310.5 m lid.
- **Edge sags.** Within 5 m of a lid street or walk, a node more than 0.5 m below the median, where some returns come from the cut (10th percentile 2 m under the median), takes the median. That catches two nodes at the south portal, (330, 875) and (340, 885). A 5 m grid cannot resolve the lid's edge, and service road 561694954 had dropped 1.9 m into the cut there.

**(460, 760) is not a spike.** The phase-1 note listed it, but that node matches the lid top (class-2 median 309.2 m). It only stands out beside the cut at the lid's east edge.

**Measured (both tiers; [d-lid/d2](log/ui/connector-repairs/d-lid/d2/)):**

| Check | D1 | D2 |
|---|---|---|
| Lid ways: drawn surface minus own lidar surface (1,005 samples) | p5 −0.10 / median 0.00 / p95 +0.15 m. Max +5.3 m, min −1.9 m | p5 −0.09 / median 0.00 / p95 +0.09 m (High). p99 0.19 m, range −0.43 to +0.37 m |
| Samples beyond ±0.3 m | 35 | 7, at two places the 5 m grid cannot resolve: walk 1451206629 near (287, 788) on a node 0.6 m below uniform returns, and walk 1451206638 near (390, 762) |
| Checker's Capitol method on the lid | All joints inside, no walk gap | Unchanged: all six joints inside, steps ≤ 0.1 mm, no walk gap |
| 439abf84 gate, 17th Street and Peachtree | Byte-identical | Byte-identical |
| `underpass-floors.json` | — | 7 nodes added on the south-band grid; every other edit unchanged |

**Stills** (day and night, matched frozen cameras; BEFORE is D1): [L4 High: Memorial and Capitol](log/ui/connector-repairs/d-lid/d2/L4-high-before-after.jpg) · [L4 night High](log/ui/connector-repairs/d-lid/d2/L4-night-high-before-after.jpg) · [P1 High: the spike cluster](log/ui/connector-repairs/d-lid/d2/P1-high-before-after.jpg) · [P2 High: the south portal](log/ui/connector-repairs/d-lid/d2/P2-high-before-after.jpg), with the Low versions beside them. Cameras: `cam=372,763,200,62,45` and `335,878,20,62,70`, with `&dev&mindist=20`.

**Deploy.** A `web/dist` rebuild only. `underpass-floors.json` is bundled, and the staged ground files do not change.

### The gate's Capitol site, re-baselined

**Checker.** `check.py`'s Capitol check now reads a lid model: branch `samsolomon/crossing-check-lid` at 846cb5b8, off `study/crossing-check-calibration`. Absent street and walk deck layers give no hits, and a walk's top falls back to the board. Nothing else changes. The calibration shows the checker change alone moves no result: old (439abf84) and new checker outputs are byte-identical on every run ([evidence](log/ui/connector-repairs/d-lid/gate/calibration-old-vs-new.json)):

| Export | Mode | Old vs new |
|---|---|---|
| step0 | `baseline` | Byte-identical |
| step0-beb9b2d0 | `peachtree` | Byte-identical |
| step0-1d04eadc | `combined` | Byte-identical |
| B2 head 70cdd4af (before D) | `combined` | Byte-identical, and the same result as step0-1d04eadc |

**D's result.** On the D2 export, `--expect repaired` passes ([result](log/ui/connector-repairs/d-lid/gate/d-repaired.json) against the [439abf84 reference](log/ui/connector-repairs/d-lid/gate/ref-439abf84-combined.json)):

| Site, Low and High | 439abf84 (accepted limits) | D |
|---|---|---|
| Capitol walk support | Failed: first unsupported 755543611 at station 2.0248 m, 197 mm; largest walk gap 6.69 m | Passes: no gap in 1,398 samples |
| Capitol joint grade | Failed: all six joints outside the class-2 envelope (59–95 pp; steps up to 0.60 m) | Passes: all six inside (−2.2 to +1.7 pp), steps ≤ 0.1 mm |
| 17th Street, Peachtree | Pass | Byte-identical |

**Review round 1 (Grok).** The check could pass vacuously, because an absent deck layer became no hits and a walk fell back to the board. The checker (e2b253ee) now requires the lid to be **found** whenever any walk sample falls back to the board, or Capitol fails with `lid not found`:
- the board sits within 0.30 m of the cover's class-2 median at 95% or more of centreline samples on every registered street and walk;
- the board is found at 80% or more of each way's stations;
- no street deck stands above it;
- at least 1,000 walk samples and all six joints are evaluated.

On D2 it reads 1,398 walk samples on the board and 1,138 lid samples, 100% matched, with no deck above. The calibration is still byte-identical, and three negative cases fail ([evidence](log/ui/connector-repairs/d-lid/gate/calibration-old-vs-new.json)):
- the board raised 1 m: `lid not found`;
- walk decks removed but street decks kept over the lid: `lid not found` and `joint grade`;
- no board: the check stops.

**Review round 2 (Grok).** The 95% share and 80% coverage were totals over all ways, so a short way could hide inside them. With the board 1 m high on the 10 stations of the 1011 limb (1451206626), the lid still matched at 0.991 and passed. A deck 2 m above a 19 m hole in the board (38 of the 194 stations on 561694953) was never tested, because the deck test ran only where the board was found. The checker (daaa6bbd) now holds each way on its own, and adds a deck test and a joint-step rule:
- **Each way:** at least six stations, the board found at 80% or more of them, and within 0.30 m at 95% or more of those.
- **Decks:** a deck is tested against the class-2 median wherever the board is missing.
- **Joints:** any joint whose two sides differ by more than 2 mm fails with `joint step`, in every mode. The unrepaired Capitol has steps up to 0.60 m, so the `baseline`, `peachtree` and `combined` modes now expect it.

D still passes: all 15 ways are 100% found and matched, the smallest has 10 stations, and no joint steps more than 0.12 mm. Both of Grok's inputs now fail; the e2b253ee checker passed them. On the four earlier calibration exports, 17th Street and Peachtree are byte-identical, and Capitol changes only by adding `joint step` to its failures ([evidence](log/ui/connector-repairs/d-lid/gate/calibration-old-vs-new.json), `round2`). `test_lid.py` on the checker branch builds both inputs as synthetic scenes.

`pipeline/scripts/test_gate_sites.py` (run by `pnpm test`) checks only that the committed gate evidence is consistent: the 439abf84 reference against the D result, Capitol passing, and the lid found. It reads JSON, so it cannot catch a code regression. `web/src/terrain/lids.test.ts` holds the code: the lid roads draw on the board, and the drawn ground sits at the lid top. **Open, outside D:** the south-band board carries the covered Connector under the lid as a plain ground road (OSM `covered=yes` is not mapped to a tunnel there), so its centreline reads the lid top. D2's spike correction moves it 1.99 m at (367.4, 760.3), back to the lid level. Whether its cars should run under the lid is a separate item.


### The covered Connector as a tunnel (after D)

Sam reviewed D's south-portal still on 2026-11-26: "What's happening under the highway? The Connector just stops and goes into a cliff." Under Capitol Gateway the Connector runs on eight covered ways (OSM `covered=yes`). The board is a heightfield, so its top is the lid and nothing is drawn under it. The open cut's roads ran into a ground wall at each mouth, and the cars vanished there. Sam chose to model the tunnel (2026-11-26).

`web/src/terrain/capitol-tunnel.ts` follows the North Line portal at Brookwood:

- **Mouths.** There are ten, one at every end of a covered way that meets an open one: four at the north-east end and six at the south-west. Each tube spans its way's surveyed section plus a 1.2 m shoulder each side.
- **Tube.** A concrete headwall rises from the 5.2 m clearance to the lid edge. A tube runs 30 m in under the lid, with walls, ceiling and floor fading to a black end cap. Two rows of crown lamps run every 6 m. They glow by day and brighten at night.
- **Board cut.** One covered slot per mouth cuts the board from 2 m outside the mouth to the tube's end, but only up to the ceiling (`cutHeightM`). The lid's own streets above stay whole.
- **Seam.** The north-east mouths straddle the z = 700 seam between the downtown and south-band boards, so both boards cut the same slots.
- **Floor levels.** Each mouth's floor is the open cut's board just outside it. The levels are pinned in `MOUTH_FLOORS`, and `capitol-tunnel.test.ts` holds them to the committed ground grids. The lid top stands 6.0–10.4 m over these floors, so every tube fits.
- **Cars.** On a covered way a car keeps the mouth's floor for 22 m, then vanishes in the dark, as the North Line's trains do. Before this it vanished at the mouth.
- **The lid road.** `lidRoads` flags the south band's eight motorway records on the covered ways as `tunnel`, so nothing samples the lid top for the freeway under it. Before this, Grok's 1.99 m centreline change came from that record.

**Truth tiers.** The covered ways come from OSM, and the cut floor and lid top from lidar. The headwall form, tube depth, clearance and lamps are illustrative: there is no photograph of the mouths in this repo yet.
