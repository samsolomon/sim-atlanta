# Road kit

A plan for a small set of road primitives that every road build uses: the Connector now, and every future expansion. Sam's brief (2026-11-26, after reviewing the Connector repairs): what a road looks like should follow rules, "like a video game", not be hand-placed. **Docs only; no build.** The audit below counts today's violations on all 13 boards, so each primitive has a number to drive to zero.

Related: [Connector repairs](connector-repairs.md) · [stacked ramps](connector-stacked-ramps.md) · [interchanges](connector-interchanges.md) · [data model](data-model.md) · [perf budgets](perf.md)

## Sam's notes, answered

| # | Note (still) | What it is, measured |
|---|---|---|
| 1 | A5: the ramp's lane paint zigzags over the mainline | **Two flat ribbons overlapping, not a vertical jump.** A 1 m raycast grid at `cam=1096,240,0,60,70` finds two separate tread surfaces over about 280 m². For 83 m² they are within 0.3 m vertically (the ramp sits 1–10 cm above the main), and for 196 m² the ramp climbs 0.3–0.4 m out of it. The ramp ribbon's own lane paint is drawn on its own slab, lying on the main deck. Primitive: **merge/diverge with one surface owner**. |
| 2 | J3 and Freedom Parkway: on-ramp lanes blend into and are drawn on top of other lanes | At grade, every Connector ribbon fills its own asphalt and strokes its own lines into the board texture (`connector-paint.ts`), in ribbon order. Where a ramp ribbon overlaps the mainline, its paint covers the other's. Primitive: **overlap rule** plus **merge/diverge**. |
| 3 | K1: elevated roads need supports | No profiled Connector deck has piers today. Supports exist only on the Midtown decks, the 17th Street Bridge, the North Line spans and Mayson. Primitive: **piers and bents**. |
| 4 | S2: parapets come and go | `transport.ts` drops a parapet wherever a probe beside the shoulder hits any Connector lane, so lanes running alongside, below or across open it too. Primitive: **elevated deck** (parapets open only at a real join). |
| 5 | S3, E2: lane count changes need a taper | Lanes come from each OSM way's `lanes` tag, so a second lane starts at full width at the node. Step 4 added a one-off widening (`laneGain`); this generalises it. Primitive: **lane add/drop taper**. |
| 6 | E1: a floating bridge piece in the lower frame | **Ellis Street NE.** It is an unsurveyed bridge split at the z = −520 seam between the Sweet Auburn and north-corner boards, and each board infers its own half's height from that half's ends. The 8 m Sweet Auburn stub is drawn at 302.0 m and ends over the seam. The north-corner half restarts at 295.1 m, 6.9 m lower, climbs to 299.5 m over the lanes below and drops back to 295.3 m. The street arrives at 303.3 m. Primitive: **elevated deck** with one profile per structure across seams, and **abutments**. |

## The primitives

Each primitive is a pure function from road data to geometry, the same on every board. It has inputs, a rule, failure cases, a cost on Low, and a test that fails on a violation (a lint over drawn geometry or over the road data). Board seams never change the result: a structure's rules are evaluated on the whole OSM way (or the whole structure), and each board draws its clip of the result. That is what stopped the Baker seam step in B2.

Shared inputs:
- **OSM:** `highway`, `lanes` (and `lanes:forward`/`lanes:backward`), `bridge`, `layer`, `covered`/`tunnel`, `width`, `man_made=bridge` outlines.
- **Profiles:** lidar-tracked own surfaces (`ramp-register`, `deck-survey`, `south-connector-decks`), measured street decks (`street-bridges`), inventory widths (NBI).
- **The board:** the drawn terrain and its yields.
- **Structure:** a profiled run, plus the connector ribbons' cross-sections.

### 1. Elevated deck: tread, deck edge, parapets, soffit

- **Inputs:** a run's plan line and cross-section (ribbon or mapped width), its profile (`deckNavd88M` or a shared `deckSurface`), and its neighbours at both ends (joins).
- **Rule.**
  - Any run more than **1.5 m above the drawn terrain** is a deck. It gets a tread, a fascia down to a soffit at a depth set by span (span/22, at least 0.9 m), and a **parapet on each side**, 0.85 m high and 0.28 m thick, continuous.
  - A parapet opens only where another drivable surface **joins at the same level**: its tread meets this one within 0.1 m vertically and the two cross-sections share an edge for at least a lane width. A lane passing below, above or alongside at a different level never opens it.
  - Where two decks run side by side at the same level (a fused viaduct), the shared edge gets a median barrier, or nothing if the survey shows striping. That choice comes from data, not from a probe.
