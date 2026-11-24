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

A large depth jump between two foliage pixels still draws, so one crown standing in front of another keeps its edge.

The foliage logic sits behind a `uFoliage` uniform. City leaves it at 0 today, so City's ink costs and draws exactly what it did before (checked at `cam=618,-3999,245,70,80`). The lab sets it to 1.

Caveat: an alpha-blended effect drawn over marked foliage (snow, rain sprites, additive lights) rewrites the mark. Before a marked species reaches City, either move the mark to its own target or keep blended effects off crowns. The mark needs opaque materials: alpha-tested cards are fine, alpha-blended ones are not, which also suits phones. Any species, and later the generic canopy, can opt in with one call.

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
- Foliage overdraw: alpha-tested leaf fragments per covered pixel, depth test off, which is the worst case:
  - High: current 2.97 (max 12), cards 1.52 (max 8). C4 is 1.53.
  - Low: current 2.31, cards 1.24.
- Main-pass triangles for the whole lab frame: current 7,743, C–C3 7,863, C4 12,663 at high; about 3,800–4,500 at low.
- `EXT_disjoint_timer_query_webgl2` is available in the Studio's Chrome, so a later pass can split CPU from GPU.
- A16 and iPhone numbers are deferred until Sam has the phone.

[C family compare sheet: specimen, mature, close-ups, night and low detail](log/ui/tree-species/variants-c-family.jpg)

## Ginkgo as plumes along the limbs (C4, lab)

