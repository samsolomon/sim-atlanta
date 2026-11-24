# Ansley house forms

This pass adds American Foursquares among eligible Colonial forms, and limestone or white-painted brick finishes with dark roofs and black window frames among Ansley Tudors. Painted grey-blue and green shingle stays within Ansley. The house mix and colours follow Sam's November 23 neighbourhood observations recorded in the handoff; these are illustrative types, not copies of individual addresses.

Foursquares retain mapped footprints and reported roof/storey information. Otherwise their two storeys, 3 m floor spacing, 2.4 m porch depth, approximately 0.9 m balustrade and roof rise of 2.2–3.6 m are estimated design dimensions. High adds balusters and a centre dormer where the roof rise is at least 2.7 m; low keeps the rails. The newer finishes reuse procedural siding style 12 and existing brick. No textures or server work are added.

Night windows use the existing illustrative occupancy pattern. No house-specific night lighting has been verified. The existing porch/yard and far-house systems remain in use; this pass does not add surveyed parcels or lighting claims.

## Reproduce the comparisons

All pairs use the same branch, staged data, camera, tier and pinned clock, changing only `residential.ts` between the pre-houses version at `a7d93028` and this PR. Day is `2026-11-20T14:00:00-05:00`; night is `2026-11-20T23:00:00-05:00`. Add `?view=city&dev&mindist=20&q=high` (or `low`), `&t=<time>` and `&cam=<camera>`.

| View | Camera |
| --- | --- |
| Sam | `1280,-3950,40,58,160` |
| Close | `1280,-3950,40,64,70` |
| Peachtree Circle | `835,-4050,40,58,160` |

## Review

House detail (including lit glass), measured by running both renderers against the same nine source boards:

| Tier | Before triangles | After triangles | Change |
| --- | ---: | ---: | ---: |
| High | 907,290 | 914,870 | +7,580 |
| Low | 552,657 | 553,694 | +1,037 |

These are generated house-detail counts, not whole-scene draw counts. The full-board performance run passed both tiers' ceilings: low 2,299,719 triangles / 167.7 MB geometry; high 13,211,335 triangles / 268.9 MB geometry. This is a desktop budget check, not an A16 frame-rate measurement.

Round one confirmed that shallow Foursquare dormers could cross the roof ridge. The fix retains the existing 2.7 m minimum rise and has a geometry regression test, verified to fail with the guard removed. The additional painted shingle palette is limited to Ansley so other neighbourhoods retain their colours.

The reviewer also identified a plausible attached-house porch overlap. Neither the midtown-upper nor brookwood-south source context contains a terrace or semi-detached footprint within the Ansley house box. No rule change was made for that unobserved case; it remains a limitation if those classes arrive in future data.

Publishing requires rebuilding `web/dist` and a coordinator deployment; no data rebuild is needed.

## Comparison gallery

- [sam, high, day](sam-high-day-compare.jpg)
- [sam, high, night](sam-high-night-compare.jpg)
- [sam, low, day](sam-low-day-compare.jpg)
- [sam, low, night](sam-low-night-compare.jpg)
- [close, high, day](close-high-day-compare.jpg)
- [close, high, night](close-high-night-compare.jpg)
- [close, low, day](close-low-day-compare.jpg)
- [close, low, night](close-low-night-compare.jpg)
- [pc, high, day](pc-high-day-compare.jpg)
- [pc, high, night](pc-high-night-compare.jpg)
- [pc, low, day](pc-low-day-compare.jpg)
- [pc, low, night](pc-low-night-compare.jpg)
