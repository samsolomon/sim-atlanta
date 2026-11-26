# Stacked ramps: Freedom Parkway, MLK and Baker

Registration for B2 (November 26). **No geometry changes.** It freezes the movement and elevation register that the plan asks for before building multi-level ramps. That covers the Freedom Parkway interchange flyovers, the MLK SB ramps and the Baker exit. [Connector repairs](connector-repairs.md) · [Crossing register](connector-crossing-register.md)

## Method

[`ramp-register.py`](../pipeline/prototypes/connector-footprint/ramp-register.py) reads every mapped Connector way in [`ways.json`](../pipeline/prototypes/connector-footprint/ways.json) that runs at least 8 m inside one of three boxes: Freedom Parkway (x 880–1700, z −900…−430), MLK (x 530–690, z 540–625) and Baker (x 840–1060, z −900…−760). For each way it tracks the way's **own** surface in the 2019 USGS GA B2 cloud:
- **Stations.** Every 5 m, the class-2 and class-17 returns within 2.4 m split into height clusters (gaps over 1.5 m, at least 4 returns each).
- **Seed and walk.** The walk starts at the end whose cluster sits nearest the drawn ground, then keeps the cluster continuous with the last accepted station. The allowance is 1.2 m plus an 8% grade across stations hidden under a structure overhead.
- **Each way also records:** connectivity by shared endpoints, how City draws it today, the drawn ground beneath it (with the underpass-floor and Leonard Tate edits applied), and each crossing ordered by tracked height.

The result is [`ramp-register.json`](../pipeline/prototypes/connector-footprint/ramp-register.json): 62 ways and 22 crossings, of which 18 are ordered. Ways on the ground track within 0.03–0.17 m of the drawn board, which is the method's control.

Drawn-today heights on the north-corner board come from a headless build: the drawn tread nearest each station's own level ([data](log/ui/connector-repairs/b2-register/north-corner-drawn-vs-measured.json)). Downtown heights come from the [MLK/Baker follow-up](connector-repairs.md#taper-follow-up-mlk-and-baker-are-stacked-ramps-november-26).

## Movement and elevation register

Elevated movements only: own surface more than 1 m above the drawn ground. Heights are NAVD88 m from start to end of each way in OSM order. "Drawn minus own" is the worst departure today.

| Movement | Ways (OSM order) | Own surface | Drawn today | Drawn minus own |
|---|---|---|---|---|
| NB flyover to Baker | 39169033 → 1450884829 → **38974028** (bridge) → **38974051** | 300.2 → 301.2 → 300.0 m, then 299.9 → 300.5 m into the Baker junction at street level | 38974028 clearance-inferred; 1450884829 and 38974051 on the ground | −8.2 to −9.2 m on the north-corner side. The Baker exit was drawn 3–6 m low under its approach (follow-up) |
| SB flyover from Baker | 9235483 → **38974034** (bridge) → 1450884828 → 38974031 | 299.2 → 300.6 → 299.8 m, then 299.7 → 299.4 m | clearance-inferred, then ground, then surveyed | −7.7 to −8.7 m |
| NB climb to Freedom Parkway | 1051688672 → 9235707 → **38974058** (bridge) → 38974043 | 291.0 → 300.5 m, then 300.6 → 310.4 m (95% tracked), then 310.1 → 302.3 m on its own fill | ground, then a flat clearance-inferred deck, then ground | 9235707 −3.5 m at its top. 38974058 −2.4 to −6.0 m: drawn flat-ish 296.5 → 307.4 m against a 300.6 → 310.4 m climb |
| SB flyover over the interchange | 9239701 → **38970413** (bridge) | 307.6 → 315.2 → 310.7 m | surveyed on the auburn board; clearance-inferred on north-corner | down to −7.9 m on north-corner |
| SB exit leg | 38970425 → 9236432 / 462253885 | 303.6 → 304.3 m | surveyed decks | within 0.02 m |
| NB to Freedom Parkway (auburn edge) | 1450884836 → **38974038** → 1450884835 → 38974039 | 303.9 → 304.1 → 303.4 m, then down to 300.4 m | surveyed. The phase-1 open start of 38974038 sits at the auburn edge | phase 1: 6.86 m open start |
| MLK SB ramps | 9236952 → **436808889** → **755543582** → 44698161 / 436808888 / 755543580 → 755543583 | 309.0 → 311.6 → 312.1 m, then 312.2 → 313.0 m up to the MLK deck | ground on the board, tapered down by the MLK covered-pavement patch | 1–6 m low (follow-up) |

