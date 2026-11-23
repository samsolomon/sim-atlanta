# Tree species

City's canopy is one generic leaf-clump tree, coloured by a random kind. This program replaces it with real species, one at a time. Each species is built and reviewed in the model lab (`/models.html`, Trees section) before City uses it. Which City trees get which species is a separate decision for Sam (see [City rollout](#city-rollout-decision-pending)).

## The framework

`web/src/trees/` holds one parameterised model per species, rather than a fixed mesh:

- **Size class.** `sapling`, `young`, `mature` or `specimen`. Each class has a nominal height, crown **spread (a diameter)** and trunk calliper, and a sourced range for each. A test checks that every nominal value lies within its range.
- **Seed.** Varies height and spread by ±8% and sets the spin, clump jitter and the tree's own offset in days on the seasonal calendar.
- **Season.** Driven by the clock's day of year. A species returns the fraction of its crown in leaf, its colour, any bloom, and an optional fallen-leaf carpet.
- **Measured overrides.** A placement can carry a real `heightM` and `spreadM`, for example from an inventory.
- **Trunk calliper is real.** The trunk's unit radius is `calliper / spread`, so it renders at the class's calliper once scaled by the crown.

`render.ts` batches any mix of species and sizes into instanced draws:

- one limb mesh per (species, size class) present
- one leaf mesh per clump shape (faceted clump or pine cone)
- one carpet mesh

**Budget.** At each tier, a species tree must use no more triangles than the generic Midtown tree. The generic count comes from the meshes `World.buildTrees` actually builds: **196** at high detail, **156** at low. The tests enforce this for every species and size class.

**Lab controls.** Size class or all sizes in a row beside a walker (1.74 m tall, measured in the page), season presets (clock date, spring, summer, fall, late fall, winter), day/night, high/low detail, and a live triangle and draw report. The generic tree sits in the same section as the baseline. `?v=ginkgo&size=all&tier=low&t=<ISO>` makes a view reproducible.

## Ginkgo

`web/src/trees/ginkgo.ts`. [Lab, all sizes on 23 November](log/ui/tree-species/lab-ginkgo-nov23.jpg)

