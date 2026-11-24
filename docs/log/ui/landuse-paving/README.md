# Landuse paving between kerb and building line

Sam saw grass-green ground at the Robinson College doors on Broad Street. The cause is board-wide. The ground map fills each board with sage `#b5bd97`, then paints a sidewalk casing of road width plus 5 m, the mapped footways, and the landcover kinds it has colours for. Downtown landuse polygons (commercial, retail, university, institutional, hospital, religious) had no colour. So wherever a building line sits more than 2.5 m past the kerb, the sage shows through. At Robinson, Broad Street is mapped `residential` (7.5 m). Its paint ends 6.25 m from the centreline, but the façade is 11.75 m away.

**Step 1 (on):** commercial and retail landuse paints first in `PAL.sidewalk`, the same concrete as the casing. Every mapped grass, park, garden, pitch, parking and plaza polygon still draws over it.

**Step 2 (off, `PAVE_CAMPUS_LANDUSE` in `web/src/terrain/ground-map.ts`):** this adds university, institutional, hospital and religious landuse. Campuses keep real lawns that OpenStreetMap often leaves unmapped, so this step also paves open campus ground. Robinson's doors sit on Georgia State's university polygon, so only step 2 fixes the view that started this.

Only the downtown and east boards carry these landuse polygons. Midtown boards have none, so Midtown's verges stay sage under both steps.

No material, shader program or texture changes. The ground canvas is the same size, and only colours inside it change.

| View | City camera | Day and night, three states |
| --- | --- | --- |
| Peachtree Center | `557,-862,-14,52,490` | [Comparison](ptc.jpg) |
| Robinson doors, close | `144,-131,140,62,35` with `&dev&mindist=20` | [Comparison](door.jpg) |
| Broad St at Marietta | `174,-134,75,48,440` | [Comparison](broad.jpg) |
| Peachtree St at 200 Peachtree | `301,-568,312,49,420` | [Comparison](peachtree.jpg) |
| Midtown, Peachtree at 10th | `349,-3071,20,50,450` | [Comparison](midtown.jpg) |
| Georgia State east, campus edge | `870,-300,0,50,450` | [Comparison](campus.jpg) |
| Residential edge, southwest downtown | `-350,-1650,0,50,450` | [Comparison](resid.jpg) |

All use November 20, 2026 at 11:30 and 23:30 Eastern, clear weather, paused, default quality. Web rebuild only.

## Step 2 lawn check (November 24)

The coordinator asked whether step 2 would pave a real quad, churchyard or hospital green. These are all ten campus-type polygons on the current boards. They exist only on the downtown board; the east board repeats four of them. For each polygon I sampled a 2 m grid. A cell counts as **open** if it isn't under a mapped building, mapped landcover, a road or walkway, or its casing; open cells are what step 2 newly paints. I then read the matching Esri World Imagery pixels and called a cell **vegetated** when 2G−R−B > 18.

| # | Kind | Name | Area | Open (step 2 paints) | Vegetated in open | Canopy trees inside |
|---|---|---|---|---|---|---|
| 0 | hospital | Grady Health System | 38,547 m² | 4,608 m² | 740 m² | 1 |
| 1 | hospital | Grady Health System | 7,483 m² | 2,208 m² | 36 m² | 0 |
| 2 | hospital | Grady Health System | 4,170 m² | 2,188 m² | 540 m² | 2 |
| 3 | hospital | Grady Health System | 15,599 m² | 5,680 m² | 1,168 m² | 3 |
| 4 | hospital | Hughes Spalding Hospital | 7,215 m² | 2,144 m² | 708 m² | 1 |
| 5 | university | Georgia State University (east) | 115,569 m² | 24,820 m² | 3,940 m² | 16 |
| 6 | university | Georgia State University (core) | 283,224 m² | 39,140 m² | 5,004 m² | 44 |
| 7 | religious | unnamed, Washington St beside the Capitol (likely Central Presbyterian) | 2,286 m² | 948 m² | 152 m² | 1 |
| 8 | religious | unnamed, Peachtree St (likely Sacred Heart Basilica) | 1,928 m² | 540 m² | 144 m² | 2 |
| 9 | institutional | unnamed, Ted Turner Dr / Forsyth St block | 57,643 m² | 10,968 m² | 2,020 m² | 7 |

Grady figures come from the 1.3 m/px Georgia State core image; the others are from their own crops. The classifier over-counts: the green copper roof on the institutional block reads as vegetation because that building is missing from the footprints, and street-tree crowns overhanging the kerb count too.

**Result: no coherent lawn.** The vegetated cells are speckles of street-tree crowns, planters and one green copper roof. Georgia State's green spaces (Hurt Park, Woodruff Park) and the playing fields are mapped as park or pitch, or sit outside the polygons, so they stay green. The churchyards are tree-covered corners of 150 m² or less, and City already draws those trees. Grady and Hughes Spalding have no grounds lawn; their open ground is parking, service yards and a bare-dirt lot.

**Recommendation:** no exception list is needed. A "stay green if canopy or grass is mapped inside" rule adds nothing, because mapped grass already draws over the paving and canopy trees render on top.

Sheets (left: step 2 paves the pink; right: cyan marks vegetation inside the pink): [Georgia State core](campus-check/gsu-core.jpg) · [Georgia State east](campus-check/gsu-east.jpg) · [Grady and Hughes Spalding](campus-check/grady.jpg) · [Institutional](campus-check/inst.jpg) · [Religious, south](campus-check/rel-south.jpg) · [Religious, north](campus-check/rel-north.jpg)
