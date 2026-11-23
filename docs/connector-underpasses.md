# Driving under the Connector bridges

At Baker and Piedmont the upper street was continuous, but both lower carriageways and two ramps disappeared. Their OSM ways carry a tunnel tag. The City renderer consequently omitted the pavement and hid the vehicles. Separately, the terrain rose into the northbound lanes. At City (926.39, −930.49) the old model left 3.24 m between the road and upper tread. The nearby northbound traffic query at (918.99, −913.12) returned no surface. Four short intervals now carry pavement and traffic beneath the mapped slab. The separately covered Capitol Gateway mainline keeps its existing treatment. [Northbound mainline](https://www.openstreetmap.org/way/1051688675) · [Southbound mainline](https://www.openstreetmap.org/way/1051688674) · [Northbound ramp](https://www.openstreetmap.org/way/963910432) · [Southbound ramp](https://www.openstreetmap.org/way/1051688672)

The elevation survey uses **25,166 accepted class-2 pavement samples across 24 transects**, taken outside the upper footprints from the 2019 USGS Georgia cloud. Each transect fits the longitudinal grade and crossfall between its two exposed ends. Adjacent fits blend across the roadway and back into the staged ground at the banks and board boundaries. The model changes 3,128 downtown grid nodes, 528 on the north band and 282 on the south band. Both terrain detail levels interpolate the same corrected nodes. The lower grade under cover is inferred. The upper grades remain based on the separately measured class-17 returns. [USGS point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Floor generator and transect coordinates](../pipeline/prototypes/connector-footprint/underpass-floors.py) · [Upper deck surveys](connector-junctions.md)

An 18 m long, 2.55 m wide, 4.1 m tall illustrative vehicle exposed two additional faults. At Decatur the terrain met the vehicle on the two outside ramps. At Courtland and Baker the staged sidewalk combined an upper-deck way and a landward way, creating a second ribbon across the lower lanes. The renderer now splits those walks at the mapped outline, leaves the inside portion on the shared sidewalk, and follows the bank outside. The regression pitches the body between its axle samples and intersects its volume with terrain triangles, approach walls, road structures, slab bottoms and light fixtures at 3 m intervals in each lane. It checks 1,779 poses per detail level. The smallest sampled centre-line floor-to-soffit distance is 6.37 m in the model. These figures describe simulation geometry. Actual bridge clearances were not surveyed. [Swept-volume checks](../web/src/terrain/underpass-clearance.test.ts)

## Grades on the upper streets

The approach begins on the surveyed deck tangent and ends on the local street tangent. Nearby terrain ridges are spread across successive cross-sections to smooth the lane, curb and walkway profiles. Tests probe 17 in-board abutments and both ramp and through-road support at Capitol. The table gives the largest absolute one-metre centre-line grade from 1 to 40 m inland. The elevations are at 16 m. Sampling exactly on the original float32 seam could fall through to freeway ground, so that boundary is checked separately.

| Approach | Elevation before → after, m NAVD88 | Peak grade before → after |
| --- | ---: | ---: |
| Piedmont, north of Baker | 298.52 → 298.99 | 21.7% → 1.9% |
| Piedmont, south of Baker | 300.27 → 300.76 | 28.7% → 1.1% |
| Baker, west of Piedmont | 300.27 → 301.60 | 29.8% → 6.3% |
| Peachtree, north bank | 308.03 → 308.07 | 2.3% → 2.2% |
| Courtland, north bank | 306.90 → 307.77 | 8.5% → 11.0% |
| Capitol, north bank | 312.39 → 312.27 | 13.3% → 5.3% |

Courtland’s north approach descends to a lower land tie-in. Its steeper middle grade accommodates a shallower departure from the deck. At the exact north Peachtree seam the old centre query returned 304.05 m. It now meets the deck at 308.39 m. [Aligned elevation profiles](log/ui/underpasses/profiles.png) · [Approach regression](../web/src/terrain/bridge-approaches.test.ts)

## Night lighting and matched City views

The October 2026 GA-403 panorama shows rows of underside fixtures extending into the covered passage. The model places low-profile lenses beneath the soffit, along the lower carriageway. The 16 m spacing, colour temperature, spill distance and brightness are illustrative. One batch draws the lenses and another draws local illumination on the actual pavement triangles with the same lane-marking texture. Both detail levels use the same fixtures. [GA-403 panorama](https://www.google.com/maps/@?api=1&map_action=pano&pano=DdrnEh1Ut1kqI9dzQOYq0Q&heading=320&pitch=0&fov=85) · [Opposite Peachtree approach](https://www.google.com/maps/@?api=1&map_action=pano&pano=Fuj7on_9Zv7AuoSKU7Q3RA&heading=325&pitch=0&fov=85)

Each gallery pairs the same two driver-height cameras at 23:12 Eastern and the same side view of the upper street at 14:12. At Capitol the two in-board crossings are northbound ramp branches. The farther crossing lies beyond the board.

| Gallery | City camera key |
| --- | --- |
| [Baker / Piedmont](log/ui/underpasses/baker.jpg) | `baker` |
| [Courtland / Ralph McGill](log/ui/underpasses/courtland.jpg) | `courtland` |
| [Peachtree Street](log/ui/underpasses/peachtree.jpg) | `peachtree` |
| [Ted Turner Drive](log/ui/underpasses/turner.jpg) | `turner` |
| [Decatur Street](log/ui/underpasses/decatur.jpg) | `decatur` |
| [Martin Luther King Jr. Drive](log/ui/underpasses/mlk.jpg) | `mlk` |
| [Capitol Avenue](log/ui/underpasses/capitol.jpg) | `capitol` |

Open `/?view=city&board=square&q=low&underpass=baker&dir=nb&offset=-9&t=2026-11-20T23:12:49-05:00&speed=0&tilt=0`. Change the key to switch crossing, use `dir=sb` for the opposite carriageway, or `dir=outer` for the second Capitol ramp. Add `drive=1` to ride through the passage. The camera sits 1.55 m over the carrying road. For the upper street use `/?view=city&board=square&q=high&bridgeProfile=baker&t=2026-11-20T14:12:49-05:00&speed=0&tilt=0`.

For release, rebuild the web bundle. The floor profiles and corrected classifications are tracked. Existing public scene data can be reused. To reproduce the floor bake with the survey environment, run `python pipeline/prototypes/connector-footprint/underpass-floors.py` from the repository root.

Claude’s review requested a moving low-detail daylight check of distant lane paint. In the northbound Baker pass the lane markings soften in the distance but remain attached to the pavement through the far portal. [Daylight ride through Baker](log/ui/underpasses/baker-day-drive.jpg)
