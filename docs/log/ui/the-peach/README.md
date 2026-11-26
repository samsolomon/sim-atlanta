# The Peach (1655 Peachtree St NE)

Landmark skin `web/src/city/the-peach.ts`. It replaces `osm:way:265351172` ("The Peach Atlanta") on the `brookwood-station` row, at the south end of the Peachtree Road bridge over I-85. The branch is based on `origin/samsolomon/north-expansion` because the footprint is in the Brookwood rows.

**Identity.** The building went up in 1964 as a 12-storey office building. A conversion to residential began around 2008 and stalled. Peach Hospitality renovated it into 107 apartments, completed in 2021 and painted white with stacked round balconies. Despite the brief, it is not a hotel. A Cvent listing calls it a hotel, but every other source I read says apartments. The giant metal peach sits on the corner tower. Midtown Alliance's public art listing dates it to 1994 and credits Taz Anderson. The AJC says it "may have been put on the roof in the early 90s".

**Sources** (linked only, never committed):
- [Midtown Alliance: The Peach (1994)](https://www.midtownatl.com/go/the-peach-1994)
- [AJC, March 2018: renovation plans](https://ajc.com/news/local/renovations-planned-for-vacant-midtown-building-with-big-peach-atop/gkeW7IRzVNIFeSDpaNtk7J)
- [Urbanize, Sept 2021: renovated exterior](https://atlanta.urbanize.city/post/photos-midtowns-famed-peach-building-renovated-ready-closeup)
- [Urbanize project page](https://atlanta.urbanize.city/project/1655-peachtree-street)
- **Daylight, angle 1:** [2021 exterior from the Peachtree side](https://atlanta.urbanize.city/sites/default/files/styles/2018_article_image_1140x538/public/background/2021-09/The%20Peach%20apartments%20exterior%20Urbanize.jpg). It shows the white slab, the round balconies, the dark cantilevered parking decks, the fluted corner tower and the ring cage.
- **Daylight, angle 2:** [2016 Google street view, published by Urbanize](https://atlanta.urbanize.city/sites/default/files/styles/1140w/public/2021-09/The%20Peach%202016%20before.png). It shows the orange peach inside the ring cage on top of the tower.
- **Plan:** [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9). The round cage, about 11.6 m across, sits over the north corner by the bridge.
- **Sam's Street View, Sep 2026:** 33.7992629, -84.3920725 (the peach currently wrapped in an ad band).

**Dimensions.** The slab and core use the mapped part heights: 39.6 m and 43.2 m, from 12 storeys at 3.6 m. The parking decks are 14.4–18 m. The rest is estimated:
- Tower top 47.2 m, about a storey above the roof.
- Mast to 49.5 m, with the ring platform 11.6 m across at 49.5 m.
- Peach about 8.2 m across and 9.4 m tall. Its lower third sits inside the ring, with a stem and leaf to about 59 m.

**Peach (revised after Sam's review).** It follows the sculpture's vertical metal slices: 12 solid gores on a peach profile, with thin dark ribs on the slice edges. The peach is slightly taller than wide, with a point at the bottom. A suture groove runs down the Peachtree-facing side. Each slice is shaded a step lighter or darker than its neighbour. The colour grades from warm golden-peach to a pink blush, which covers about half to two-thirds of the side seen from the Peachtree approach and the close camera (Sam, second review), and the ad wrap is a thin plain cream band.

**Not drawn.** The ad wrap is a plain cream band with no lettering, and the rooftop and east-facade advertising signs are left blank. No logos appear.

**Lighting.** No reliable night photograph of the building or the peach was found, which is a gap. At night the model shows only about one in seven apartment windows lit, as illustrative scenery. The peach is not floodlit.

**Cost.** Measured from the matched normal camera, 1440×720, against the same camera with the skin switched off:
| Tier | Draw calls | Triangles |
|---|---|---|
| High | +2, day and night | +3,188 |
| Low | +2, day and night | +3,302 |

The sliced peach added 284 triangles over the first round (`b028b997`). Its cameras and counters are in [`cameras-sliced.json`](cameras-sliced.json).

The landmark draws alone in its batch cell. See [`cameras.json`](cameras.json).

**Cameras** (`/?view=city&dev&mindist=20&cam=…`, then `__setView` with the zoom shown):
- normal `40,-5000,-40,55,320`
- I-85 approach `34,-4996,-90,76,260`
- Peachtree approach `25,-4995,15,77,230`
- peach close-up `-103,-4996,-90,70,330`, zoom 2.6

The arch bridge still reads beside the slab, and the peach is visible from both approaches. [Before/after gallery](review.html).