Sam picked C4, then judged the rounded C4 crown generic ("could be an oak"). Ginkgo foliage pushes out in long, strand-like sprays that follow the main branches. The primary reference is now the [Virginia-Highland ginkgo, Atlanta, late Nov 2018](https://commons.wikimedia.org/wiki/File:Mature_ginkgo_tree_in_Virginia-Highland_neighborhood_of_Atlanta_in_late_November.jpg). The Frederick MD photo is demoted.

- **Plumes:** mature and specimen crowns are tiers of tapered, creased plume cards whose long axis runs along a branch: 7 tiers at high detail (27 plumes), 5 at low (21). Lower tiers are longest and flattest, upper ones shorter and steeper. Gaps between tiers are left open, and the rounded silhouette comes from where the plumes sit.
- **Ragged edge:** the rim of each plume frays away in leaf-sized chunks (`frayPlumes`). The ink mask uses the same patch through `userData.maskShader`, so the silhouette follows the drawn edge.
- **Colour:** the atlas supplies only leaf shape (alpha). Colour is the season tint, so peak season is one saturated butter yellow, slightly brighter on the sun side. Cards don't receive self-shadow, and fan tips are lit as if they faced the sky.
- **Young and sapling:** unchanged, narrow and gangly.
- **Winter:** bare limbs follow only the lower tiers' plumes, to stay within budget. They are sparser than the photos' twig haze.
- **Budget:** mature and specimen use 177 / 121 triangles per tree (high / low), within the 196 / 156 budget. Fan tips add 300 on at most 8 trees within 45 m, at high detail only. The 20-tree grove test passes.

[Photo, current and new, side by side](log/ui/tree-species/ginkgo-plumes.jpg). **City rollout waits for Sam's approval.**

## Crown brightness against the low-poly trees

Sam found that card crowns lose colour compared with the low-poly canopy. The fix is shared. The tree-lab agent owns the builders (`crownNormals`, core fill, palette, `__lab.crownStats`). Tree-species owns the ink and the ginkgo.

- **Ink:** at a foliage silhouette, the line now goes on the sky or ground pixel only, never on a leaf pixel, and the warm foliage ink is lighter (`#7a5520` at 60%). Crowns keep full colour to the edge.
- **Ginkgo plume normals:** 80% outward from the crown centre and 20% the plume's own, so the crown shades like a solid mass. Self-light on cards drops from 0.25 to 0.06, and card albedo from 0.92–1.02 to 0.80–0.90.
- **Measured** in the lab on the composited frame (ink and grade on), using mean crown-pixel luminance and HSV saturation. Crown pixels come from a foliage-only mask. Mature at 42 m, specimen at 70 m, noon. Baseline is the low-poly octahedron ginkgo.

| | Low-poly lum | C4 lum (before → after) | Saturation, low-poly / C4 |
|---|---|---|---|
| Mature, high, 23 Nov | 0.472 | 0.647 → 0.522 (+11%) | 0.994 / 0.991 |
| Mature, low, 23 Nov | 0.506 | 0.627 → 0.488 (−4%) | 0.995 / 0.986 |
| Specimen, high / low, 23 Nov | 0.504 / 0.532 | 0.61 / 0.60 → 0.544 / 0.545 (+8% / +2%) | 0.99 / 0.98–0.99 |
| Mature, high / low, 1 Jul | 0.327 / 0.355 | 0.502 / 0.484 → 0.375 / 0.345 (+15% / −3%) | 0.92 / 0.95–0.96 |

Low detail now lands within 5%. High detail stays 8–15% brighter, mostly from the sky-lit fan tips. Lower plumes read as a deeper ochre than the low-poly octahedra's undersides; blending the normals at 70% instead of 80% would lift them. [Captioned compare](log/ui/tree-species/ginkgo-brightness.jpg)

## Filling the ginkgo's centre

Sam found the C4 specimen too transparent in the middle. Two changes fix it:

- An inner core of shorter, flat two-triangle plumes sits near the leader through the middle of the crown: 8 at high detail, 10 at low. Each frays only at its tip.
- Branches now run only under the two lowest tiers, so the limbs read in the lower third.

The outer, ragged silhouette is unchanged. C4 fan tips drop from 100 to 96 per tree to keep the 20-tree grove under its ceiling.

| Size | Triangles per tree (high / low) | Budget |
|---|---|---|
| Mature | 193 / 137 | 196 / 156 |
| Specimen | 193 / 141 | 196 / 156 |

Brightness and crown coverage, measured the same way as #275:

| | Luminance | Change vs low-poly ginkgo | Crown coverage |
|---|---|---|---|
| Specimen, high | 0.545 | +8% | +21% |
| Specimen, low | 0.549 | +3% | +46% |
| Mature, high | 0.517 | +10% | +6% |
| Mature, low | 0.491 | −3% | +21% |

[Before and after](log/ui/tree-species/ginkgo-core.jpg)

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

The willow oak row is superseded by [Species options](#willow-oak), which use sourced classes.

**Sources and gaps.**
- Mature ranges, forms and bloom months come from each species' [NC State Plant Toolbox](https://plants.ces.ncsu.edu/) page, checked against GT percentiles and City 2011 height and spread bins.
- Champions come from the Trees Atlanta service.
- Most species have no sourced Atlanta leaf-out or leaf-drop date.
- **Willow oak is not documented as "Atlanta's dominant street tree."** Trees Atlanta calls it "likely the most popular oak for streetscape plantings". In the City 2011 census it is second with 1,155 trees, behind crape myrtle at 1,475. It is first among Trees Atlanta plantings in the box, at 647.

**Build order** (by City mix weight, one PR per pair): willow oak and water oak; loblolly pine and tulip poplar; red maple and sweetgum; southern magnolia and crape myrtle; American elm and dogwood; white oak.

## Species options (lab only)

[Willow oak sheet](log/ui/tree-species/options-willow-oak.jpg) · [Water oak sheet](log/ui/tree-species/options-water-oak.jpg) · [Loblolly pine sheet](log/ui/tree-species/options-loblolly-pine.jpg) · [Tulip poplar sheet](log/ui/tree-species/options-tulip-poplar.jpg) · [Red maple sheet](log/ui/tree-species/options-red-maple.jpg) · [Sweetgum sheet](log/ui/tree-species/options-sweetgum.jpg) · [Southern magnolia sheet](log/ui/tree-species/options-southern-magnolia.jpg) · [Crape myrtle sheet](log/ui/tree-species/options-crape-myrtle.jpg) · [Loblolly rework sheet](log/ui/tree-species/options-loblolly-pine-tiers.jpg) · [Magnolia gloss sheet](log/ui/tree-species/options-magnolia-gloss.jpg) · [Magnolia gloss round 2 sheet](log/ui/tree-species/options-magnolia-gloss-2.jpg) · [Japanese maple sheet](log/ui/tree-species/options-japanese-maple.jpg) · [American elm sheet](log/ui/tree-species/options-american-elm.jpg) · [Flowering dogwood sheet](log/ui/tree-species/options-flowering-dogwood.jpg) · [Lineup, 15 Nov](log/ui/tree-species/lineup-15nov-all.jpg) · [Lineup, 25 Jul](log/ui/tree-species/lineup-25jul.jpg) · [Lineup, 1 Jul](log/ui/tree-species/lineup-summer.jpg)

**Sam's picks (23 Nov).**
- Option A for willow oak, water oak, tulip poplar and red maple, and generally for broadleaves.
- Crape myrtle: A, vase of branch-mass cards.
- Loblolly pine: A, tiered needle tufts.
- Ginkgo: C4.
- Sweetgum: A ("looks good").
- American elm: A, vase of branch-mass cards ("looks good"). It joins City in the next round, with the oaks.
- Still to pick: the magnolia (gloss round 2: A and speck densities A1–A3) and the dogwood (round 2 pending).
- The shared crown fixes (crowning tuft, edge-on fade, outline clamp) are approved as the base for the remaining species.

All picks are lab defaults. City rollout waits on a placement and cost proposal per species.

Each species after the ginkgo gets two or three rendering options in the lab (`/models.html?v=willow-oak&variant=all`) for Sam to pick from. **City draws none of them until he does.** The lab's Trees section lists each species, its options with Compare all, and **All species** (`?v=lineup&variant=default`), every species at mature size side by side in one season. "Default" is Sam's pick where he has made one (ginkgo C4), otherwise a species' option A.

**How the options are built** (`web/src/trees/`):
- `broadleaf.ts`: a species' habit as a few numbers (trunk height, crown base, egg-shaped envelope, scaffold limbs, branch-mass size). The same habit drives the framework clump model ("Current") and every option.
- **Foliage follows the branches.** Sam's ginkgo review found that a round envelope filled with uniform leaf cards makes every species look generic. So each scaffold limb ends in a rounded **branch mass**, with a smaller mass on a side branch from its elbow and one on the leader's top, set just inside the species' outline. Each mass splits into small leaf clusters, lit on top and shaded beneath. The crown reads as separate lumps with sky between them, organised by the limbs.
- `foliage-kit.ts`: the shared builders. Spray sleeves, flame tufts and spray cards serve the ginkgo. Leaf cards, faceted lobes and leaf tips serve the masses. A leaf atlas is painted per leaf shape at three leaf sizes, and the card picks the size that keeps leaves about 0.45 m long on any tree.
- **Seasons** come from dated keys per species (`keyedCalendar`), each with two colour tones that every leaf cluster mixes in its own proportion.
- **Leaf drop thins leaf by leaf.** Each painted leaf's alpha is its drop order, and a card discards leaves above the tree's leaf share. Faceted options drop whole clusters instead. The ink's foliage mask gets the same patch (`userData.maskShader`), so it outlines only leaves that are drawn.
- **Ink.** Card options register with `inkFoliageMesh(mesh, 2)`: warm, silhouette-only ink, as in ginkgo C4. Faceted options keep full ink.
- **Leaf tips** are the ginkgo C4 extra: small two-triangle leaves on the outer clusters. Like the ginkgo's, they draw on at most `TIP_CAP` (8) trees within `TIP_RANGE_M` (45 m), nearest first, and never at low detail.

**Options for the oaks.**

| | Technique | Willow oak, high / low | Water oak, high / low |
|---|---|---|---|
| A · Branch-mass cards | C4 on the oak's structure: leaf cards on branch masses, warm silhouette ink, leaf tips close up | 193 / 81, plus 114 in tips | 193 / 81, plus 120 in tips |
| B · Cored masses | A small dark faceted core in each mass under the cards. Fuller and more solid; the cores are cut once the crown falls below about 60% in leaf | 191 / 97 | 191 / 97 |
| C · Faceted clusters | The same masses as faceted clusters, every facet inked: the house clump style | 191 / 105 | 191 / 105 |
| Current (clump model) | | 193 / 89 | 193 / 89 |

The triangle counts above are for a mature tree. Every class uses the same counts: 82 for limbs (trunk, four limbs with elbows, four side branches), the foliage, and 7 for the carpet. The budget is the generic tree's 196 / 156, and the tests hold it for every option, size and tier. Leaf tips are the near-range exception, as with the ginkgo. **Draws:** each option needs limbs and foliage per size class present, plus leaf tips per class (A, high detail) and one leaf carpet. That comes to 2–3 per class plus 1, however many trees.

### Willow oak

`web/src/trees/oaks.ts`. A straight trunk under a dense, fine-textured oblong crown. Young trees are pyramidal and old ones rounded, with drooping lower limbs ([UF ST-556](https://web.archive.org/web/2010id_/http://hort.ifas.ufl.edu/trees/QUEPHEA.pdf), [Virginia Tech](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=75)). Bark goes from smooth reddish-brown to grey with narrow ridges (NC State).

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–5.5 | 1.2–2.5 | 0.04–0.1 | 4.5 / 1.8 / 0.06 | ANSI Z60.1 Type 1 nursery heights; GT under 15 cm DBH: median 4.9 m tall, 2.4 m wide |
| Young | 5–12 | 3–7 | 0.1–0.3 | 10.5 / 5.4 / 0.2 | GT 15–30 cm DBH medians: 10.5 m, 5.4 m |
| Mature | 12.2–22.9 | 7.6–15.2 | 0.3–0.75 | 18 / 13.5 / 0.55 | [NC State](https://plants.ces.ncsu.edu/plants/quercus-phellos/) 12.2–22.9 m tall and 7.6–15.2 m wide; GT 30–91 cm DBH medians: 16.5–22.3 m tall, 9.5–14.5 m wide |
| Specimen | 24–34.3 | 20–38.4 | 1–1.9 | 32 / 32 / 1.8 | Trees Atlanta champions: Avondale Estates (2010), 34.3 m tall, 38.4 m wide, 1.78 m DBH; 2020, 33.5 m by 33.5 m. The 41.9 m Manor Ridge Dr record is far above every other and is probably an error |

GT is 478 active willow oaks (`GENUS_SPECIES='QUPH'`, surveyed 2012–2019): height p10/p50/p90 4.0 / 14.0 / 22.9 m, spread 1.7 / 7.2 / 15.2 m, DBH 4 / 34 / 74 cm, median crown base 3.7 m. Units are inferred to be feet and inches; the crown widths check out as feet.

**Calendar** (inferred for Atlanta). USA-NPN has no Atlanta willow oak data. These dates shift NC Piedmont status data (35–36°N; buds break about 22 Mar, leaves expand about 11 Apr, colour and drop from October) a little earlier for 33.75°N.

| Date | Stage |
|---|---|
| to mid-Mar | Bare grey limbs. The leaf carpet fades by February |
| ~Mar 18–28 | Catkins; buds breaking |
| Apr 12 → 28 | Leafing out to full |
| to Oct 20 | Summer green, light and fine |
| Nov 5–20 | Turning golden yellow to orange-brown. The colour words are NC State's "yellowish orange-brown to red-brown" and Clemson's "yellow-brown". [Oak Hill, VA, 22 Nov 2019](https://commons.wikimedia.org/wiki/File:2019-11-22_15_45_00_A_couple_of_Willow_Oaks_in_late_autumn_along_Elevation_Lane_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg) shows golden crowns |
| Dec 3 → 15 | Dropping, to nearly bare over a carpet |

Trees turn within ±7 days of each other.

### Water oak

`web/src/trees/oaks.ts`. A crown that is "spreading, rounded, open" ([UF ST-553](https://web.archive.org/web/2008id_/http://hort.ifas.ufl.edu/trees/QUENIGA.pdf)) with ascending branches ([Virginia Tech](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=73)). It is medium in texture and moderate in density. Bark is grey-black and rough when old. Leaves are spatulate and dark bluish-green. It is drawn like the willow oak but bigger, lumpier and darker, on a short trunk with ascending leaders.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–5.5 | 1.2–3 | 0.04–0.1 | 4.5 / 2.2 / 0.06 | Nursery heights as a Type 1 shade tree (**inferred**: ANSI names willow oak, not water oak) |
| Young | 6–13 | 3–8 | 0.1–0.3 | 11 / 6.4 / 0.22 | GT 15–30 cm DBH medians: 11.6 m, 6.4 m |
| Mature | 15.2–24.4 | 10–21.3 | 0.4–0.92 | 18 / 15 / 0.65 | [NC State](https://plants.ces.ncsu.edu/plants/quercus-nigra/) 15.2–24.4 m tall, 15.2–21.3 m wide; GT 30–91 cm DBH medians: 17.7–19.8 m tall, 10.1–15.1 m wide |
| Specimen | 23.8–31.2 | 24.4–35.1 | 1.6–2.02 | 25.7 / 30 / 1.8 | Trees Atlanta champions, wider than tall: 328 Josephine St, 25.7 m tall, 35.1 m wide, 2.0 m DBH; Atlanta Memorial Park, 31.2 m by 27.4 m |

GT is 446 active water oaks: height p10/p50/p90 7.0 / 17.1 / 23.8 m, spread 3.0 / 11.0 / 18.2 m, DBH 8 / 57 / 92 cm, median crown base 4.6 m.

**Calendar** (inferred for Atlanta). Water oak is semi-evergreen at Atlanta's latitude. USA-NPN north of 33.5°N (18 sites in NC, SC and GA) puts the crown at about 37% leaf in December and near bare in January, though about half of winter checks still find some leaves. Southern Alabama holds 62% in December. Georgia buds break about 8 Apr (n = 2). A [Georgia Tech twig](https://commons.wikimedia.org/wiki/File:Quercus_nigra_Flowering.jpg) was breaking bud on 14 Mar 2012, and an [Athens tree](https://commons.wikimedia.org/wiki/File:Water_Oak_-_Flickr_-_treegrow.jpg) was in fresh leaf on 28 Mar 2007.

| Date | Stage |
|---|---|
| Jan 1 | A quarter of the crown held, green and brown |
| Feb 10 | Nearly bare |
| Mar 8 → 28 → Apr 20 | Buds breaking, leafing out, full |
| to Oct 31 | Summer green, darker than the willow oak |
| Nov 22 | Yellowing, still partly green: "a wonderful yellow fall color show for about a week" (UF) |
| Dec 5 → 20 | Green, yellow and brown, then a third held over a thin carpet |

Trees turn within ±10 days of each other.

### Reference photographs and gaps

The sheets cite their photographs.
- **Willow oak:** [Mississippi, Jun 2019](https://commons.wikimedia.org/wiki/File:Tree_in_Mississippi.jpg), [Oak Hill, VA, Nov 2019](https://commons.wikimedia.org/wiki/File:2019-11-22_15_45_00_A_couple_of_Willow_Oaks_in_late_autumn_along_Elevation_Lane_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg) and [Jan 2019](https://commons.wikimedia.org/wiki/File:2019-01-01_09_07_54_A_Willow_Oak_holding_a_few_green_leaves_well_into_winter_along_Kinross_Circle_in_the_Chantilly_Highlands_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg).
- **Water oak:** [Arlington, Helen Keller Water Oak](https://commons.wikimedia.org/wiki/File:Medal_of_Honor_Trees_at_Arlington_National_Cemetery,_Arlington,_Virginia,_June_18,_2024_-_12.jpg) and [Martin Luther King Jr. Water Oak](https://commons.wikimedia.org/wiki/File:Medal_of_Honor_Trees_at_Arlington_National_Cemetery,_Arlington,_Virginia,_June_18,_2024_-_1.jpg), [Oak Hill, VA, Nov 2019](https://commons.wikimedia.org/wiki/File:2019-11-26_11_37_53_A_Water_Oak_turning_yellow_in_late_autumn_along_White_Barn_Lane_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg) and [Athens, GA, Mar 2007](https://commons.wikimedia.org/wiki/File:Water_Oak_-_Flickr_-_treegrow.jpg).

**Gaps.**
- Commons has no full-tree, fall or winter photograph of either oak taken in Georgia.
- It has no bare winter water oak and no reliable water oak bark close-up.
- The Virginia photos show form and colour only, not Atlanta dates.
- The first sheet panel is option A from an eye-level camera framed like the primary photo. The models stand at our nominal mature size, which is narrower than the open-grown Mississippi tree.

**Night.** The foliage has no self-light, so crowns at night are lit only by the scene.

### Crown brightness matches today's canopy

Sam's concern with cards was that they "lose a lot of colour" against the low-poly canopy. Every card option now:
- **Lights the crown as one blob.** `crownNormals` (`foliage-kit.ts`) bends each card's normal 80% of the way toward the crown envelope's outward normal, and keeps the ragged silhouette.
- **Keeps one normal on both faces.** Double-sided cards no longer flip it on back faces, which darkened half of every card.
- **Takes its colour from the season tint.** The atlas supplies only alpha and a light per-leaf variation.
- **Receives no shadows**, which blotched crown interiors.
- **Uses a softer vertex shade**, and summer palettes moved toward the generic tree's bluer greens (`#5f8f4e` family).
- **May lift the low tier.** A species' `lowLift` adds a small lightness change where its fewer, bigger low-detail cards show more interior.

The tree-species agent made the ink change: foliage silhouettes are inked only on the outside pixel, with a lighter warm ink.

**Measured** with `__lab.crownStats()`: one frame through ink and grade, averaged over a depth-tested foliage mask, with Rec. 709 luminance and HSV saturation. The view is the Front preset at mature size, noon on 1 Jul. The baseline is the generic tree.

| Option A | High: luminance / saturation | Low |
|---|---|---|
| Generic tree (baseline) | 0.248 / 0.806 | 0.239 / 0.833 |
| Willow oak | 0.256 / 0.775 | 0.233 / 0.803 |
| Water oak | 0.239 / 0.826 | 0.249 / 0.811 |
| Tulip poplar | 0.240 / 0.819 | 0.234 / 0.820 |
| Red maple | 0.243 / 0.801 | 0.241 / 0.795 |
| Sweetgum | 0.255 / 0.820 | 0.240 / 0.839 |
| Southern magnolia | 0.234 / 0.832 | 0.218 / 0.836 |
| Crape myrtle | 0.247 / 0.789 | 0.228 / 0.818 |
| Loblolly pine (tiered) | 0.211 / 0.929 | 0.201 / 0.924 |

**A measurement bug, fixed.** When the edge-on fade went in, the crown mask did not apply it, so faded cards counted the bright background behind them as crown. Every card crown then looked about 20–30% brighter than it was, and I darkened palettes to compensate. The mask now runs the same visibility patch as the material, edge-on fade included, so it counts only drawn leaves. The palettes were reset to their pre-bias values and re-measured. A side lesson: screen-space derivatives (`dFdx`) are undefined after a `discard`, so the shader takes the face normal first.

Re-measured after the crown-top, edge-on and envelope fixes. Taking out the dark edge-on slivers brightened every card crown, so each palette was retuned.

Every broadleaf is within 5% of the baseline luminance except the southern magnolia, which is 6–9% darker by design (City's magnolia green is a dark `#2f5c3a`). The tiered loblolly sits between City's dark pine green and the broadleaves, lighter on its sunlit tops as Sam asked, and the grade pushes dark greens to high saturation.

### Loblolly pine

`web/src/trees/pine-poplar.ts`. A long, straight, cylindrical bole carries a high, open, irregular oval crown. The crown is "loosely pyramidal in youth … a dense oval crown at maturity as it loses its lower branches" ([NC State](https://plants.ces.ncsu.edu/plants/pinus-taeda/)). "Needles are borne in clusters at the tips of twigs, which are bare below." Bark is red-brown in broad flat scaly plates. Nothing read supports a "flat-topped" crown.

**Options.**
- **A · Needle-tuft cards:** needle-burst cards gathered into flat tufts at the branch ends, with warm silhouette ink and needle tips close up. 193 / 81, plus 144 in tips.
- **B · Needle stars:** each tuft is six thin triangles fanning out. 191 / 105.
- **C · Tiered pads:** flattened faceted pads, fully inked. 185 / 105.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–6 | 1.2–3 | 0.04–0.1 | 4.5 / 2 / 0.07 | **Inferred**; no nursery size found |
| Young | 7–16.5 | 2.4–6 | 0.1–0.3 | 14 / 4.5 / 0.22 | GT 15–30 cm DBH medians: 16.5 m, 4.5 m |
| Mature | 18.3–27.4 | 6.1–12.2 | 0.3–0.76 | 22 / 12 / 0.5 | NC State 18.3–27.4 m by 6.1–12.2 m; GT 30–91 cm medians 18.3–21.9 m by 7.0–11.8 m; FEIS DBH 61–76 cm |
| Specimen | 30–45.1 | 12.2–20.1 | 0.76–1.12 | 38 / 17 / 1.0 | Champions: 436 Princeton Way, 41.5 × 20.1 m, 1.12 m DBH; Fernbank Forest, 45.1 × 16.0 m |

GT holds 957 active loblollies. Median height is 3.5 times spread, and median crown base a third of height.

**Calendar** (evergreen; **inferred** dates):
- Pollen from early March ([Georgia Forestry Commission](https://gatrees.org/love-it-or-hate-itthe-truth-about-tree-pollen/)), then new candles in April.
- Third-year inner needles turn orange-brown and shed in October and November while the tips stay green. Sources: NC State; [UGA Extension](https://site.extension.uga.edu/wilcoxcoag/2017/11/brown-needles-in-pine-stands); [17 Nov 2018 photo](https://commons.wikimedia.org/wiki/File:2018-11-17_14_26_32_Loblolly_Pines_undergoing_old_needle_abscission_in_late_autumn_along_a_walking_path_in_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg).
- Duller in winter ("light green to brown during the winter", UF).
- A pine-straw carpet lies under the tree all year, thickest after the fall shed.

### Tulip poplar

`web/src/trees/pine-poplar.ts`. "A fairly narrow oval crown, even as it grows older … a straight trunk … several large-diameter major limbs in the top half of the crown" (UF ST363). About two thirds of the bole is free of branches in stands (FEIS). Texture is coarse, with big four-lobed, square-tipped leaves. Bark is grey with pale diamond furrows.

**Options.**
- **A · Branch-mass cards:** C4, square-tipped leaf atlas. 193 / 81, plus 108 in tips.
- **B · Cored masses:** 191 / 97.
- **C · Faceted clusters:** 193 / 105.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–7 | 1.2–3.5 | 0.04–0.12 | 5 / 2.2 / 0.07 | GT under 15 cm DBH: median 7.0 m by 3.2 m |
| Young | 7–14 | 3–6 | 0.12–0.3 | 12.3 / 4.5 / 0.2 | GT 15–30 cm medians |
| Mature | 19.2–36.6 | 7.6–18.3 | 0.3–0.91 | 27 / 11 / 0.65 | NC State 24.4–36.6 m by 9.1–18.3 m; GT 30–91 cm medians 19.2–25.1 m by 7.6–10.8 m |
| Specimen | 36.6–50.6 | 17.1–29.9 | 0.91–1.9 | 44 / 24 / 1.5 | Champions: 44.3 × 29.9 m, 1.9 m DBH (2020); Bitsy Grant Tennis Center, 50.6 m (2014), the city's tallest |

**Calendar.** Georgia USA-NPN has 6 sites. Buds break in March and April. All 28 October records were coloured. Of 10 November records, 9 were in leaf; no December record was. The [Georgia Forestry Commission](https://www.fox5atlanta.com/news/leaf-watch-2021-week-five-fall-colors-take-over-north-georgia) found the north Georgia mountains bare by 11 Nov 2021. **Inferred** for Atlanta:
- Leafing out from 22 Mar, full by the end of April.
- Golden yellow by mid-October.
- Dropping in early November, bare by about 18 Nov.
- The pale "tulip" fruit on winter twigs is not drawn.

### Red maple

`web/src/trees/maple-sweetgum.ts`. "A rounded crown and ascending branches" ([NC State](https://plants.ces.ncsu.edu/plants/acer-rubrum/)), oval to round with medium texture (UF ST041). Bark is smooth and light grey when young, and the twigs are "slender, red, and shiny". The crown is drawn as dense rounded clusters on ascending limbs, with reddish limbs on a grey trunk.

**Options:** A · branch-mass cards (palmate leaf atlas), 193 / 81 plus 120 in tips; B · cored masses, 191 / 97; C · faceted clusters, 193 / 105.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–6.5 | 1.2–3 | 0.04–0.1 | 4.5 / 2 / 0.06 | GT under 15 cm DBH: median 6.4 m by 2.6 m |
| Young | 6–12 | 3–7 | 0.1–0.3 | 10.7 / 5.6 / 0.2 | GT 15–30 cm medians |
| Mature | 12.2–22.9 | 7.6–15.2 | 0.3–0.76 | 15 / 10 / 0.45 | NC State "more commonly" 12.2–21.3 m; UF 18.3–22.9 m by 7.6–10.7 m; GT 30–91 cm medians 12.8–14.6 m by 8.2–12.0 m |
| Specimen | 18.9–33.3 | 12–18.3 | 0.76–0.97 | 22 / 17 / 0.9 | Champion: McLendon Ave, 33.3 × 16.0 m, 0.89 m DBH (2011). Two 2020 rows are flagged "location is not accurate". GT over 91 cm: 18.9 m by 18.3 m |

**Calendar.** Georgia USA-NPN has 8 sites. Open flowers run January to April. Of 28 October records, 23 were coloured; none of 3 December records was in leaf. In North Carolina, red maple flowers from January to March (NC State). Colour "may vary from tree to tree". **Inferred** for Atlanta:
- A thin red crown of flowers from late January, then red keys with the first leaves in March.
- Leafing out through late March, full by about 22 Apr.
- Scarlet to orange by late October.
- Dropping in mid-November, bare by about 22 Nov; trees spread ±8 days, so none is in leaf in December.

The [Athens grove](https://commons.wikimedia.org/wiki/File:Olympic_Grove_of_12_Red_Maples.JPG) was nearly bare on 21 Nov 2012.

### Sweetgum

`web/src/trees/maple-sweetgum.ts`. "Grows in a narrow pyramid … developing a more oval or rounded canopy as it grows older", on a trunk that "is normally straight and does not divide" (UF ST358). The leaves are glossy five- to seven-pointed stars, and the bark is grey-brown and deeply furrowed.

**Options:** A · branch-mass cards (star leaf atlas), 193 / 81 plus 84 in tips; B · cored masses, 191 / 97; C · faceted clusters, 193 / 105.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–8.7 | 1.2–3 | 0.04–0.1 | 5 / 2 / 0.07 | GT under 15 cm DBH: median 8.7 m by 2.7 m |
| Young | 7–15 | 3–7 | 0.1–0.3 | 13 / 4.3 / 0.2 | GT 15–30 cm medians: narrow and pyramidal |
| Mature | 18.3–30.5 | 10.7–16.7 | 0.3–0.91 | 24 / 13 / 0.7 | NC State 18.3–30.5 m by 12.2–15.2 m; UF ST358 10.7–15.2 m spread; GT 30–91 cm medians 24.7–25.0 m by 12.2–15.2 m |
| Specimen | 27.9–42.2 | 16.7–27.4 | 0.91–1.25 | 36.6 / 27.4 / 1.25 | Champions: Peachtree Battle, 36.6 × 27.4 m, 1.25 m DBH (2025); Parkwood Park, Decatur, 42.2 m (2014) |

**Calendar.** Sweetgum colours late and holds its leaves "for a long time" (NC State). UF says the colour comes in early winter in USDA zones 8–9. The Georgia Forestry Commission saw "purple to yellow and some red" in northeast Georgia on 11 Nov 2021. USA-NPN has too few Georgia records to use. **Inferred** for Atlanta:
- Leafing out in April.
- Turning from early November.
- Every colour at once around 22 Nov.
- Dropping into December, bare by about 22 Dec.

Each tree's two tones run from yellow-orange to purple, mixed per leaf cluster.

**Not drawn yet:** the dark gumballs that hang all winter. They are a candidate near-range extra under the same caps as leaf tips.

### Crown tops, leaders, edge-on cards and outliers (all species)

Sam's sweetgum and lineup review found four problems, fixed once in `broadleaf.ts` and `foliage-kit.ts`:
- **A full crown top.** The top mass is now a crowning tuft centred over the leader, just under the crown top and larger than the branch masses (smaller on tiered and pyramidal crowns). It used to sit off-axis at a random angle, leaving the leader as a spike.
- **The leader stays inside.** It ends inside the crowning tuft, below its centre, and tapers to 12% of the trunk, so it never pokes through the crown.
- **No edge-on streaks.** A card seen edge-on fades out: alpha falls with |face normal · view| below about 0.35, using the true face normal, not the crown normal used for lighting. The fade sits in the shared visibility patch, so the ink's foliage mask and `crownStats` see exactly the leaves that are drawn.
- **No floating leaves.** Clusters are pulled in so their outer edge stays within the crown envelope plus 6%, and near leaf tips sit within each cluster's card extent.

[Sweetgum before and after](log/ui/tree-species/fix-sweetgum-before-after.jpg)

### Loblolly pine rework

Sam asked for "less dense, more layered" (23 Nov). His references were an illustration with distinct horizontal tufted tiers and an open-grown lawn loblolly: a clean trunk to about 40%, long, slightly ascending, fairly bare limbs ending in separate needle clumps, loose layers with sky between, and an irregular open top. Option A is now:
- **Tiered:** separate needle tufts at the ends of their own visible limbs, in four loose horizontal tiers (three at low detail) evenly spaced in height. The `Habit.tiers` setting gives 3, 3, 3 and 2 tufts, with the upper tiers fuller.
- **Sparser:** 22 cards against 26 before, on 11 tufts.
- **Lit like Sam's photo:** each tuft's tone follows how far it faces up (`toneByLight`), yellow-green on sunlit tops over a deeper green underside.

Options B (needle stars) and C (tiered pads) share the tiers. Crown luminance is now 0.211 / 0.201 (high / low), lighter than City's dark pine green, as Sam asked.

### Bloom

Flowers and bracts are small chips on the outer, upper side of the leaf clusters, painted with the atlas so they read as florets.
- Each chip has a bloom order. A tree's bloom share, from its calendar, opens them a few at a time.
- Chips ignore the leaves, so dogwood bracts can open on bare twigs.
- A species can carry several bloom colours, and each tree takes one by its seed (crape myrtle).
- Chips face outward rather than skyward, so they are never edge-on from the street.
- Chip sizes are exaggerated, about 1–1.5 m, so a crown in flower reads at City distances.

### Southern magnolia

`web/src/trees/magnolia-crape.ts`. "A dense (more open in the shade), dark green pyramidal shape, the lower branches often bending to the ground" ([UF ST371](https://ask.ifas.ufl.edu/publication/ST371/pdf)). The leaves are leathery and glossy, 13–25 cm long, with rusty undersides. Bark is grey and smooth, developing scaly plates with age. The crown is built as dense tiers of branch masses down to the ground, shrinking toward the top (since gloss round 2: `Habit.tiers` 3, 3, 2, 2, 2, `taper` 0.6, `cone` 0.8, widest 0.24; see below). Sunlit tops are bright over a near-black interior (`toneByLight`).

**Options:** A · glossy branch-mass cards with flowers; B · cored masses (dropped in gloss round 2); C · faceted clusters. All stay within 196 / 156.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–6 | 1.2–3.5 | 0.04–0.15 | 4.5 / 2.2 / 0.08 | GT under 15 cm DBH: median 5.5 m by 2.9 m |
| Young | 5–12 | 2.5–6.5 | 0.15–0.3 | 9.1 / 4.4 / 0.22 | GT 15–30 cm medians |
| Mature | 12–24.4 | 7–15.2 | 0.3–0.91 | 15.7 / 11.2 / 0.7 | NC State and UF 18.3–24.4 m by 9.1–15.2 m; GT 30–91 cm medians 12.6–15.7 m by 7.4–11.2 m |
| Specimen | 19.9–24.5 | 17.1–20.1 | 0.9–1.38 | 23.8 / 19.8 / 1.37 | Champions: 2021, 23.8 × 19.8 m; Oakland Cemetery (2012), 19.9 × 20.1 m |

GT holds 433 active magnolias. Their median crown base is only 0.9–2.6 m, and 379 have one stem.

**Calendar.** Evergreen, with "no color change" (UF). The GA USA-NPN medians are thin (3–4 tree-years): young leaves Apr 13–28, open flowers May 22 to Jun 6, and red seeds in October. NC State adds "sparse continued flowering throughout the summer". The lab opens the creamy-white flowers (chips about 1.5 m across, exaggerated so they read) from 12 May, peaks on 28 May, and thins through June, with a few into July.

**Brightness.** Option A sits 6–9% below the generic broadleaf. City's own magnolia colour is a dark `#2f5c3a`, so this is by design.

### Crape myrtle

`web/src/trees/magnolia-crape.ts`. Multi-stem: GT's 861 crape myrtles have a median of 4 stems, p90 6. The vase crown has bark that is "smooth, tan orange, and flakes off in patches to reveal shades of brown, green, and reddish brown" ([UF ST342](https://ask.ifas.ufl.edu/publication/ST342/pdf)). Each stem leans out from the base into its own branch mass (`Habit.stems`: 4, or 3 for saplings and 5 for specimens). The stems alternate tan and grey-brown.

**Bloom.** Panicles 15–46 cm long in white, pink, red or purple (NC State), July to September. Each tree takes one of four colours by its seed. No source says which colours are most common in Atlanta, so the four are equally likely. Topped "crape murder" forms are not drawn.

| Class | Height (m) | Spread (m) | Largest stem (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 1.8–4.5 | 1–4 | 0.025–0.08 | 3 / 2 / 0.05 | NC State 1.8–9.1 m overall; GT under 15 cm equivalent DBH: median 4.3 m |
| Young | 4.5–7 | 3–6 | 0.06–0.15 | 5.5 / 4.5 / 0.1 | GT 15–30 cm medians: 7.0 m by 5.0 m |
| Mature | 6–9.8 | 4.3–7.6 | 0.1–0.3 | 7.3 / 5.8 / 0.18 | UF 3.0–9.1 m by 4.6–7.6 m; GT 30–61 cm medians: 7.3 m by 5.8 m |
| Specimen | 8–10.4 | 6–9.1 | 0.2–0.42 | 10.1 / 7.8 / 0.3 | Champion: Georgia Beer Garden, 420 Edgewood Ave, 10.1 × 7.8 m (2018) |

**Calendar.** Crape myrtle is not in USA-NPN. Bloom runs "from July to September" (NC State), and the fall colour is "yellow, orange, or red". **Inferred:** leaf-out in April, full bloom in late July, colour in late October, bare by mid-November with the mottled stems showing.

### Magnolia gloss (A1–A3)

Sam on option A: "this is the right shape. I don't know that I get the sense of glossiness on the leaves." The reference shows many individual leaves catching the sky as small silvery glints on the sunlit side, and a few rusty-bronze undersides. Option A was tightened (bigger, denser cards; the habit's less ragged outline also applies to B, C and the clump model), and three variants sit beside it (`?v=southern-magnolia&variant=allA`). None adds a draw or a triangle: each is 187 / 113, plus 90 in near tips.
- **A1 · sheen:** a sharp specular term (`twoToneFoliage({ sheen })`). Each card's true face normal is lit against the sun's half vector, so glints scatter card by card and move with the view. It fades out with the sun's intensity, so it is off at night. Near leaf tips stay matte.
- **A2 · baked glints:** about 10% of the sunlit-side cards carry a pale silver vertex multiplier over the dark green.
- **A3 · sheen and bronze:** A1 plus about 15% rusty-bronze cards on the shaded side.

Crown luminance / saturation (Front, 1 Jul): A 0.232 / 0.832, A1 0.299 / 0.726, A2 0.312 / 0.721, A3 0.300 / 0.726. Gloss lifts the crown 30–35% over the dark base, and the bronze undersides are subtle in front light. At 300 m through ink and grade all three still read: A1 and A3 as a pale silvery patch on the sun side, A2 as pale flecks. (A first build had the sheen's half vector reversed and lit backlit cards; the code review caught it.)

### Magnolia gloss, round 2 (specks on a dark cone)

[Sheet](log/ui/tree-species/options-magnolia-gloss-2.jpg). The coordinator's read of round 1: whole lit cards read as frost or mildew, the baked flecks as sun-bleached patches, and the crown as too round and too light at the top. In the reference, gloss is hundreds of tiny sharp highlights over a near-black cone. A card is far bigger than a leaf, so per-card lighting cannot make that.
- **Shape.** A new habit option, `cone` (0 to 1), straightens the envelope above its widest point. The masses (`ringAt`) and the outline clamp follow it, and the leader stops lower so it never shows through the pulled-in top. The magnolia uses `cone` 0.8, `taper` 0.6, widest at 0.24, and tiers 3, 3, 2, 2, 2 to a filled top. Its top tone is darker. Above the widest point the crown normals follow the cone's flank (`envelopeNormal`), and the outline clamp pulls clusters in by bisection, since the cone's metric is not linear.
- **Specks** (`LookOption.specks`, cards only). The shader picks single painted leaves by hashing each leaf's atlas value with a half-metre cell of tree space, so every card picks its own few. A picked leaf turns warm white where its card faces the sun's half vector, on the crown's sun side (the smoothed crown normal) only. The step is near-binary, so it reads as a point and not a wash. It scales with the sun, so it is off at night. A1, A2 and A3 let about 1 leaf in 20, 10 and 6 flash.
- **Dropped:** the whole-card sheen, the baked silver glints and the bronze undersides.
- **Cost:** none added. A and its variants are 193 / 113 per tree, plus 90 in near tips. C rises to 13 clusters so every mass keeps one. B (cored) is dropped for the magnolia: a core per mass on 13 masses cannot fit 196 with cards on every mass, and Sam's direction is A.

Crown luminance / saturation (Front, 1 Jul, high): A 0.201 / 0.862, A1 0.205, A2 0.210, A3 0.218 / 0.845; low A 0.211. The specks add 2–8%, not round 1's 30%. The pick reads the atlas at full size (`textureLod`), so mipmaps cannot blend neighbouring leaves into new ids at range, and it hashes tree space, not world position, to keep `sin()` precise far from the origin. Other species measure as before (willow oak 0.256, tulip poplar 0.240, sweetgum 0.255, crape myrtle 0.246, elm 0.249). The cone is deliberately darker than the generic canopy (0.248), as the reference is. At eye level the specks are subtle; they show best in the day row and at 300 m as a faint sun-side sparkle.

### Japanese maple

`web/src/trees/japanese-maple.ts`, Sam's request (23 Nov). Red Japanese maples are "everywhere in front yards and on the traffic islands" of Ansley Park: low, wide, layered, umbrella-shaped, on several leaning trunks. They are "the colour accents". The sources describe a "low, dense, rounded top and spreading branches" ([NC State](https://plants.ces.ncsu.edu/plants/acer-palmatum/)) that is "typically multi-trunked", with "muscular-looking, picturesque, grey" trunks ([UF ST023](https://ask.ifas.ufl.edu/publication/ST023/pdf)).

**Colourways.** Each tree takes one by its seed (`Look.varieties`):
- **Scarlet-crimson** (3 in 5, the dominant look): bronze-red in summer heat. Red cultivars green and bronze in southern summers (NC State, UF).
- **Bloodgood burgundy:** "deep burgundy spring and summer foliage", "bright crimson in fall" (NC State).
- **Orange-red:** green in summer.

**Calendar** (inferred near Atlanta):
- Early leaf-out (UF, Missouri Botanical Garden).
- Peak colour about 14 Nov. Gibbs Gardens in Ball Ground, Georgia, holds its Japanese maple Colorfest Nov 1–17.
- Bare by early December. No dated Georgia leaf-drop source was found.

**Options.** All well within budget:
- A · layered branch-mass cards: 135 / 71, plus 102 in tips.
- B · cored: 133 / 87.
- C · faceted layers: 143 / 103.

The weeping laceleaf mound (about 2 m, cascading to the ground, on Sam's ivy bank) is not built. It would be a second habit on the same species.

| Class | Height (m) | Spread (m) | Largest stem (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 1.5–3 | 1–3 | 0.02–0.08 | 2.4 / 2.4 / 0.05 | GT under 4 in DBH: median 2.4 m by 3.0 m |
| Young | 2.5–5 | 2–5 | 0.06–0.18 | 4.2 / 4 / 0.12 | GT 4–8 in medians: 4.3 m by 4.1 m |
| Mature | 4.5–7.6 | 3.7–7.6 | 0.12–0.3 | 5 / 5.5 / 0.2 | NC State 4.6–7.6 m; 'Bloodgood' 4.6–6.1 m by 3.7–6.1 m; GT 8–12 in medians 4.9 m by 5.6 m |
| Specimen | 6–9.4 | 6–10.2 | 0.2–0.57 | 7.5 / 8 / 0.35 | GT 12–18 in medians 7.5 m by 6.0 m; GT maximums 9.4 m and 10.2 m. No Atlanta champion *A. palmatum* is recorded |

**Proposed placement** (for Sam; nothing is placed): front yards, side yards and traffic islands in Ansley Park and Midtown residential blocks, as a small share of the yard mix (taken from "other broadleaf") and a larger share on the planted islands. Never as street trees. Trees Atlanta's plant inventory has only 23 alive (Candler Park 6, Midtown 2, Ansley 0), because most are private plantings, so the share rests on Sam's walk. City placements would be `illustrative`.

### American elm

`web/src/trees/elm-dogwood.ts`. "Open-grown trees fork 10 to 20 feet (3-6 m) from the ground with several erect limbs forming a wide, arching crown" ([FEIS](https://www.fs.usda.gov/database/feis/plants/tree/ulmame/all.html)), "branches like spreading fountains" (Morton Arboretum). Leaves are rough and matte. Bark is ashy grey and narrowly fissured. The proposal is for City's street mixes to map lacebark elm and zelkova, the elm's street substitutes, to this species (not wired in yet). Both are more common on Atlanta streets than the American elm itself.

**Options:**
- A · vase of branch-mass cards: 177 / 77, plus 108 in tips.
- B · cored masses: 179 / 85.
- C · faceted clusters: 177 / 97.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 3–6.5 | 1.5–4 | 0.04–0.12 | 5 / 3 / 0.08 | GT under 15 cm DBH: median 6.1 m by 3.3 m |
| Young | 6–13.6 | 4–8.5 | 0.12–0.3 | 10 / 6.4 / 0.22 | GT 15–30 cm medians |
| Mature | 15–27.4 | 9.1–21.3 | 0.3–0.91 | 21 / 15 / 0.7 | NC State 18.3–24.4 m by 9.1–18.3 m; UF 21.3–27.4 m by 15.2–21.3 m; GT 30–91 cm medians 18.1–23.2 m by 11.6–17.5 m |
| Specimen | 24–32 | 20–33.5 | 0.9–1.52 | 30 / 28 / 1.4 | Champions: 80 Palisades Rd, 32.0 × 29.0 m; Doraville, 25.4 × 33.5 m |

**Calendar.** Flowers in February and March before the leaves (NC State, FEIS). Fall colour is "an undistinguished yellow" (NC State). Georgia USA-NPN has only 2 tree-years. A [Norcross state-champion photo](https://commons.wikimedia.org/wiki/File:State_Champion_American_Elm,_Norcross_GA.jpg) on 19 Mar 2026 shows a yellow-green haze, either seeds or first leaves. **Inferred:** full leaf by about 20 Apr, soft yellow about 30 Oct, bare by about 18 Nov.

### Flowering dogwood

`web/src/trees/elm-dogwood.ts`. "Branches on the lower half of the crown grow horizontally, those in the upper half are more upright … a strikingly horizontal impact" ([UF ST185](https://ask.ifas.ufl.edu/publication/ST185/pdf)). The crown is drawn as tiers of flat masses (3, 3 and 2) on near-level limbs. It has one trunk: UF says "typically multi-trunked", but 96% of GT's 339 dogwoods are single-stem.

**Bloom.** The bracts open on bare or barely leafing twigs. In bloom the crown stays present and washes white (`bloomWash` 0.8), with early green between, because the bracts dominate the crown. Georgia USA-NPN has 39 tree-years: open flowers Mar 28 to Apr 9 (medians), full flowering Apr 1–13. The Atlanta Dogwood Festival runs Apr 10–12, 2026, and a [dated Oakland Cemetery photo](https://commons.wikimedia.org/wiki/File:Oakland_Cemetery_dogwood_tree_and_downtown_Atlanta_skyline.jpg) shows full bloom on 29 Mar 2017. Red berries from late September are not drawn.

**Options:**
- A · layered branch-mass cards: 189 / 109, plus 90 in tips.
- B · cored layers: 183 / 129.
- C · faceted layers: 169 / 109.

| Class | Height (m) | Spread (m) | Calliper (m) | Nominal | Basis |
|---|---|---|---|---|---|
| Sapling | 1.5–4 | 1–4 | 0.03–0.12 | 3 / 2.6 / 0.07 | GT under 15 cm DBH: median 3.4 m by 2.7 m |
| Young | 4–7 | 3–7.5 | 0.12–0.3 | 6 / 5.5 / 0.2 | GT 15–30 cm medians: 6.4 m by 5.5 m |
| Mature | 6–9.3 | 4.6–11.1 | 0.3–0.5 | 7.5 / 8 / 0.35 | NC State 4.6–7.6 m by 4.6–9.1 m; UF 6.1–9.1 m by 7.6–9.1 m; GT 30–61 cm medians 8.2 m by 7.2 m |
| Specimen | 8–12.9 | 9–13.7 | 0.45–0.65 | 9.1 / 13.7 / 0.6 | Champions: 458 Ponce de Leon Ave, 9.1 × 13.7 m; Peachtree Christian courtyard, 12.9 × 12.2 m |

**Fall.** "Red to reddish purple" (NC State), "red to maroon" in sun (UF). Georgia USA-NPN puts coloured leaves Oct 3–20 and falling leaves Oct 5–22, with the latest on Nov 21. Sam saw red-maroon dogwoods at Ansley yard edges on 23 Nov, so the lab keeps them red-maroon into November and bare by early December.

**Brightness.** Option A against the generic tree: elm 0.249 / 0.818 high and 0.249 / 0.806 low; dogwood 0.238 / 0.749 and 0.247 / 0.739.

### Pair 2 gaps

- Commons has no verified Atlanta or Georgia photograph of a whole loblolly pine or tulip poplar. The only Georgia Piedmont photo is a distant loblolly stand in Oconee National Forest.
- There is no Atlanta fall-colour date per species.

## Ansley Park tree patterns (Street View, illustrative)

Sam asked for the feel of Ansley's trees, not a survey (23 Nov). These notes come from Google Street View, viewed and not copied, plus his own late-November walk. Anything they shape in City is `illustrative`, with no on-screen label. House types, setbacks, terracing, walls and curbs belong to the parks and houses agent.

| Place, capture | What the trees do |
|---|---|
| [The Prado at 17th St, Jan 2020](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79300,-84.37870&heading=10&pitch=12&fov=90) | Bare oaks two to three times the height of the two- and three-storey houses (about 25–30 m), crowns meeting over the street. One dark magnolia mass by a house. A big oak alone on the planted median. |
| [Ansley Dr at Maddox, Feb 2022](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79560,-84.37900&heading=200&pitch=12&fov=90) | A huge oak limb arching over the corner. A multi-stem crape myrtle vase against a two-storey house. Pines behind. Foundation shrubs. |
| [Beverly Rd island at the golf club edge, Jan 2026](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79730,-84.37680&heading=90&pitch=12&fov=90) | A round grass traffic island with one large hardwood at its centre (the zelkova or elm island Sam saw). Golf-course edge of scattered tall loblollies and big hardwoods. A tall pine by a stone house. |
| [Peachtree Cir at Winn Park, Mar 2022](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78935,-84.38210&heading=300&pitch=12&fov=90) | Big oak trunks on the park lawn. A white-flowering ornamental and others in spring bloom. Trees over-topping a four-storey apartment block. |
| [Westminster Dr at Winn Park, Mar 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79135,-84.38035&heading=40&pitch=10&fov=90) | Tall, thin, bare hardwoods rising three to four times the house height from a slope; houses sit up on the rise above stone walls. A redbud in pink. |

**What this suggests for City** (proposals for Sam, nothing built):
- **Skew sizes large in Ansley.** In yard, park and street contexts there, draw about 40% of oak and tulip-poplar crowns at the specimen class (25–35 m) and the rest at mature. Sam: "many trees are much bigger than the houses". The street views agree.
- **Closed street canopy.** On The Prado and Peachtree Circle, street oaks are big enough for crowns to meet over the road. Place them in pairs facing each other across the street, not in a single file.
- **Island rule.** A round grass island gets one large hardwood at its centre (oak, or elm and zelkova). Small or triangular islands get Japanese maples and crape myrtles (Sam's walk).
- **Yard accents.** Japanese maples and crape myrtles at the front of yards, a magnolia beside about one house in several, dogwoods at yard edges, and loblollies behind the houses and along the golf-course edge.



**Rollout status (2026-11-23):** Draft PR #336 implements crape myrtle A, loblolly A, sweetgum A and Japanese maple A, using these mixes and the Ansley placement rules. Oaks remain generic; magnolia awaits a gloss decision. The High Museum ginkgo is unchanged. The wider proposal has two tiers:

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

### City rollout validation — 2026-11-23 (PR #336)

Crape myrtle A, loblolly A, sweetgum A and Japanese maple A are batched across City.
Low quality uses one mature geometry per look, scaled to the requested crown size;
high quality also uses specimen forms. Every instanced mesh has finite bounds and
frustum culling. Leaf tips and the shared `landscape` carpet disappear at far detail.
Bare/thin crowns retain limbs to preserve their winter silhouette; that exception
still requires phone-perf approval.

The 1180 terrace exports **eight** planting positions (the earlier handoff said seven).
Each crape is 4.5 m tall, with a 4 m spread, at the roof's world elevation, 42.28 m
above scene zero. The existing curved-edge placement loop is unchanged. These are
illustrative plantings, not a surveyed inventory.

Paired Studio counts against `origin/main` at `d1411a9e`, after merging that baseline:

| Low-quality view | Before calls / triangles | After calls / triangles | Delta |
|---|---:|---:|---:|
| Default | 531 / 2,334,211 | 540 / 2,378,963 | +9 / +44,752 |
| Skyline | 225 / 1,877,208 | 234 / 1,925,968 | +9 / +48,760 |
| Pan | 530 / 2,334,195 | 539 / 2,380,939 | +9 / +46,744 |

`pnpm test:perf` passes both tiers; high default is 1,169 calls / 13,789,017 triangles.
Low is also below phone-perf's proposed 2.6M ceiling. These are geometry/draw counts,
not phone frame rates. The original pre-main-update measurements in the handoff are
superseded. Full tests pass with pipeline checks skipped because `.venv` is absent.

Reproduction: `?view=city&q=low&t=2026-11-20T14:00:00-05:00&perf=run`;
append `&cam=150,500,0,66,1900` for skyline or `&motion=pan` for pan.
Release requires a web rebuild and coordinator deployment, not a data rebuild.

Matched sheets: [1180 daylight](log/ui/tree-species/rollout/1180-day-sheet.jpg),
[1180 night](log/ui/tree-species/rollout/1180-night-sheet.jpg),
[The Prado daylight](log/ui/tree-species/rollout/prado-day-sheet.jpg),
[The Prado night](log/ui/tree-species/rollout/prado-night-sheet.jpg),
[The Prado low](log/ui/tree-species/rollout/prado-low-sheet.jpg), and
[winter far-detail comparison](log/ui/tree-species/rollout/winter-sheet.jpg).
The sheets use the classic UI to avoid capturing the white-model arrival transition.
1180 uses `cam=650,-3690,0,0,350`, then `__setView(0,0,350,650,-3690,2)` for
lens zoom. The Prado uses `cam=1194,-4352,20,50,420`.

At the winter camera `1194,-4352,20,50,1100` (20 January, 14:00 ET, low),
the rollout retains 13,974 limb triangles in three visible instanced limb meshes,
with both `fartrees=0` and `fartrees=1`. This is the submitted instance count before
frustum culling, not an incremental phone GPU timing. Limbs do not cast shadows.
The matched sheet preserves the bare silhouettes; phone-perf must approve this exception.

Additional terrace checks: [low daylight](log/ui/tree-species/rollout/1180-low-day-sheet.jpg)
and [low night](log/ui/tree-species/rollout/1180-low-night-sheet.jpg).
Raw [paired counts](log/ui/tree-species/rollout/paired-results.json) and
[pan counts](log/ui/tree-species/rollout/pan-results.json) preserve the measurement runs.
