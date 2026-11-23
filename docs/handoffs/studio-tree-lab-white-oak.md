# White oak research (pair 6), carried over from the tree-lab scratchpad

Compiled 2026-11-23 by the tree-lab agent. Unchecked against the lab; the method notes are below.

## Shared sources and method

- **GT** = Georgia Tech campus tree inventory, `https://services2.arcgis.com/I9cUOJUZvdGAJncI/arcgis/rest/services/Trees_All_View1/FeatureServer/0/query`, `where=GENUS_SPECIES='<code>' AND TreeStatus='Active'`. I confirmed the codes by querying distinct `GENUS_SPECIES`/`COMMONNAME`: MAGR = Southern magnolia, LAIN = Common crapemyrtle, ULAM = American elm, ULPA = Chinese (lacebark) elm, ZESE = Japanese zelkova, COFL = Flowering dogwood, QUAL = White oak.
  - **INFERRED** units: TOTHT, CROWNWIDTH* and CROWNBASE are in feet and DBH is in inches. I converted them with 0.3048 and 2.54.
  - **INFERRED** method: crown width is the mean of the NS and EW widths. For multi-stem trees I binned by the equivalent single-stem DBH, sqrt(sum of DBH_i²), taken over the nonzero DBH1..6. Percentiles use linear interpolation.
  - The layer also has an `NSTEMS` field. I report it alongside the nonzero-DBH count because DBH1..6 stops at 6 stems.
- **Champions** = Atlanta champion trees, `https://services6.arcgis.com/BZn8g8tzu5WfMokL/arcgis/rest/services/TreeChampionData_2019/FeatureServer/0/query`. I took rows with `Status='Alive'` and ranked them by `TotalPointsEarned`. The layer's fields are in feet and inches, and I converted them to metres. Personal names and phone numbers are left out.
- **NPN** = USA-NPN observations for Georgia, `https://services.usanpn.org/npn_portal/observations/getObservations.json?state[0]=GA&species_id[0]=<id>&start_date=2008-01-01&end_date=2026-11-01`. Species IDs come from `https://services.usanpn.org/npn_portal/species/getSpecies.json`. Crape myrtle is not in the NPN species list.
  - For each individual and year I took the first and last day-of-year with status "yes", then the median across individual-years. Dates use a non-leap year.
  - NPN sites are spread across Georgia (Atlanta, plus north-west Georgia sites near lat 34.75, lon -84.98), so treat them as Piedmont/Ridge values, not downtown-specific.
- **Photo thumbnails:** every 1280px URL below returned HTTP 200 to `curl -sI` on 2026-11-23. Commons' API now hands out `thumb.wikimedia.org` URLs. I rewrote them to `upload.wikimedia.org`, which also returned 200.

---

## 5. White oak (*Quercus alba*)

### Sizes (published)

| Source | Height | Spread | Other |
|---|---|---|---|
| NC State, https://plants.ces.ncsu.edu/plants/quercus-alba/ | 50–135 ft = **15.2–41.1 m**; "generally tops out at 80 to 100 feet" = 24.4–30.5 m | 50–80 ft = **15.2–24.4 m** | Habit: Broad, Dense, Pyramidal, Rounded. Growth slow |
| UF/IFAS EDIS ST541 (ENH-699), https://ask.ifas.ufl.edu/publication/ST541/pdf | 60–100 ft = **18.3–30.5 m** | 50–80 ft = **15.2–24.4 m** | "trunks can be six feet in diameter" (1.83 m). Trunk flares at the base. Crown irregular, pyramidal or round |
| USFS FEIS, https://www.fs.usda.gov/database/feis/plants/tree/quealb/all.html | "commonly reaches 60 to 80 feet (18-24 m)"; ">100 feet (30 m)" on favorable sites | | Diameter can "exceed 5 feet (1.5 m)". Lives "up to 600 years" |

### GT inventory, QUAL (n = 93 active)

