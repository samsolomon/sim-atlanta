# Midtown Union office tower

The 26-storey office tower at 1331 Spring Street (Cooper Carry for Granite Properties, finished July 2022) replaces the generic box on `osm:way:1297223465`. The mapped parts decide the massing: the Spring Street prow and the Arts Center Way wing at 97.2 m, the middle mass at 93.6 m and the thin Spring sliver at 90 m. The garage at 17th and West Peachtree (`osm:way:1433501525`) stops at 28.8 m under a planted deck.

**Height basis:** the mapped OSM part heights, which are post-2019, with no lidar. The April 2019 lidar predates the tower. The parts are 27, 26 and 25 floors at 3.6 m, which fits the reported 26 storeys. Skyscraper Center's 114 m is an unverified alternative, estimated from the floor count alone. The 2.4 m glass roof screen set 2.5 m in on the prow is an estimate.

## Evidence

- **Day, every side.** [Urbanize office tour, October 2022](https://atlanta.urbanize.city/post/midtown-union-photos-largest-new-office-building-tour), frames 30–38. The frames show reflective blue glass to grade on the prow and on the plaza side, a double-height lobby under a timber soffit, raking V-shaped concrete columns about 1 m thick, and the garage skin. That skin is white, pale grey and charcoal panels set in shifted, slanted rows, with gold slots.
- **Second angle.** [Urbanize before/after from Spring & 17th](https://atlanta.urbanize.city/post/photos-wandering-new-midtown-union-development-project-night) (the Google Street View pair). This angle puts the prow at the Spring and 17th corner, with the patterned garage running east along 17th behind it. Mira's mural recedes south down Spring.
- **Blue hour, not full night.** [Urbanize night walk, August 2022](https://atlanta.urbanize.city/post/photos-wandering-new-midtown-union-development-project-night), frames 1 and 21. The lobby glows warm behind the raking columns. The gold slots read as paint, not lamps. Scattered office floors are lit at dusk.
- **Gap:** I found no verified full-night (23:30) exterior. At night, City shows the lobby and storefront glazing lit and five office floor strips, three of them on the faces in view. The rest of the shaft stays dark, as offices usually are at that hour. No crown lighting appears in any photo, so none is modelled.
- **Architect.** [Cooper Carry project page](https://www.coopercarry.com/projects/offices-at-midtown-union/) gives 26 storeys, 600,000 sq ft, and the "optical-inspired art" garage façade. No logos are drawn.

## Model

All of it is vertex colours on `landmarkShell`'s StaticLandmarkMaterial body plus its lamp mesh, with no library surfaces and no new shader program. The glass shades from the street-level tone up to the sky reflection near the top. A broad joint every 3.6 m is the same glass, darker, so the curtain wall keeps its floor rhythm at the 450 m orbit without per-pane speckle. The garage's storefront band follows each face's own sampled grade, because the street falls toward West Peachtree. The tower adds 1,296 body triangles and 64 lamp triangles.

| View | Camera | Local time, 20 November 2026 | Capture |
|---|---|---|---|
| Survey start | `285,-4163,32,60,257` | 11:30 and 23:30 | [Day and night](daynight.jpg) |
| Spring & 17th oblique | `280,-4165,140,64,430` | 11:30 (before and after), 23:30 | [Before/after](compare.jpg), [day and night](daynight.jpg) |
| Garage close | `300,-4170,200,66,230` | 11:30 | [Close](close.jpg) |
| Storefronts at night | `325,-4180,200,70,90` with `&dev&mindist=20` | 23:30 | [Close](close.jpg) |

Use `/?view=city&cam=<camera>&t=<ISO timestamp>`.
