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
| Trunk position | City (612.5, −4001.2) ±3 m, on the mulched bed of the Peachtree lawn south of the entry ramp, 6 m from where the lawn path ends | `inferred` | Triangulated from two Street View panoramas, each calibrated on Rodin's *The Shade* at (603.6, −4003.4): [Peachtree, Dec 2025, heading 252°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78993,-84.38466&heading=252&pitch=12&fov=55) and [café to the south, Sep 2024, heading 300°](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78972,-84.38478&heading=300&pitch=10&fov=45). |
| Size | 20 m tall, 18 m spread | `inferred` | Sam's call |

**How the position was chosen.**
- The champion record's point, 33.789866, −84.384916, is City (617.9, −3999.2). An untagged OSM tree node lies 1.1 m from it. #203 placed the tree there.
- In both panoramas the pano heading reads about 7–11° short of the bearing to *The Shade*. After correcting for that, the two sight lines to the forked grey trunk cross at (612.5, −4001.2), 5.7 m WSW of the record point.
- Street View from Nov 2019 at the same spot shows the same upright, forked tree in leaf. That makes it the ginkgo.
- The culture agent's leaf-on aerial pick was (615, −4005). All three agree within about 6 m. Street View is the only source that sees the trunk itself, so the tree uses it.
- **Kept, not thinned:** the canopy-map crown at (619.5, −3990.5), 12.8 m south, matches a real tree beside the Peachtree steps in both panoramas.

[Before and after, top-down and from Peachtree](log/ui/tree-species/city-ginkgo-position.jpg)

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

## City rollout (decision pending)

This is not built yet. The proposal, with weights and sources, will be sent to Sam before anything changes in City. It has two tiers:

1. **Reported.** Inventory points (City 2011, Georgia Tech, Trees Atlanta) and OSM species tags are placed by species, using their measured sizes where given.
2. **Illustrative.** Every other canopy crown gets a species drawn deterministically from its crown id. The draw comes from a context-weighted mix (street, residential yard, park and woods, campus, plus the Ansley ginkgo bias) built on published Atlanta urban-forest composition.

**Generic crowns stay stable.** Removing a crown under a named tree must not reshuffle the colour and kind of every other generic tree, so the filter belongs after `World.buildTrees` draws each crown's seed.

The canopy staging (`pipeline/scripts/midtown_landscape.py`, owned by the parks agent) stays as it is. Species live in the renderer.
