# 1105 West Peachtree

`osm:way:1001565075`, rank 5 in [building skins](https://github.com/samsolomon/sim-atlanta/blob/samsolomon/studio-building-skins/docs/building-skins.md). Code: `web/src/city/1105-west-peachtree.ts`.

The block opened in 2022 and is developed by Selig. Its 31-storey office tower stands at West Peachtree and 12th, with Google as the main tenant. A steel exoskeleton wraps the tower's south and north elevations. A parking podium under a landscaped deck links it to the 16-storey Epicurean hotel on West Peachtree and the 20-storey condominium on 12th Street. Both "Google" signs are tenant logos, so the model leaves them out.

## Sources

Photos were checked in an Orca browser tab on 2026-11-23. They are linked here, not copied.

| What | Source | Angle |
|---|---|---|
| Day, south elevation: X-braced bays, belt trusses, frame above the roof | [Commons: A1105WPGoogleMT2510-0442.jpg](https://commons.wikimedia.org/wiki/File:A1105WPGoogleMT2510-0442.jpg) (aerial, Nov 2025) | From the south, elevated |
| Day, finished block: office, hotel, condo, lawn deck | [Selig rendering-photo via Urbanize](https://atlanta.urbanize.city/post/images-googles-new-midtown-atlanta-hq-aims-dazzle-light) | Elevated, second angle |
| **Night, ordinary weeknight**: exoskeleton and crown edge lit cobalt blue, offices partly lit | [SKYDB, "From the southwest at night, Thursday, August 20, 2026"](https://www.skydb.net/file/268758408/1105-west-peachtree-atlanta/) | From the southwest |
| Night, podium exoskeleton in multicolour test lighting (2021) | [Urbanize, Oct 2021](https://atlanta.urbanize.city/post/images-googles-new-midtown-atlanta-hq-aims-dazzle-light) | Street level |
| Construction, brace and outrigger geometry | [Commons: under construction 1](https://commons.wikimedia.org/wiki/File:1105_West_Peachtree_under_construction_1.jpg) | West Peachtree, looking east |
| Structure: "420-foot-tall, geometric steel exoskeleton … on the south elevation in addition to secondary exoskeletons on the office north elevation and podium", extending 39 ft above the roof around a 25 ft glazed screen wall | [Uzun+Case project story](https://uzuncase.com/stories/1105-west-peachtree-mixed-use-development/) | Text |
| Programme: 31-storey office, 16-storey 178-key hotel, 20-storey 63-unit condominium, eight-level podium | Uzun+Case; [Brasfield & Gorrie](https://www.brasfieldgorrie.com/projects/1105-west-peachtree/) | Text |

## Footprint and heights

The site postdates the April 2019 lidar (median roof return 0.2 m), so heights come from the published figures and the mapped parts.

| Part | Mapped | Model | Basis |
|---|---|---|---|
| `1427404721` office tower | 128.9 m (reported) | Roof 113.1 m, glazed screen to 120.7, frame to 125 | 410 ft frame, 39 ft above the roof, 25 ft screen (Uzun+Case). Urbanize also says 410 ft; Uzun+Case gives 420 ft once |
| `1427404722` hotel, north strip on West Peachtree | 49.5 m (inferred) | 49.5 m | 14 room floors at 3.1 m over a 5.6 m lobby (16 storeys counting the lobby levels). The Epicurean's address is on West Peachtree, north of the tower |
| `1427404726` condominium, east block on 12th | 52.8 m (inferred) | 66 m, **estimated** | 20 storeys at about 3.1 m over a 7.2 m lobby, from grade. Its address is 40 West 12th Street |
| `1464967900` podium and deck | 16.5 m (inferred) | 19.8 m | Matched to the adjoining 19.8 m parts. The eight podium levels include below-grade decks; **estimate** |
| Others (drop-off canopy and low strips) | 3.3 to 19.8 m | Mapped, capped at the deck | — |

## Exoskeleton geometry

The mapped south wall has a 2 m recess between x = 390.1 and 396.1. It lines up with the aerial's narrow middle bay. Frame columns therefore stand on x = 367.45, 390.1, 396.1 and 409.8, leaving X-braced bays of 22.5 m and 13.8 m on either side of an unbraced 6 m bay, which matches the aerial's proportions (1.9:1 measured, 1.6:1 mapped). The same frame repeats on the north elevation, where the mapped wall has the matching recess. There it starts on the podium roof (19.8 m) in six modules, because the deck fills the face's east half. Seven belt modules run from the 7.2 m lobby head to the roof, and one more runs to the frame top. Members stand 1.4 m off the glass (the outriggers). Columns are 1.3 m wide, belts 1 m and braces 0.8 m.

The podium's secondary exoskeleton is left out: its location along the podium is not established.

## Lighting

- **Exoskeleton:** the only ordinary-night evidence, the August 2026 SKYDB photo, shows the frame and the crown's top edge lit solid cobalt blue. The model makes that the night state, in its own lit material. The LEDs are programmable, and event colours (Pride, Fourth of July, Falcons) need separate evidence, so they are not modelled. The blue is a separate lit material (same program as the window lamps), set only in `setNight` at 0.45 intensity, which keeps it under clipping.
- **Offices:** about 7% of panes are lit at 23:30. The photo shows a scatter of lit floors.
- **Hotel and condominium:** about 30% of rooms are lit, the residential and hotel share.
- All of it is `illustrative` ambient scenery and is not labelled on screen.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| Start cam, day / night / low tier | `424,-3475,32,60,375` | 11:30 / 23:30 / 11:30 `&q=low` |
| South elevation, day / night | `395,-3450,350,68,650` | 11:30 / 23:30 |
| North elevation, day / night | `420,-3460,165,40,650` | 11:30 / 23:30 |
| Three-quarter with crown | `395,-3450,335,74,950` | 11:30 |
| Frame base at West Peachtree and 12th (close) | `380,-3425,20,62,130` with `&dev&mindist=20` | 11:30 |