| DBH bin (cm) | n | Height m, p10 / median / p90 | Crown width m, p10 / median / p90 | Crown base m, median |
|---|---|---|---|---|
| <15 | 56 | 3.0 / 4.7 / 8.1 | 1.5 / 2.4 / 4.1 | 1.8 |
| 15–30 | 13 | 6.8 / 9.1 / 11.3 | 3.4 / 5.0 / 6.4 | 2.1 |
| 30–61 | 7 | 12.9 / 17.7 / 23.0 | 6.4 / 8.1 / 13.4 | 4.3 |
| 61–91 | 7 | 21.3 / 25.3 / 32.3 | 12.4 / 15.2 / 20.0 | 6.7 |
| >91 | 10 | 23.3 / 25.9 / 29.5 | 17.4 / **22.1** / 29.3 | 6.7 |

All 93 trees have a single stem. The big trees have crowns about as wide as they are tall, with a high crown base of about 6.7 m.

### Atlanta champions (alive)

| Points | Height | Spread | Circumference | Location |
|---|---|---|---|---|
| 353 (1st, 2020) | 113 ft = **34.4 m** | 97 ft = **29.6 m** | 216 in = 5.49 m | "backyard tree", no address; lat 33.7276, lon -84.4141 |
| 341.56 (1st, 2011), **tallest** | 142 ft = **43.3 m** | 96 ft = 29.3 m | 175.56 in = 4.46 m | Forest SW of Bitsy Grant Tennis Center, Northside Dr |
| 338.95 (1st, 2016), **widest high scorer** | 98.5 ft = 30.0 m | 117 ft = **35.7 m** | 211.2 in = 5.36 m | 1428 Vaughn St, 30317 |
| 332 (1st, 2019) | 97.5 ft = 29.7 m | 122 ft = 37.2 m | 204 in | "front yard tree"; lat 33.7512, lon -84.4403 |

- Data quirk: the "845 Clifton Rd" tree (139.3 ft) appears twice, once Alive and once Dead, at different coordinates. Treat it as unreliable.

### Form at a distance (quoted)

- NC State: "Young trees are typically pyramidal in form, but as the tree matures it has a rounded and broad crown."
- FEIS: "a medium to large, spreading, deciduous tree".
- EDIS: "branches droop; showy; typically one trunk". "The trunk flares out at the base lifting sidewalks".
- Bark:
  - NC State: "whitish or light ashy gray, scaly. shallowly furrowed and divided into flat narrow plates or vertical blocks. They may become flakey with age." Colour Light Gray.
  - EDIS: "whitish, scaly, and flaking in irregular blocks or plates with age, smooth patches are also common".
- Leaves:
  - NC State: "4 to 9 inches long by 2 to 4 inches wide with 5 to 9 deep, rounded, and even lobes … bright green with whitish or glaucous undersides".
  - EDIS: blade 2–8 in, "blue green and shiny on top, paler green to almost white underneath".

### Calendar

| Event | Sourced | Source |
|---|---|---|
| Flowers and leaf-out | NC State: catkins "appear in April". FEIS: leaves begin "mid-March to late May, depending on geographic location". For NC and SC: flowering April, fruit ripe Sept–Nov | NC State, FEIS |
| Leaf-out, Georgia NPN | Breaking leaf buds: median first **Apr 1**. Early leaf expansion: median first **Apr 13**, last Apr 19 (18 individual-years) | NPN species 100, GA 2011–2026, 3,495 obs |
| Fall colour | NC State: "purplish brown to reddish-brown and develops late". EDIS: "red", "fairly reliable … outstanding among the oaks in USDA hardiness zones 8a and colder" | NC State, EDIS |
| Fall timing, Georgia NPN | Colored leaves: median first **Oct 9**, median last **Nov 12** (14 individual-years). Falling leaves: median first **Nov 2**, last **Nov 25** (12). Coloured leaves were still seen as late as **Dec 24** | NPN 100 |
| Marcescence | EDIS: "Brown leaves may be held on the tree into the early part of the winter." NC State: "A few leaves may persist into winter." FEIS: "leaves commonly persist into winter" | EDIS, NC State, FEIS |
| Acorns | FEIS: "Acorns fall from the trees by September or October". NPN GA: ripe fruits Oct 4–14 | FEIS, NPN 100 |