Covered lower roads under the Baker cap (1051688672/74/75) track only 24–56% of their length, because the walk can lock onto the cap returns above. Their "above ground" values are not used.

## Crossing register

All gaps are tracked upper surface minus tracked lower surface. None is a modelled clearance. Crossing heights come from `ramp-register.py`'s `at()`, which interpolates the tracked `own` stations within 7.5 m of the crossing. Where only one station is in reach, it copies that station. The 305.83 m for 38974058 at the three-level stack is the s = 70 station copied this way (no station sits nearer the crossing), so read it as an estimate, not a measurement at that point. The drawn stack uses the spans, which put 38974058 at 305.24 m there.

| Plan point (x, z) | Upper | Lower | Gap |
|---|---|---|---|
| (946.7, −799.8) | 38974028 at 300.37 | 9235707 at 290.88 | 9.49 m |
| (951.7, −791.8) | 38974034 at 300.02 | 9235707 at 291.13 | 8.89 m |
| (988.8, −804.3) | 38974028 at 301.14 | mainline 337901399 at 291.22 | 9.92 m |
| (995.9, −794.9) | 38974034 at 300.59 | 337901399 at 291.13 | 9.46 m |
| (1056.2, −498.4) | 38974038 at 304.05 | 9235920 at 293.66 | 10.39 m |
| (1079.0, −594.3) | 38974058 at 302.40 | 9235920 at 291.93 | 10.47 m |
| (1115.8, −591.0) | 38970413 at 314.94 | **38974058 at 305.83** | 9.11 m. **Three levels**: the mainline 337901445 passes beneath both at ≈294 m |
| (1150.4, −604.3) | 38974058 at 308.00 | 38974031 at 295.21 | 12.79 m |
| (1159.0, −609.6) | 38974058 at 308.65 | 39169033 at 293.73 | 14.92 m |
| (1172.4, −618.0) | 38974058 at 309.47 | 39169032 at 294.22 | 15.25 m |
| (1186.0, −626.8) | 38974058 at 310.07 | 949978958 at 294.99 | 15.08 m |
| (1211.1, −642.7) | 38974058 at 310.44 | 28852664 at 301.85 | 8.59 m |
| (1119.1, −602.3) | 38970413 at 314.68 | 337901445 at 293.94 | 20.74 m |
| (1136.96, −637.07) | 38970413 at 313.20 | 38974031 at 293.68 | 19.52 m |
| (1142.6, −644.8) | 38970413 at 312.80 | 39169033 at 293.08 | 19.72 m |
| (1155.6, −659.2) | 38970413 at 311.90 | 39169032 at 292.91 | 18.99 m |
| (1158.2, −661.7) | 38970413 at 311.75 | 949978958 at 293.02 | 18.73 m |
| (1190.1, −684.6) | 38970413 at 309.99 | 1111331909 at 300.86 | 9.13 m |

**Unordered (4)**, because one way is hidden at the crossing:
- 28686579 under 9236432 and 462253885 near (1246, −495);
- 38974039 under 38970413 at (1117.9, −486.3);
- 337901445 under 38974058 at (1123.4, −592.6).

The order is unambiguous from the other ways' heights. The lower way's own level still needs imagery or interpolation from its exposed ends.

## Open questions before building

- 38974058 → 38974043. The flyover ends at 310.4 m and 38974043 starts at 310.1 m on fill. That is continuous, but drawn today as a flat deck meeting ground: the B phase-1 "flat strips ending in air".
- 38974028 has no drawn surface near its level on the north-corner board. It is drawn on the downtown side and dropped past the seam. Confirm on the assembled board before profiling.
- Baker covered lower roads: under-cap grades stay inferred (underpass floors).
- Barriers between adjacent flyovers, and pier positions, need imagery before any piers are added.

## Implementation plan: the stacked-ramp primitive

