# JW Marriott Atlanta Downtown

Overture `30de017f-b8eb-4692-9674-b9db13a90288`, 45 Ivan Allen Jr Boulevard. Code: `web/src/city/jw-marriott-downtown.ts`, mounted in `city.ts` and in the downtown batch `listed` array.

The footprint was unnamed in the data. A reverse lookup at its centre lands on the JW Marriott Atlanta Downtown. The building opened in 2009 as the W Atlanta – Downtown and was reflagged in 2026. It is a 25-storey tower, with the hotel below and condominiums above ([Urbanize, Feb 2026](https://atlanta.urbanize.city/post/jw-marriott-downtown-hotel-overhaul-finish-fifa-world-cup-2026)). The renovation was interior; no exterior change is reported. Operator signs are left out.

## Sources

| What | Source |
|---|---|
| Street level, Mar 2025: glass slab, east balcony stacks with glass rails, floor bands | [Street View from Ivan Allen Jr Blvd](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.76460,-84.38990&heading=45&pitch=35&fov=100) (viewed in an Orca tab, not copied) |
| Height and use (25 storeys, 237 rooms, condos above, rooftop pool) | [Urbanize, May 2026](https://atlanta.urbanize.city/post/jw-marriott-downtown-hotel-images-tower-fifa-world-cup-overhaul) |
| Heights | April 2019 3DEP lidar, 2.5 m raster |

**Gap:** no labelled day aerial and no night photograph turned up. Night is drawn from the building type: hotel and condo rooms are noticeably lit.

## Heights

Measured above the 301.5 m NAVD88 ground ring:

| Element | Lidar | Model |
|---|---|---|
| Slab parapet | 102 | 102 (glass parapet ring) |
| Roof deck inside it | 97–99 | 98 |
| South block (Overture part `e2fff5c3`, mapped 109.7) | 106 | 106 |
| East balcony stacks (four, 1.7 m deep) | to 89 | 22 → 89 |
| Podium east of the drive (`071358c8`, `1047d8c4`, mapped 18.3) | 21–22 | 22 |
| Podium west wing (`58b20517`, mapped 14.6) | 18 | 18 |

## Estimates

- **Floors:** 3.3 m, from the 22 m podium roof up to the 98 m roof deck. The glass above the deck is parapet, so no rooms are lit there. Below that, a 6 m dark lobby and storefront band, then bands up to the podium.
- **Balconies:** each floor is drawn as its slab edge and glass rail on the stack's face, plus one side wall per stack. Individual balcony depth is not modelled.
- **Podium:** pale panels with a storefront band and one ribbon window per upper floor, set from the grade under each wall, since the site falls about 5 m to the south-west. Its parking levels are not distinguished.
- **Glass:** `#a0b1b6` (base S 0.12, V 0.71), with flat vertex colours because of the shader program budget. The long east and west faces stay in shade most of the day, so the base is low in saturation and high in value to keep them from going navy.

### Rendered-pixel check

Taken at 11:30, high tier. Medians of HSV:

| Patch | Camera | S | V |
|---|---|---|---|
| Sunlit south face | `220,-1270,10,72,280` (`&dev&mindist=20`) | 9 | 67 |
| Shaded long faces | `222,-1255,150,72,320` | 38 | 35 |
| Generic glass tower in the same frame, sun / shade | both frames | 20 / 37 | 55 / 44 |

## Lighting

About 30% of rooms are lit at 23:30, chosen with the shared `litHash`. There is no crown or façade lighting, because no evidence was found. Everything is `illustrative` ambient scenery.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| North-east three-quarter, day / night / low tier (money shot) | `220,-1242,220,64,480` | 11:30 / 23:30 / 11:30 `&q=low` |
| South face (close) | `220,-1270,10,72,280` with `&dev&mindist=20` | 11:30 |
| South-east corner and podium (close) | `225,-1265,130,66,260` / `190,-1235,0,72,120` with `&dev&mindist=20` | 11:30 |
| East face and balcony stacks (close) | `232,-1245,250,70,170` with `&dev&mindist=20` | 11:30 / 23:30 |
