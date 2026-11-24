# Southern Company Gas (Ten Peachtree Place)

Ten Peachtree Place (1991) is the Southern Company Gas headquarters at West Peachtree and Peachtree Place. It uses the mapped outline `osm:way:164876035` and its parts. The Commons photographs show:

- a tower of red granite with rows of punched windows;
- tall green-glass slots near each corner;
- a glazed central bay through the top floors of the broad faces;
- a granite setback ledge over the base;
- a castellated crown of granite merlons over dark openings, under a cornice;
- an arched lunette over the recessed glass entrance on Peachtree Place.

Low granite wings step down to the north toward 10th Street. [Commons: Ten Peachtree Place, ATL](https://commons.wikimedia.org/wiki/File:Ten_Peachtree_Place,_ATL.jpg), [Atlanta](https://commons.wikimedia.org/wiki/File:Ten_Peachtree_Place,_Atlanta.jpg), [Atlanta, GA](https://commons.wikimedia.org/wiki/File:Ten_Peachtree_Place,_Atlanta,_GA.jpg), [Midtown Atlanta](https://commons.wikimedia.org/wiki/File:Ten_Peachtree_Place,_Midtown_Atlanta.jpg), [entrance](https://commons.wikimedia.org/wiki/File:Ten_Peachtree_Place_entrance.jpg)

The entrance sign is omitted (no logos).

## Heights from lidar

NAVD88 heights from the USGS `GA_Statewide_B2_2018` point cloud:

- **Grade:** 293.1 m.
- **Tower roof:** 374.4 m (81 m above grade).
- **Crown parapet:** 376.1 m.
- **Penthouse:** 378.0 m, which matches the mapped 96 m from the low south grade.
- **Low wings:** 320.2 m (middle) and 311.8 m (the wing on 10th Street).

## Estimates

- **Floor module (estimated):** 3.9 m.
- **Window rows:** one per floor, broken by the corner slots, plus the central bay for the top seven floors on the broad faces.
- **Corner slots:** 3.2 m wide, 4.5 m in from each corner.
- **Setback ledge:** 27 m above grade.
- **Crown:** merlons of about 3.2 m.
- **Lunette:** a 4.2 m half-arch over the entrance bay.
- **Penthouse:** 18 × 12 m.

## Colour

Everything is vertex colour, so the building batches.

| | Base | Base S / V | Rendered S / V |
|---|---|---|---|
| Green slot glass | `#7a9a92` | 20 / 60 | 25 / 56 (sunlit) |
| Window rows | `#606c70` | 14 / 44 | |
| Granite | `#ad8a7e` | — | 48 / 70 (sunlit, warm under the grade, as in the photographs) |
| Generic glass tower in frame | | | 6 / 71 |

The rendered values come from the close frame.

## Lighting

As an office, it is mostly dark at 23:30. About 6% of the 3 m window bays are lit, using skin-kit `litHash`. This lighting is illustrative. I found no night photograph.

## Captures

Use `/?view=city&cam=<camera>&t=2026-11-20T<time>-05:00`. In `cam`, the bearing is the view heading, so bearing 0 looks north at the south face.

| View | Camera | 11:30 AM | 11:30 PM |
|---|---|---|---|
| From the south-south-west: the Peachtree Place (south) face, the west face and the crown | `411,-3010,20,40,480` | [Day](day.jpg) | [Night](night.jpg) |
| Spec starting camera | `416,-3017,32,60,288` | [Day](start-day.jpg) | [Night](start-night.jpg) |
| Close: the Peachtree Place entrance and lunette (`&dev`, then `__setView(0,40,420,411,-2996,2.2)`) | | [Close](close.jpg) | |
| Four sides at 420 m (view headings 180, 270, 0 and 90, tilt 40) | `411,-3010,<bearing>,40,420` | [Sheet](four-sides.jpg) | |