1. **Profiles from the register.** For each elevated movement above, turn the tracked `own` stations into deck spans. A span covers stations where own minus drawn ground exceeds 0.5 m, tied to the ground at both ends as `deck-survey.py` does. The spans go in a new `ramp-decks.json` keyed by way start/end on each board.
2. **Apply.** On north-corner and the auburn edge, `auburnTransport` adds these profiles to its existing profile map, replacing the clearance inference for 38974028/34/58 and the north-corner part of 38970413. Downtown (MLK ramps; the Baker exit legs 38974028/51/34) needs a small hook in `city.ts` that slices the baked `vignette.json` runs the same way.
3. **Ground beneath.** Keep the covered-pavement taper for the lower roads. Under ramps that ride above it, apply the trial rule from the follow-up: release nodes where the way's own class-2 confirms the raw grid. The deck now carries the ramp, so no sawtooth ridge forms.
4. **Acceptance, on both tiers, with the 439abf84 gate held.**
   - Every crossing above keeps its order, with modelled soffit-to-tread at least 4.5 m over each lower lane.
   - Joint probe: no step over 2 mm and no open end above 0.5 m.
   - Each movement's drawn tread within 0.3 m of its own profile.
   - The phase-1 B witnesses all close: the 38974038 open start, the 38974034 → 1450884828 step, and the north-corner ramp ends.
   - Matched before/after stills at B1/B2/B5 and the three-level stack (1115.8, −591.0).
5. **Order of work.** First the NB/SB Baker flyovers (38974028/34 and their legs) and the Baker exit, then 38974058 with its three-level stack, then the MLK SB ramp tree, then the north-corner part of 38970413. *Revised in step 2:* the stack cannot clear without 38970413, so its north-corner half moved into step 2. Step 4 is now the NB-to-Freedom-Parkway chain at the auburn edge (1450884836 → 38974038 → 1450884835 → 38974039), with the 38974038 open start in its acceptance, plus any north-corner ramp ends still open.

## Built

### Step 1: the Baker flyovers and the Baker exit

`ramp-decks.py` turns each listed way's tracked `own` stations into deck spans and writes `ramp-decks.json`, in metres along the full OSM way. Step 1 lists 38974028, 38974034, 1450884828 and 1450884829, plus the first 60 m of 38974031 and of 38974051 and the last 74 m of 39169033. From 75 m on, 38974051 is the Baker junction deck's own approach (`junction-decks.json`, drawn by `junctionPortals`). A span there doubled it 1–12 cm under its surface, so it is left out. `web/src/terrain/ramp-decks.ts` applies the spans. Boards clip ways at their seams, so it matches runs to ways by geometry (every vertex within 5 cm of the way):

- On north-corner, `auburnTransport` looks up `rampSpans(road.pts)` when a motorway road has no Sweet Auburn profile, then slices it like any other profiled road.
- Downtown, `applyRampDecks(vd)` slices the baked `vignette.json` runs before `createSurfaceTransport` and `cityRoadHeight` read them.

Runs that already carry a profile keep it. Span ends that round to within 5 cm of a run vertex snap to that vertex, so no sliver piece opens a joint.

**Ties.** A span starts and ends one station beyond its elevated stations, at a tie row flagged in the JSON. The City gives that vertex `deckWeight` 0, so the deck meets the terrain it actually draws there, not the lidar sample of it. One extra row, 0.25 m inside each tie, keeps the blend that short. Without it, the 5 m blend followed the ground falling away toward the freeway and sagged the 38974034 tread by 0.555 m.

**Measured (both tiers identical; probe scripts and outputs in [b2-baker](log/ui/connector-repairs/b2-baker/)):**

