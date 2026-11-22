# Six shopfronts facing Woodruff Park

Walk south from Poplar along Peachtree toward Walton. The white corner shop shares a City footprint with the red shop next door. Four more narrow facades follow before the named Muse building. The 2025 leasing plan labels the six doors P70, P66, P64, P62, P60 and P56. Matching those doors to the baked lot edges gives the following order. [Muse’s Retail leasing plan, p. 4](https://static1.squarespace.com/static/6854042a093547782539225c/t/68c807bf748cbc26937a5cfb/1757939647913/091125%2BRetail%2BLeasing%2BFlyer%2B-%2BMuse%27s.pdf#page=4) · [March 2025 view down the row](https://www.google.com/maps/@?api=1&map_action=pano&pano=Wl3CWFk8b_OvTtVtf4xikA&heading=297&pitch=14&fov=100)

| Peachtree unit | Overture building ID | Baked height | Visible form in March 2025 |
| --- | --- | ---: | --- |
| P70 and P66 | `f472648e-f73e-4031-86f4-d8d6885ba239` | 14.8 m | P70 has white paired sashes, a pale cornice and curved heads over street glass. The window rows turn onto Poplar. P66 has four square upper bays below four round heads, a dark shop base and a projecting cap. |
| P64 | `5bf06764-7551-4ae7-9442-88f6eb1fa43d` | 13.1 m | White painted front, a wide bank of small panes, dark street transom and deep parapet. |
| P62 | `2a99a93b-d963-4348-8792-a489cf3e4697` | 16.6 m | Two rows of broad dark gridded glass in a pale surround, with a black awning sloping out over the entry. |
| P60 | `2298c49e-cf23-4617-8ba9-cf2899b46d66` | 15.5 m | Four narrow upper windows across each of two brick stories. The shallow arched heads, pale sashes and dark cornice distinguish it from P66. |
| P56 | `c57236ea-b41d-49e7-88a5-32015b8830e0` | 13.5 m | Two tall arched openings in a pale stone front. |

The P70/P66 joint falls about halfway across the 17.3 m frontage. Its position, P66’s extra 1.2 m of parapet, the glazing recesses (0.18 m upstairs and 0.34 m at street level), the awning reach and paint colors are illustrative fits to the photographs. The long exposed walls above adjoining roofs have plain masonry. Broad Street has its own shops and entrances, as the leasing plan and the reverse street view show. [Poplar corner](https://www.google.com/maps/@?api=1&map_action=pano&pano=d0zL4yhYhgkAde4_b5XFTA&heading=231&pitch=8&fov=95) · [Toward Walton](https://www.google.com/maps/@?api=1&map_action=pano&pano=Wl3CWFk8b_OvTtVtf4xikA&heading=236&pitch=13&fov=88) · [Broad Street](https://www.google.com/maps/@?api=1&map_action=pano&pano=CIHM0ogKEICAgIDEkNuFTQ&heading=115&pitch=15&fov=100)

The 2017 park photograph and the owner’s 2018 evening event photograph show storefront and street lighting through the trees. Neither resolves individual shop hours or which upstairs rooms were lit. The night scene gives a few ground-floor panes warm light and leaves the upper masonry and sashes under ambient light. Tenant signs and colors change over time. [Downtown Counts, p. 10](https://ctycms.com/ga-atlanta/docs/downtown-counts_2017-reduced.pdf#page=10) · [Party With the Past, October 2018](https://images.squarespace-cdn.com/content/v1/611fd546857f6c1cf9a3c938/1642792960214-6LDCCHF85NNYY7EKYGRQ/20181025_AHC_Party_With_The_Past_23.jpg)

## Matched desktop Orca views

Each sheet pairs the original above the revised scene. Both use the Flatiron relief from `ee3da9b`, the same downtown bake, high quality and a paused timetable clock on November 20, 2026. Camera settings give City target x/z, bearing, metres per pixel and tilt. To reproduce, open `/?view=city&q=high&t=2026-11-20T10:15:00-05:00&speed=0` and use, for example, `__city.lookAt(247, -219, {bearing:290, metresPerPixel:0.36, tilt:49})`. Change the time to 20:15 for the night sheet.

| View | Settings | 10:15 EST | 20:15 EST |
| --- | --- | --- | --- |
| Across the district | (247, −219), 290°, 0.36, 49° | [Day](district-day.jpg) | [Night](district-night.jpg) |
| Woodruff Park near the Flatiron | (225, −221), 274°, 0.19, 48° | [Day](park-day.jpg) | [Night](park-night.jpg) |
| Full row | (216, −171), 295°, 0.093, 58° | [Day](row-day.jpg) | [Night](row-night.jpg) |

## Integration

The facade builder uses five IDs plus a matching Peachtree edge in downtown x/z metres. A changed ID or moved frontage falls back to the ordinary building. The selected streets use recessed panes, jambs and cornices within the shared building geometry. Broad Street keeps its existing material. The generic material choice for all other buildings still follows the existing massing rule. The normal web build includes this change using the existing City data.

| High-quality opening from (−40, −260) | Draws before → after | Submitted triangles before → after |
| --- | ---: | ---: |
| Day | 141 → 141 | 2,220,519 → 2,226,491 (+0.27%) |
| Night | 157 → 157 | 2,204,392 → 2,210,364 (+0.27%) |

Counts come from `__city.stats()` at the default opening camera and include shadow passes. The same mesh carries all panes, frames, masonry and the awning. Lighting uses the existing night uniform. Visitors fetch the normal City bundle and bake.
