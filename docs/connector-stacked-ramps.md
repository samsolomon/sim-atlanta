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

All gaps are tracked upper surface minus tracked lower surface. None is a modelled clearance.

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
5. **Order of work.** First the NB/SB Baker flyovers (38974028/34 and their legs) and the Baker exit, then 38974058 with its three-level stack, then the MLK SB ramp tree, then the north-corner part of 38970413.

## Built

### Step 1: the Baker flyovers and the Baker exit

`ramp-decks.py` turns each listed way's tracked `own` stations into deck spans and writes `ramp-decks.json`, in metres along the full OSM way. Step 1 lists 38974028, 38974034, 38974051, 1450884828, 1450884829, the first 60 m of 38974031 and the last 74 m of 39169033. `web/src/terrain/ramp-decks.ts` applies the spans. Boards clip ways at their seams, so it matches runs to ways by geometry (every vertex within 5 cm of the way):

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
| Ground through the tread, centreline and ±1.6 m | None |
| Ties | Tread = drawn terrain + 0.12 m at all five, as at Sweet Auburn abutments. 38974034's start was 0.216 m |
| Soffit to lower tread over 9235707 and 337901399 | 8.12, 8.57, 8.65 and 9.08 m (≥ 4.5 m), with the crossing order kept |
| 439abf84 gate, warm, Low and High | Byte-identical to the reference |
| Triangles, whole scene at the Baker camera | +4,494 High, +4,510 Low, all deck geometry |

**Still open after step 1.**

- **Plan gap at the x = 1000 seam.** Both carriageways stop 0.6–0.7 m short of each other across the seam. It is pre-existing: `transport.ts` clamps a perpendicular end row to the board bounds, which leaves a wedge on each side wherever a deck crosses a seam obliquely. Before this step the 7.4 m step hid it; it is now the only defect visible in K1 and K2. It gets its own commit.
- **38974038 open start.** It is not a Baker way. It sits on the NB-to-Freedom-Parkway chain at the auburn edge (1450884836 → 38974038), so step 1 leaves it as phase 1 found it.
- **Tie edges.** At the 38974031 tie, the drawn terrain rises 2–3 cm through the tread 0.15 m inside the slab edge, between grid nodes. A shallow yield could not reach it (the nodes were already below the tread), so none is applied.

**Stills** (day, matched frozen cameras, BEFORE | AFTER): [K1 High: the flyovers over the Connector](log/ui/connector-repairs/b2-baker/K1-high-before-after.jpg) · [K1 Low](log/ui/connector-repairs/b2-baker/K1-low-before-after.jpg) · [K2 High: side-on near the seam](log/ui/connector-repairs/b2-baker/K2-high-before-after.jpg) · [K2 Low](log/ui/connector-repairs/b2-baker/K2-low-before-after.jpg) · [K3 High: 38974034 into 1450884828](log/ui/connector-repairs/b2-baker/K3-high-before-after.jpg) · [K3 Low](log/ui/connector-repairs/b2-baker/K3-low-before-after.jpg) · [K4 High: the Baker exit](log/ui/connector-repairs/b2-baker/K4-high-before-after.jpg) · [K4 Low](log/ui/connector-repairs/b2-baker/K4-low-before-after.jpg). Cameras: `cam=1000,-790,150,60,220`, `1020,-785,200,70,90`, `1045,-772,120,65,60`, `895,-835,250,30,170`, with `&dev&mindist=20`, matrices in `cameras/`.

**Deploy.** This needs a `web/dist` rebuild only. `ramp-decks.json` is imported at build time, and no `pnpm data` is needed.