- **Failure cases.**
  - Decks that touch for a short stretch: require at least 6 m of shared edge before treating it as a join.
  - Very narrow walks: use a railing (1.07 m, open), not a parapet.
  - Board seams: parapets are computed on the whole run, then clipped (the seam fix in B2 already puts deck ends on the seam).
- **Cost on Low.** A parapet is about 6 triangles per 2 m station, so about 3 triangles per metre of edge. Walling the 47.9 km of open elevated edge the audit finds (10.4 km is walled today) adds about 140k triangles at full detail, and less on Low, where far rings thin the decks. Instancing a parapet section per run could cut that. It needs a perf budget line, and it is the biggest cost in the kit.
- **Test.** Lint `elevated-edges`: every elevated deck edge cell is walled, joined or landing; open length 0. Today's count is in the audit.

### 2. Piers and bents

- **Inputs:** an elevated deck's plan line, profile and width; everything below it (drawn roads, ribbons, rail and streetcar centrelines, paths, water polygons); OSM `bridge:structure` where present; NBI span counts where known.
- **Rule.**
  - **Spacing:** nominal span by class: 30 m for ramps and links, 40 m for mainline viaducts, 25 m for street bridges. Where NBI gives spans and length, use their mean.
  - **Placement:** start at the abutment and step along the line.
  - **Clearance:**
    - a pier footprint, plus 1.2 m (road), 2.5 m (rail centreline) or 0.6 m (path), must not touch any road, rail or path below. Water is excluded too.
    - If a station falls on one, **slide it** along the line to the nearest clear station within ±40% of the span. If none exists, extend the neighbouring span (a longer girder) and flag it.
  - **Bents:** a deck wider than 12 m gets a bent (a cap beam on two or more columns at least 6 m apart). Columns follow the same clearance rule individually, so a bent may straddle a road.
  - **Height:** from the soffit down to the drawn terrain, no deeper.
  - Exact real pier positions are not required (Sam); where a survey has them (17th Street, Mayson), the survey wins.
- **Failure cases.**
  - Long spans over wide junctions: flag spans over 60 m for imagery.
  - Decks over decks (the three-level stack): a lower deck counts as a road below.
  - Terrain voids and slots: no pier in a slot.
- **Cost on Low.** An instanced column (one draw for all piers on a board) at about 12–24 triangles per column. Around 600 piers City-wide is roughly 15k triangles, 1 draw per board.
- **Test.** Lint `pier-footprints`: no pier footprint intersects a road, ribbon, rail, streetcar or path polygon below (count 0), and no elevated span runs more than 1.5× its nominal span without a support.

### 3. Abutments and fill where a deck lands

- **Inputs:** the deck end, the terrain at and beyond it, and the receiving run (a ground road, another deck, or nothing).
- **Rule.**
  - Where a deck's end is within 0.5 m of the terrain or of a receiving tread, it **lands**. The tread meets the receiver within 2 mm, with the 0.12 m deck lift tapered to zero over the last 2 m (this replaces today's 0.12 m lip at every tie).
  - The fascia steps down into an abutment wall, and the slope beyond it is graded fill (a ground yield toward the terrain, at 1:2).
  - A deck end that is more than 0.5 m above everything and is not at a board seam is an **open end**, and the build fails.
  - A structure split by a board seam keeps one profile: the seam is never an end.
- **Failure cases.**
  - Two boards inferring different heights for one bridge (Ellis Street). The rule above forbids it: an unsurveyed bridge is profiled once, from its whole way.
  - A deck ending onto a lid or cover (Capitol Gateway, MLK west approach): the receiver is the drawn surface.
- **Cost on Low.** Small: a wall quad strip and a yield per end.
- **Test.** Lint `open-ends`: no elevated tread edge is more than 0.5 m above every surface beyond it, except at board seams where the neighbouring board continues the profile. A cross-board check compares tread heights on both sides of every seam (≤ 2 mm).

### 4. Lane add/drop tapers