- **INFERRED** Atlanta sequence:
  - Leaves leaf out pinkish-grey in early to mid April. The "tiny, fuzzy new leaves" in the Duke Forest photo were dated Apr 10, 2011.
  - The canopy is blue-green in summer and turns wine-red to russet-brown from mid-October to mid-November.
  - Most leaves drop in late November. Brown leaves stay on the lower limbs and young trees into winter.

### Reference photos

| What | File page | 1280px thumbnail (HTTP 200) | Author / licence | Date / place | Species evidence |
|---|---|---|---|---|---|
| Full form, open-grown at an old house site, in fall colour (orange-russet); I checked it visually | https://commons.wikimedia.org/wiki/File:Large_white_oak_at_old_house_site.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Large_white_oak_at_old_house_site.jpg/1280px-Large_white_oak_at_old_house_site.jpg | Dcrjsr / CC BY 3.0 | 2011-11-11, Duke Forest, Durham NC. The description gives a trunk circumference of 16.4 ft (5.0 m) | Cat. "Quercus alba in autumn" |
| Fall colour: view up, red-orange leaves against pale ashy limbs; I checked it visually | https://commons.wikimedia.org/wiki/File:Duke_Forest_fall_Oak_high.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Duke_Forest_fall_Oak_high.jpg/1280px-Duke_Forest_fall_Oak_high.jpg | Dcrjsr / CC BY 3.0 | 2006-11-04, Duke Forest, Durham NC | Cat. "Quercus alba (autumn leaves)" |
| Winter form, Georgia: big bare broad crown over a street (historic B&W); I checked it visually | https://commons.wikimedia.org/wiki/File:The_tree_that_owns_itself_(4987035786).jpg | https://upload.wikimedia.org/wikipedia/commons/c/ce/The_tree_that_owns_itself_%284987035786%29.jpg (original is 1024 px wide; no 1280 thumbnail exists) | Huron H. Smith (Field Museum) / "No restrictions" | Photo dated 1910 in the description, Athens GA ("The Tree That Owns Itself") | Description: "large white oak, Quercus alba"; cat. "Tree That Owns Itself" |
| Winter marcescence: bare upper crown with tan-brown leaves held on the lower limbs; I checked it visually | https://commons.wikimedia.org/wiki/File:2020-01-31_13_33_59_A_White_Oak_with_dead_leaves_still_attached_to_the_lower_limbs_during_mid_winter_within_a_wooded_section_of_the_Franklin_Farm_section_of_Oak_Hill,_Fairfax_County,_Virginia.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/2020-01-31_13_33_59_A_White_Oak_with_dead_leaves_still_attached_to_the_lower_limbs_during_mid_winter_within_a_wooded_section_of_the_Franklin_Farm_section_of_Oak_Hill%2C_Fairfax_County%2C_Virginia.jpg/1280px-thumbnail.jpg | Famartin / CC BY-SA 4.0 | 2020-01-31, Oak Hill, Fairfax Co. VA | Cat. "Quercus alba with marcescent leaves" |
| Bark: pale grey, squarish fissures, small shaggy plates; I checked it visually | https://commons.wikimedia.org/wiki/File:Quercus_alba_white_oak_bark.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Quercus_alba_white_oak_bark.jpg/1280px-Quercus_alba_white_oak_bark.jpg | Dcrjsr / CC BY 3.0 | 2011-11-06, Duke Forest, Durham NC | Cat. "Quercus alba (bark)" |
