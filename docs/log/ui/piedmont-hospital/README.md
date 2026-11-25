# Piedmont Atlanta Hospital

Private North City study based on `6f3e9021`. Marcus Tower stands on the northwest corner of Peachtree and Collier. The tower and podium follow the two parts in the private r16 context. At ground level the southern tip faces Collier, while the main entrance sits near the northern end of the concave Peachtree plaza.

## Exterior references and dimensions

- The southeast corner photograph shows a sharp glass prow, a terracotta return and a continuous warm horizontal break. The plaza photograph faces north along the glass wall and shows the shallow canopy at the main doors, the timber soffit and the double-height frontage. [HKS corner and plaza](https://www.hksinc.com/wp-content/uploads/2020/05/caseStudy-Piedmont2-b1.jpg) · [HKS plaza looking north](https://www.hksinc.com/wp-content/uploads/2020/05/caseStudy-Piedmont2-b4.jpg) · [HGOR streetscape](https://www.hgor.com/project/piedmont-atlanta-hospital/)
- The hospital site plan places the main entrance and valet on Peachtree near the north end of the plaza. It also separates the South Deck, the rear North Deck, employee parking and 275. The model reuses the surrounding core, office and garage masses, including the existing separate Shepherd Center and east-side Building 2001 context. [Piedmont campus map](https://www.piedmont.org/media/file/2022-08-PAH-Campus-Map.pdf) · [Accessible campus plan from Piedmont’s interactive map](https://interactive.medmaps.com/pdf/public_pdfs/25)
- The contractor's southeast dusk photograph shows a continuous warm light at the break in the glass skin, a bright lobby and irregular illuminated panes concentrated below the break. The model uses the same broad lighting pattern. Individual rooms, colour temperature and brightness are estimates. The photo shows dusk, so the full-night model is a continuation of the dusk treatment. [Brasfield & Gorrie dusk exterior](https://www.brasfieldgorrie.com/wp-content/uploads/external/d26a77a3e70ed10cb477193f9855080e.jpg)
- HKS, Piedmont and structural engineer Uzun+Case report 16 stories. The mapped Marcus Tower and podium cover approximately 4,159 m² and 5,796 m² respectively. The private context estimates their heights at 57.6 m and 14.4 m. The model uses these values above the entrance grade. The connected six-floor core, ten-floor Building 275 and eight-floor Shepherd Center use the board's source tags. No independent roof elevations were found. The 35.1 m spandrel break, 8.1 m glazed base and roughly 20 × 7 m canopy are visual estimates. [HKS project](https://www.hksinc.com/what-we-do/projects/piedmont-atlanta-hospital-marcus-tower/) · [Piedmont fact sheet](https://www.piedmont.org/media/file/2025-03-PAH-Fact-Sheet.pdf) · [Uzun+Case structural notes](https://uzuncase.com/projects/piedmont-atlanta-hospital-new-tower/)

## Reproducing the private City views

Run the local web app against the private board staged under `web/public/data`. The r16 context and ground files used for the study match the verified North board files byte for byte. Use `/?view=city&board=midtown&q=high&weather=clear&speed=0&dev&mindist=25` with the following values.

| View | `cam` | `t` |
| --- | --- | --- |
| Campus daylight | `-305,-6003,-61,56,475` | `2026-11-25T13:30:00-05:00` |
| Campus full night | `-305,-6003,-61,56,475` | `2026-11-25T23:30:00-05:00` |
| Main entrance | `-208,-6042,-58,66,46` | `2026-11-25T13:30:00-05:00` |
| Collier return | `-293,-5961,20,57,270` | `2026-11-25T13:30:00-05:00` |
| Wider campus | `-370,-6050,-72,54,710` | `2026-11-25T13:30:00-05:00` |

The entrance close-up showed the bare-earth slope hiding the lower doors. The 18 × 7.8 m landing uses the adjacent approach grade and gives the terrain a cut to follow beneath the paving. A 540-point sample on each tier of the verified r16 surface found 3.7 cm of penetration before the cut and at least 7.0 cm of clearance after it. This is a check of the drawn terrain and estimated landing geometry. The board’s forecourt planting and paving beyond the landing remain generalized.

The City mount replaced generic parent `osm:way:887724919`. Its existing tower part `osm:way:887724918` is rendered by the landmark, with a guard against a separate copy of that part. The browser's r16 terrain supplied 7.07 cm minimum clearance at the same 540 sample sites. The full-board `pnpm audit:ground` run at 2 m resolution also found zero penetrations and zero coplanar samples for the hospital, across 132 samples on each tier. The audit reported intersections on other board layers. The model uses the existing procedural material library.

[Campus daylight](campus-day.jpg) · [Matched full night](campus-night.jpg) · [Main entrance](entrance-day.jpg) · [Collier return](collier-day.jpg) · [Wider campus](campus-wide.jpg)
