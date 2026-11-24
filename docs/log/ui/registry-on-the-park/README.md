# The Registry on the Park

The Registry on the Park (207 13th Street, completed 2017, formerly YOO on the Park) replaces the generic box on `osm:way:1442258925`. It is a 25-storey residential tower by Piedmont Park: blue-grey glass in a pale concrete frame, with balcony stacks across the middle of each long face. It stands over a white podium whose 13th Street end carries tall perforated art screens above the lobby.

**Height basis:** the 22 April 2019 lidar, in absolute NAVD88 heights. Inside the tower part (`osm:way:536885263`), insets of 2, 6 and 10 m all agree: roof p50 355.7–356.9 m, p95 about 360.3 m, max 360.6 m. Ground falls toward the park: median 277.8 m on the east side and 282.2 m on the west, with the lowest return at 274.1 m. The model puts the main roof at 356.9 m and the penthouse screen at 360.6 m. Even measured from the lowest ground, that top is 86.5 m. The mapped 98 m and Wikipedia's 321 ft (97.8 m) are **unverified**. The podium parts measure 17.0–21.6 m (lidar), modelled at their part values with a 20.4 m deck.

## Evidence

- **Day:** the [Apartments.com listing photographs](https://www.apartments.com/registry-on-the-park-atlanta-ga/3qh4j7f/), a worm's-eye view of the tower and a rooftop view across to it. They show a pale concrete frame, glass bays, stacked balconies with glass rails, and blue-grey glazing.
- **Second angle, dusk:** the [Midtown Alliance listing](https://www.midtownatl.com/view/yoo-on-the-park) carries the developer's rendering from the 13th Street corner. It shows the white podium with perforated green-white art screens, lit at dusk, and a planted terrace on the podium roof. It is a rendering, not a photograph, so the screens' exact pattern is an estimate.
- **Gap:** I found no verified full-night photograph. Residential windows are lit at about 30% at 23:30 (`litFacade` with the shared `litHash`), and the art screens glow as in the rendering. No crown lighting is modelled.
- **Estimates:** the tower is a clean rectangle inside the notched mapped outline (the notches are balcony recesses), balcony slab depth 1.8 m, storey height about 3.1 m, the art screens' size and count, and the penthouse screen's inset.

## Model

The model is vertex colours on `landmarkShell` (batchable, no library surfaces).

**Glass:** base `#82919e` (HSV S 18%, V 62%). At 11:30 a taller neighbour shades most of the south face, so the sunlit reading comes from 14:00 from the south-west: south face, panes (darkest third) S 16%, V 42%, face median S 8%, V 58%. In the same frame a generic sunlit tower reads S 6%, V 72%. Shaded faces at 11:30 read panes S 25–29%, V 31–37%.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Survey start | `1049,-3466,32,60,240` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| From the south-west | `1049,-3466,40,55,650` | 11:30 (before and after) | [Before/after](compare.jpg) |
| 13th Street | `1049,-3466,200,50,450` | 11:30 and 23:30 | [Day and night](daynight.jpg), [close](close.jpg) |
| Sunlit check | `1049,-3466,40,55,650` | 14:00 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
