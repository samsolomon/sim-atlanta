# 1075 Peachtree

`osm:way:234935278`, rank 4 in [building skins](https://github.com/samsolomon/sim-atlanta/blob/samsolomon/studio-building-skins/docs/building-skins.md). Code: `web/src/city/1075-peachtree.ts`.

The 2010 office tower fills the block between Peachtree Street (west) and Juniper Street (east), south of 12th Street. Its main entrance is the curved corner at Peachtree and 12th. The tower is now known for its PwC tenancy. Its sign is a tenant logo, so the model leaves it out.

## Sources

Photos were checked in an Orca browser tab on 2026-11-23. They are linked here, not copied.

| What | Source | Angle |
|---|---|---|
| Day, south and west faces over the precast podium, with the brim and louvred crown | [Commons: A1075PchTrMT2511-0662.jpg](https://commons.wikimedia.org/wiki/File:A1075PchTrMT2511-0662.jpg) (aerial, 2025) | From the southwest, elevated |
| Day, flat-topped north block with the crown block behind | [Commons: One_Midtown_ATL.jpg](https://commons.wikimedia.org/wiki/File:One_Midtown_ATL.jpg) | From the north, looking south |
| Day, podium glass band beside the Loews | [Commons: 1065 and 1075 Peachtree, March 2018](https://commons.wikimedia.org/wiki/File:1065_Peachtree_Street_and_1075_Peachtree_Street,_Atl_March_2018.jpg) | From Peachtree, looking up |
| Dusk, the brim and crown profile from the east | [Commons: Sunset view from the Eastside BeltLine Trail](https://commons.wikimedia.org/wiki/File:Sunset_view_of_the_midtown_Atlanta_skyline_from_the_Eastside_BeltLine_Trail.jpg) | From the east, about 2.5 km |
| Night, lobby art glass in blue and violet under a glass canopy (2012-04-14, 21:21) | [Commons: 1075_Peachtree.JPG](https://commons.wikimedia.org/wiki/File:1075_Peachtree.JPG) | Street level |
| Night skyline, 2011 | [Commons: Midtown_at_night.jpg](https://commons.wikimedia.org/wiki/File:Midtown_at_night.jpg) | From Piedmont Park, looking west |
| Street level, glazed base and restaurant frontage on Peachtree | [Street View, June 2022](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78425,-84.38306&heading=135&pitch=15&fov=100) | Peachtree at 12th, looking southeast |
| Aerial, both masses, the brim on the curved crown block, the corner entrance | [1075peachtree.com brochure, cover](https://www.1075peachtree.com/wp-content/uploads/2022/10/1075-Peachtree_Brochure-1.pdf) | From the northwest, elevated |

## Footprint and heights

The mapped outline is split between the midtown-upper and midtown-central tiles. Each tile's fragment is skinned separately.

April 2019 3DEP lidar, sampled per part and rasterised at 2.5 m, changes the mapped picture:

| Part | Mapped | Lidar (NAVD88 roof, height above local ground) | Model |
|---|---|---|---|
| `1434982572` crown block (the curved-north-face part) | 156.7 m | median roof 433.1, p95 445.2 (149.5 m) | Roof 433.1; glass parapet to 438.6, louvred band to 443.6, brim ring to 445.2 |
| `podium` north block, 12th Street | 18.8 m (inferred) | median 433.1, p95 437.0 (140 m) | **A tower mass, not podium.** Glass to 433.1, parapet and plant on top |
| `234935282` podium | 18.8 m (reported) | median 331.1, p95 333.1 (35 m) | Precast deck to 332.4 |
| `1434982552` east slice | 45.4 m | 323.1 to 324.7 | 323.6 |
| `1434982573` west podium | 33 m | 322.9 to 323.6 | 323.2 |
| `1434982574` west low wing | 16.5 m | 306.4 to 307.6 | 306.8 |
| `1434982571` Juniper and 12th corner | 12.4 m | 5 returns only | Mapped 12.4 m, glazed |
| `1434982570` curved canopy, Peachtree and 12th | 8 m (illustrative) | — | 0.6 m slab at 6.9 m |

The tower therefore stands on two masses, which matches the 12th Street photo of a flat-topped block in front of the crowned block. Both masses have a median roof of 433 m. Six metres inside the crown block's edge, only 12.5% of returns reach 440 m or more. The median stays at 433.1, and the 90th percentile is 440.7, which is rooftop plant. The brim is therefore an open ring around a lower mechanical roof, not a lid, and the model builds it that way.

## Estimates

- **Floor pitch:** 4.1 m, measured down from the roof. Lines from the lobby to the roof give about 33 floors on the north block. OSM tags the building with 37 floors and Structurae lists 38, counts that include the lobby and mechanical levels.
- **Mullions:** the photos show 1.5 m modules. Only paired 9.2 m ribs are drawn, because finer lines shimmer at the 400 to 500 m orbit.
- **Brim:** about 2.6 m of overhang beyond the glass, judged from the aerial and sunset photos, and 1.6 m thick.
- **Crown:** the aerial and sunset photos show glass running almost to a louvred band about one floor high (estimated 5 m), under the brim. Above the 433.1 roof, the glass continues as a 5.5 m parapet.
- **Podium:** pilasters at about 8.4 m centres, with precast spandrels every third garage level. The real podium has more glazing and louvre variety than this.
- **Base:** 8.2 m double-height glazing where either mass meets the street. Only the faces within 16 m of the Peachtree and 12th entrance are lit at night. The rest stays dark glass, including STK's frontage on Peachtree. The lobby's art glass is not modelled.
- **Glass colour:** dark blue-green (`#46606e`), sampled by eye from the two day photos.

## Lighting

- **Day:** the glass reads as one even dark face with faint floor lines.
- **Night, crown:** the 2011 Piedmont Park photo shows a white, even glow at the top of a tower whose position and rounded outline fit 1075's crown block. The louvred band is therefore lit as one even emissive band in the shared warm white. This identification comes from position and outline, not a labelled photo. **Gap:** no verified close night photo of the crown.
- **Night, offices:** about 5% of panes are lit at 23:30, and 3% on the top four floors. The pattern is a stable hash per pane.
- **Night, lobby:** the 2012 photo shows the entrance lobby lit. The model lights only that corner's double-height glazing, in the common warm white rather than the art-glass colours.
- No holiday or event colours.

Every light is drawn as `illustrative` ambient scenery and is not labelled on screen.

## Captures

Clock 2026-11-20, high tier unless noted. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| Start cam, day / night / low tier | `814,-3330,32,60,470` | 11:30 / 23:30 / 11:30 `&q=low` |
| Crown three-quarter, day / night | `815,-3330,215,70,950` | 11:30 / 23:30 |
| Entrance corner (close) | `806,-3360,115,45,220` with `&dev&mindist=20` | 11:30 / 23:30 |

At the start cam, the Loews Atlanta Hotel stands in front of the tower, so the crown view is the money shot.

## Rework (2026-11-24)

The registry audit failed #416: from a distance it read as a flat navy slab (sunlit glass about V 20), and the brim, louvre crown and mullions did not register. The lead confirmed three identifiers, from the [2025 aerial](https://commons.wikimedia.org/wiki/File:A1075PchTrMT2511-0662.jpg) and [the view from the north](https://commons.wikimedia.org/wiki/File:One_Midtown_ATL.jpg): the white brim line at the top, the deep reveal between the two masses, and thin pale floor lines.

What changed:
- Brim top and soffit: white (`#ecebe5`, `#f4f3ee`). Louvre band: pale (`#e2e3de`).
- Floor lines: pale (`#c6d0d4`), 0.8 m deep. Mullions are lighter.
- A dark reveal (`#1f2b33`) runs down the shared corners of the two masses.
- No new material and no new geometry apart from the reveal strips.

Glass, for Sam's palette pick (rendered sunlit, 11:30 high tier, `820,-3335,0,78,320` with `&dev&mindist=20`):

| Version | Base | Hue | S | V |
|---|---|---|---|---|
| Original glass (#416) | `#46606e` | 201 | 74 | 35 |
| Photo-matched glass (option A) | `#8ca8bc` | 192 | 20 | 64 |
| **Deeper blue (option B, Sam's pick, in code)** | `#718a9d` | 200 | 33 | 53 |

The photo-matched value follows the photos' light, reflective sky-blue and is inside the rule (V ≥ 62 → S ≤ 30). At 800 m it sits close to the generic pale-blue towers, so the lead asked for a middle option. The deeper blue renders at S 33 and V 53, inside the cap and more distinct from its neighbours. The current glass, at S 74, is over the S ≤ 36 cap.

[Before / current / photo-matched](rework-compare.jpg) · [Four sides at 400 m](1075-peachtree-four-sides.jpg)

## Glass pick (Sam, 2026-11-24)

Sam picked option B, the deeper blue `#718a9d` ("The glass pick looks good to me"), from a strip that showed both options with #631's glass shade floor merged in locally. B reads clearly apart from the pale-blue towers around it at the money-shot distance, and its sunlit render (S 32 / V 53) is inside the rule. The lit-pane colour follows it (`#738ca0`). [The A/B strip](https://github.com/samsolomon/sim-atlanta/blob/e2ab64c62aa4975a01e8dbe59ce58ed88f49f2a3/review/1075-glass-pick/glass-pick.jpg?raw=true)

The final before and after ([rework-compare.jpg](rework-compare.jpg), `815,-3330,215,70,950`) is shot **pre-floor**: #631's glass shade floor was not yet on main. The four-side sheet comes from `scripts/four-side-sheet.mjs` (low tier, 500 m, target 815,-3330).
