# Hampton Inn & Suites Atlanta Midtown

This is the hotel at 1231 West Peachtree Street, on the corner of West Peachtree and 15th. It opened in February 2020 and has 186 rooms. It replaces the outline `osm:way:885304559`.

## Height

The hotel was built after the 2019 lidar. The 22 April 2019 survey caught it under construction: a 51.5 m top and an 80 m spike, which is most likely the tower crane. The height here is therefore the reported 20 storeys with a 20th-floor rooftop lounge, about 66 m, labelled post-2019.

The model is:
- a 6 m base;
- 18 room floors at 3.05 m up to 61 m;
- a glazed lounge box with its parapet at 66 m.

## Identifying features (confirmed with the lead)

All four come from the [Hilton rendering via Hospitality Net](https://www.hospitalitynet.org/announcement/41004561/hampton-inn-suites-by-hilton-atlanta-midtown.html) and the [Street View at 15th Street, September 2024](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.78870,-84.38690&heading=225&pitch=30&fov=90). The Street View was viewed, not copied.

1. **Two-tone slab.** Pale grey precast `#d9dad6` with a tan/buff centre field `#c2b29c` on the long north and south faces. Both colours come from the rendering, where the tan field reads clearly against the grey.
2. **Dark-bronze frame** `#76604a`, a slim 0.55 m member. It climbs the glazed NW chamfer at West Peachtree and 15th and arches over the roof terrace. Two posts and a five-step lintel, about 1 m above the lounge parapet, are built as touching prisms, so the frame reads as one member and passes the detachment check.
3. **Glazed rooftop lounge** on the 20th floor, set back from the terrace.
4. **Red-trimmed base** on West Peachtree.

The "Hampton Inn & Suites" wordmarks are left off.

Note that 15th Street is on the north side, because +z runs south in City.

## Glass and colour

The window glass is `#8a9499` (S10 V60). At 11:30, high tier, from camera `383,-3829,330,50,450`:

| Surface | H | S | V |
|---|---|---|---|
| Grey wall, sunlit | 44 | 14 | 60 |
| Panes in the grey | 200 | 13 | 35 |
| Tan field, sunlit | 36 | 36 | 80 |
| Tan field, shaded | 31 | 26 | 33 |
| Generic tower, sunlit | 147 | 5 | 67 |

## Lighting

There's no full-night photo. As a hotel it is noticeably lit: about 30% of rooms, from skin-kit `litFacade`. The base storefront is lit. The lounge glazing is not lit, and that is an estimate.

## Checks

The footprint and detachment checks are clean.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| NW corner and frame, looking south-southeast | `383,-3829,150,50,450` | 11:30 AM EST | [Day](day.jpg) |
| Same | `383,-3829,150,50,450` | 11:30 PM EST | [Night](night.jpg) |
| South face, looking north-northwest | `383,-3829,330,50,450` | 11:30 AM EST | [South](south.jpg) |
| Frame and lounge (close) | `383,-3829,150,40,160` | 11:30 AM EST | [Close](close.jpg) |
| Four faces, ~420 m | see sheet | 11:30 AM EST | [Four sides](four-side.jpg) |

The bearing is the view heading. The close view adds `&dev&mindist=20`.
