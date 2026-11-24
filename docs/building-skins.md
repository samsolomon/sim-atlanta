# Building skins

## Preliminary survey

The table orders candidate footprints by mapped or estimated height (40 points), footprint area (16), proximity to Peachtree and the Connector (10 each), proximity to Five Points (10), presence of a mapped name (7), and office, hotel, university or parking classification (5). Proximity approximates visibility. Actual sightlines, recognition, key corners and overlapping landmark footprints still need inspection before dispatch. Dimensions are the minimum rotated rectangle of the largest available tile fragment. Heights marked estimated use 3.3 m per mapped floor, with a two-floor fallback. Mapped heights also need verification, especially at Campanile and Colony Square.

| Rank | Mapped name or class | OSM ID or Overture UUID | Height, m | Plan, m | City x, z |
|---:|---|---|---:|---:|---:|
| 1 | The Campanile | osm:way:269843407 | 200 (mapped) | 66 × 45 | 833, -3571 |
| 2 | Four Seasons Hotel | osm:way:269843469 | 186 (mapped) | 70 × 53 | 580, -3585 |
| 3 | 1100 Peachtree | osm:way:39450210 | 130 (mapped) | 99 × 92 | 734, -3452 |
| 4 | office | osm:way:1464967906 | 198 (estimated) | 75 × 55 | 308, -3351 |
| 5 | 1075 Peachtree | osm:way:234935278 | 157 (mapped) | 90 × 73 | 814, -3330 |
| 6 | 1105 West Peachtree | osm:way:1001565075 | 125 (mapped) | 116 × 107 | 424, -3475 |
| 7 | ViewPoint | osm:way:536670474 | 150 (mapped) | 87 × 64 | 710, -2668 |
| 8 | The Atlantic | osm:way:269542078 | 176 (mapped) | 94 × 43 | -561, -4078 |
| 9 | 1010 Midtown | osm:way:1427534504 | 124 (mapped) | 110 × 76 | 708, -3341 |
| 10 | Loews Atlanta Hotel | osm:way:234935283 | 118 (mapped) | 64 × 39 | 764, -3269 |
| 11 | Marquis Two Tower | 2b0270ee-9f6a-44c9-bf0d-e6fb20e6c47c | 115 (mapped) | 57 × 31 | 553, -902 |
| 12 | Marquis One Tower | d36a5d7e-165d-4008-a4be-6d32c4c55f0b | 115 (mapped) | 57 × 32 | 552, -810 |
| 13 | 230 Peachtree Building | ef617421-bb1d-405b-848c-712d0267ff56 | 115 (mapped) | 57 × 32 | 324, -697 |
| 14 | 999 Peachtree | osm:way:886036475 | 120 (mapped) | 67 × 41 | 728, -3026 |
| 15 | 903 Peachtree | osm:way:1284487937 | 108 (mapped) | 90 × 44 | 732, -2823 |
| 16 | Midtown Union Office Building | osm:way:1297223465 | 86 (estimated) | 111 × 44 | 285, -4163 |
| 17 | Atlantic House | osm:way:505414294 | 125 (mapped) | 80 × 63 | 387, -3583 |
| 18 | 712 West Peachtree | osm:way:996610147 | 88 (mapped) | 60 × 49 | 357, -2258 |
| 19 | Two Peachtree Pointe | osm:way:269391972 | 77 (mapped) | 66 × 60 | 320, -4929 |
| 20 | Metropolis Condominium | osm:way:234733557 | 76 (mapped) | 125 × 65 | 731, -2916 |
| 21 | NCR Global Headquarters | osm:way:26795281 | 63 (estimated) | 143 × 113 | 181, -2793 |
| 22 | Southern Company Gas | osm:way:164876035 | 96 (mapped) | 59 × 54 | 416, -3017 |
| 23 | 10 10th | osm:way:235006974 | 85 (mapped) | 101 × 45 | 414, -3104 |
| 24 | Nomia | osm:way:1300593936 | 102 (estimated) | 72 × 25 | 441, -4246 |
| 25 | 171 Seventeenth | osm:way:269542125 | 89 (mapped) | 71 × 36 | -203, -4185 |
| 26 | 1355 Peachtree | osm:way:885332250 | 66 (estimated) | 86 × 56 | 599, -4210 |
| 27 | The Proscenium | osm:way:269843396 | 98 (mapped) | 73 × 37 | 729, -3606 |
| 28 | 400 Colony Square | osm:way:536737549 | 94 (mapped) | 60 × 47 | 794, -3754 |
| 29 | Hanover Midtown | osm:way:505421514 | 102 (estimated) | 75 × 62 | 308, -3796 |
| 30 | 100 Colony Square | osm:way:536737548 | 96 (mapped) | 53 × 50 | 819, -3670 |
| 31 | Sora at Spring Quarter | osm:way:1300604915 | 96 (estimated) | 66 × 58 | 175, -3115 |
| 32 | 77 12th Street | osm:way:536895716 | 90 (mapped) | 91 × 59 | 608, -3369 |
| 33 | Emmi Midown | osm:way:269542143 | 102 (estimated) | 45 × 39 | 259, -4355 |
| 34 | Twelve Downtown, Autograph Collection | b3827be6-be37-4ae8-8605-e99d8b07ec53 | 60 (mapped) | 60 × 38 | 336, -1287 |
| 35 | One Coca-Cola Plaza | osm:way:536717630 | 123 (mapped) | 48 × 48 | -465, -1887 |
| 36 | 200 Peachtree St. | 3b44d236-c74c-40cc-bf2b-7a42547418fe | 44 (mapped) | 93 × 80 | 312, -555 |
| 37 | 25 Pine Street NE Parking Garage | osm:way:270470130 | 33 (estimated) | 64 × 54 | 424, -1460 |
| 38 | J. Mack Robinson College of Business | 06942e29-e032-4d6b-a30f-7e1f4bc9f2a4 | 46 (estimated) | 63 × 24 | 151, -130 |
| 39 | Ascent Midtown | osm:way:884939412 | 82 (estimated) | 103 × 43 | 292, -4319 |
| 40 | Emory University Hospital Midtown Staff Parking | osm:way:1021839184 | 50 (estimated) | 103 × 42 | 310, -1681 |

