# Park Central Condominiums

Park Central (1101 Juniper Street, built 1998 as apartments and converted to condominiums) replaces the generic block on `osm:way:234933267`. It is an 18-storey buff stucco slab on 12th Street with a leg down Juniper and a lower south wing. It has paired white-framed sash windows, recessed balcony stacks, a red-brick base with a cream band and an arched entry, and grey hipped roofs over a parking deck.

**Height basis:** the 22 April 2019 lidar per mapped part, above the median grade (290.5 m NAVD88). The mapped heights (71.4 m and 59.4 m) were floor-count guesses.

| Part | Lidar p50 / p95 | Model |
|---|---:|---|
| Slab and Juniper leg `osm:way:886021357` | 49.6 / 54.6 | eave 49.6 m, hip ridge 54.6 m |
| South wing `osm:way:886021358` | 36.9 / 39.9 | eave 36.9 m, ridge 39.9 m |
| Parking deck `osm:way:234933263` | 18.5 | 18.5 m |
| Stair core `osm:way:1442258946` | 54.6 | under the roof |

## Evidence

- **Day, two angles:** the [Apartments.com building listing](https://www.apartments.com/building/park-central-atlanta-ga/j9vq9r4/) has two elevated photographs, from the south-west along Juniper and from the south. Both show the buff stucco, the paired white-framed windows, the recessed balcony columns and the grey hipped roof.
- **Entrance:** [Midtown Alliance listing](https://www.midtownatl.com/view/park-central). It shows the two-storey red-brick base, the cream band and the arched driveway entry.
- **Gap:** I found no night photograph. Residential windows are lit at about 30% at 23:30 by `litHash`, and no roof lighting is modelled.
- **Estimates:** the window module (3.4 m bays, 2.95 m storeys), the base height (7.2 m), the positions of the balcony stacks and the hip roof geometry.

## Model

Everything is vertex colours on `landmarkShell` (batchable). The skin splits by tier:
- **High (4,484 triangles):** punched windows, with white frames on the lowest three storeys.
- **Low (1,724 triangles, under the 2,400 cap):** each window column is one glass strip crossed by one stucco band per floor. Lit windows still get individual quads.

**Glass:** base `#6f7b85` (HSV S 17%, V 52%). On the 12th Street face at 11:30, sunlit panes measure S 18–20%, V 43–44%. On the shaded park-side faces, panes read S 51%, V 28%, while a generic glass tower in the same frame reads S 5%, V 80% (it has no shading on that face).

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Park side | `934,-3430,300,52,520` | 11:30 (before and after), 23:30, plus low tier | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| 12th Street | `950,-3405,10,70,90` with `&dev&mindist=20` | 11:30 | [Close](close.jpg) |
| Start (pulled back) | `936,-3423,32,60,450` | 11:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`; add `&q=low` for the phone tier.
