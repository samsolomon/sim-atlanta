# Ansley terraced front yards

Use the existing residential yard frontage, nearest-street clearance and footprint-blocking logic. High-only, Ansley-only. Qualify when rendered ground rises over 0.8 m from the end of the front walk to the house-front sample; skip short walks, concave plans, apartments, missing terrain and shared frontages.

Add a narrow supported garden shelf behind a low fieldstone or pale limestone wall, split at the walk. A clipped hedge crowns both sections. Two to five open treads join the walk to the shelf; occasional newer masonry houses add piers. Target about 40–80 triangles per qualified house, with no low-tier changes. Keep dimensions bounded and skip sites whose local step height would require more than five risers.

Return shelf/stair GroundYield footprints from the yards layer. Build that layer before the rest of scenery, carve before its consumers sample ground, then attach/dispose it through the existing lifecycle. The lawn shelf is a filled retaining structure rather than a floating plane; its front/end walls reach below existing ground. The existing front walk stops at the upper stair landing to avoid a buried duplicate surface.

Architect review: reuse yard placement and obstruction checks; do not introduce another nearest-road lookup. Move yard preparation earlier to give carved geometry one coherent sampler. High-only keeps low far-ground and memory untouched.

Product design review: use existing stone/hedge colours, keep the entry gap legible, preserve tree placement and avoid labels for illustrative scenery. Do not imply parcel surveys. Matched day/night before/after, ground audit, full tests/build/perf, cross-review and coordinator merge notice are required.

## WIP status at the model handoff

The latest stair-landing fix qualifies 34 sites: eight on midtown-upper and 26 on brookwood-south. They add 2,008 terrace triangles before replacing existing street hedges; each site stays at 52–76 triangles. Low builds no terrace geometry or terrain cuts. The stair top now uses the ground at the entry plus the existing walk's 4 cm surface offset, rather than the highest shelf corner. A five-percent sideways-slope regression failed before this fix (23 cm gap) and passes after it. Flat, obstructed, short, shared-frontage, tree-occupied and board-seam sites are skipped. Shapes, stone colours and planting follow Sam's Ansley photo observations; dimensions are illustrative, not surveyed parcels.

Claude cross-review ran twice. Round one confirmed that an old flower bed could overlap a shelf; terraced yards now suppress that bed. Round two identified a possible lateral-slope landing gap, reproduced by the regression above and fixed. A plausible remaining risk is a tree crown added later by the Ansley facing-pair rollout or a named species site: terrace exclusion checks supplied tree locations, while rollout occurs later. No affected lot was identified. Do not run a third review round; finish validation and report this plausible risk in the PR.

The evidence in [the comparison README](log/ui/ansley-terraces/README.md) predates the landing fix and must be refreshed before the PR. The previous 30-site version passed ground-contact's independent 34,850-point exposed-surface audit at 0.25 m and visual checks of stairs/piers; the new 34-site version needs that check repeated. The prior full-board audit ran directly in Orca with all 12 areas because the command-line harness stalled on its readiness gate. Existing board-wide intersections are not a clean-scene claim.

Before the final landing fix, the integrated-main full suite passed (20 Rust, pipeline checks, 982 web plus one skip, five worker), build passed and both performance ceilings passed. Low: 2,356,960 triangles / 543 calls / 114 MB textures / 168.6 MB geometry / 430 MB post-GC heap. High: 13,730,361 / 1,177 / 813.2 / 274.1 / 562. Concurrent timings exceeded non-blocking targets; these are budget checks, not phone FPS claims. Final-fix validation status is in the handoff. No new texture, paid service or data rebuild is needed; normal web rebuild/deploy remains coordinator-owned.
