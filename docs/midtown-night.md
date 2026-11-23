# Midtown at night

Downtown's streets have long had warm pools from lamps every 28 m, alternating sides, baked into a light map over the ground. The five Midtown rows went dark at their edge: their generic towers already had window glow at the same level as downtown's, but the streets, campus and park read as ground colour. The rows now use the same `World.buildLights` path with three restrictions.

* **Arterials only.** Street lamps follow Peachtree Street and Road, West Peachtree, Spring, Juniper, Piedmont Avenue, 10th, 14th and 17th Streets and North Avenue. Residential and campus streets stay dark, which keeps the grid legible without lighting every block. Decks and covered ways get no surface lamps; the 17th Street Bridge keeps its own lighting.
* **Mapped paths.** The archived OSM row extracts tag 404 ground-level footways, paths, cycleways and steps `lit=yes` (19.4 km, mostly the Tech campus and Midtown plazas). Each gets 4 m pedestrian lamps every 24 m with smaller 9 m pools, on whichever side of the path keeps them off a carriageway. The 24 `highway=street_lamp` nodes get 6 m lamps. Piedmont Park's paths are not tagged lit in the extracts, so the park stays dark and its paths read faintly. [Extraction](../pipeline/prototypes/midtown-night/lit.py) · [Fixture](../web/src/city/fixtures/midtown-night.json)
* **Placement.** No lamp stands in a building, including landmark sites, or in a Connector lane. A procedural arterial lamp gives way to a mapped lamp node within 6 m. Each row bakes only its own light map, so lamps stay one pool radius back from the row seams; at worst one lamp is missing at each seam rather than a pool stopping in a straight line.
* **Budget.** The rows hold 1,712 lamps: 437, 613, 388, 240 and 34 from south to north. Lamps are two instanced meshes per row, so 8 more draw calls at the wide camera, and the pools are baked into a texture rather than real lights. Baking takes 4–6 ms per row. The low tier uses a 1024-texel light map and four-sided posts, adding about 47k triangles (3.8%) at the wide camera.

Lamp positions, spacing, heights and colour are illustrative; only the lit tag and lamp nodes are mapped facts.

| Camera | Low day / night | High day / night |
| --- | --- | --- |
| Peachtree at 10th, 350,−3050,0,55,300 | [Day](log/ui/midtown-night/peach-low-day.jpg) · [Night](log/ui/midtown-night/peach-low-night.jpg) | [Day](log/ui/midtown-night/peach-high-day.jpg) · [Night](log/ui/midtown-night/peach-high-night.jpg) |
| Midtown wide, 300,−3300,0,55,900 | [Day](log/ui/midtown-night/wide-low-day.jpg) · [Night](log/ui/midtown-night/wide-low-night.jpg) | [Day](log/ui/midtown-night/wide-high-day.jpg) · [Night](log/ui/midtown-night/wide-high-night.jpg) |

[Wide view before](log/ui/midtown-night/wide-before-high-night.jpg) · [Tech campus paths](log/ui/midtown-night/tech-high-night.jpg) · [Piedmont Park](log/ui/midtown-night/park-high-night.jpg)
