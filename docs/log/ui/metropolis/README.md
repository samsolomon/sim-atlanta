# Metropolis

Metropolis (943 Peachtree Street, completed 2002) replaces the generic block on `osm:way:234733557`. It is two 21-storey glass condominium towers over a garage podium, with retail bases on 8th Street and Peachtree Place. Each tower keeps its three mapped parts: a Peachtree slice at 75.6 m, the main body at 71.4 m, and a 54.6 m step on Metropolis Alley. The podium is 21.9 m, the amenity deck on Peachtree is 24.9 m, and the retail bases are 9.3 m.

**Height basis:** the mapped (reported) part heights. The April 2019 lidar agrees: roof p50/p95/max are 54.7/72.1/76.8 m, which covers the step, the bodies and the slices.

## Evidence

- **Dusk exterior, from across Peachtree, elevated:** [Midtown Alliance listing photo](https://www.midtownatl.com/view/metropolis). It shows two glass shafts with light silver slab edges every floor, stacked balconies with glass rails at the street corners, a garage podium with horizontal openings, a lit glazed amenity level, and warm, scattered apartment lighting. The crown carries the building's name sign, which is not drawn (no logos). The parapet beside it reads as an even white glow.
- **Second angle:** an [Esri World Imagery aerial](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) (capture date not stated) set against the mapped parts. It confirms the pool deck on the podium between the towers, the rooftop plant on both towers, and the rounded retail corner at 8th & Peachtree. 8th Street lies south of the site (City z points south).
- **Listing facts:** [Engel & Völkers Atlanta](https://www.evatlanta.com/metropolis) describes a twin 21-storey high-rise over a commercial base.
- **Gap:** I found no verified full-night (23:30) exterior; the Midtown Alliance frame is dusk. City lights about 30% of apartment runs in whole two-bay runs, with a stable pattern, plus the storefronts, two-thirds of the amenity panes, and an even crown band on the north tower's Peachtree slice. The photo shows a glass drum at the deck's street corner, but its exact position can't be fixed from one frame, so it is left out.

## Model

All of it is vertex colours on `landmarkShell`'s StaticLandmarkMaterial body and its lamp mesh: no library surfaces and no new shader program. The lamp mesh receives shadows, so the lit runs keep the shaded wall's tone by day. Glass shades from street level to the sky reflection at the top. A light 0.55 m slab edge every 3.6 m, from the podium line up, carries the floor rhythm. Balcony stacks are a 1.6 m slab, an edge and a glass rail on every floor, 4 m wide at both ends of each tower's Peachtree face. Storefront heads follow the ground sampled every 6 m, and walls start 1 m under the lowest corner. The skin is 1,348 body triangles and 746 lamp triangles.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Survey start | `731,-2916,32,60,227` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| Across Peachtree | `731,-2916,95,62,420` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| Podium close | `700,-2915,80,72,90` with `&dev&mindist=20` | 11:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
