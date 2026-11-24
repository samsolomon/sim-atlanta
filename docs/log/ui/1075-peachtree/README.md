# 1075 Peachtree

`osm:way:234935278`, rank 4 in [building skins](../../../building-skins.md). Code: `web/src/city/1075-peachtree.ts`.

The 2010 office tower at Peachtree and 12th is now known for its PwC tenancy. Its sign is a tenant logo, so the model leaves it out.

## Sources

Photos were checked in an Orca browser tab on 2026-11-23. They are linked here, not copied.

| What | Source | Angle |
|---|---|---|
| Day, south and west faces over the precast podium, with the brim and louvred crown | [Commons: A1075PchTrMT2511-0662.jpg](https://commons.wikimedia.org/wiki/File:A1075PchTrMT2511-0662.jpg) (aerial, 2025) | From the southwest, elevated |
| Day, flat-topped north block with the crown block behind | [Commons: One_Midtown_ATL.jpg](https://commons.wikimedia.org/wiki/File:One_Midtown_ATL.jpg) | From 12th Street, looking south |
| Day, podium glass band beside the Loews | [Commons: 1065 and 1075 Peachtree, March 2018](https://commons.wikimedia.org/wiki/File:1065_Peachtree_Street_and_1075_Peachtree_Street,_Atl_March_2018.jpg) | From Peachtree, looking up |
| Dusk, the brim and crown profile from the east | [Commons: Sunset view from the Eastside BeltLine Trail](https://commons.wikimedia.org/wiki/File:Sunset_view_of_the_midtown_Atlanta_skyline_from_the_Eastside_BeltLine_Trail.jpg) | From the east, about 2.5 km |
| Night, lobby art glass in blue and violet under a glass canopy (2012-04-14, 21:21) | [Commons: 1075_Peachtree.JPG](https://commons.wikimedia.org/wiki/File:1075_Peachtree.JPG) | Street level |
| Night skyline, 2011 | [Commons: Midtown_at_night.jpg](https://commons.wikimedia.org/wiki/File:Midtown_at_night.jpg) | From Piedmont Park, looking west |
| Street level, garage podium and retail along 12th Street | [Street View, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78440,-84.38345&heading=215&pitch=20&fov=100) | 12th Street, looking southwest |
| Brochure | [1075peachtree.com brochure](https://www.1075peachtree.com/wp-content/uploads/2022/10/1075-Peachtree_Brochure-1.pdf) | Not used for dimensions |

## Footprint and heights

The mapped outline is split between the midtown-upper and midtown-central tiles. Each tile's fragment is skinned separately.

April 2019 3DEP lidar, sampled per part and rasterised at 2.5 m, changes the mapped picture:

| Part | Mapped | Lidar (NAVD88 roof, height above local ground) | Model |
|---|---|---|---|
| `1434982572` crown block (the curved-north-face part) | 156.7 m | median roof 433.1, p95 445.2 (149.5 m) | Glass to 431.6, louvred screen to 443.6, brim 443.6 to 445.2 |
| `podium` north block, 12th Street | 18.8 m (inferred) | median 433.1, p95 437.0 (140 m) | **A tower mass, not podium.** Glass to 433.1, parapet and plant on top |
| `234935282` podium | 18.8 m (reported) | median 331.1, p95 333.1 (35 m) | Precast deck to 332.4 |
| `1434982552` east slice | 45.4 m | 323.1 to 324.7 | 323.6 |
| `1434982573` west podium | 33 m | 322.9 to 323.6 | 323.2 |
| `1434982574` west low wing | 16.5 m | 306.4 to 307.6 | 306.8 |
| `1434982571` Peachtree and 12th corner | 12.4 m | 5 returns only | Mapped 12.4 m, glazed |
| `1434982570` curved canopy | 8 m (illustrative) | — | 0.6 m slab at 6.9 m |

The tower therefore stands on two masses, which matches the 12th Street photo of a flat-topped block in front of the crowned block. Its median roof is 433 m everywhere. Inside the crown block the median stays at 433 while the p95 reaches 445, so the brim is an open ring around a lower mechanical roof, not a lid. The model builds it as a ring.

## Estimates

- **Floor pitch:** 4.1 m, measured down from the roof. Lines from the lobby to the roof give about 33 floors on the north block. OSM tags the building with 37 floors and Structurae lists 38, counts that include the lobby and mechanical levels.
- **Mullions:** the photos show 1.5 m modules. Only paired 9.2 m ribs are drawn, because finer lines shimmer at the 400 to 500 m orbit.
- **Brim:** about 2.6 m of overhang beyond the glass, judged from the aerial and sunset photos, and 1.6 m thick.
- **Louvred band:** 12 m tall, from the lidar step.
- **Podium:** pilasters at about 8.4 m centres, with precast spandrels every third garage level. The real podium has more glazing and louvre variety than this.
- **Lobby:** double-height glazing, 8.2 m, where the tower meets the street on 12th and Peachtree. Its art glass is not modelled.
- **Glass colour:** dark blue-green (`#46606e`), sampled by eye from the two day photos.

## Lighting

- **Day:** the glass reads as one even dark face with faint floor lines.
- **Night, crown:** the 2011 Piedmont Park photo shows a white, even glow at the top of a tower whose position and rounded outline fit 1075's crown block. The louvred band is therefore lit as one even emissive band in the shared warm white. This identification comes from position and outline, not a labelled photo. **Gap:** no verified close night photo of the crown.
- **Night, offices:** about 5% of panes are lit at 23:30, and 3% on the top four floors. The pattern is a stable hash per pane.
- **Night, lobby:** the 2012 photo shows the lobby lit. The model lights the double-height glazing in the common warm white, not the art glass colours.
- No holiday or event colours.

Every light is drawn as `illustrative` ambient scenery and is not labelled on screen.
