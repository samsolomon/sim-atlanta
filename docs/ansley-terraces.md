# Ansley terraced front yards

Use the existing residential yard frontage, nearest-street clearance and footprint-blocking logic. High-only, Ansley-only. Qualify when rendered ground rises over 0.8 m from the end of the front walk to the house-front sample; skip short walks, concave plans, apartments, missing terrain and shared frontages.

Add a narrow supported garden shelf behind a low fieldstone or pale limestone wall, split at the walk. A clipped hedge crowns both sections. Two to five open treads join the walk to the shelf; occasional newer masonry houses add piers. Target about 40–80 triangles per qualified house, with no low-tier changes. Keep dimensions bounded and skip sites whose local step height would require more than five risers.

Return shelf/stair GroundYield footprints from the yards layer. Build that layer before the rest of scenery, carve before its consumers sample ground, then attach/dispose it through the existing lifecycle. The lawn shelf is a filled retaining structure rather than a floating plane; its front/end walls reach below existing ground. The existing front walk stops at the upper stair landing to avoid a buried duplicate surface.

Architect review: reuse yard placement and obstruction checks; do not introduce another nearest-road lookup. Move yard preparation earlier to give carved geometry one coherent sampler. High-only keeps low far-ground and memory untouched.

Product design review: use existing stone/hedge colours, keep the entry gap legible, preserve tree placement and avoid labels for illustrative scenery. Do not imply parcel surveys. Matched day/night before/after, ground audit, full tests/build/perf, cross-review and coordinator merge notice are required.

## Rendered sites and validation

Ground-contact audited the rendered geometry at `a0b531f0`. High has 33 terraces, eight in Midtown Upper and 25 in Brookwood South. All 66 walk corners coincide with the upper treads. A quarter-metre grid produced 39,670 shelf and cap samples with zero penetration or coplanar hits. Following each walk from the exact shared vertices produced 39,510 terrain probes, all valid, with at least 4.04 cm clearance. Low had all 12 boards loaded and zero terrace layers.

The first check covered 34 sites. At the shared frontage of `osm:way:269540532`, a neighbouring walk crossed the proposed upper tread near `1201.065,-4020.922`. Testing neighbouring walk rectangles removed exactly this site. An earlier candidate near `1109.666,-4386.753` had no drawable approach. Neither frontage receives a terrace. Original walks remain.

The top tread meets both edges of its walk at one height. A convex terrain cut under the approach uses one sloping plane fitted below every walk vertex. The terrace suppresses the original flower bed and street hedge at that frontage. A later tree rollout can add named or paired trees after the terrace checks supplied trunks. No overlapping lot was identified during review.

The appearance follows Sam’s Ansley photo observations. Dimensions and planting are illustrative. [Matched daylight and night renders](log/ui/ansley-terraces/README.md). Web rebuild and coordinator deployment are required.