- **Inputs:** consecutive ways' `lanes` (and per-direction lanes), the joint, and the road class.
- **Rule.** When the lane count changes at a joint and nothing else joins there, the added lane **opens** (or the dropped lane **closes**) along a taper on the side OSM puts it (`turn:lanes`/`placement` when tagged, otherwise the outside). Taper lengths:

| Class | Add (opening) | Drop (closing) |
|---|---|---|
| Motorway, through lanes | 90 m | 220 m (MUTCD merging taper L = W·S: a 12 ft lane at 60 mph gives 720 ft) |
| Motorway links and ramps | 60 m | 90 m |
| Trunk, primary | 45 m | 60 m |
| Secondary and below | 30 m | 30 m |

  - The taper is a cross-section change on one ribbon (as `widenInto` does in B2), not a second ribbon.
  - A taper that would cross a board seam is computed on the whole way and clipped.
  - Lane paint follows the taper: the new lane's line starts where the lane reaches 2.5 m (`connector-paint` already ends a lane below 2.5 m).
- **Failure cases.**
  - The next joint comes before the taper ends: shorten to the available length, and flag it if under half.
  - Lanes changing on a deck: the deck widens with the lanes (B2 step 4).
  - The count mismatches at merges and diverges are handled by primitive 5, not here.
- **Cost on Low.** No new draws; a few more cross-section rows per taper.
- **Test.** Lint `lane-steps`: at every joint, the drawn travel width changes by no more than 0.15 m per metre along the road (no step). Today's abrupt changes are in the audit.

### 5. Merge and diverge: one surface owner

- **Inputs:** a node where ways split or join (the `successors` lane map in `connector-corridor`), each way's lanes, and the gore geometry from OSM or ribbon edges.
- **Rule.**
  - Inside a merge or diverge zone, from the node to where the ribbons separate by a full shoulder, **one surface** is built from the combined lane count: the union of the ribbons' travel polygons, with one fill and one set of lane lines.
  - The **gore** (the wedge between diverging lanes) is generated: a solid edge line on each side, chevron hatching inside, and a crash cushion at the nose if it is elevated.
  - No ribbon paints its own lines inside the zone. On decks, the zone is one tread with one parapet set (primitive 1), never two slabs overlapping.
  - Lane lines follow the combined count and run continuously through.
- **Failure cases.**
  - Merges whose ribbons do not touch until well after the OSM node: grow the zone until they separate by a shoulder.
  - Merges at different levels (a ramp landing on a deck): the zone is a deck.
  - Three-way splits (the MLK fork): one zone for all branches.
- **Cost on Low.** Fewer triangles than today (one surface instead of overlapping ribbons), plus gore paint in the board texture.
- **Test.** Lint `surface-overlap` (primitive 6) at every merge node, plus `gore-paint`: every diverge has a generated gore.

### 6. Overlap rule

- **Rule.** No two drivable surfaces may be drawn over the same plan point within **0.30 m** vertically, whether geometry or board paint. Surfaces at different levels (one more than 0.3 m above the other plus its deck depth) are crossings and are fine. The single exception is a surveyed overlay that is drawn on purpose and recorded (the MLK ramp tucking under its approach).
- **Inputs:** every drawn tread triangle, and every ribbon's travel polygon in the board paint.
- **Failure cases.** Board paint has no height, so at grade the lint compares ribbon polygons on the same board (and same level).
- **Test.**
  - Lint `surface-overlap`: count of stacked tread cells, 1 m grid, Δy < 0.30 m, is zero.
  - Lint `paint-overlap`: ground ribbons on the same level do not overlap by more than 1 m² beyond 3 m of a shared node.

### 7. Lane paint follows lane count

