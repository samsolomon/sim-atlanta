# Rhodes Hall

## Plan (2026-11-23)

Replace only `osm:way:269637579` in the terrain landmark dispatch, using the existing
local landmark shell and procedural granite/slate materials. Preserve the mapped
footprint, sample the entrance grade, and retain generic geometry when ground is missing.
Model the square tower, steep main roof, rounded front bay, gable, and open three-arch
porch. Use merged geometry and no texture allocations. Check matched day/full-night
views at both tiers, ground contact, full tests and performance before review and PR.

Architect review (2026-11-23): registration belongs in `terrain/model.ts`, not City’s
older flat-board landmark chain. The archived Brookwood South footprint supplies the
stable ID; no pipeline change is needed. Ground-contact stairs must use shared carving.

Product design review (2026-11-23): the open porch and asymmetric silhouette matter more
than window counts. Keep most glazing dark at night; do not add ambient truth-tier labels.

## Evidence

Viewed in a fresh Orca research tab on 2026-11-23:
- [Georgia Trust daytime tower angle](https://www.georgiatrust.org/wp-content/uploads/Rhodes_20-1.jpg),
  from [the official site](https://www.georgiatrust.org/our-historic-sites/rhodes-hall/): rough
  grey granite, square tower, corbelled top, rounded bay and reddish steep roofing.
- [Jessica Manning, front approach](https://travelbygrain.com/wp-content/uploads/2023/01/visiting-rhodes-hall-1.jpg)
  and [full-night oblique exterior](https://travelbygrain.com/wp-content/uploads/2023/01/visiting-rhodes-hall-17.jpg),
  published with [Travel by Grain, March 16, 2023](https://travelbygrain.com/rhodes-hall-in-atlanta/).
  The night view shows warm porch arches, pale floodlighting on the tower and rounded
  side, and predominantly dark windows/roof. Fixture positions and intensities are estimates;
  this is a historical lighting reference, not a claim about present operation.

The OSM archive `pipeline/prototypes/square-board/brookwood-south/context.json` places
way 269637579 within x 284.65–317.60, z −4688.05–−4661.96, entirely inside the assigned
rectangle. Its overall 33 × 26 m footprint includes projections. Tower and roof heights,
window dimensions, stone course scale and ornament are photo estimates, not surveys.

## Validation

Model and validation notes follow.

Implemented dimensions (estimated): tower 8.4 × 9.5 m, parapet top 22.65 m above
entrance datum; main eave 9.6 m and ridge 16 m; rounded bay radius 3.5 m; porch
three 3.8 m clear arches and 3.5 m entrance stair. The roof, porch projection and
all vertical dimensions are illustrative photo fits. The shared stair primitive returns
its ground yield for terrain carving. No new textures or point lights.

Camera: `301,-4675,340,60,160`, November 20 at 14:00 and 21:00 Eastern,
`q=high|low`. Captures: [day high](log/ui/rhodes-hall/high-day.png),
[night high](log/ui/rhodes-hall/high-night.png), [day low](log/ui/rhodes-hall/low-day.png),
[night low](log/ui/rhodes-hall/low-night.png).

Rust, web and worker tests passed (Python pipeline checks skipped: no `.venv`) after `pnpm data:midtown` refreshed stale local tree rollout data.
Performance: low 2,382,148 triangles, 543 calls, 83 programs, 114 MB textures,
170.9 MB geometry, 432 MB post-GC heap; high 13,783,395 triangles, 1,175 calls,
147 programs, 813.2 MB textures, 276.6 MB geometry, 545 MB post-GC heap. All ceilings
pass. Ground audit ran at both tiers; it reports existing board-wide ground overlaps,
so it is not a clean-board certificate. The entrance is also checked visually.
Deployment needs a web rebuild; no new pipeline data is required for this landmark.

Review (Claude, two rounds): fixed the loading-screen capture and extended the lighting
regression check to require a tower wash while leaving the rear roof unlit. Round two
noticed the temporary generic-building capture switch; the final dispatch uses
`rhodesHallId`. The remaining close-porch visual check is recorded with the review images.

The reviewer’s close camera `308,-4655,180,60,30` was checked at low-tier full night:
[porch openings](log/ui/rhodes-hall/porch-low-night.png). The three arches remain open,
the stair meets the centre opening, and the roof/window surfaces stay dark; the visual
finding is dismissed. Stone roughness remains stylized rather than individually modeled.

## Tower lighting adjustment — 2026-11-23

Sam asked for the tower lights to be slightly dimmer after viewing the night comparison.
The tower-only wash multiplier is reduced to 0.75 (25% less). The porch wash, emissive
window/bulb intensity, materials and daytime appearance are unchanged. This calibrates
an estimated lighting intensity against Sam's visual judgement, not a new factual claim.
Matched camera `301,-4675,340,60,160`, November 20 at 21:00 Eastern start time, both tiers.
[High comparison](log/ui/rhodes-tower-dim/compare-high-night.jpg) ·
[Low comparison](log/ui/rhodes-tower-dim/compare-low-night.jpg).

The original spatial tower mask overlaps the western porch beam. The reduction now
stops before porch geometry is emitted, preserving that edge's original wash too.
A regression pins both the reduced tower peak and the unchanged overlapping beam.