| Check | Result |
|---|---|
| Drawn tread minus profile, centreline, every 0.25 m | 0.117–0.122 m on every way (the 0.12 m deck lift), except the 0.25 m tie blends |
| Drawn tread minus register `own` at measured stations | ≤ 0.13 m (shared endpoints are averaged) |
| Shared vertices of the Baker chain | One height. The phase-1 38974034 → 1450884828 step (−0.291 m High, −0.307 m Low) is closed |
| x = 1000 seam, 38974028 and 38974034 | Downtown and north-corner treads within 1 mm. Before: the downtown half stood 7.4 m above the north-corner half |
| Any other surface through the tread (terrain, bridge approaches, every mesh), centreline and ±1.6 m | None |
| Cars (`cityRoadHeight` on the real `vd.roads` / north-corner roads, every metre of every span) | Car height minus profile 0.117–0.136 m on both boards and both tiers; none fall back to the ground |
| Ties | Tread = drawn terrain + 0.12 m at all four, as at Sweet Auburn abutments. 38974034's start was 0.216 m |
| Soffit to lower tread over 9235707 and 337901399 | 8.12, 8.57, 8.65 and 9.08 m (≥ 4.5 m), with the crossing order kept |
| 439abf84 gate, warm, Low and High | Byte-identical to the reference |
| Triangles, whole scene at the Baker camera | +3,398 High, +3,414 Low, all deck geometry |

**Still open after step 1.**

- **Plan gap at the x = 1000 seam (closed in the next commit).** Both carriageways stopped 0.6–0.7 m short of each other across the seam. The gap was pre-existing: `transport.ts` clamped a perpendicular end row to the board bounds, which leaves a wedge on each side wherever a deck crosses a seam obliquely. The 7.4 m step had hidden it. Now a profiled run's end corners slide along the run onto the boundary (`onSeam`, ribbon and plain laterals), capped at 6 m for grazing crossings. Dense 5 cm samples across x = 999.4–1000.6 at the centreline and ±1 m find tread everywhere on both carriageways and both tiers, with no step over 1 mm. The 439abf84 gate stays byte-identical, and `ramp-decks.test.ts` fails with the change reverted. Stills: [K1 High](log/ui/connector-repairs/b2-baker/seam/K1-high-before-after.jpg) · [K1 Low](log/ui/connector-repairs/b2-baker/seam/K1-low-before-after.jpg) · [K2 High](log/ui/connector-repairs/b2-baker/seam/K2-high-before-after.jpg) · [K2 Low](log/ui/connector-repairs/b2-baker/seam/K2-low-before-after.jpg). Here BEFORE is step 1, from the same frozen cameras. **Scope beyond Baker:** `onSeam` applies to every profiled deck end on a board edge. Today that also means three Sweet Auburn ends at z = −520 (x 1111.89, 1243.33, 1251.77). Their auburn-side wedge closes (it missed up to z −519.65 before, and nothing past −520 now). The north-corner partners are not profiled yet, so their half still clamps and leaves up to 0.35 m (step 4). A's reviewed stills (z −250 to 40) are not near it, and the A branch does not contain this commit.
- **38974038 open start.** It is not a Baker way, and none of the four approved steps covers its chain (1450884836 → 38974038 → 1450884835 → 38974039, NB to Freedom Parkway at the auburn edge). On this head it still starts in mid-air: tread −19.57 at (1045.81, −497.53), with the terrain 0.8 m short of the start at −25.81.
- **The lane under the Baker junction approach.** The taper finding at (880, −855) (a covered lane climbing on a 28% grade, leaving 3.0 m to the street where 10.1 m is expected) is ground beneath a structure. That is plan item 3, which step 1 does not touch.
- **Tie edges.** At the 38974031 tie, the drawn terrain rises 2–3 cm through the tread 0.15 m inside the slab edge, between grid nodes. A shallow yield could not reach it (the nodes were already below the tread), so none is applied.

**Stills** (day, matched frozen cameras, BEFORE | AFTER): [K1 High: the flyovers over the Connector](log/ui/connector-repairs/b2-baker/K1-high-before-after.jpg) · [K1 Low](log/ui/connector-repairs/b2-baker/K1-low-before-after.jpg) · [K2 High: side-on near the seam](log/ui/connector-repairs/b2-baker/K2-high-before-after.jpg) · [K2 Low](log/ui/connector-repairs/b2-baker/K2-low-before-after.jpg) · [K3 High: 38974034 into 1450884828](log/ui/connector-repairs/b2-baker/K3-high-before-after.jpg) · [K3 Low](log/ui/connector-repairs/b2-baker/K3-low-before-after.jpg) · [K4 High: the Baker exit](log/ui/connector-repairs/b2-baker/K4-high-before-after.jpg) · [K4 Low](log/ui/connector-repairs/b2-baker/K4-low-before-after.jpg). Cameras: `cam=1000,-790,150,60,220`, `1020,-785,200,70,90`, `1045,-772,120,65,60`, `895,-835,250,30,170`, with `&dev&mindist=20`, matrices in `cameras/`.

