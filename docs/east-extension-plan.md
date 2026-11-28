# East extension plan

Draft for Sam, 2026-11-27. A plan only, with no City code. It follows your decisions of
2026-11-27: east first, tiles underneath and neighbourhoods on top, never an empty square, and
road and rail as a gate.

Numbers are tagged **M** (measured, with source) or **E** (estimate). The parent plan is
[scaling plan v2](https://github.com/samsolomon/sim-atlanta/blob/samsolomon/scaling-plan-v2/docs/scaling-plan.md)
(still on its branch). "Increment n" refers to its §5.

## Summary

1. **Extent.** Two rectangles east of today's board, plus a thin strip for I-20: **26.4 km²**,
   which takes the board from 21.3 to 47.7 km². The east edge is x 5400 (lon −84.3332). That
   takes in Candler Park and the Edgewood/Candler Park station. Lake Claire would need one more
   column (+3.2 km²).
2. **Tiles.** These are 800 m tiles on the existing lattice, anchored at (−1000, −5700): **47
   tiles** (35 full, 12 clipped) and 141 files. Today's areas stay as they are and act as
   tiles of their own size.
3. **Memory decides the order.** Low has 1.9 MB left before its reserve (M). Showing the
   east as white alone costs about +4.5 MB (E). So area unload and freed near houses come before
   any east tile.
4. **Road and rail first.** Road kit parts 1–3 and working road and crossing checks are a gate
   before any east tile. Then I-20, the MARTA east line and the CSX/BeltLine corridor get their
   own phase behind a flag, and Sam signs off a still sheet before the east opens.
5. **Six releases.** They are listed in §7, and each one is no worse than live on phones. The
   whole plan is about 310–490 agent-hours.

![Extent map](log/east-extension/extent.png)

*Today's board (blue), A. Eastside (orange), B. Northeast (purple), the I-20 strip, and an
optional Lake Claire column (dashed). [SVG](log/east-extension/extent.svg).*

## 1. Extent

Scene metres are measured from Five Points (lon −84.3916, lat 33.7539), with x east and z south.

| Block | Scene x | Scene z | Lon | Lat | km² | 800 m tiles |
|---|---|---|---|---|---:|---:|
| A. Eastside | 1800 … 5400 | −2500 … 1500 | −84.3721 … −84.3332 | 33.7764 … 33.7404 | 14.4 | 25 (5 clipped) |
| B. Northeast | 1800 … 4600 | −6500 … −2500 | −84.3721 … −84.3418 | 33.8124 … 33.7764 | 11.2 | 20 (5 clipped) |
| I-20 strip | −200 … 1800 | 1100 … 1500 | −84.3938 … −84.3721 | 33.7440 … 33.7404 | 0.8 | 2 + one arm of a third |
| **Total** | | | | | **26.4** | **47** |
| Option: Lake Claire column | 5400 … 6200 | −2500 … 1500 | to −84.3245 | | +3.2 | +5 |

**Why this shape.**
- **East edge, x 5400.** It contains the Edgewood/Candler Park platforms (x 4694, z −878, from
  the MARTA GTFS stop rows) and all of Candler Park, whose polygon ends at x 5419.
- **Narrower to the north.** Block B stops at x 4600, because x 4600–5400 north of z −2500 is
  79% unincorporated DeKalb (the Druid Hills and North Druid Hills CDPs), with no City neighbourhood polygons.
- **South edge, z 1500.** It holds I-20 and every ramp at Hill Street, Boulevard,
  Memorial/Glenwood and Moreland. In OSM all of them sit between z 760 and 1235.
- **The I-20 strip.** I-20 leaves today's board by x 400–800 (mainline at z 1090–1185). The
  Connector register already lists 8 ramps that run past the south band's z 1100 edge
  ([connector-interchanges.md](connector-interchanges.md) §E). The strip fills that gap.
- **North edge, z −6500.** This matches R16. The Northeast trail leaves today's board through
  its *north* edge near x 1380, so an east extension can't complete it (see question 3 in §8).

**Neighbourhoods** (City of Atlanta DCP GIS neighbourhood layer; km² from a 50 m raster, tools in
[`log/east-extension/tools/`](log/east-extension/tools/)):

| Coverage | Neighbourhoods (km² added; NPU) |
|---|---|
| All, or completed with today's board | Morningside/Lenox Park 5.6 of 5.9 (F), Virginia-Highland 2.7 (F), Edgewood 2.1 of 2.2 (O), Old Fourth Ward 2.0 (M, now complete), Candler Park 1.7 (N), Reynoldstown 1.6 (N), Inman Park 1.6 (N), Poncey-Highland 1.0 (N), Piedmont Heights 0.8 (F, now complete), Midtown 0.6 (E, now complete), Cabbagetown 0.5 (N), Atkins Park, Edmund Park |
| Part | Grant Park 1.2 of 4.5 (W), Druid Hills (City part) 0.9 of 1.4 (N), East Atlanta 0.8 of 4.1 (W), Kirkwood 0.6 of 3.9 (O), Ormewood Park 0.4 of 2.0 (W), Summerhill 0.4 (V), Lindridge/Martin Manor 0.2 of 1.8 (F) |
| Outside the city | Druid Hills CDP 0.8 and North Druid Hills CDP 0.5 (US Census TIGER places, DeKalb) |
| Not reached | Lake Claire (starts at x 5413). It needs the option column (+0.87 of 1.24 km²) or two columns for all of it |
| Already on the board | Ansley Park (east edge x 1916) and Sherwood Forest (x 1253) |

## 2. Tile grid

- **Size and anchor.** Tiles are 800 m square on #435's lattice:
  - index `i = (minX + 1000) / 800` and `j = (minZ + 5700) / 800`;
  - each tile is 0.64 km², about one Midtown row's height and Sweet Auburn's size;
  - 3 files per tile: ground, context and the index entry.
- **Rows line up.** The Midtown rows and R16 are exactly tile rows `j = −1 … 4` (z −6500 to
  −1700), so block B's tiles meet them edge to edge.
- **Columns don't.** Today's board is 2,800 m wide, which is 3.5 tiles. The lattice column
  x 1400–2200 is cut in half by today's east edge at x 1800. Its east half becomes 10 clipped
  tiles, 400 × 800 m, whose manifest records the cell and a clip rectangle (#435's rule).
- **Downtown, King and Sweet Auburn coexist.** They keep their hand-built bounds (downtown
  z −1300…700, Sweet Auburn −520…280, King 280…640, the bands at −1700 and 700). The ring
  manager treats each one as a unit of its own size, so nothing is re-tiled. One east tile can
  meet two or three of these boards along x 1800. For example, tile (3,7) meets Sweet Auburn,
  King and south-corner.
- **Seams need real work.** Today's boards have no east join. `verifySeam` demands identical
  5 m samples, so every east tile must be cut from the same pinned DEM grid. The seam code must
  also accept one tile edge shared with several boards. This is part of increment 6.
- **Count.** That makes 47 tiles and 141 files, under 1% of the free host's 20,000-file cap.

## 3. Neighbourhood layer

**Data.**
- **Names.** These come from the City of Atlanta DCP GIS neighbourhood layer, which City already
  ships as `data/ga/neighborhoods.json` (323 KB). `places.ts` reads it for the corner label and
  search.
- **NPUs.** The same service's NPU layer (25 units) gives a grouping above neighbourhoods.
- **Outside the city.** US Census TIGER places name the cells: "Druid Hills (DeKalb)" and
  "North Druid Hills (DeKalb)".
- **Gaps.** A few cells inside the city have no polygon (0.2 km², mostly park edges). They take
  the OSM park name if one covers them, otherwise the nearest neighbourhood.

**Tile to neighbourhood.** The pipeline writes each tile's neighbourhood shares (25 m raster)
into the tile index, as in [`tiles.json`](log/east-extension/tiles.json). The mapping is
many-to-many: a tile belongs to every neighbourhood with at least 5% of it. Inverting it gives
each neighbourhood's tile list.

| Use | Rule |
|---|---|
| Corner label | Unchanged: the neighbourhood under the camera target (`neighborhoodAt`) |
| Search | Unchanged results. Choosing an unloaded neighbourhood flies there and raises its load priority |
| Key | Lists the neighbourhoods on the board and says what the white model means. No tile ever appears in the interface |
| Load priority | The neighbourhood under the target loads first, nearest tile first. Next come its neighbours by distance. A shared tile loads once, for whichever neighbourhood asks first |
| Reveal | A neighbourhood's tiles dissolve from white together once all of them are ready, or after 2 s each on its own. People see a neighbourhood arrive, not squares |
| Seams | The fade uses a stippled edge band (about 60 m, world-space dither, no blending) wherever a loaded tile meets a white one. It must add 0 programs (High is inside its reserve) |
| Agent work passes | One pass per neighbourhood. A feature (building, landmark, trail piece) belongs to the polygon holding its centroid, not to a tile. Two passes can work in a shared tile without touching the same feature. Each pass is accepted with [`expansion-checklist.md`](expansion-checklist.md) on its tile list |

Main tiles per neighbourhood (majority share): Morningside (4,−1) (5,−1) (4,0) (5,0) (6,0)
(3,1)–(6,1); Virginia-Highland (4,2) (5,2) (4,3) (5,3); Old Fourth Ward (3,4) (3,5) (4,5) (3,6);
Poncey-Highland (5,4); Inman Park (5,5) (4,6) (5,6); Candler Park (6,5) (7,5); Edgewood (6,6)
(7,6) (6,7); Reynoldstown (5,7); Cabbagetown (4,7); Grant Park (3,8) (4,8).

## 4. Prerequisites, in order

| # | Item | Increment | Status, 2026-11-27 |
|---:|---|---|---|
| 1 | **Road and crossing checks on main**, and the lint fast enough to use | — | Not on main. `lint:roads` exists only on draft #710 and takes about 40 min. The crossing check (`439abf84`) lives only on `study/crossing-check-calibration` and `samsolomon/crossing-check-lid`, a family `next-steps.md` marks as deletable. I didn't run either |
| 2 | **Road kit parts 1–3** (overlaps, parapets, abutments and one profile per structure) | — | Part 1 is draft #710. Its open-edge regression (+299 m at Sweet Auburn) isn't fixed yet. Parts 2 and 3 aren't started |
| 3 | Device A/B | 0 | Draft #709 |
| 4 | Boot slicing | 1 | Partly done: #705 merged (`stage:terrain` 2.3 s median at 6×, M) |
| 5 | Night windows | 2a | **Done**: #721, High night 629 → 486 calls. The ceiling is now 535, which clears the 40-call reserve |
| 6 | Budget reserves encoded | — | **Done**: #708 |
| 7 | White placeholder | — | **Done**: #726, with `show`, `appear`, `reveal` and `hide` hooks |
| 8 | Programs phase A | 2b | Not started. High is at 94/100, 4 inside the 10-program reserve |
| 9 | **Free near houses, pack buildings** | 2c | Not started. `house-lod.ts` hides near groups but never frees them. This is a hard prerequisite, because the east is mostly houses |
| 10 | Per-view budgets, growth check, boot gate | 2d | Not started |
| 11 | **Area unload** | 3 | Not started. The scaling plan's §3.2 lists five undo paths that main doesn't have |
| 12 | **Tiles and ring manager** | 6 | #435 is a held prototype, to be rebased |
| 13 | Neighbourhood index, priority and grouped reveal; stippled seam; white tiles batched into one draw | new | Not started |
| 14 | Coarse levels L1–L3 | 7 | Not needed for the east (all of it is within 6 km). Needed before Buckhead |

## 5. Budgets

Measurements are from `test:perf` on 16110fa6, 2026-11-27, at the default view with 12 areas
loaded and R16 white (white-placeholder A/B, M). About 30 building-skin merges have landed since,
and none of them is re-measured.

| Currency | Today, Low | Ceiling, Low | Today, High | Ceiling, High |
|---|---:|---:|---:|---:|
| Geometry MB | 163.1 | 190 (reserve 25, so 165 usable) | 274.5 | 300 |
| Calls | 338 | 435 | 432 day / 480 night | 475 / 535 (night reserve 40) |
| Programs | 80 | 86 | 94 | 100 (reserve 10) |
| Triangles | 1.69M | 2.06M | 6.50M | 6.85M |
| Texture MB | 108.7 | 125 | 772 | 890 |

**Per km²:**
- **Full detail.** It costs 7.6–7.9 MB of Low geometry per km² (M, R16 seen from a distance).
  That figure is a campus and freeway row, not houses.
- **Close views cost more.** A Midtown street view measured 209.5 MB on Low (M). Close views add
  about 60 MB per neighbourhood with houses, and that memory is never freed (M).
- **White model.** It costs 0.17 MB/km² resident, 8.3k triangles/km² while drawn, and 13 KiB/km²
  to download (M, #726).
- **High.** Ground maps cost 21.8 MB of texture per km² (M), so High has room for about 5 km²
  before it too needs unload.

**Projected resident memory, Low (E):**

| View | What is resident | Geometry |
|---|---|---|
| Default (Five Points), no change in loading | Today's board plus 26.4 km² of white | 163.1 + 4.5 = **167.6 MB, inside the reserve.** It needs 2c's ~−18 MB, giving ~150 MB |
| BeltLine (target over Ponce City Market, ~1.5 km orbit), with unload | ~18 km² at full detail; the rest white | About 13 MB fixed + 18 × 7.9 + 30 × 0.17 = **~160 MB** |
| The same, if houses and canopy cost 10 MB/km² | | ~198 MB, over the ceiling. The window must shrink to ~15 km² |

So **the resident window is set from the first east tile's measured cost**, not assumed. That
measurement is a gate in release E4.

**Draws and programs (E).**
- **One white draw.** One draw and one shadow per white tile would add up to 94 calls, more than
  fits on High by day (43 left) or at night (15 above the reserve). White tiles must be batched
  into one draw, with the index buffer rebuilt on each load or unload.
- **Triangles.** All of the east shown white adds about 220k triangles on Low, giving 1.91M of
  2.06M. Past about 6 km a coarser white form is worth it (L2-like, ≤ 10 KB/km²).
- **No new programs.** East tiles reuse the area materials. The trail reuses path materials. The
  seam stipple must add nothing.

**Download (E).** Area source data is 0.45 MB/km² (M, row files). That makes about 0.29 MB for a
full tile and 0.15 MB for a clipped one, gzipped, and about 12 MB hosted for all 47 tiles, static
with no per-visitor server cost. The east's white form adds about 340 KiB. A visitor at the
BeltLine view fetches about 4–5 MB of east tiles.

**Main thread.** Each tile mount stays at or under 300 ms for its longest task at 6× (today's
sliced rows measure 185–335 ms, M).

## 6. Road and rail (a gate)

Sam is worried about road and rail, so they are their own phases with their own bar, not a line
in the content list.

**Known open Connector defects** (road-kit audit on cf83c531, High, all 13 boards, M, from
[road-kit.md](https://github.com/samsolomon/sim-atlanta/blob/samsolomon/road-kit-1-overlaps/docs/road-kit.md)
and the [Connector handoff](handoffs/studio-connector-repairs.md)):

| Defect | Size | Fixed by |
|---|---|---|
| Elevated edge with no wall | 47.9 km at 1,297 sites (83% of elevated edge) | Part 2, parapets |
| Stacked treads (two decks within 0.3 m) | 5,316 m² at 243 sites (Sam's A5) | Part 1 |
| At-grade paint drawn over paint | 5,238 m² in 58 pairs (J3, Freedom Parkway) | Part 1 (#710: 4,498 → 103 m²) |
| Steps and open deck ends | 3.8 km at ~210 sites; Ellis Street's 2.2 m step at z −520 | Part 3 |
| Washington Street (E1) | Drawn 4.5–7.5 m below its lidar surface | After part 3 ([research](https://github.com/samsolomon/sim-atlanta/blob/samsolomon/connector-e2-joints/docs/washington-street-bridge.md)) |
| Abrupt lane changes; unbalanced merges | 43; 34 | Part 4 |
| Decks with no supports | 214,669 m²; 27 pier meshes city-wide (K1) | Part 5 |
| Capitol tunnel nits | Bank slab shelf and nubs at the mouths | Parts 1 and 3 |
| Ellis side walls | Short, uneven pieces | Part 2 |

**East road and rail scope:**
- **I-20.** The mainline runs from the interchange to Moreland. It sits in cut or on fill
  (survey task). Ramps:
  - Hill Street (x 1218–1552);
  - Boulevard (x 1770–2505);
  - Memorial/Glenwood (x 2738–3124);
  - Moreland and Glenwood (x 3378–4300);
  - the Carter Center ramps (x 3918).

  The street bridges and walls over and beside it come from NBI records and lidar.
- **MARTA Blue/Green east.**
  - The line runs from King Memorial (x 1472, z 439) to Inman Park/Reynoldstown (x 3591,
    z −395) and Edgewood/Candler Park (x 4694, z −878).
  - It is elevated over six CSX tracks at Hulsey yard with 9.6–12.6 m clearance (M,
    [king-memorial-corridor.md](king-memorial-corridor.md)).
  - Where it is at grade, on an embankment or in a cut further east is a survey task.
  - Both stations are landmark models.
  - Trains use the existing schedule and live data. Following a train east must keep working.
- **CSX and the BeltLine corridor.**
  - The CSX mains through Hulsey yard come from OSM and the rail network. The yard's current use
    is a survey task. Freight stays `illustrative`.
  - The Eastside Trail rides the old rail corridor past Ponce City Market and the Krog Street
    tunnel (x 2567–2608, z 49–165, OSM). Its bridges and grade are a survey task.

**Road and rail bar.** Before the east tiles open to visitors:
1. `lint:roads` reads zero on every east tile for the kit primitives that exist (parts 1–3,
   plus 4–5 for I-20). It doesn't regress on today's 13 boards.
2. The crossing check passes on every east structure.
3. Sam approves a **matched still sheet**: day and night, Low and High, each camera saved. It
   covers I-20 at Boulevard and at Moreland, the interchange's south legs, the MARTA viaduct over
   Hulsey, both stations, the Krog Street tunnel, the trail at Ponce City Market, Freedom Parkway
   at the east edge, and a follow-train run from King Memorial to Edgewood.

## 7. Phasing

Every release ships only if it is no worse than live on phones (`test:perf` plus a device run).
East content waits behind `?east=1` until its release.

| Release | What ships | Visible change | Owner(s) | Agent-h (E) |
|---|---|---|---|---:|
| **E0. Gate** (parallel) | Road tooling on main (6–10 h); road kit 1 finished (8–12), 2 (12–20) and 3 (10–16); Washington Street (6–10). 2c houses and packing (6–10); 2d budgets and gates (6–10). 2b programs (8–12). Increment 0 (2–3 plus device). Boot slicing (6–10) | Better Connector; no new area | Roads; streaming; materials; coordinator; integrator | 70–113 |
| **E1. Unload** | Increment 3 on today's board. R16 and the Midtown rows drop to white when far. Never-empty test; growth check ±10% | Far rows go white after travel | Streaming | 20–30 |
| **E2. Tiles** | Increment 6 ring manager (25–35); legacy areas as units, multi-board seams at x 1800 (8–12); neighbourhood index, priority, reveal, labels and Key (8–12); stippled seam and one white draw (6–10); tile pipeline: 3DEP ground, OSM and Overture context, City canopy plus Meta/WRI heights (15–25) | None without the flag | Streaming; ground | 62–94 |
| **E3. Road and rail east** (flag) | I-20 survey (6–10) and build with the strip (30–45); road kit 4–5 (20–30); I-20 traffic (4–8); MARTA east line and two stations (20–30); CSX and BeltLine corridor (12–20). **Sam's still sheet** | None without the flag | Roads; rail; skins | 92–143 |
| **E4. Eastside opens** | Block A plus the strip, 15.2 km². Seven neighbourhood passes (25–35); the Eastside Trail as a feature (8–12); Ponce City Market (10–16); Krog Street tunnel (4–6). **Gate:** the first tile's measured MB/km² sets the window | Inman Park to Candler Park | Ground; skins; streaming | 47–69 |
| **E5. Northeast opens** | Block B, 11.2 km². Five passes (15–25); north trail reach to z −6500; one landmark pass (8–12) | Virginia-Highland, Morningside | Ground; skins | 23–37 |
| | | | **Total** | **~314–486** |

**Owners**, one integration owner per group (AGENTS.md):
- **Streaming:** 2c, 2d, increments 3 and 6, the neighbourhood layer.
- **Roads:** tooling, road kit and I-20.
- **Rail:** MARTA east, CSX and the trail corridor.
- **Ground:** the tile pipeline and neighbourhood passes.
- **Skins:** landmarks, under the AGENTS.md photo rules.
- **Coordinator:** the perf window, device runs and Sam's sheets.

**Deploy.** E2–E5 change pipeline output (`pnpm data`, a `web/dist` rebuild and a redeploy).
E0 and E1 need a rebuild only.

**Landmarks worth doing**, in order:
1. Ponce City Market (x 2413, z −2079).
2. Inman Park/Reynoldstown station.
3. The Eastside Trail itself: a concrete ribbon (width to confirm from survey) with lamps, on
   its corridor grade.
4. The Krog Street tunnel and its painted walls, as generic colour fields (no copied art).
5. Edgewood/Candler Park station.
6. Then the Carter Center, Little Five Points and Historic Fourth Ward Park.

Each landmark follows the photo, dimension and night rules, and adds 0 programs.

## 8. Risks and open questions for Sam

**Questions:**
1. **The trail as a feature.** Is the trail surface plus lamps enough for E4? People on the trail
   would be ambient (`illustrative`, Key only). They cost triangles and calls, so I'd hold them
   until E4's measurements.
2. **How far east.** Options:
   - x 5400 (recommended): Candler Park and the Edgewood station.
   - x 6200: adds 70% of Lake Claire, +3.2 km², 5 tiles.
   - x 7000: all of Lake Claire. The East Lake station (x 7272) still sits outside.
3. **North-south extent.** z −6500 … 1500 is recommended. Completing the Northeast trail toward
   Lindbergh is a north step, not an east one.
4. **Should the I-20 strip be in scope?** It is 0.8 km² under today's south band. Without it,
   I-20 west of x 1800 stays undrawn.
5. **Is Buckhead next?** Lenox is about 3.7 km north of the board edge. It needs coarse levels
   (increment 7) as well, so I'd do the Lindbergh and Northeast trail step first.
6. **White as the far form.** Using the white model as the far form of loaded areas (−9 MB Low,
   your earlier call) is worth more once the east exists.

**Risks:**
- **Memory.** The east's cost per km² is unmeasured, and it is house and canopy heavy. Without 2c
  and unload, a phone tab over budget is killed.
- **Stale baseline.** It predates about 30 skin merges, so re-measure before E1.
- **Seams.** Multi-board seams at x 1800 have no precedent (`verifySeam` assumes one neighbour per
  edge).
- **Tooling.** The road lint's 40 min run keeps it off CI. If it doesn't come down, road
  regressions surface late.
- **Crossing check.** It lives on branches marked deletable. Recover it before cleanup.
