# Washington Street bridge at the I-20 interchange

Research record for E1 of the [Connector repairs](connector-repairs.md), November 26. **Held for Sam: a new bridge model.** No geometry changes and no images committed; every reference is a link. It follows the landmark rules in AGENTS.md: sources, dimensions, and what is estimated or missing, before any model work. [Plan](connector-interchanges.md#e-i-20)

**Location.** Washington Street SW crosses the ramps of the Connector and I-20 interchange south of Capitol Gateway, under the I-20 flyover 442591112. In the City it is OSM way 39160883 (no bridge tag), from (−0.37, 874.99) to (−59.66, 966.54). The bridge-tagged sidewalk 1388990213 runs from (22.04, 822.78) to (−37.41, 917.21), with 1388990214 beyond it. The inventory coordinates (33°44′46.93″ N, 84°23′28.89″ W) fall at about City (22, 837), at the sidewalk's south end.

## What the City draws today

From the [register](connector-interchanges.md#e-i-20), both tiers:
- **The street** is drawn on the ground at 302.4–305.2 m, while its own lidar surface is 307.3–310.0 m (x −5 to −34, z 882–926): 4.5–7.5 m low.
- **Sidewalk 1388990213** is a clearance-inferred deck about 5.5 m low (304.4–305.0 m against 307.9–310.4 m).
- **Sidewalk 1388990214** is on the ground, about 3 m low.
- **The crossings under 442591112** cannot be measured until these are lifted. The flyover is at 319.1 m, so about 8 m would remain.

## Structure (sourced)

From the federal bridge inventory, structure **000000012104160**, "WASHINGTON STREET over 2 I-75 RAMPS", in Atlanta ([NTAD NBI query](https://services.arcgis.com/xOi1kZaI0eWDREZv/arcgis/rest/services/NTAD_National_Bridge_Inventory/FeatureServer/0/query?where=STRUCTURE_NUMBER_008%3D%27000000012104160%27&outFields=*&f=json), [bridgelookup](https://bridgelookup.com/bridge/99338), [bridgecondition](https://bridgecondition.com/bridge/georgia/ga-000000012104160)):

| Attribute | Value | Tier |
|---|---|---|
| Built | 1959, no reconstruction recorded | reported |
| Type | Steel continuous (NBI 4/02, stringer/multi-beam), cast-in-place concrete deck | reported |
| Spans | 5; longest 41.1 m; total length 135.3 m | reported |
| Width | Deck 19.5 m out to out; roadway 14.6 m curb to curb; approach roadway 14.6 m | reported |
| Sidewalks | 2.4 m on each side | reported |
| Lanes | 4 on the bridge, no median; 2 under (the record's "2 I-75 ramps") | reported |
| Under-clearance | 5.91 m | reported |
| Skew | 0° | reported |
| Railing | NBI code 0, does not meet current standards. Form unknown | reported, form unknown |

The 1959–60 design record in the [Digital Library of Georgia](https://dlg.usg.edu/record/gsu_planatl_3516) describes the bridge carrying relocated Washington Street "across the westbound leg of the East-West Expressway, Interstate Route 20", 429 feet long. It was one of three structures built to move Washington Street through the Capitol Avenue–Memorial Drive interchange. That is the same structure: 429 ft (130.8 m) against the inventory's 135.3 m (444 ft). The inventory names the lower roads as I-75 ramps because the Connector carries I-75/85 there.

## Estimated, not documented

- **Parapets.** The deck width minus the roadway (4.9 m) is almost exactly the two 2.4 m sidewalks, which leaves about 0.05 m. The sidewalk figures most likely include their parapets or rails.
- **Girder depth.** About 1.6–1.9 m, from a span-to-depth ratio of roughly 1/22–1/25 at 41.1 m.
- **Pier spacing.** About 27 m average over five spans if evenly spaced. Not documented.
- **Deck level.** 307.3–310.0 m from the street's own lidar surface along x −5 to −34. The deck falls about 2.7 m to the northwest, roughly 2.5%.
- **Clearance.** The measured gap from street to lower ramps (about 302 m) is about 8 m, against the inventory's 5.91 m minimum. The difference is the girder and deck depth plus where the minimum falls; both are estimates.

## Photographs (links only)

- **Day, historic:** the design-record photograph above, [DLG gsu_planatl_3516](https://dlg.usg.edu/record/gsu_planatl_3516). Described from the catalogue record only; not viewed yet.
- **Day, current, second angle:** Street View [on the deck looking northwest](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.74608,-84.39169&heading=315&pitch=0&fov=80) and [from the ramps below looking north](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7458,-84.3912&heading=0&pitch=5&fov=80). Neither link has been opened yet; verify both, and open daytime and nighttime views in a fresh Orca tab before modelling.

**Gaps.**
- **Night:** no night image of the bridge, its railing or its lighting was found, so bridge lighting is undocumented.
- **Railing:** the form is unknown beyond the inventory code.
- **Map data:** OSM carries no bridge outline (`man_made=bridge`), and the street itself has no bridge tag, so the deck edge has to come from the street axis plus the inventory widths.

## Plan, held for Sam

Survey it as a street bridge, the Jackson (B1) primitive in `street-bridge-survey.py`. That gives measured rows from class-17 or class-2 returns along the street axis, a 14.6 m roadway with 2.4 m walks on each side (19.5 m out to out), and walks 1388990213/1388990214 landing on its rows.
- **Acceptance:**
  - the street and walks within 0.3 m of their lidar surface;
  - both crossings under 442591112 keeping their order with at least 4.5 m soffit clearance;
  - the 439abf84 gate unchanged;
  - day and night stills from matched cameras.
- **Before building:** open and record the photographs above, add a mapped or measured deck outline, and agree the railing form with Sam.
