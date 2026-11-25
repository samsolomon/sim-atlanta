# Shepherd Center after hours

**Sam approved Shepherd Center in daylight and at night for 5250 on November 25, 2026.** Approval covers model revision `198e71e6`, matched capture evidence `70e6d96c`, and the verified combined North board `7d57f34c`. The combined captures show Shepherd alongside approved Piedmont on High and Low. [Private comparison gallery](review.html)

The Marcus Center’s large curtain-wall panels now have small warm rectangles for sparse room occupancy. The recessed lobby and the old hospital’s entrance fascia light up, and the enclosed bridge has a more continuous warm interior. A few rooms glow in the older wings. Shepherd’s peak emissive intensity is 0.49, compared with 0.54 for Piedmont. City sets the same illustrative 23:30 clock on both grades. The 2018 owner publication gives an evening precedent for the older campus. Completed Marcus Center lighting and the occupancy of individual rooms are illustrative. [Exterior evidence and mapped dimensions](../README.md)

| Matched pose | City camera | Clock |
| --- | --- | --- |
| Joint campus, High and Low | `-245,-6160,-58,57,790` | 23:30 EST |
| Peachtree frontage, High and Low | `-172,-6294,-62,60,340` | 23:30 EST |
| Peachtree daylight control, High | `-172,-6294,-62,60,340` | 13:30 EST |

Both sides use clear illustrative weather and a fixed 1440 × 720 viewport on November 25, 2026. The local capture harness skips City’s opening animation at serve time on both paths.

The five pairs have exactly matching recorded world and projection matrices. The daylight control retains the approved silhouette and pale two-floor glazing grid. The wide night view shows a handful of warm rooms in Marcus Center while the bridge and lobby read in both tier details.

| Control | Draws before → after | Triangles before → after | Programs before → after |
| --- | ---: | ---: | ---: |
| High joint at night | 80 → 80 | 1,230,947 → 1,231,259 | 63 → 63 |
| High Peachtree at night | 65 → 65 | 781,740 → 782,052 | 63 → 63 |
| Low joint at night | 50 → 50 | 788,617 → 788,929 | 46 → 46 |
| Low Peachtree at night | 38 → 38 | 523,682 → 523,994 | 46 → 46 |
| High Peachtree in daylight | 52 → 52 | 781,727 → 782,039 | 63 → 63 |

These are static render counters from the two matched camera distances. TypeScript and eight landmark-batch tests passed. [Recorded controls](verification.json)

## Studio checkpoint

Paused on `study/shepherd-center`. Product source is `198e71e6`, matched evidence is `70e6d96c`, and Sam’s approval is recorded in `6bcbe742`. Phone owns the integrated copy. If work resumes, use accepted combined witness `7d57f34c` and coordinate any future capture with Phone. The private gallery and raw captures remain in `dist/shepherd-night/`.
