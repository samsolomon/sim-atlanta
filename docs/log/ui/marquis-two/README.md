# Marquis Two (and Marquis One's crown)

Marquis Two (285 Peachtree Center Avenue, 1988) uses the mapped Overture outline `2b0270ee-9f6a-44c9-bf0d-e6fb20e6c47c`, about 57 × 31 m and 115.2 m high. The district nomination calls it a near clone of Marquis One. It has the same three symmetrical bays with glazed strips between them, a shortened crown parapet and the same lion stair on Peachtree Center Avenue. It differs in two ways. The north wall has double-width panes in elongated Vs that run from the crown to the lobby. The tower-side entrance never had a half-barrel hood. [District nomination, pp. 44–48](https://saportareport.com/wp-content/uploads/2017/09/Peachtree-Center-HD-Final-4-24-17.pdf#page=48) · [Leasing exterior](https://peachtreecre.com/property/marquis-two/) · [SKYDB daylight angles: narrow end](https://www.skydb.net/file/950669689/marquis-ii-atlanta/), [narrow end from Piedmont](https://www.skydb.net/file/319314953/marquis-ii-atlanta/), [long face](https://www.skydb.net/file/249898214/marquis-ii-atlanta/)

## Heights from lidar

The SKYDB narrow-end photographs show the centre bay rising above its neighbours to a slotted crown. The USGS GA Statewide B2 2018 point cloud confirms this on both towers. Side-bay roofs sit at 418.9–419.0 m NAVD88 and the centre bars at 426.1 m, with the crown edge at 427.8–428.0 m. Ground beside Marquis Two is 310.6–312.9 m. The mapped 115.2 m therefore belongs to the crown. City now stops both towers' side bays 8.4 m lower and continues the centre bar one more course before a precast crown with recessed slots. The City coordinator, to whom Sam delegated building skins, approved lowering Marquis One's side bays to match (2026-11-23). [USGS point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)

## Estimates

- **North-wall V (estimated):** No public photograph of the north wall turned up. Photos 236 and 239 in the nomination are not in the text PDF, and neither Street View nor the Google Maps gallery shows the wall clearly. The text gives the pattern but not the count. City uses three Vs across the 35-bay wall, apexes at the lobby, opening to one-sixth of the wall per side at the crown. Each double pane drops one precast pier and uses lighter glass. The count, apex direction and glass tone are estimates.
- **Baker Street entrance (estimated):** The nomination places the hoodless secondary entrance on the podium face opposite Marquis One's Harris Street hood. City puts it on the north wall 13 m east of centre, mirroring One, with a flat precast lintel. The mapped skybridge to Truist Plaza Garden Offices meets the same wall about 3 m east of centre. The single spiral stair is inside the lobby and is not modelled.
- **Grid:** It uses Marquis One's estimates: 11.6 m lobby, 1.8 m transfer band, 26 courses (about 3.5 m each once the side roof drops) and a 1.55 m bay. Bays now follow merged collinear wall runs, so the mapping nodes on both long walls no longer restart the rhythm.

## Lighting

The night skyline photograph used for Marquis One shows scattered warm office windows around Peachtree Center but no positive read of either Marquis lobby or crown. I found no Marquis Two night photograph. City keeps sparse, stable warm occupancy (illustrative) with uniform density across the north wall, an unlit crown and a lit lobby door. Gap: real night evidence for the crown and both lobbies. [Night skyline](https://explorecams.com/photos/WwAPDZzyzW?lens=sony-fe-35mm-f1-4-za)

## Captures

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`, with November 20, 2026 and clear weather.

| View | Camera | Time | Capture |
|---|---|---|---|
| Marquis Two from the north-east | `553,-890,215,52,480` | 11:30 AM EST | [Day](two-day.jpg) |
| Marquis Two from the north-east | `553,-890,215,52,480` | 11:30 PM EST | [Night](two-night.jpg) |
| North wall, both crowns | `553,-840,185,66,640` | 11:30 AM EST | [North wall](north-day.jpg) · [2× detail](north-detail.jpg) |
| Peachtree Center Avenue, both towers | `660,-858,95,56,620` | 11:30 AM EST | [Avenue pair](pca-day.jpg) |
| Lion stair (close, `&dev&mindist=20`) | `527,-903,40,65,45` | 11:30 AM EST | [Stair](avenue-day.jpg) |
| Marquis One before and after, 490 m | `557,-862,-14,52,490` | 11:30 AM / PM EST | [Day](one-compare-day.jpg) · [Night](one-compare-night.jpg) |

## Night pattern (2026-11-24)

Both towers now pick lit panes with skin-kit `litHash(seedOf(id), face, floor, bay)` at the old density, 1 in 83 panes. The earlier linear modulus `(floor·29 + bay·17 + edge·41) % 83` lit panes on a fixed diagonal lattice. Glass colours and geometry are unchanged. [Before and after, 2.2× crops at 11:30 PM](lithash-compare.jpg): Marquis One from `557,-862,-14,52,490` and Marquis Two from `553,-890,215,52,480`, each then `__setView(…, 2.2)` with `&dev`.

## Pier rework (2026-11-24)

The lead's audit failed Marquis One as a beige grid beside a generic beige-grid tower. Marquis Two was borderline: a dark grid with no vertical rhythm. The district nomination and the photographs agree on what identifies both towers: light precast piers running the full shaft height, slender dark windows recessed between them, and the centre bay rising to a slotted crown over an open double-height base.

The façade is now pier-dominant:

- The horizontal spandrel band at every floor is gone.
- Piers fill 0.88 m of each 1.55 m bay, in light precast `#d9d3c6`.
- The windows are dark glass `#66706f` and the recess is `#555e5e`.
- The crown slots use the recess colour.
- Marquis Two's double-width north-wall panes in Vs are kept.

Rendered at 11:30 from `557,-862,-14,52,490`, Marquis One's south face has piers at V 93 and slots at V 31. The coordinator's targets were piers V 70 or more and slots V 30–40. No new materials were added, and the change removes geometry: one band quad per floor per run.

[One, day](piers-cmp-one-day.jpg) · [Two, day](piers-cmp-two-day.jpg) · [One, night](piers-cmp-one-night.jpg) · [Peachtree Center Avenue pair](piers-cmp-pca.jpg) · [One, four sides](piers-four-sides-one.jpg) · [Two, four sides](piers-four-sides-two.jpg)