**Deploy.** This needs a `web/dist` rebuild only. `ramp-decks.json` is imported at build time, and no `pnpm data` is needed.

### Step 2: 38974058 and the three-level stack

Step 2 lists 9235707 (its last 17 m), 38974058, the first 10 m of 38974043 and **38970413**. 38970413 was planned for step 4, but at (1115.8, −591.0) it drew at 307.34 m against a measured 314.94 m (7.6 m low). Lifting 38974058 alone to its measured 305.2 m would leave its tread 1.0 m under 38970413's soffit. Only 38970413's north-corner half takes the ramp spans: its Sweet Auburn half keeps the deck-survey profile. Where a Sweet Auburn surveyed road ends on a listed way, `ramp-decks.py` now pins the span to that surveyed height. Without the pin, 38970413 met Sweet Auburn at the z = −520 seam 1.4 cm apart.

**Measured (both tiers identical; probes and outputs in [b2-stack](log/ui/connector-repairs/b2-stack/)):**

| Check | Result |
|---|---|
| The stack at (1115.8, −591.0) | 38970413 tread 315.06 m, soffit 314.11 m. 38974058 tread 305.36 m, soffit 304.38 m. Mainline 294.15 m. **8.75 m and 10.23 m clear** (before: 38970413 7.6 m low) |
| Every other register crossing on these ways | Soffit to lower tread 7.77–11.97 m, order kept |
| Drawn tread minus profile, every 0.25 m, centreline and ±1.6 m | 0.09–0.15 m on the north-corner parts. 38970413 past s 246 is Sweet Auburn's own survey, unchanged |
| Joints 9235707 → 38974058 and 38974058 → 38974043 | One height (< 2 mm, unit test) |
| z = −520 seam on 38970413 | No gap. Steps ≤ 2 mm across the slab. On the centreline only, the Sweet Auburn side's raised centre stripe stands 3 cm and does not continue onto the north-corner lane layout (paint, cosmetic) |
| Ties (9235707 at s 300, 38974043 at s 10, 38970413 at s 0) | Tread = drawn terrain + 0.12 m |
| Any surface through the tread | None |
| Cars (`cityRoadHeight`) | 0.112–0.120 m above the profile on all four ways |
| 439abf84 gate, warm, Low and High | Byte-identical |
| Triangles | +6,294 deck triangles on both tiers |

`ramp-decks.test.ts` names the stack clearance, the joints and the seam height, plus Grok's request on step 1: no 38974051 span from 80 m on, where the Baker junction deck takes over. Each fails with its fix reverted.