## Shared modeling specification

Use the photographed structural rhythm to select the wall treatment. Measure a run of repeated bays between two corners, then divide its mapped length by the bay count. Repeat that calculation vertically between the lobby roof and the last occupied floor. Handle the podium separately when the module changes.

| Family | Wall and opening treatment | Ground floor |
|---|---|---|
| Curtain wall | Use surfaces.curtainGlass with measured floor height and mullion spacing. Model setbacks and large braces in silhouette. | Recess entrance glazing beneath the observed canopy. |
| Ribbon-window office | Alternate continuous dark glazing and surfaces.precast or granite spandrels. Carry the observed corner return around the end wall. | Identify the lobby side and the service side independently. |
| Punched masonry | Paint brick, limestone or granite around grouped openings. Match the pier width and lintel line to the photograph. | Continue structural piers down to grade. Model an arcade only where visible. |
| Residential or hotel slab | Align repeated room bays to slab edges. Combine continuous balconies by floor where visible. | Separate the arrival canopy and occupied frontage from the parking base. |
| Open garage | Use concrete decks, dark openings and continuous perimeter rails. Preserve ramp direction and the exposed end. | Keep vehicle portals open at the photographed street elevation. |

Build the highest occupied roof, parapet and mechanical screen as separate height decisions. Derive crown profile from two angles. Align roof equipment with visible penthouses and record estimates. Sample perimeter grade on the rendered terrain. Use GroundYield for hard ground surfaces that require carving.

Drive lit windows from the City night factor with a stable per-building pattern. Follow photographed floor groups, entrance pools and crown illumination. Record unavailable night evidence and omit unsupported decorative lighting. Holiday colors need separate evidence for ordinary operation.

Proposed low-tier incremental ceilings per building are 600 triangles for routine skins and 2,400 for landmarks. Target zero additional draws when merged into an existing opaque batch, with one extra draw allowed for a routine building and three for a landmark. Measure before and after from the same camera using the City performance harness. Record absolute board totals alongside the delta.

## Acceptance views

Use each table row's City x and z with a clear, paused clock at 11:30 and 23:30 Eastern on 2026-11-20. Capture the public entrance and a three-quarter view showing the roof and a second elevation. Save the actual bearing, tilt and distance with each pair, then check the silhouette from the closest corridor and the default City camera at low tier. Flag unresolved footprint identity, podium/tower splits, distinctive crowns and night-lighting conflicts for landmark research.

## Landmark research assignments

**Campanile — lead.** The building was photographed during façade removal. Establish the reference date before specifying cladding or the roof. Its reported 21 stories also warrant a lidar check against the tile's 200 m. Frame the exposed frame from Peachtree and the southeast corner. [Dated site photographs](https://atlanta.urbanize.city/post/dewberry-midtown-site-neighbor-concerns-city-plots-crackdown-crane) · [Earlier exterior](https://homepages.bluffton.edu/~sullivanm/atlanta/tvs/tvs.html)

**1100 Peachtree — landmark.** The broad face has reflective window ribbons separated by gray stone and steps back beneath the illuminated crown. Use stone bands and curtain glass, then resolve the crown separately. Compare the profile against the property's dusk cover and check the entrance from street height. [Property photography](https://www.1100peachtree.com/uploads/1/5/4/0/154046563/7867550_new_photography_-_brochure_-_custom_-_pm.pdf) · [Dusk exterior](https://res.cloudinary.com/jll-global-cmg/image/upload/v1740000208/Prod/DealX/Doc/95ec8e8c-952d-4aa6-a473-4527c8ecd2ef/_JLL__1100_Peachtree_Offering_Summary.pdf)

**Colony Square 100 and 400 — lead.** Reconcile lidar returns on the low podium polygons with both tower outlines before changing the replacement registry. Separate warm lobby lighting from seasonal plaza displays. [Photo references and measured sections](https://github.com/samsolomon/sim-atlanta/blob/fee824c6/docs/research/colony-square.md)