- **Inputs:** the cross-section's lane count at each station, after tapers and merge zones.
- **Rule.**
  - Edge lines are solid: yellow on the left of a one-way carriageway, white on the right.
  - Lane lines between lanes are dashed, 3 m on and 9 m off (today's pattern).
  - A lane narrower than 2.5 m has no line.
  - Merge and diverge zones use the combined count, with gore lines and chevrons generated.
  - Lane-drop arrows and "exit only" markings are optional (from `turn:lanes`).
- **Failure cases.** Lanes on decks are drawn as tread paint (raised 0.03 m today), and at grade as board paint. Both read the same cross-section.
- **Cost on Low.** None beyond today.
- **Test.** Lint `paint-lanes`: the number of drawn lane lines equals lanes − 1 at sampled stations.

## How the kit is enforced

- **A lint suite, `pnpm lint:roads`,** runs the audit below over the assembled City: all 13 boards, both tiers, in headless Chrome, as `test:perf` does. It fails on any count above a ratchet stored in `road-kit-budget.json`, ratcheting down as primitives land, the way the perf ceilings do.
- **Unit tests per primitive:** pure functions over committed fixtures, with no browser.
- **Every expansion board** passes the lint at zero for the primitives that exist when it lands.
- **Cost.** The lint run is about 40 minutes on the Studio today. Restricted to transport meshes and a 1 m grid it should come down to about 10 minutes; it is not part of `pnpm test`.

## Audit: today's violations

Measured on `main` cf83c531 (A, B1 and B2 merged), High tier, all 13 boards. South-corner and King have no road decks; their at-grade roads are paint. Evidence and the audit script: [road-kit/evidence](log/ui/road-kit/evidence/).

**How it was measured.**
- **Geometry.** Every upward-facing tread triangle (road, ramp and walk colours) in the structure meshes is rasterised onto a 1 m grid per board, together with the board's drawn terrain and parapet geometry. Each board is visited in 600 m tiles so it is measured at full detail.
- **Elevated** means the tread is more than 1.5 m above the drawn terrain. Each elevated edge metre is one of three kinds:
  - **walled:** a parapet rises above it;
  - **step:** it drops 0.3–1.5 m to another tread;
  - **open:** a drop with no wall.
- **Stacked** means two treads at one point less than 0.3 m apart.
- **Data.** Paint overlaps and lane changes come from the Connector ribbons (lane counts from OSM).

| Board | Elevated deck m² | Elevated edge m | Walled m | Open m (sites) | Step m | Stacked m² (sites) | Paint overlap at grade m² (pairs) | Abrupt lane add/drop | Unbalanced merge/diverge |
|---|---|---|---|---|---|---|---|---|---|
| downtown | 50,626 | 24,051 | 1,068 | 21,281 (325) | 1,701 | 831 (65) | 339 (5) | 8 | 6 |
| north-band | 9,639 | 2,616 | 365 | 2,152 (69) | 99 | 249 (10) | 272 (3) | 3 | 1 |
| north-corner | 10,082 | 3,093 | 1,269 | 1,603 (47) | 221 | 63 (2) | 71 (3) | 6 | 3 |
| auburn | 40,174 | 5,628 | 4,637 | 653 (53) | 338 | 1,357 (53) | 533 (8) | 8 | 5 |
| south-band | 48,676 | 15,602 | 1,969 | 12,461 (407) | 1,172 | 1,159 (38) | 473 (3) | 4 | 1 |
| midtown-south | 2,252 | 819 | 0 | 750 (16) | 69 | 74 (5) | 1,705 (10) | 3 | 6 |
| midtown-central | 6,303 | 1,027 | 0 | 960 (35) | 67 | 12 (2) | 189 (1) | 2 | 1 |
| midtown-upper | 3,394 | 1,200 | 0 | 1,176 (49) | 24 | 422 (24) | 546 (9) | 4 | 4 |
| brookwood-south | 11,798 | 2,723 | 723 | 1,902 (99) | 98 | 438 (23) | 544 (11) | 5 | 4 |
| brookwood-station | 13,736 | 2,622 | 399 | 2,213 (98) | 10 | 711 (21) | 145 (2) | 0 | 1 |
| r16 | 17,989 | 2,749 | 0 | 2,746 (99) | 3 | 0 (0) | 421 (2) | 0 | 1 |
| south-corner | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 | 0 |
| king | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 | 0 |
| **Total** | **214,669** | **62,130** | **10,430 (17%)** | **47,897 (1297)** | **3,802** | **5,316 (243)** | **5,238 (58)** | **43** | **34** |

**What the counts mean for each primitive**
- **Elevated deck (parapets): 47.9 km of open elevated edge.** 83% of elevated edge has no wall. It includes the Connector street bridges (R3), the downtown Gulch viaducts and every ramp. It over-counts structures that carry their own railing colours (the 17th Street Bridge, the North Line spans); the lint will learn those.
- **Piers: 214,669 m² of elevated deck.** 27 pier meshes exist City-wide: the Midtown deck piers, the North Line spans and Mayson. Every other elevated deck, all of the Connector included, has no support.
- **Abutments and open ends: 3.8 km of steps** where a deck drops 0.3–1.5 m onto another surface, at about 210 sites; the board seams and deck ends cluster here. Floating pieces such as the Ellis Street stub (R5) sit inside the open-edge sites. The lint will count them as pieces separately (an elevated tread component with no landing).
- **Overlap: 5,316 m² of stacked tread at 243 sites** (R4), plus 5,238 m² of at-grade paint where one ribbon is drawn over another (58 pairs; the largest is 653 m² in Midtown South). The A5 site Sam circled is one of the Sweet Auburn stacked sites.
- **Lane tapers: 43 abrupt lane adds and drops** where one way continues with a different lane count, and **34** merges and diverges whose lane counts do not balance. None has a taper today.

**Stills**, High, daylight:
- [R3, north-corner: a street bridge over the Connector with no parapets](log/ui/road-kit/open-edges-street-bridge.jpg), `cam=1106,-676,200,60,110`
- [R4, I-20 west on the south band: two ramp decks lying across each other within centimetres](log/ui/road-kit/stacked-decks-i20-west.jpg), `cam=-58,961,30,62,90`
- [R5, the floating Ellis Street stub at the z = −520 seam](log/ui/road-kit/floating-ellis-street.jpg), `cam=1047,-517,180,62,60`
- [R2, downtown: a Gulch-area street drawn as a deck with bare edges](log/ui/road-kit/open-edges-gulch-street.jpg), `cam=-578,-43,120,60,160`


## Pre-existing item: the covered Connector under Capitol Gateway

Raised in Grok's review of D, and written up for Sam. No code.

- **What is there.** The Connector runs beneath the Capitol Gateway lid as eight covered ways: both six-lane mainlines (39160888, 39160890) and the branches 39160886, 39160889, 435734520, 435734523, 580328711 and 580328712. `pipeline/prototypes/connector-footprint/extract-ways.py` turns OSM `covered=yes` into `tunnel` ribbons, so none of them is painted and the freeway is not drawn under the lid.
- **Cars.** `connector-traffic.ts` gives a car no height on a tunnel interval (`if (run.tunnel) return null`), so Connector traffic disappears at one portal and reappears at the other. Cars never drive on the lid and are never seen under it.
- **The inconsistency.** The south-band board's own road list (`context.json`) carries the same mainline as an ordinary motorway, with `bridge` and `tunnel` both false. Anything that samples that record reads the lid top. That is why Grok saw its centreline move 1.99 m at (367.4, 760.3) when D2 removed the DEM spike there. Connector traffic does not use that record, so no car is placed on the lid today.
- **The question for Sam.** Should the covered Connector be a modelled tunnel: portal walls and ceilings at both mouths, lit interiors, and cars that drive in and stay visible a few car lengths into the dark? Or should the lid simply hide it, as now? A modelled tunnel would make the mouths read correctly from the street and at night, cost about one draw per portal, and need the board's road list to carry `tunnel` so that nothing else can drape on the lid.

## Carried nits (from the Capitol tunnel, #701)

- **Bank slab shelf.** Where the raised bank still slopes within one 5 m grid cell of a portal face, the closing slab shows as a slightly lighter shelf. It belongs to abutments and fill (part 3): grade the bank to the headwall instead of closing it with a slab.
- **Nubs at road level.** A couple of tunnel openings show small dark nubs where the apron's cut meets the bed. They belong to the overlap rule's ground checks (part 1 or part 3).

## Order of work

1. **Overlap rule plus merge/diverge.** This fixes Sam's A5 and J3, and is the largest visible error at grade.
2. **Elevated deck parapets.** This gives the S2 behaviour everywhere, and is the biggest triangle cost, so it lands with a budget line.
3. **Abutments and one profile per structure across seams.** This fixes E1's Ellis Street stub and the other open ends.
4. **Lane tapers.** S3 and E2.
5. **Piers and bents.** K1, with the clearance lint.
6. **Paint by lane count.** This follows from 4 and 5.

Each step: a branch, matched stills, Grok review, and the lint ratchet lowered in the same PR.
