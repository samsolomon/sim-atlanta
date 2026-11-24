# Ansley terraced front yards

Use the existing residential yard frontage, nearest-street clearance and footprint-blocking logic. High-only, Ansley-only. Qualify when rendered ground rises over 0.8 m from the end of the front walk to the house-front sample; skip short walks, concave plans, apartments, missing terrain and shared frontages.

Add a narrow supported garden shelf behind a low fieldstone or pale limestone wall, split at the walk. A clipped hedge crowns both sections. Two to five open treads join the walk to the shelf; occasional newer masonry houses add piers. Target about 40–80 triangles per qualified house, with no low-tier changes. Keep dimensions bounded and skip sites whose local step height would require more than five risers.

Return shelf/stair GroundYield footprints from the yards layer. Build that layer before the rest of scenery, carve before its consumers sample ground, then attach/dispose it through the existing lifecycle. The lawn shelf is a filled retaining structure rather than a floating plane; its front/end walls reach below existing ground. The existing front walk stops at the upper stair landing to avoid a buried duplicate surface.

Architect review: reuse yard placement and obstruction checks; do not introduce another nearest-road lookup. Move yard preparation earlier to give carved geometry one coherent sampler. High-only keeps low far-ground and memory untouched.

Product design review: use existing stone/hedge colours, keep the entry gap legible, preserve tree placement and avoid labels for illustrative scenery. Do not imply parcel surveys. Matched day/night before/after, ground audit, full tests/build/perf, cross-review and coordinator merge notice are required.

## Result and checks

The staged 3DEP terrain qualifies 30 sites: three on midtown-upper and 27 on brookwood-south. Each adds 52–76 triangles, 1,744 terrace triangles total, before replacing any existing near-street hedge. Low builds no terrace geometry or terrain cuts. Flat, obstructed, short, shared-frontage, tree-occupied and board-seam sites are skipped. Shapes, stone colours and planting follow Sam's Ansley photo observations; dimensions are illustrative, not surveyed parcels.

Independent ground-contact audit of `ceae1970` sampled 34,850 points at 0.25 m across exposed shelves/stairs: zero penetrations and zero coplanar hits. Its 120 shelf triangles cover all 30 sites; low contains none of the new surface layers. Stairs and piers were also checked visually. The later flower-bed fix removes overlapping bed geometry without changing terrace surfaces or cuts.

Claude cross-review confirmed that an old flower bed could overlap a shelf; terraced yards now suppress that bed. A plausible remaining risk is a tree crown added later by the Ansley facing-pair rollout or a named species site: the terrace exclusion checks supplied tree locations, while rollout occurs later. No affected lot was identified. Close views of the stairs and piers show no trunk intersection. Existing walk/drive strips still use their established ground sampling; the terrace walk ends at the upper landing.

[Day/night evidence and cameras](log/ui/ansley-terraces/README.md).

After integrating main: `pnpm test` passes (20 Rust, pipeline checks, 982 web plus one skip, five worker); `pnpm build` passes. `pnpm test:perf` passes both ceilings: low 2,356,960 triangles / 543 calls / 114 MB textures / 168.6 MB geometry / 430 MB post-GC heap; high 13,730,361 / 1,177 / 813.2 / 274.1 / 562. Timing under concurrent verification was above the non-blocking targets, so these runs are budget checks rather than a phone FPS claim. No textures, servers or data rebuilds are added; normal web rebuild/deploy is required, owned by the coordinator.

`pnpm audit:ground` was invoked but its old UI-text readiness gate stalled. The same `window.__groundAudit` ran directly in the Orca browser with all 12 areas mounted, at 1 m for the full-board report. Its existing board-wide intersections are not a clean-scene claim; the finer independent terrace-only report above is the acceptance check for the new surfaces.
