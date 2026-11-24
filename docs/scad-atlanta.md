# SCAD Atlanta — 1600 Peachtree

## Plan and review — 2026-11-23

Replace OSM way 265351173 in terrain's landmark dispatch. Use its archived building-part
polygons and inferred heights for the stepped academic block and northern parking decks,
with library precast/concrete surfaces, projecting piers, recessed square windows and a
bright entrance. Merge geometry into the existing landmark shell; no new textures.

Architect review: preserve the mapped parts rather than inventing rectangular footprints.
Keep the generic building when parts or ground are absent. Geometry is in a rotated street
frame; terrain queries and any ground-contact assets must stay in world coordinates.
Product design review: use the newer charcoal exterior, not the old pale finish. The older
night photo is lighting evidence only. Avoid copying exhibition artwork into the scene.
Verify the approach and matched day/night City views at both tiers, full tests and perf.

## Sources and observations

Viewed in a fresh Orca tab on 2026-11-23:
- [Official facility page](https://www.scad.edu/life/buildings-and-facilities/scad-atlanta)
- [Fall 2020 exterior](https://www.scad.edu/sites/default/files/Facilities/Atlanta/SCAD%20Atlanta/SCAD-Atlanta-1600-Exterior-Fall-2020-JC_01.jpg):
  charcoal wall, deep regular vertical piers, square pale-framed windows, entrance canopy.
- [Fall 2015 front entrance](https://www.scad.edu/sites/default/files/Facilities/Atlanta/SCAD%20Atlanta/SCAD-Atlanta-1600-Peachtree-exterior-Fall-2015-RP_11_SN.jpg):
  second, frontal angle shows recessed windows, glazed lobby and illuminated display cases.
- [2013–14 housing guide, PDF page 3](https://www.scad.edu/sites/default/files/PDF/HousingGuideCurrent-broch_0.pdf#page=3):
  dusk/night entrance photograph shows warm canopy underside and lobby, lit windows and
  a blue-white sign. This predates the charcoal repaint; it is not evidence of current colour.
  No reliable full-dark photograph of the whole newer exterior was found in this pass.

Archive: `pipeline/prototypes/square-board/brookwood-south/context.json`, way 265351173.
Bounds x −33.41…137.19, z −4869.05…−4678.62 are inside the assigned rectangle.
The local frame is centred (52, −4774), axis approximately (0.792, 0.610).
Building-part heights 3.3–23.1 m are inferred, not surveyed. Bay spacing, pier projection,
window sizes, entrance location and night occupancy are photo estimates.

## Validation

Web rebuild required; no new data generation required. Captures use the documented `ui=classic` escape hatch to bypass the reveal animation.

The replacement uses all 17 archived parts, with a maximum height of 23.1 m above the
entrance datum. The academic piers project an estimated 0.55 m, spaced about 4.5 m;
parking bands repeat at the archive's 3.3 m inferred storey interval. The entrance canopy
is 26 m long. Exhibition cases carry abstract light colours rather than copied artwork.
The sign is a small blue-white light panel, without a new lettering texture.

Validation camera `52,-4774,300,65,360`, 14:00 and 21:00 Eastern, November 20, both tiers.
Full tests passed (Python pipeline checks skipped because no `.venv`). Both perf tiers
pass: low 546 calls, 433 MB post-GC heap, 171.3 MB geometry; high 1,181 calls,
544 MB post-GC heap, 276.7 MB geometry. No texture bytes added. Rendering exposed
clockwise archived part rings; these are normalized before outward facade placement.

Matched captures: [high day](log/ui/scad-atlanta/high-day.png) ·
[high night](log/ui/scad-atlanta/high-night.png) ·
[low day](log/ui/scad-atlanta/low-day.png) · [low night](log/ui/scad-atlanta/low-night.png).

The entrance now has a 5 m-wide shared stair run from the sampled approach to the
estimated threshold, with a world-coordinate ground yield. Its mesh is transformed back
into the landmark's rotated frame; the yield remains in board coordinates. Stair geometry
is illustrative, not a surveyed reconstruction of the campus's access arrangements.

Review follow-up: the actual low-tier terrain samples at every mapped part vertex put
all roofs above ground: minimum clearance 1.958 m (part 1456404443), with northern
parking roofs at least 5.19 m clear. `pnpm audit:ground` ran at both tiers and reports
existing board-wide overlaps. Reverse day views at `52,-4774,120,55,360` check the
parking end: [high](log/ui/scad-atlanta/reverse-high-day.png) ·
[low](log/ui/scad-atlanta/reverse-low-day.png). A regression assertion now checks pier
vertices outside the east academic facade; it catches inward-facing archived rings.

Final high-tier readiness was 4.93 s during concurrent capture/review, above the 3 s target
(which has no ceiling); low readiness was 2.08 s. All memory/draw/triangle ceilings pass.
