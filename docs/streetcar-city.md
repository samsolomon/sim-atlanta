# Atlanta Streetcar in City

## Track and overhead wire

The track comes from the MARTA GTFS streetcar shapes (route `marta:route:STREETCAR`, three paths, 708 scheduled trips and 12 stops). That is the same geometry the vehicles run on. The longest path (2,616 m) is the base loop, and stretches of the other paths more than 2.5 m from track already laid are added as separate segments. The OSM tram runs in the downtown vignette sit a median 2.5 m from these shapes (11 m at worst). They stopped at the downtown board edge, so Edgewood Avenue east of the Connector showed no track at all. In terrain mode those runs are now marked `replaced`: they stay in the data, but the generic strips no longer draw them. [GTFS shapes](../web/public/data/ga/routes.json) · [Module](../web/src/city/streetcar.ts)

Street View on Edgewood Avenue and Auburn Avenue shows single, one-way track embedded in a travel lane; Auburn has a lighter concrete strip. Slim grey steel poles stand at the curb on the track side, about 30–35 m apart, with cantilever arms holding a single contact wire. There is no catenary messenger. City draws:
- two grooved rails on a 2.8 m concrete slab;
- a contact wire 5.8 m above the rail that follows the track, held by pull-offs on curves;
- a pole for every 32 m of track at the first clear curb within 12 m, 3.5–7.5 m from the track and at least 20 m from the next, each with an arm and dropper.

Poles never stand on a drawn road (its width plus 0.3 m), inside a building, or within 9 m of a junction. A test checks every downtown pole against the roads at their drawn widths and against the building footprints. The 5.8 m wire height, the pole size and the spacing are estimates.

Track height follows the surface street it runs on. Under the Downtown Connector viaduct (x ≈ 1180–1235, on both Auburn and Edgewood) the track stays at street level, because motorways never set its height. The wire casts no shadow. No reliable night photograph of the track or wire was found, and Street View is daytime only, so nothing on the track is lit at night; the street's own lamps do that. [Street View, Edgewood Ave](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75470,-84.38160&heading=90&pitch=8&fov=90) · [Street View, Auburn Ave](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75560,-84.37640&heading=90&pitch=8&fov=90)

The track spans two boards: downtown, built at City start, and Sweet Auburn, built when that board mounts and disposed with it. Each track segment, wire span and pole belongs to the board that holds its midpoint, so the seam at x = 1000 is drawn exactly once. A test checks that the two halves add up to the whole. The slab and rails sit 0.15–0.17 m above the street surface, over the drawn asphalt and markings. Stops and vehicles follow in separate changes. Vehicles will use the Siemens S70 from the model lab (#260) and run on the published schedule.

Cameras: Edgewood near Hilliard at (1407, −57), bearing 250°, tilt 62°, distance 70 m. Auburn at Piedmont at (860, −185), bearing 250°, tilt 70°, distance 45 m. Woodruff Park at (320, −180), bearing 170°, tilt 55°, distance 80 m. Viaduct at (1205, −180), bearing 90°, tilt 72°, distance 70 m. [Edgewood, before and after](log/ui/streetcar/track-edgewood-before-after.jpg) · [Auburn, before and after](log/ui/streetcar/track-auburn-before-after.jpg) · [Woodruff Park, before and after](log/ui/streetcar/track-woodruff-before-after.jpg) · [Under the viaduct](log/ui/streetcar/track-viaduct.jpg) · [Night](log/ui/streetcar/track-edgewood-high-night.jpg) · [Low day](log/ui/streetcar/track-edgewood-low-day.jpg) · [Low night](log/ui/streetcar/track-edgewood-low-night.jpg)

## Vehicles

Each scheduled streetcar trip runs one Siemens S70 (cars 1001–1004), using the model from the lab (#260, `web/src/vignette/streetcar.ts`). It is placed on the same GTFS shape its track is built from, by the car's own kinematics:
- The centre section rides its own truck, between its axles at ±0.9 m.
- Each end section hangs from the centre section at its joint (±2.305 m) and rides its power truck (±8.2 m), aimed from joint to truck.
- Cab A leads.

On a 20 m-radius curve a test holds every joint closed to within a micron, and every truck and axle within 5 cm of the rail. Height follows the street surface the track is built on, on whichever board is mounted.

**Tiers.** Positions come from the MARTA timetable and are `scheduled`. The card says "Scheduled · not live", and Follow says "position Scheduled". The MARTA bus vehicle-positions feed, which the worker already caches, carried 185 vehicles on a weekday afternoon. None was within 15 m of the streetcar shapes, so there is no free live feed to use and no new upstream call. The car is an illustrative S70 in its real colours, without logos.

**Follow and picking.** Each section is a plain mesh with `trainId` and its own `lengthM`. Follow finds the cars through `locate()`, and picking sizes each section by its length.

**Traffic.** For road traffic, `streetcarLanes()` gives the shapes with per-segment headings, and the controller's `occupied(x, z, margin)` reports the drawn sections. The Connector agent wires these into RoadTraffic.

Cameras: Auburn Avenue at (1361, −178), bearing 20°, tilt 58°, distance 80 m, at 13:31. King Historic District at (1538, −178), bearing 250°, tilt 60°, distance 70 m, at 21:30. A Follow link: `/?view=city&follow=marta:route:STREETCAR`. [Auburn, before and after](log/ui/streetcar/cars-auburn-before-after.jpg) · [Night at King](log/ui/streetcar/cars-king-high-night.jpg) · [Low day](log/ui/streetcar/cars-auburn-low-day.jpg) · [Follow card](log/ui/streetcar/cars-follow-card.jpg)

## Stops

All 12 stops were surveyed in Street View between July 2024 and April 2026. Every stop uses the same prefab shelter:
- **Platform:** a raised curb platform about 22 × 3 m and 0.33 m high for level boarding, with a red tactile band about 0.6 m wide at the boarding edge, ramps at both ends and a galvanised pipe guardrail along the back.
- **Shelter:** a single-slope cantilevered glass canopy, about 5.5 × 1.7 m with 2.7 m clear underneath, on four bays of round silver posts. It has a glass back wall and one glass end panel.
- **Inside, left to right:** a backlit map panel, a silver and light-blue ticket machine and a perforated bench.
- **Name board:** a charcoal board hangs under the front edge.

City draws exactly that. Navy name pylons, about 3.5 m tall, are drawn only at Park Place and Sweet Auburn Market, where they were confirmed. Centennial Olympic Park is the one free-standing island platform, so it gets railings on both long sides. Dobbs Plaza stands under the Connector viaduct beside its large sepia mural (the mural is not drawn).

The side of the street comes from the survey for every stop. Inferring it from road centrelines put Sweet Auburn Market on the wrong side, because the OSM street centreline sits about a lane from the GTFS track there. Each platform centre stands 2.95 m from the track: a 1.45 m gap plus half its width.

At night only the map panels glow. No canopy light was visible by day, and no night imagery was found, so the shelters are otherwise unlit. All dimensions are estimates scaled from the ticket machine (about 0.75 × 1.85 m). The name boards carry no text. [Survey notes and panoramas](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.75504,-84.38821&heading=345&pitch=0&fov=90)

Tests check that all 12 stops are placed 2.95 m from the track, on their surveyed side and outside buildings, and that the x = 1000 seam splits them between the boards with none lost or doubled. [All 12 stops, day](log/ui/streetcar/stops-gallery-day.jpg) · [All 12 stops, night](log/ui/streetcar/stops-gallery-night.jpg)
