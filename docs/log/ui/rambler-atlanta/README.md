# Rambler Atlanta

`osm:way:1300601309`, 736 Peachtree Street NE, at 4th Street. Code: `web/src/city/rambler-atlanta.ts`.

Rambler is a 19-storey student tower by Niles Bolton Associates for LV Collective. It opened in August 2025 ([Urbanize, Aug 2025](https://atlanta.urbanize.city/post/rambler-midtown-photos-posh-student-housing-tower-opens)) and runs east–west from Peachtree to Cypress Street.

## Height: reported (post-2019)

The April 2019 lidar shows an empty lot here (roof median 0 m). The height is therefore reported, from the floor count: OSM gives 19 levels and no height, and the press gives 19 storeys. The model is a 14 m base (the three-level garage and the café floors), 15 residential floors of 3.0 m and a 1.7 m parapet, for about **60.7 m (estimated)**.

## Features and the photo behind each

| Feature | Model | Evidence |
|---|---|---|
| Dark warm-grey shaft of paired punched windows | Window box `#4c555b` crossed by wide piers `#6f6a64` and floor bands `#5b5752` | Topping-out photo, Sept 2024: [south and west views](https://atlanta.urbanize.city/sites/default/files/styles/1140w/public/2024-09/Rambler%20September%202024%201.png) show a dark grey shaft of tall punched windows |
| White base band of about four floors | `#efece4`, with a storefront band and one ribbon window per garage floor | Same photo (white lower floors under the dark shaft), and the [Niles Bolton rendering](https://atlanta.urbanize.city/sites/default/files/styles/1140w/public/2023-06/Rambler%20Atlanta%20736%20Peachtree%201.png) |
| Balcony ladders, strong white horizontals | One white slab-and-rail front per floor, 1.5 m out, with side cheeks: centred on both narrow ends and two stacks on the long south face | Both images show stacked balconies on the narrow end and up the long face |
| Recessed café on Peachtree | Dark storefront band at the base | [Urbanize, Sept 2024](https://atlanta.urbanize.city/post/midtown-rambler-project-tops-out-images): "recessed into the building, facing Peachtree Street, with exposed pillars" |

No logos. Materials are flat vertex colours, because a library surface is a hooked material that the batcher never merges.

## Lighting

About a third of rooms are lit at 23:30 (student housing), chosen with the shared `litHash` and grouped two windows wide. **Gap:** no night photograph. Everything is `illustrative`.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| Peachtree end and south face, day / night / low tier (money shot) | `600,-2320,300,60,420` | 11:30 / 23:30 / 11:30 `&q=low` |
| Four sides at 400 m ([sheet](four-sides.jpg)) | `570,-2320,{0,90,180,270},64,400` | 11:30. The south face is partly hidden at 0°, so the money shot covers it |
| Peachtree end (close) | `625,-2322,290,66,150` with `&dev&mindist=20` | 11:30 |
