# MARTA Rapid lab variants — 2026-11-23

Build XE60 articulated electric and a purple Rapid livery on the existing XN40.
Lab only; no live fleet assignment, data regeneration or City motion change.
The official Phase One page specifies CNG; photographed 7108–7112 are XN40.
XE60 was bought for A-Line; return to revenue service is unverified.

- New `vignette/xe60.ts`: measured manufacturer envelope and axle spacing,
  separately exported front/rear/bellows geometry, low/high tiers, shared bus
  material convention. Front section origin is front axle at ground; rear origin
  is hitch at ground. Export all origins/anchors/footprints and estimated limits.
- Keep hitch coincident in explicit-angle lab poses. Bellows interpolate between
  the two body end rings, so turning cannot pull a hole in the joint. Motion
  solver and route assignment belong to connector. No fixed-distance centre sampling.
- Add Rapid paint option to XN40 without changing default geometry/paint; no logos.
- Lab entries adjacent to XN40; XE60 gets labelled angle slider/reset and existing
  Detail buttons. Controls appear only on relevant model. No automatic animation.
- Meaningful tests: anchors coincide at both turn limits, dimensions/axles agree,
  bellows endpoints follow bodies, low <=1500 triangles, no duplicate default bus
  geometry, existing model lab controls contract. Build/full tests/browser review.
- Day/night and bent/straight views, linked source photos with publication dates
  distinguished from unknown capture dates. Phone note reports triangles, shared
  geometry memory, 3 draw batches possible (front/rear/bellows), not claimed FPS.

## Architect review — 2026-11-23

Verified existing busGeometry(livery), busMaterial(aKind), lab cars disposal and
Detail buttons. Significant: rebuilding bellows independently per bus defeats
shared instancing. Use fixed shared bellows geometry plus articulation shader;
expose per-instance angle support for connector, and a uniform for lab. Dispose
shared material once with a dedicated preview owner rather than duplicate cars.
Rigid XN40 livery remains parameter-only, preserving current City/default bus.

## Product design review — 2026-11-23

Significant: calling XE60 the current A-Line vehicle would misstate service.
Use purchased-for-A-Line wording and explicitly unverified revenue return.
Reuse the Detail controls and model dropdown; angle slider has a label, numeric
output, keyboard support and Straight reset. Keep controls hidden on rigid buses.
No autoplay; avoid a route assignment control in this geometry study.
