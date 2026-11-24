# Atlantic House

Atlantic House (1163 West Peachtree, Smallwood for Novare, 2018) is a 32-floor apartment slab at West Peachtree and 13th Street. It uses the mapped outline `osm:way:505414294` and its parts. The architect's photographs show teal-grey glass between cream stone pilasters, with stacks of projecting balconies on both broad faces and a central stack on each narrow end. A centre bay of stone piers screens the rooftop club and pools, and rises above the end bays. The separate nine-level parking deck to the north carries a tennis court and terraces. [Architect: project page and photographs, including a dusk view](https://smallwood-us.com/projects/atlantic-house/) · [CTBUH: 109 m, 32 floors](https://www.skyscrapercenter.com/building/atlantic-house/30379)

## Heights from lidar

The mapped height is 125.4 m and the deck is 26.4 m (inferred). The USGS `GA_Statewide_B2_2018` point cloud gives different values ([point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)):

- End-bay roofs: 388.1 m NAVD88.
- Centre roof: 392.2 m.
- Crown piers: top out at 398.0 m.
- Deck: its court sits at 316.3 m, and its perimeter walls reach 321.8 m.
- Ground: 282–289 m across the steep site.

That puts the crown about 109–113 m above the low corner, which matches CTBUH's 109 m.

## Estimates

- **Stacks (estimated):** four balcony stacks per broad face between five pilasters, and one stack on each narrow end. Each stack is 4 m wide and 1.7 m deep.
- **Floor lines:** a slab-edge strip every 3.2 m across the glass.
- **Crown:** seven stone piers across the 38 m centre on each broad face, plus a stone band round the end bays.
- **Deck:** one open band per 3.4 m level on three faces, with a green court roof.

## Glass

The base is vertex colour only, so the body batches. Glass `#75979e` is S 26%, V 62%: teal-grey backed by the photographs and under the base-value table. Rendered sample at 11:30 from `392,-3585,10,38,560` ([day frame](day.jpg)):

| Face | S | V |
|---|---|---|
| South glass, sunlit (teal pixels) | 29 | 54 |
| West face, shaded | 25 | 27 |
| Generic slab, sunlit | 6 | 68 |
| Generic tower, shaded | 24 | 51 |

## Lighting

The architect's dusk photograph shows the rooftop club floor lit warm behind the crown and scattered lit units. City lights about 40% of the units either side of each pilaster with skin-kit `litHash`, as a residential tower noticeably lit at 23:30, and adds the club floor behind the crown piers. The selection of lit units is illustrative. I found no full-night exterior, only dusk.

## Captures

Use `/?view=city&cam=<camera>&t=2026-11-20T<time>-05:00`, clear weather.

| View | Camera | 11:30 AM | 11:30 PM |
|---|---|---|---|
| From the south over 13th Street, broad face and crown | `392,-3585,10,38,560` | [Day](day.jpg) | [Night](night.jpg) |
| Spec starting camera | `387,-3583,32,60,324` | [Day](start-day.jpg) | [Night](start-night.jpg) |
| Close: the day camera with a 2.2× lens (`&dev`, then `__setView(10,38,560,392,-3610,2.2)`) | | [Close](close.jpg) | |