**Stills** (day, matched frozen cameras; BEFORE is step 1): [S1 High: the climb under the flyover](log/ui/connector-repairs/b2-stack/S1-high-before-after.jpg) · [S1 Low](log/ui/connector-repairs/b2-stack/S1-low-before-after.jpg) · [S2 High: the three-level stack](log/ui/connector-repairs/b2-stack/S2-high-before-after.jpg) · [S2 Low](log/ui/connector-repairs/b2-stack/S2-low-before-after.jpg) · [S3 High: onto 38974043's fill](log/ui/connector-repairs/b2-stack/S3-high-before-after.jpg) · [S3 Low](log/ui/connector-repairs/b2-stack/S3-low-before-after.jpg) · [S4 High: the z = −520 seam](log/ui/connector-repairs/b2-stack/S4-high-before-after.jpg) · [S4 Low](log/ui/connector-repairs/b2-stack/S4-low-before-after.jpg). Cameras: `cam=1140,-610,200,60,260`, `1112,-596,250,72,110`, `1228,-652,160,62,70`, `1112,-524,200,62,70`, with `&dev&mindist=20`.

**Deploy.** A `web/dist` rebuild only.

### Step 3: the MLK SB ramp tree

Step 3 lists 436808889, 755543582, 44698161, 436808888, 755543580 and the first 2.5 m of 755543583. The phase-1 taper finding reads them as elevated ramps that the covered-pavement taper pulls down 1–6 m. They now ride their own lidar profiles over the tapered ground, which stays as it is beneath them.

**What the downtown board needed.** Downtown merges 9236952, 436808889 and 755543582 into one ground road with no baked transport run. The bridge-tagged MLK link's ground run spans two ways (755543580 and 755543583). So `rampSpans` now maps spans onto any polyline that runs along one or more registered ways, and spans of consecutive ways that meet at a vertex merge into one deck. `applyRampDecks` also slices downtown ground roads that carry a span and marks them as structure, as `auburnTransport` does on the boards. Steps 1 and 2 come out the same: north-corner byte-identical, downtown within 1.3e-5 m (float order of interpolation).

**The top end.** The MLK street bridge's west approach (`street-bridges.json`, `streetPortals`) already draws 755543583 at about 313.2 m. Before this step, 755543580 ran on the tapered ground at 306.5 m into the approach's 6.7 m face. `ramp-decks.py` now clips 755543583 to its first 2.5 m (`CLIP`) and pins both ways' ends to 312.95 m (`MEETS`), eased over the last 10 m. So the flat tread (313.07 m) runs 2.5 m under the approach's diagonal edge and stays under its whole surface. The approach falls across its width: its lowest point over the ramp's footprint is 313.111 m. Grok's round 1 found that the first pin (313.08 m, set against the approach's 313.23 m centreline) left the tread 1–8 cm above the approach's lower edge. `ramp-decks.test.ts` now samples the footprint across the width against `bridgeApproaches` on staged downtown data, and fails on that pin. Ending the deck at the approach's edge left a wedge of air up to 1 m wide on the outer side (probe grid in `evidence/`).

**The fork at (561.1, 584.44).** 44698161, 436808888 and 755543580 split from 755543582 here. Their Connector ribbons start the diverging ramps at no width, so the gore pavement for the first 3–4 m is 44698161's deck. The ramps then rise or fall on their own grades: 755543580 stands 0.2 m above 44698161 4 m from the nose. Cars there found no tread on their own piece, which would have hidden them (`NO_ROAD`). `cityRoadHeight` now rides a bridge piece that shares the car's piece's end vertex, within 10 m of it. A deck crossing overhead never shares one (`road-height.test.ts`).

**Measured (both tiers identical; probes and outputs in [b2-mlk](log/ui/connector-repairs/b2-mlk/)):**

| Check | Result |
|---|---|
| Drawn tread minus profile, centreline and ±1.6 m | 0.087–0.121 m on 436808889 and 755543582. At the fork the top surface is the shared gore deck, 0.13–0.37 m above 436808888's own falling profile |
| Joints | 436808889 → 755543582 is one deck. The fork vertex carries one height on all four ways |
| Ties (436808889 s 35, 44698161 s 15, 436808888 s 5) | Tread = drawn terrain + 0.12 m |
| The MLK west approach | The approach lies on top wherever they overlap: 7 cm above the tread at its low edge, up to 0.3 m on its high side. At its start edge, s 12, the approach stands 0.19 m over the tread (313.229 against 313.044 m). No open edge across ±2 m |
| Any other surface through the tread | None. The MLK approach lies over the ramp's end by design |
| Cars | Every sample has a height. Car minus profile 0.114–0.209 m on own decks; on the shared gore pavement (436808888 to s 4, 755543580 to s 3) they ride the drawn surface |
| 439abf84 gate, warm, Low and High | Byte-identical |
| Triangles | +3,544 deck triangles on both tiers |

**Stills** (day, matched frozen cameras; BEFORE is step 2): [M1 High: the ramp tree](log/ui/connector-repairs/b2-mlk/M1-high-before-after.jpg) · [M1 Low](log/ui/connector-repairs/b2-mlk/M1-low-before-after.jpg) · [M2 High: the fork](log/ui/connector-repairs/b2-mlk/M2-high-before-after.jpg) · [M2 Low](log/ui/connector-repairs/b2-mlk/M2-low-before-after.jpg) · [M3 High: onto the MLK west approach](log/ui/connector-repairs/b2-mlk/M3-high-before-after.jpg) · [M3 Low](log/ui/connector-repairs/b2-mlk/M3-low-before-after.jpg) · [M4 High: 436808889 climbing](log/ui/connector-repairs/b2-mlk/M4-high-before-after.jpg) · [M4 Low](log/ui/connector-repairs/b2-mlk/M4-low-before-after.jpg). Cameras: `cam=600,570,200,58,220`, `560,586,200,62,45`, `556,592,110,62,45`, `625,566,300,72,90`, with `&dev&mindist=20`.

**Deploy.** A `web/dist` rebuild only.

### Step 4: the NB-to-Freedom-Parkway chain and the 38974038 open start

38974038, 1450884835 and 38974039 were already surveyed Sweet Auburn decks. The open start came from the 8.5 m link before them, 1450884836. The auburn board drew it on the ground, falling from 303.9 m at 9239459's fill to 297.7 m under 38974038's start. So 38974038 began 6.6 m in the air. 9239459 itself runs at grade on its fill (own within 0.1 m of the ground) and needs no deck. Step 4 lists 1450884836 only: a tie at s 0 on the fill, then up to 304.11 m, where the Sweet Auburn survey of 38974038 starts. The Sweet Auburn pin in `ramp-decks.py` now also applies at a span's end, not only inside it. The only other row it moves is 38970413's far end on the auburn board, which Sweet Auburn's own profile draws, so nothing drawn changes there.

**Lane gain.** OSM adds 38974038's second lane at the joint (1450884836 has 1 lane, 38974038 has 2). On the ground that was paint. On a deck it left the added lane's 2.75 m of slab end standing over a 7.4 m drop. `ramp-decks.ts` `laneGain` marks a ramp deck piece that ends where exactly one way with more lanes begins, by setting `widenInto` to a point 1 m into that way. `transport.ts` then widens that piece's ribbon section across its length, from its own section at the fill to the next ribbon's section at the joint, keeping the shoulders. Only that piece is marked on any board.

**Measured (both tiers identical; [b2-edge](log/ui/connector-repairs/b2-edge/)):**

| Check | Result |
|---|---|
| 38974038's start | Continuous deck: 304.21, 304.25 and 304.26 m at s 7.5, 8.0 and 8.5 along the chain. Before: terrain 297.69 m, then the deck at 304.26 m |
| Joint 1450884836 → 38974038, 5 cm samples at −1.5, 0 and +1.5 m | Tread steps ≤ 1 mm. On the centreline, 38974038's lane stripe starts 3 cm proud (paint) |
| Deck width at the joint | −3.5 to +3.5 m on both sides (before: −3.5 to +0.75 m on 1450884836) |
| Tie at 9239459's fill | Tread = drawn terrain + 0.12 m |
| Drawn tread minus profile, centreline and ±1.6 m | 0.117–0.365 m (the upper end is the parapet edge over the widening). No surface through the tread |
| Cars on 1450884836 | 0.120–0.166 m above the profile |
| 439abf84 gate, warm, Low and High | Byte-identical |
| Triangles | +252 deck triangles on both tiers |

**Stills** (day, matched frozen cameras; BEFORE is step 3): [E1 High: the chain at the auburn edge](log/ui/connector-repairs/b2-edge/E1-high-before-after.jpg) · [E1 Low](log/ui/connector-repairs/b2-edge/E1-low-before-after.jpg) · [E2 High: 38974038 no longer starts in mid-air](log/ui/connector-repairs/b2-edge/E2-high-before-after.jpg) · [E2 Low](log/ui/connector-repairs/b2-edge/E2-low-before-after.jpg) · [E3 High: the widening ramp](log/ui/connector-repairs/b2-edge/E3-high-before-after.jpg) · [E3 Low](log/ui/connector-repairs/b2-edge/E3-low-before-after.jpg). Cameras: `cam=1045,-497,180,62,120`, `1046,-498,90,60,45`, `1040,-500,330,72,60`, with `&dev&mindist=20`.

With this step the phase-1 B witnesses are closed: the 38974038 open start, the 38974034 → 1450884828 step (step 1) and the north-corner ramp ends (steps 1 and 2).

**Deploy.** A `web/dist` rebuild only.

