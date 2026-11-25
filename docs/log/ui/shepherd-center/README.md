# Shepherd Center on the private North board

Model `d465d7c8` on `study/shepherd-center`. Before is `b357096c`, which includes Sam’s accepted Piedmont geometry `98cf2e1d`. Both use the same r16 map and bare-earth terrain. [Private comparison gallery](review.html)

## Footprints and heights

| Mass | Frozen map | Model |
| --- | --- | --- |
| Main Shepherd hospital | `osm:way:269196399`, centroid −223.2, −6252.3 m, about 7,246 m² | Exact 52-point base, dark window ribbons, pale floor edges and brick piers. Stepped roofs vary from the 26.8 m lower roof to a 32.5 m high point above the local entry. |
| Marcus Center for Advanced Rehabilitation | `osm:way:1423358852`, centroid −131.9, −6308.0 m, about 3,197 m² | Exact six-point tower perimeter. Peachtree’s pale two-floor grid turns onto the south face. The blue north return, recessed street base and rooftop services read separately. Main roof 43.5 m above entry and screened services reach 47.1 m. |
| West parking deck | `osm:way:269196183`, approximately 5,021 m², seven mapped levels | Reuses the generic open deck on its own mapped footprint, at an estimated 22.5 m above its foundation. Other mapped buildings stay generic. |
| Enclosed campus link | Across internal arrival drive | About 55 m in two spans, about 4 m wide, with underside 9.25 m above the Marcus entry datum. The glass enclosure and the turn are visible. The span centerline and elevation are photo-derived. |

The two custom shells each consume one frozen footprint. The sitework aerials show why the west deck remains independent of the narrower tower. The mapped hospital has eight floors. Choate reports 14 stories for Marcus, and design-era RJTR reports 13. The owner’s visitor directory numbers public levels through 11. Roof heights and subdivisions in City are inferred from the visible envelope, relative grade and repeating bays. [Choate](https://www.choateco.com/project/shepherd-center-marcus-center-for-advanced-rehabilitation/) · [RJTR](https://rjtrdesign.com/shepherd-cari/) · [Owner floor directory](https://shepherd.org/about/locations/mcar/)

## Exterior evidence

- **August 14, 2024, daylight, aerials facing south and west.** Ruby-Collins sitework construction photographs. The drone filenames carry the date. They show the street wall, service screen, separate rear deck, both legs of the covered bridge and the entry driveway. Construction materials and clearance informed the massing. [North aerial](https://ruby-collins.com/wp-content/uploads/2026/04/DJI_20240814152910_0003_V-750x600.jpg) · [East aerial](https://ruby-collins.com/wp-content/uploads/2026/04/DJI_20240814153135_0007_V-750x600.jpg)
- **Published summer 2025, daylight, internal court.** The owner’s magazine back cover shows the completed glass bridge, planted court and the older brick and cream wings. The magazine dates the publication. [Owner magazine PDF](https://shepherd.org/wp-content/uploads/shepherd-center-spinal-column-summer-2025.pdf)
- **Completed project, daylight, Peachtree/Valley junction and internal drive.** BDR’s finished photos support the slab’s grid, the columns and recess beneath it, the more transparent return, and the crossing. The center opened in April 2025. The photographs have no independently verified capture date. William Twitty’s credited project gallery has a February 2026 image publication path. [Peachtree exterior](https://bdrpartners.com/wp-content/uploads/2023/08/2060-peachtree-ext0413.jpg) · [Approach and bridge](https://bdrpartners.com/wp-content/uploads/2023/08/mcar-exterior-header-image-1.webp) · [Twitty gallery](https://healthcaresnapshots.com/projects/25654/shepherd-center-marcus-center-for-advanced-rehabilitation/)
- **Published 2018, evening, older courtyard.** The owner’s report back cover shows a purple sky, a few warm lit rooms and exterior lights at the base. Exact photo date is unverified. A second reliable night angle and a finished Marcus night exterior could not be established. The City render uses sparse illustrative lobby, bridge and older-wing occupancy, with an otherwise dark Marcus curtain wall. [Owner report back cover](https://shepherd.org/wp-content/uploads/community-health-needs-assessment-2018.pdf#page=40)

## Captures and controls

City was paused on November 25, 2026 in clear illustrative weather, with timetable data. Day is 13:30 EST and full night is 23:30 EST. The High and Low controls ran in fresh headless Chrome profiles with a fixed 1440 × 720 CSS viewport. The local Vite capture harness skipped the opening animation on both revisions. The product code retains the normal intro.

| View | Camera | Before | Candidate |
| --- | --- | --- | --- |
| Both campuses in daylight | `-245,-6160,-58,57,790` | [Before](before-joint-day.jpg) | [After](after-joint-day.jpg) |
| Both campuses at full night | `-245,-6160,-58,57,790` | [Before](before-joint-night.jpg) | [After](after-joint-night.jpg) |
| Peachtree approach | `-172,-6294,-62,60,340` | — | [Frontage](after-peachtree.jpg) |
| Peachtree Valley return | `-174,-6305,-133,59,335` | — | [Alternate](after-valley.jpg) |

The paired projection and world matrices match exactly at both tiers. Nine areas mounted in each render control, including r16. Peachtree’s curb lines and the surrounding roofs line up across the paired images. [Recorded matrices, counters and r16 audit rows](verification.json)

| Static control | Draw calls | Triangles | Programs |
| --- | ---: | ---: | ---: |
| High, daylight | 63 → 67 | 1,228,340 → 1,230,934 | 53 → 53 |
| High, full night | 76 → 80 | 1,228,353 → 1,230,947 | 61 → 61 |
| Low, daylight | 46 → 50 | 785,787 → 788,617 | 41 → 41 |

The 2 m full-board ground audit ran on High and Low. The r16 asphalt and sidewalk rows each recorded zero terrain penetrations at both tiers. Piedmont’s hospital, plaza and treads likewise recorded zero. The audit still reports terrain intersections across other board layers, including generic buildings and landscape. A separate sweep sampled the drawn terrain under the two legs of Shepherd’s bridge at 42 centerline stations on each tier. Clearance ranged from 5.16 to 10.87 m and the service drive remained open in the model. The mounted landmark groups report exactly one replacement apiece. Entry grades sampled at 276.56 m NAVD88 for Shepherd’s main building and 273.06 m for Marcus. These are render controls and modeled dimensions. [Audit excerpt and contact sweep](verification.json)

TypeScript and the repository’s committed-board footprint test passed. The frozen r16 geometry was checked in City because the repository footprint test reads committed prototype boards. Formal Grok review is pending because this host’s OpenCode has no Grok provider configured.