**Form.**
- Young trees are "gangly", open and irregular, with one leader (NC State, Clemson, UF/IFAS). Old trees become broad, and some have several trunks.
- The High Museum's champion forks low, at about a fifth of its height, into thick near-upright stems under a broad, open crown ([Commons, 27 Nov 2017](https://commons.wikimedia.org/wiki/File:Ginkgo_tree_and_Rodin_at_the_Woodruff_Arts_Center.jpg)).
- Only that specimen is photographed, so the forked form is used for `specimen` only. The other classes keep a single leader with sparse limbs that angle upward.
- Leaves grow in tufts on spur shoots, so the crown reads as separate clumps with sky between them.
- Bark is light grey with shallow furrows ([Morton Arboretum](https://mortonarb.org/plant-and-protect/trees-and-plants/ginkgo/)).
- No source supports tiered, near-horizontal limbs. The upward limb angles are an artistic choice.

**Sizes.** Spread is the crown diameter. Sources:
- [NC State](https://plants.ces.ncsu.edu/plants/ginkgo-biloba/common-name/ginkgo/): 15–24 m tall, 9–12 m wide.
- Georgia Tech campus inventory, 89 ginkgos ([service](https://services2.arcgis.com/I9cUOJUZvdGAJncI/arcgis/rest/services/Trees_All_View1/FeatureServer/0)):

  | | p10 | p50 | p90 | max |
  |---|---|---|---|---|
  | Height (m) | 3.7 | 6.7 | 15.2 | 19.2 |
  | Spread (m) | 1.2 | 3.2 | 7.9 | 10.8 |
  | DBH (m) | 0.05 | 0.11 | 0.39 | 0.64 |

- Trees Atlanta's [champion record](https://services6.arcgis.com/BZn8g8tzu5WfMokL/arcgis/rest/services/TreeChampionData_2019/FeatureServer/0).

The class boundaries are our own synthesis, not a published standard.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal |
|---|---|---|---|---|
| Sapling | 3–4.5 | 1–2 | 0.05–0.075 | 4 / 1.5 / 0.065 |
| Young | 4.5–8 | 2–4 | 0.08–0.15 | 7 / 3.2 / 0.12 |
| Mature | 14–22 | 7–12 | 0.3–0.6 | 17 / 10 / 0.45 |
| Specimen | 22–28 | 15–26.2 | 0.8–1.5 | 27.5 / 26.2 / 1.5 (the champion) |

**Calendar.** Dated photographs settle the timing better than articles do.

| Date | Stage | Evidence |
|---|---|---|
| ~Mar 21 to Apr 20 | Leaf-out | **Inferred.** No Atlanta source found. |
| to Oct 31 | Green | |
| Nov 1–14 | Turning | |
| Nov 15–27 | Butter-yellow | The High's tree was full gold on [27 Nov 2017](https://commons.wikimedia.org/wiki/File:Ginkgo_tree_and_Rodin_at_the_Woodruff_Arts_Center.jpg). A Virginia-Highland tree was at "peak" on [23 Nov 2018](https://commons.wikimedia.org/wiki/File:Mature_ginkgo_tree_in_Virginia-Highland_neighborhood_of_Atlanta_in_late_November.jpg). |
| Nov 28 to Dec 1 | Drop | Trees Atlanta says a ginkgo often drops its whole canopy in a single day ([50 Atlanta trees](https://treesatlanta.org/resources/50-atlanta-trees/)). The High's tree drops "in a period of a few days or even a few hours" ([treeinspection.com](https://treeinspection.com/atlanta-s-trees/item/gingko)). |
| to ~Dec 13 | Gold carpet fading | Carter Center ginkgos were "dropping their final leaves" over a heavy gold carpet on [8 Dec 2016](https://commons.wikimedia.org/wiki/File:Ginkgos_and_geese_at_the_Carter_Center.jpg). |
| then | Bare grey limbs | |

- **Per-tree offset.** Each tree's offset is at most ±3 days, so a street of ginkgos turns and drops nearly together.
- **Year to year.** The drop seems to follow the first hard freeze, which came on Nov 15 in 2026. City uses a fixed calendar and does not model the weather year.
- **Disagreement.** The Piedmont Park Conservancy gives an earlier peak, "into early November". The dated photos are later.

**Budget, triangles per tree** (budget 196 high / 156 low):

| Class | High | Low |
|---|---|---|
| Sapling, young, mature | 179 (52 limbs + 120 leaves + 7 carpet) | 81 |
| Specimen | 191 (64 + 120 + 7) | 81 |

**Draws.** One ginkgo needs three: limbs, leaves and carpet. A scene with all four classes needs six, with one limb draw per class.

**Night.** Crowns are lit only by the scene, so the gold never glows ([night](log/ui/tree-species/lab-ginkgo-night.jpg)).

## Where ginkgos are

**OpenStreetMap.** No feature in the board box is tagged as a ginkgo. That covers 1,421 `natural=tree|tree_row|wood` features, snapshot 2026-07-15, in the box 33.743–33.806 N, 84.403–84.372 W. Only 16 trees in the box carry any species tag, and all 16 are *Quercus nuttallii*.

**Inventories with species and coordinates.** These hold 338 ginkgo records in the box:

| Dataset | Ginkgos in box | Terms |
|---|---|---|
| City of Atlanta 2011 Downtown inventory, 9,005 trees ([CSV mirror at Georgia Tech](https://dssgtrees.gatech.edu/CityStreetTrees/CityTrees1.csv)) | 78 | No licence stated |
| Trees Atlanta planting inventory ([service](https://services6.arcgis.com/BZn8g8tzu5WfMokL/arcgis/rest/services/Trees_Atlanta_Plant_Inventory_Public_View/FeatureServer/0)) | 172 (150 Alive) | No licence stated |
| Georgia Tech campus inventory (service above) | 88 (72 Active) | No licence stated |
| Trees Atlanta Champion Trees (service above) | 1 | No licence stated |
| McCoy et al. 63-city dataset ([Zenodo](https://zenodo.org/records/6726506)), a 1993–2018 snapshot of Trees Atlanta plantings | 54 | **CC0** |

Only the Zenodo copy is openly licensed. We may cite individual trees as facts, but we should not redistribute the other datasets wholesale without asking their owners.

**The High Museum ginkgo (placed in City).** `web/src/trees/sites.ts`, tiers per attribute:

| Attribute | Value | Tier | Source |
|---|---|---|---|
| Species | Ginkgo | `reported` | Trees Atlanta champion record |
| Trunk position | City (607.2, −3998.6), on the lawn 1.2 m past the dead end of the little lawn path, 14 m south of the ramp centreline | `inferred` | Local observation (Sam), checked against [Street View from Peachtree, Dec 2025, heading 252°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78993,-84.38466&heading=252&pitch=12&fov=55) |
| Size | 20 m tall, 18 m spread | `inferred` | Sam's call |

**How the position was chosen.**
- **Champion record.** It gives 33.789866, −84.384916, which is City (617.9, −3999.2). #203 placed the tree there.
- **#210, wrong.** #210 moved the tree 5.7 m to a two-panorama triangulation. Sam saw that this still crowded the ramp's Peachtree end.
- **Sam's spot, current.** Sam knows the site and puts the trunk at the dead end of the lawn path, (607.5, −3997.4). The trunk is drawn 1.2 m past it on the lawn.
- **The check.** Bearings are measured against Rodin's *The Shade* in the same frame, which cancels the panorama's heading error. The Peachtree panorama shows the trunk 5.1° left of the sculpture. Sam's spot comes out 8.5° left, about 2 m apart at 37 m. That is no clear contradiction.
- **Dropped panorama.** #210's second panorama (the café, Sep 2024) was dropped. Its foreground tree looks like a magnolia, so it probably sighted the wrong trunk.
- **Departure from the record.** The champion point is 11 m away. Champion coordinates are often taken from the sidewalk.
- **Ramp clearance.** The crown keeps its leaves 2.6 m outside the ramp edge in plan and at least 9.5 m up.
- **Kept, not thinned.** The canopy-map crown 14.7 m away, by the Peachtree steps, matches a real oak.

[Before and after, from the same two cameras, with the Street View check](log/ui/tree-species/city-ginkgo-path-end.jpg)

**How the size was chosen.**
- The 2012 champion record measured 27.5 m tall, 26.2 m spread and 4.72 m circumference.
- The culture agent's photo and leaf-off aerial estimate was 17 m by 15 m.
- The canopy height map (Meta/WRI) independently put a 17 m crown, 15 m across, 2.8 m from the trunk.
- Sam judged the tree today to be a mature tree "a little larger than" the photo estimate. The record is fourteen years old and was measured for champion points, and Atlanta Magazine (2025) reports that renovations and pollution "have stressed its health for decades".
- The size is set in one line in `sites.ts`.

**Form.** The tree is drawn with the forked `specimen` form, because photographs show its low fork. The class's calliper scales with the spread, to 1.03 m, which matches the photo estimate of 0.9–1.0 m.

**What it replaces.** It stands in the canopy map's own crown for this tree. A crown is removed when its trunk lies within the ginkgo's radius plus half its own; here that removes the 17 m crown and a 10 m neighbour 8.8 m away. Removal happens after `World.buildTrees` draws each crown's colour seed, so no other generic tree changes kind or colour (tested).

**The entry ramp.** The culture agent's rebuilt ramp sits about 11.5 m from the trunk. The drawn tufts reach 10.5 m out. The nearest comes within 0.6 m of the edge of the mapped ramp footway, and the lowest hangs 9.5 m up (9.0 m at low detail). A test holds every leaf within a metre of the ramp above the 7.5 m the culture agent asked for.

**Size class.** 20 m sits below the specimen class's 22–28 m range. The site uses the specimen class only for its forked form; its height and spread are per-tree overrides.

[Before and after, captioned](log/ui/tree-species/city-ginkgo-review.jpg) · [Close, 23 Nov](log/ui/tree-species/city-ginkgo-nov23-high.jpg) · [Context](log/ui/tree-species/city-ginkgo-context-day.jpg) · [Night](log/ui/tree-species/city-ginkgo-night-high.jpg) · [Context at night](log/ui/tree-species/city-ginkgo-context-night.jpg) · [Low detail](log/ui/tree-species/city-ginkgo-nov23-low.jpg) · [Summer](log/ui/tree-species/city-ginkgo-summer-high.jpg). Camera: `/?view=city&cam=618,-3999,245,70,80&t=2026-11-23T12:00:00-05:00&speed=0`.

**Calendar caveat.** City passes `local().doy`, which counts leap days, so in a leap year the City ginkgo runs a day behind the lab. That is within its ±3-day spread.

**Ansley Park.**
- **Records.** No inventory or photo set documents an individual large ginkgo. The only records are two young 'Shangri-La' ginkgos, planted on 17th St in 2017–18, at about (667, −4383) and (635, −4363).
- **Sam's account.** Sam reports many mature ginkgos in the neighbourhood.
- **Plan.** Try dated mid- to late-November leaf-on aerials, where ginkgos show as uniform bright butter-yellow crowns. Place any we can resolve as `inferred`, citing the image date. Otherwise, bias Ansley's illustrative species mix toward ginkgo. Never scatter named trees.

## Four ginkgo renderings

Sam wants the ginkgo to read differently from the generic clump trees. Its foliage follows the main limbs in dense, feathery sprays that sweep upward, and up close the fan leaves cluster on spur shoots. The lab (`/models.html?v=ginkgo`, **Ginkgo rendering**) builds four candidates on one shared skeleton of upswept, angular two-segment limbs. All four share the same season calendar, the drop-day gold carpet, a few falling leaves during the drop, a warm self-light by day (switched off at night), and darker inner sprays shading to bright rims. **City still draws the current model until Sam picks one.**

| | How it works | Triangles per tree, high / low | Notes |
|---|---|---|---|
| A · Branch sleeves | A faceted three-sided sheath per spray along each limb, swept up, with a crease between facets | 185 / 101 | Reads at every distance and holds the ink style |
| B · Micro-fans | Three-triangle fan chips on spur shoots: 20 per spray at high detail, 8 at low | 1,265 / 245 | Near range only. Swaps to A beyond 60 m, so 300 distant trees cost the same as A |
| C · Leaf cards | Two crossed cards per spray, cut out from a painted fan-leaf atlas with sky between | 145 / 85 | Without ink it is the leafiest of the four. With ink, every cutout edge is outlined and the crown goes dark. The alpha test does not shimmer, but the ink does |
| D · Flame tufts | Two stacked three-sided flame facets per spray | 185 / 101 | A storybook look and very cheap |

The current model costs 179 / 81 triangles per tree (191 / 81 for the specimen). The generic tree's 196 / 156 is the budget. A, C and D stay within it, and B is the deliberate near-range exception.

**Measured cost.** Mature trees in the lab at 1, 50 and 300 trees, with ink, grade and shadows on, using `__lab.bench(60)`. Triangles are counted for the main pass. Times are CPU submit plus `gl.finish` per frame on the Mac Studio, in ms.

| Trees | Current | A | B | C | D |
|---|---|---|---|---|---|
| 1 | 1,746 tri · 0.10 | 1,832 · 0.11 | 3,992 · 0.29 | 1,752 · 0.09 | 1,832 · 0.35 |
| 50 | 17,601 · 0.25 | 21,901 · 0.38 | 129,901 · 0.35 (near) | 17,901 · 0.16 | 21,901 · 0.38 |
| 300 | 106,023 · 0.20 | 131,823 · 0.27 | 131,823 · 0.63 (far, as A) | 107,823 · 0.37 | 131,823 · 0.63 |

**Draws.** Every variant uses limbs and foliage per size class present, plus the carpet and the falling leaves. B adds its far sleeves. That comes to 4–5 instanced draws for any number of trees.

**Reference photographs.** The sheets show cited Commons photographs: sapling, young, mature and specimen, in fall and winter. Commons has no usable sapling-in-winter photograph. Sam's two reference screenshots (a big upswept crown, and close-up fans on branches) are not committed, for copyright reasons.

Compare sheets, each showing fall, winter, night and low detail beside the references: [sapling](log/ui/tree-species/variants-sapling.jpg) · [young](log/ui/tree-species/variants-young.jpg) · [mature](log/ui/tree-species/variants-mature.jpg) · [specimen](log/ui/tree-species/variants-specimen.jpg)

## Leaf cards without the dark ink (C1–C4)

Sam picked C (leaf cards), with B's fans, but the ink outlines drained C's colour. The cause is the ink pass (`web/src/vignette/ink.ts`). It runs once over the finished frame and draws a line wherever depth jumps (a second difference, relative to distance) and, more faintly, wherever luminance steps. It has no idea what a pixel belongs to. Every cut-out leaf on a card is a depth jump against the sky behind it, so every leaf got a near-black outline.

**The hook: a foliage mark in the colour alpha.** `inkFoliage(material, mode)` patches a material so its fragments write a small mode code into alpha. Opaque surfaces write 1, and City runs ink directly after the scene render, before AO, bloom, tilt-shift and grade, so the mark arrives intact. The ink pass then:
- draws **no** line where the pixel and its four neighbours are all foliage;
- draws a silhouette where foliage meets anything else, but **only if** the far side stays clear 4 and 8 pixels out. Crown against sky, ground or a building qualifies; a small gap between leaves does not;
- for modes 2 and 3, uses a warm ochre-brown ink (`#5a3a12`) at 75% strength in place of near-black.

Unmarked materials, buildings included, take the old code path unchanged (checked in City at `cam=618,-3999,245,70,80`). The mark needs opaque materials: alpha-tested cards are fine, alpha-blended ones are not, which also suits phones. Any species, and later the generic canopy, can opt in with one call.

| | Ink | Triangles per tree, high / low |
|---|---|---|
| C | Old ink, every leaf outlined | 145 / 85 |
| C1 | Silhouette only, near-black | 145 / 85 |
| C2 | Silhouette only, warm ochre | 145 / 85 |
| C3 | Warm. Interior lines kept close up, faded out between 16 and 40 m | 145 / 85 |
| C4 | C2, plus three-triangle fan leaves on the outer branch tips | 445 on a tipped tree / 85 |

**Guardrails (Sam).**
- No fans at all at low detail.
- Cards are alpha-tested (discard), never blended. A test checks this.
- C4 caps the fans: at most `TIP_CAP` = 8 trees carry tips, nearest first and within `TIP_RANGE_M` = 45 m. The rest stay C2. Tips are re-chosen only when the camera moves more than 1 m.
- B (micro-fans) also draws no fans at low detail.

**Worst-case budget test.** A synthetic 4 × 5 grove of 20 mature trees 11.5 m apart, about as dense as the Peachtree avenue at Andrew Young, with the camera standing inside it (`ginkgo-variants.test.ts`).

| Tier | Variant | Triangles drawn | Draws | Ceiling (fails above) |
|---|---|---|---|---|
| High | C, C1, C2, C3 | 3,000 | 4 | 7,320 triangles, 5 draws |
| High | C4 (8 trees tipped) | 5,400 | 5 | 7,320 triangles, 5 draws |
| Low | All C variants | 1,620 | 4 | 3,120 triangles, 4 draws |

**Measured on the Mac Studio** in the lab, with the same grove and an eye-level camera inside it (`?v=ginkgo&variant=…&n=20`, then `__lab.bench(60)` and `__lab.overdraw()`). Frame time is the wall time to submit 60 frames and `gl.finish`, which covers CPU and GPU together. Every case came in between 0.04 and 0.43 ms, inside the noise of a sub-millisecond measurement, so no variant is measurably slower than another here.
- Foliage overdraw, the leaf layers per covered pixel with depth test off (a worst case):
  - High: current 2.62 (max 11), cards 1.19–1.21 (max 6).
  - Low: current 2.05, cards 1.01.
- Main-pass triangles for the whole lab frame: current 7,743, C–C3 7,863, C4 12,663 at high; about 3,800–4,500 at low.
- `EXT_disjoint_timer_query_webgl2` is available in the Studio's Chrome, so a later pass can split CPU from GPU.
- A16 and iPhone numbers are deferred until Sam has the phone.

[C family compare sheet: specimen, mature, close-ups, night and low detail](log/ui/tree-species/variants-c-family.jpg)

## Next species (lab only)

All six will be built in the lab with the same framework, budget and tests, and will not be placed in City until Sam decides on the rollout. Spread is a diameter. Sizes are in metres, given as class ranges. "GT" is the Georgia Tech inventory and "City 2011" the downtown census.

| Species | Form to build | Sapling | Young | Mature | Specimen (Atlanta champion) | Season |
|---|---|---|---|---|---|---|
| Willow oak (*Quercus phellos*) | Straight single trunk, dense oval-to-round crown, fine willow-like leaf texture | 3.5–5 tall | 5–12 tall, 3–7 spread | 15–24 tall, 9–16 spread, 0.35–0.75 DBH | 41.9 / 30.8 / 1.79 (Manor Ridge Dr) | Leaves out in April. Yellowish orange-brown to red-brown fall colour; leaf drop not sourced. |
| Southern magnolia (*M. grandiflora*) | Dense pyramidal evergreen, branches sweeping to the ground. About 19% of GT trees are multi-stem | 3–5 | 5–10 | 12–18 tall (Atlanta trees run shorter than NC State's 18–24) | 19.9 / 20.1 / 1.38 (Oakland Cemetery, in the box) | Evergreen. Creamy white flowers May–June. |
| Loblolly pine (*Pinus taeda*) | Tall clear trunk, high oval crown of cone tiers; lower limbs self-prune | 3–6 | 7–15 | 18–27 tall, 6–12 spread | 41.5 / 20.1 / 1.12 (Princeton Way) | Evergreen. |
| Red maple (*Acer rubrum*) | Oval to rounded crown with ascending branches; smooth grey bark when young | 3–4.5 | 5–10 | 12–18 tall, 8–14 spread | 26.8 / 32.9 / 0.97 | Red flowers January–March before the leaves. Red early-fall colour. |
| Crape myrtle (*Lagerstroemia indica*) | Multi-stem vase (GT median 4 stems, p90 6), smooth mottled bark | 2–3.5 | 3.5–5 | 6–10 tall, 4–7 spread | 10.1 / 7.8 (420 Edgewood Ave) | Pink, red or white bloom July–September. Yellow-orange-red fall colour. |
| Flowering dogwood (*Cornus florida*) | Low, wider than tall, layered horizontal branching | 1.5–2.5 | 2.5–4 | 5–8 tall, 5–8 spread | 9.1 / 13.7 / 0.60 (Ponce de Leon Ave) | White bracts before the leaves, early April (Dogwood Festival). Red to purple fall colour. |

**Sources and gaps.**
- Mature ranges, forms and bloom months come from each species' [NC State Plant Toolbox](https://plants.ces.ncsu.edu/) page, checked against GT percentiles and City 2011 height and spread bins.
- Champions come from the Trees Atlanta service.
- Most species have no sourced Atlanta leaf-out or leaf-drop date.
- **Willow oak is not documented as "Atlanta's dominant street tree."** Trees Atlanta calls it "likely the most popular oak for streetscape plantings". In the City 2011 census it is second with 1,155 trees, behind crape myrtle at 1,475. It is first among Trees Atlanta plantings in the box, at 647.

**Planned build order.** Pairs share the most code:
1. Willow oak and red maple: single-trunk deciduous broadleaves.
2. Southern magnolia and loblolly pine: evergreens, and the first `cone` leaf shape.
3. Crape myrtle and dogwood: multi-stem and layered small trees, with bloom.

## City rollout (proposal, waiting for Sam)

**Nothing here is built.** City still draws one generic tree everywhere except the High Museum ginkgo. Sam decides this proposal before any rollout. It has two tiers:

1. **Reported.** Inventory points are placed by species, at their measured sizes where given. The sources are the City 2011 census (Downtown only), Georgia Tech's campus inventory, Trees Atlanta plantings, and OSM species tags. Their licences are unclear (see [Where ginkgos are](#where-ginkgos-are)), so we would ask the owners before shipping derived positions.
2. **Illustrative.** Every other canopy crown takes a species drawn deterministically from its crown id, weighted by context. Each crown's context (street, yard, park and woods, or campus) would come from the land use and road masks the parks staging already has.

**Generic crowns stay stable.** Swapping a crown's species must not reshuffle any other crown. The draw is seeded per crown, and any filtering happens after `World.buildTrees` draws each seed, as it does for the named ginkgo.

Every crown drawn from these mixes has the tier `illustrative`. Weights are shares of **crowns** (the model's unit), so I lean on crown-area or leaf-area evidence for large trees, not on stem counts, which over-weight small trees like crape myrtle.

### Sources

| Key | Source | Basis | How read |
|---|---|---|---|
| **USFS16** | USFS/i-Tree Eco, *Atlanta Urban Forest Effects and Values*, July 2016 (443 plots, 2013 data), Table 1 | % trees / % leaf area, citywide | Read in PDF |
| **C11** | City 2011 street-tree census, `dssgtrees.gatech.edu/CityStreetTrees/CityTrees1.csv`. 6,336 live trees in the board box. Covers Downtown and the expanded area only (lat ≤ 33.771), with no Midtown or Ansley trees | count, and crown² from the spread class | Computed |
| **TA** | Trees Atlanta plant inventory (ArcGIS), alive, in box, without Genus `x` or shrubs. n = 9,591, 2,000s–2020s plantings | count of plantings (young, not standing stock) | Computed |
| **GT** | Georgia Tech `Trees_All_View1`, `TreeStatus='Active'`, n = 12,946 | count | Computed |
| **MA** | Midtown Alliance streetscape guidelines, tree species overview: lacebark elm, Nuttall oak, Princeton American elm, red maple, Shumard oak, trident maple, willow oak | specified list | Read in PDF (found by subagent) |
| **ZEN** | Zenoble 2021 (UGA MS), a 12 ha, 70-year-old Piedmont second-growth plot. This is Athens, not Atlanta. Top importance values: white oak 82.7, red maple 62.5, beech 59.8, winged elm 57.4, sweetgum 50.6 | importance value | Read in PDF |

**USFS16 Table 1** (% trees / % leaf area): loblolly pine 18.0/17.6, water oak 7.1/15.8, sweetgum 10.5/6.1, tulip poplar 5.9/6.1, red maple 3.4/4.7, pecan 2.5/5.0, dogwood 4.8/2.3, southern magnolia 2.1/3.7, white oak 1.9/3.7, black cherry 3.0/1.3. The report has no breakdown by land use.

**C11 in box, crown² share** (count share in brackets): willow oak 24.4 (15.8), red maple 9.5 (9.0), Callery pear 9.0 (4.5), zelkova 7.8 (7.2), lacebark elm 5.7 (6.7), water oak 5.3 (1.4), crape myrtle 4.6 (14.9), American elm 3.1, winged elm 2.6, river birch 2.6, sugar maple 2.3, Nuttall oak 2.2, trident maple 2.1, southern magnolia 1.3, ginkgo 0.6 (1.2), Chinese pistache 0.2 (0.6).

**TA top plantings** (% of n = 9,591): crape myrtle 8.6, willow oak 6.7, trident maple 5.7, American elm 5.2, redbud 4.6, red maple 4.2, hornbeam 3.9, black gum 3.7, Nuttall oak 3.7, lacebark elm 3.5, sweetbay 3.2, parrotia 2.7, white oak 2.5, bald cypress 2.4, Shumard oak 1.9, ginkgo 1.9. In street strips and tree wells (n = 4,444): crape myrtle 14.2, trident maple 10.3, redbud 6.1, Nuttall oak 5.1, willow oak 5.0, and ginkgo 2.1.

**GT top** (% count): loblolly pine 7.4, crape myrtle 6.7, red maple 4.0, willow oak 3.7, water oak 3.4, southern magnolia 3.3, slash pine 3.1, tulip poplar 2.8, dogwood 2.6, redbud 2.6, Shumard oak 2.2, Virginia pine 2.1, all elms 3.5, Yoshino cherry 1.1, river birch 1.0, ginkgo 0.7, sweetgum 0.7, white oak 0.7.

**Mapping to the palette.** Nuttall, Shumard, pin and scarlet oak go to southern red oak. Zelkova and every *Ulmus* go to elm. Slash and Virginia pine go to loblolly pine. Callery pear, trident and sugar maple, redbud, hornbeam, black gum, holly, pecan, beech and cherry laurel go to other broadleaf.

### Proposed mixes (% of crowns, each sums to 100, checked in code)

| Species | Street | Yard | Park & woods | Campus |
|---|---|---|---|---|
| Willow oak | 24 | 10 | 3 | 7 |
| Water oak | 5 | 14 | 12 | 6 |
| White oak | 0 | 6 | 8 | 2 |
| Southern red oak | 5 | 5 | 4 | 6 |
| Red maple | 10 | 8 | 8 | 6 |
| Southern magnolia | 2 | 6 | 2 | 5 |
| Loblolly pine | 1 | 8 | 20 | 13 |
| Crape myrtle | 8 | 6 | 0 | 6 |
| Flowering dogwood | 1 | 5 | 3 | 3 |
| Ginkgo | 2 | 1 | 0 | 1 |
| Tulip poplar | 0 | 7 | 14 | 4 |
| Sweetgum | 0 | 5 | 12 | 1 |
| River birch | 3 | 1 | 1 | 1 |
| Yoshino cherry | 1 | 1 | 0 | 1 |
| Elm | 18 | 1 | 2 | 4 |
| Chinese pistache | 1 | 0 | 0 | 0 |
| Other broadleaf | 19 | 16 | 11 | 34 |

**Street (basis: C11 crown², checked against MA and TA).**
- **Willow oak 24.** C11 gives 24.4 crown² and 15.8 count. MA lists it.
- **Elm 18.** C11 gives zelkova, lacebark, American and winged elm a combined 19.2 crown². MA lists two elms.
- **Red maple 10.** C11 9.5, and MA lists it.
- **Crape myrtle 8.** C11 gives 4.6 crown² and 14.9 count, and TA streets 14.2. I put it between the two because crowns are small but numerous.
- **Water oak 5.** C11 5.3.
- **Southern red oak 5.** C11 Nuttall oak 2.2, plus MA Nuttall and Shumard oak, plus TA Nuttall 5.1 in streets.
- **River birch 3.** C11 2.6.
- **Southern magnolia 2.** C11 1.3.
- **Ginkgo 2.** C11 count 1.2, TA streets 2.1.
- **Pistache 1.** C11 0.6 count.
- **Yoshino cherry, dogwood, loblolly pine, 1 each.** These are token weights. C11 has 0.1 Yoshino, 1.7 dogwood count and 1.4 Virginia pine crown².
- **Other broadleaf 19.** Mostly Callery pear (9.0), with trident and sugar maple.

**Yard (basis: USFS16 leaf area, adjusted for intown neighbourhoods; thinnest evidence).** No source isolates residential yards. USFS16 is citywide and includes woods. The TA FrontYard cut (n = 216) holds only young plantings: white oak 10.6, black gum 10.2, red maple 8.8, ginkgo 5.1, none of them in Ansley.
- **Water oak 14.** USFS16 leaf area 15.8.
- **Willow oak 10.** C11 shows it dominates the adjacent streets. This is a judgement.
- **White oak 6.** USFS16 3.7, plus TA yards 10.6.
- **Southern red oak 5.** This is a judgement.
- **Red maple 8.** USFS16 4.7, plus TA yards 8.8.
- **Loblolly pine 8.** USFS16 gives 17.6, which I halved because intown lots have fewer pines. This is a judgement.
- **Tulip poplar 7.** USFS16 6.1.
- **Sweetgum 5.** USFS16 6.1.
- **Southern magnolia 6.** USFS16 3.7, raised for intown yards. This is a judgement.
- **Dogwood 5.** USFS16 4.8 of trees.
- **Crape myrtle 6.** TA 8.6, and C11 shows it is common.
- **Other broadleaf 16.** Pecan (USFS16 5.0 of leaf area), black cherry 1.3, holly and redbud.

**Park and woods (basis: USFS16, whose plots are dominated by forest canopy, plus ZEN).**
- **Loblolly pine 20.** USFS16 17.6/18.0.
- **Tulip poplar 14.** USFS16 6.1, raised for mesic stream buffers. ZEN names it a gainer.
- **Sweetgum 12.** USFS16 10.5 of trees; ZEN importance value 50.6.
- **Water oak 12.** USFS16 15.8.
- **White oak 8.** USFS16 3.7, ZEN top species.
- **Red maple 8.** USFS16 4.7, ZEN second.
- **Elm 2.** ZEN winged elm.
- **Dogwood 3, southern red oak 4, willow oak 3.** These are for Piedmont Park's planted lawn trees. TA named parks give white oak 12.6 and red cedar 14.7.
- **Magnolia 2, river birch 1.** These are judgements.
- **Other broadleaf 11.** Beech (ZEN 59.8), black cherry, black gum and hickory.

**Campus (basis: GT count, nudged toward large crowns).**
- **Loblolly pine 13.** GT pines total 12.6.
- **Willow oak 7, water oak 6.** GT 3.7 and 3.4, raised for crown size.
- **Southern red oak 6.** GT Shumard 2.2 + pin 1.8 + southern red 0.6 + Nuttall/Texas red 1.0.
- **Crape myrtle 6.** GT 6.7.
- **Red maple 6.** GT 4.0.
- **Magnolia 5.** GT 3.3.
- **Tulip poplar 4.** GT 2.8.
- **Elm 4.** GT 3.5.
- **Dogwood 3.** GT 2.6.
- **White oak 2.** GT 0.7.
- **Yoshino, river birch, ginkgo, sweetgum, 1 each.** GT 1.1, 1.0, 0.7 and 0.7.
- **Other broadleaf 34.** GT has 211 taxa. Redbud, holly, laurelcherry, sugar maple and zelkova are each about 1.4 to 2.6.

### Ansley Park ginkgo bias

Inside Ansley Park, triple ginkgo by taking the extra from other broadleaf. Streets go from 2 to 5 (other broadleaf 19 to 16), and yards from 1 to 3 (other broadleaf 16 to 14). That is about 2.5 times the documented baseline of 0.6 to 2.1% (C11, TA, GT), so it stays modest.

**Evidence: essentially none documented.** Trees Atlanta records 0 ginkgos among 198 plantings tagged `AnsleyPark`. OSM has no ginkgo tags in the box. `docs/tree-species.md` finds only two young 'Shangri-La' ginkgos on 17th St (2017–18). C11 does not reach Ansley. The bias rests on Sam's first-hand report of many mature ginkgos. It could be confirmed from mid- to late-November leaf-on aerials, where ginkgo crowns show uniform butter yellow.

### Gaps
- The City's 2014 canopy study, a 2018–2020 City i-Tree study, Nowak's 1997 UFORE Atlanta table, and the City arborist's annual removal and planting species counts were not obtained. No numbers here come from them.
- The City 2023 Tree Planting List was found by a subagent, and I have not verified its contents.
- No figure here comes only from a search snippet. Every number above was computed from the datasets or read in the PDFs.
- USFS16 has no land-use breakdown, so the yard weights are partly judgement and are marked as such.
