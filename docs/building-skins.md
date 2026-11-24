# Building skins

## Ranked survey

The [full ranking of 6,177 candidate footprints](building-skins-ranking.csv) includes the priority score, projected footprint area and measured corridor distances. The survey is a snapshot taken before the downtown worker’s three PRs. Rank 13 has since landed in [PR 377](https://github.com/samsolomon/sim-atlanta/pull/377).

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

Build opaque geometry with `landmarkShell` in `web/src/city/landmark-shell.ts`. Its body uses `StaticLandmarkMaterial` from `web/src/materials/landmark-batch.ts`. Keep fixed tints in vertex colours and both shadow flags enabled. High-tier downtown groups eligible bodies into 500 m cells before board clipping. A cell needs two eligible meshes. Custom compile hooks (including procedural surfaces), per-building lighting and transparent glass need separate handling. Measure those draws independently. The Midtown loader and low tier do not automatically inherit downtown batching. Keep repeated bays in one body builder. Use the existing materials library for photo-visible detail and preserve its distance fade.

At #386 phone-perf measured 1,179/1,250 high draws, 105/140 programs, 562/600 low draws and 90/90 programs. The low allowance for new program variants at that baseline is zero. Compare the same clock, viewport, camera and mounted areas before and after, and run the full two-tier harness on the combined base.

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

## Routine skin research

**Marquis One and Two — paired Sol brief.** Match the slender windows recessed between light precast concrete piers on the two 115 m shafts. Give Marquis Two its wider panes on the north wall. Make one comparison from Peachtree Center Avenue with both towers in frame and another looking south at the north wall of Two. The preservation survey identifies the corresponding elevations in photos 236–250. Full-night evidence remains open. [Georgia historic district nomination](https://gadnr.org/sites/default/files/hpd/pdf/Peachtree%20Center%20HD%20Final%204-24-17.pdf)

**171 Seventeenth — Sol.** The Connector approach exposes a broad glass elevation with floor-to-ceiling glazing across 21 stories. Set the curtain-glass floor module from the occupied shaft, then measure the rooftop enclosure separately. Capture the east approach over the 17th Street bridge and a three-quarter view of the return. Use the building-specific night photograph to compare glazing above the bridge approach. [Night exterior](https://www.skydb.net/file/162451671/171-17th-street-atlanta/) · [Architect’s gallery](https://www.smallwood-us.com/work/case-study/171-17th-street) · [Leasing agent’s exterior photograph and floor count](https://www.cbre.com/press-releases/prime-us-reit-and-kbs-appoint-cbre-as-the-exclusive-leasing-agent-for-510000-sf-midtown-atlanta)

### Assigned downtown landmarks

Downtown rail worker `7abc46f1` owns the following three buildings, one PR each. The table above gives their Overture IDs, preliminary dimensions and target coordinates.

| Order | Building | Research and acceptance view |
|---:|---|---|
| 1 | 230 Peachtree | Compare the precast panel module with the four promenade towers. Frame the narrow end and the Peachtree entrance. [Promenade research](log/ui/peachtree-center/README.md) |
| 2 | 200 Peachtree | Trace the shared boundary with the Westin podium before measuring facade bays. Show the public frontage and an elevated oblique with both roofs visible. [Westin boundary survey](westin-peachtree-plaza.md) |
| 3 | J. Mack Robinson College of Business | Identify the 14-floor Overture outline across Broad from Commerce. Frame both buildings from Broad to check their separation and roof heights. Prior lidar sampling places Robinson’s main surface at about 375.1 m NAVD88. [Commerce survey](log/ui/commerce-building/README.md) |

## Worker queue by survey rank

Sol can take any unassigned routine row. Dimensions and source IDs are in the survey above. Start each matched day/night pair at the supplied City camera, then move to the specified facade at street height. Each source links to a project gallery, photograph, survey, or existing research. A missing full-night photograph is an evidence gap. Capture the night City render and document the gap before introducing decorative lighting.

| Rank and building | Owner | Facade family and modeling brief | Starting camera | Reference |
|---|---|---|---|---|
| 1. The Campanile | Lead / Astra | **Construction.** Exposed frame during recladding. Establish date and lidar height. | `833,-3571,32,60,600` | [Reference](https://atlanta.urbanize.city/post/dewberry-midtown-site-neighbor-concerns-city-plots-crackdown-crane) |
| 2. Four Seasons Hotel | Lead / Astra | **Hotel.** Hotel slab with a stepped pyramidal cap. Resolve the upper setbacks. | `580,-3585,32,60,558` | [Reference](https://www.fourseasons.com/atlanta/photos-and-videos/) |
| 3. 1100 Peachtree | Lead / Astra | **Ribbon office.** Reflective window ribbons under an illuminated stepped crown. | `734,-3452,32,60,390` | [Reference](https://www.1100peachtree.com/uploads/1/5/4/0/154046563/7867550_new_photography_-_brochure_-_custom_-_pm.pdf) |
| 4. office | Lead / Astra | **Mixed-use.** Confirm the unnamed outline against 1072 West Peachtree. Split the podium from the tall residential shaft. | `308,-3351,32,60,594` | [Reference](https://atlanta.urbanize.city/post/rockefeller-1072-west-peachtree-atl-tallest-building-30-years-fresh-images-details) · [Night exterior](https://www.skydb.net/file/500986372/1072-west-peachtree-atlanta/) |
| 5. 1075 Peachtree | Lead / Astra | **Curtain wall.** Trace the curved glazed frontage and determine which upper edges carry permanent lighting. | `814,-3330,32,60,471` | [Reference](https://www.1075peachtree.com/wp-content/uploads/2022/10/1075-Peachtree_Brochure-1.pdf) |
| 6. 1105 West Peachtree | Lead / Astra | **Braced glass.** Model the large diagonal exterior frame on the glazed office shaft. | `424,-3475,32,60,375` | [Reference](https://1105westpeachtree.com/) · [Night exterior](https://www.skydb.net/file/268758408/1105-west-peachtree-atlanta/) |
| 7. ViewPoint | Sol | **Residential.** Align the residential bay grid above the 865 entrance canopy. | `710,-2668,32,60,450` | [Reference](https://cororealtyadvisors.propertycapsule.com/property/output/document/view/id%3A11763/) |
| 8. The Atlantic | Lead / Astra | **Residential.** Preserve the stepped crown and vertical balcony runs in the Atlantic Station silhouette. | `-561,-4078,32,60,528` | [Reference](https://henryinc.com/portfolio/the-atlantic/) |
| 9. 1010 Midtown | Lead / Astra | **Residential.** Follow the curved balcony ribbons around the Peachtree bend. | `708,-3341,32,60,372` | [Reference](https://commons.wikimedia.org/wiki/File%3AVertical_panorama_of_1010_Midtown_in_midtown_Atlanta.jpg) |
| 10. Loews Atlanta Hotel | Lead / Astra | **Hotel.** Match hotel room bays over the arrival canopy and resolve the shared development boundary. | `764,-3269,32,60,354` | [Reference](https://www.loewshotels.com/atlanta-hotel/photos-videos) |
| 11. Marquis Two Tower | Sol | **Precast.** Precast piers frame narrow windows. Widen the panes on the north wall. | `553,-902,32,60,345` | [Reference](https://gadnr.org/sites/default/files/hpd/pdf/Peachtree%20Center%20HD%20Final%204-24-17.pdf) |
| 12. Marquis One Tower | Sol | **Precast.** Repeat the recessed precast window bays, checking the entrance separately from Marquis Two. | `552,-810,32,60,345` | [Reference](https://gadnr.org/sites/default/files/hpd/pdf/Peachtree%20Center%20HD%20Final%204-24-17.pdf) |
| 13. 230 Peachtree Building | Downtown worker | **Precast.** Assigned downtown. See the public plaza entrance research in the PR. | `324,-697,32,60,345` | [Reference](https://github.com/samsolomon/sim-atlanta/pull/377) |
| 14. 999 Peachtree | Sol | **Punched stone.** Light stone piers frame dark reflective windows. Check corner depth at street level. | `728,-3026,32,60,360` | [Reference](https://listingsprod.blob.core.windows.net/ourlistings-usa/029c3a00-fd72-436f-91a8-cb5d39ad3af0/e1d2df09-f24c-44d2-9da5-7b8e1e474e7b) |
| 15. 903 Peachtree | Sol | **Residential.** Break the parking base into contrasting panel fields and metal bands below the residential floors. | `732,-2823,32,60,324` | [Reference](https://henryinc.com/portfolio/decorative_facades_at_903_peachtree/) |
| 16. Midtown Union Office Building | Lead / Astra | **Curtain wall.** Isolate the office wing above the mixed-use base and trace its glazed end. | `285,-4163,32,60,258` | [Reference](https://www.midtownatl.com/view/midtown-union-office-building) |
| 17. Atlantic House | Sol | **Residential.** Stack balcony edges above the entrance podium and keep the broad side legible. | `387,-3583,32,60,375` | [Reference](https://estateexposure.com/atlantic-house-atlanta-real-estate-photography) |
| 18. 712 West Peachtree | Sol | **Curtain wall.** Use the street corner to measure the glazed office grid and podium transition. | `357,-2258,32,60,264` | [Reference](https://www.skydb.net/file/750011963/712-west-peachtree-atlanta/) |
| 19. Two Peachtree Pointe | Sol | **Curtain wall.** Carry the curved glass frontage around its return. Compare with the adjoining first phase. | `320,-4929,32,60,231` | [Reference](https://www.skydb.net/file/724752301/two-peachtree-pointe-atlanta/) |
| 20. Metropolis Condominium | Lead / Astra | **Residential.** Separate the two residential masses over the retail base and repeat the balcony slabs. | `731,-2916,32,60,228` | [Reference](https://www.midtownatl.com/view/metropolis) |
| 21. NCR Global Headquarters | Lead / Astra | **Curtain wall.** Resolve the glazed office masses and their connection over the campus base. | `181,-2793,32,60,189` | [Reference](https://www.dudapaine.com/featured-projects/workplace/ncr-headquarters/) |
| 22. Southern Company Gas | Sol | **Punched stone.** Measure the stone entrance surround independently from the shaft window grid. | `416,-3017,32,60,288` | [Reference](https://commons.wikimedia.org/wiki/File%3ATen_Peachtree_Place_entrance.jpg) |
| 23. 10 10th | Sol | **Ribbon office.** Trace the office slab and its entry recess from the 10th Street frontage. | `414,-3104,32,60,255` | [Reference](https://metzlerna.com/en/metzlerna/portfolio/case-studies/10-10th) |
| 24. Nomia | Sol | **Residential.** Green-clad rectangular shaft. Match the narrow end and vertical panel rhythm. | `441,-4246,32,60,306` | [Reference](https://www.r2l-architects.com/work/nomia) |
| 25. 171 Seventeenth | Sol | **Curtain wall.** Repeat the floor-to-ceiling glass grid. Measure the rooftop enclosure independently. | `-203,-4185,32,60,267` | [Reference](https://www.smallwood-us.com/work/case-study/171-17th-street) · [Night exterior](https://www.skydb.net/file/162451671/171-17th-street-atlanta/) |
| 26. 1355 Peachtree | Lead / Astra | **Brick and stone.** Red-brown upper wall with repeated punched windows above a pale classical base. | `599,-4210,32,60,198` | [Reference](https://s3.us-east-2.amazonaws.com/media.buildingsondemand.com/sites/9/2024/03/1355-Peachtree-Brochure_v3-UPDATED-MARCH-2024.pdf) |
| 27. The Proscenium | Sol | **Ribbon office.** Use the recessed 1170 entrance and broad office window fields to set bay spacing. | `729,-3606,32,60,294` | [Reference](https://www.prosceniumatl.com/wp-content/uploads/2025/05/PROSCENIUM.pdf) |
| 28. 400 Colony Square | Lead / Astra | **Precast.** Resolve the tower over its lower podium using the lidar transects. | `794,-3754,32,60,282` | [Reference](https://github.com/samsolomon/sim-atlanta/blob/fee824c6/docs/research/colony-square.md) |
| 29. Hanover Midtown | Sol | **Residential.** Stack residential window bays and balconies over the arrival frontage. | `308,-3796,32,60,306` | [Reference](https://www.livehanovermidtown.com/atlanta/hanover-midtown/photos/) |
| 30. 100 Colony Square | Lead / Astra | **Precast.** Check the low mapped parts against the tower returns before replacing the outline. | `819,-3670,32,60,288` | [Reference](https://github.com/samsolomon/sim-atlanta/blob/fee824c6/docs/research/colony-square.md) |
| 31. Sora at Spring Quarter | Sol | **Residential.** Distinguish the glazed residential slab from the neighboring historic chapel. | `175,-3115,32,60,288` | [Reference](https://www.guardianglass.com/ap/en/projects/project-details/sora-at-spring-quarter) |
| 32. 77 12th Street | Sol | **Residential.** Carry the balcony and glazing rhythm around the retail frontage. | `608,-3369,32,60,270` | [Reference](https://rjtrdesign.com/77-12th-street/) |
| 33. Emmi Midown | Lead / Astra | **Residential.** Use separate glazing modules for the stepped residential elevations. | `259,-4355,32,60,306` | [Reference](https://glasssystems.biz/projects/emmi-midtown/) |
| 34. Twelve Downtown, Autograph Collection | Sol | **Hotel.** Separate the hotel entrance and upper balcony grid from the podium. | `336,-1287,32,60,185` | [Reference](https://www.marriott.com/en-us/hotels/atlpk-twelve-downtown-autograph-collection/photos/) |
| 35. One Coca-Cola Plaza | Lead / Astra | **Office.** Check the roof silhouette and window rhythm from the Connector approach. | `-465,-1887,32,60,369` | [Reference](https://www.skydb.net/building/204849954/one-coca-cola-plaza/) |
| 36. 200 Peachtree St. | Downtown worker | **Historic masonry.** Assigned downtown. Preserve the Westin podium boundary. | `312,-555,32,60,185` | [Reference](https://github.com/samsolomon/sim-atlanta/pull/381) |
| 37. 25 Pine Street NE Parking Garage | Sol | **Open garage.** Repeat concrete deck openings, tracing the Pine Street vehicle portal separately. | `424,-1460,32,60,185` | [Reference](https://www.skydb.net/building/222518734/pine-street-parking-deck/) |
| 38. J. Mack Robinson College of Business | Downtown worker | **Historic masonry.** Assigned downtown. Preserve the distinct Commerce roof across Broad. | `151,-130,32,60,185` | [Reference](https://github.com/samsolomon/sim-atlanta/pull/384) |
| 39. Ascent Midtown | Sol | **Residential.** Keep balcony stacks and the roof terrace legible from the narrow end. | `292,-4319,32,60,246` | [Reference](https://r2l-architects.squarespace.com/work/ascent-midtown) |
| 40. Emory University Hospital Midtown Staff Parking | Lead / Astra | **Open garage.** Trace the staff deck footprint before selecting a garage elevation. Verify identity against adjacent visitor parking. | `310,-1681,32,60,185` | [Reference](https://www.gareygomez.com/hrd-euhm-parking-deck) |
