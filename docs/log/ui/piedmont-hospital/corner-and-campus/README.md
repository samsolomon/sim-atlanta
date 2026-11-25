# Piedmont's corner and campus

Private North r16 comparison against the accepted `f8222b9a` model, using the same board context and terrain in both views.

**Accepted by Sam on November 25, 2026.** Approval covers private revision `98cf2e1d` and the matched corner and campus views below.

## What changed

- **Peachtree and Collier.** The lower walk now follows the grade around a curved planting bed and joins the inside edge of the mapped sidewalk. The low curb follows the bed perimeter. The pavement stops short of the crossing spur, and the bed stays roughly 9.5 m inside the sidewalk centerline at its closest point. The bed outline and curb reveal are photo-derived estimates. The planting abstracts the low grasses and shrubs visible in Sam’s October 2025 Street View and the architect’s corner photograph. [HKS corner photograph](https://www.hksinc.com/wp-content/uploads/2020/05/caseStudy-Piedmont2-b1.jpg) · [HGOR landscape plan and photographs](https://www.hgor.com/project/piedmont-atlanta-hospital/)
- **North Parking.** The parking contractor’s photos identify the open concrete bands, the roof deck, and the enclosed pedestrian link beside the uphill entrance. The deck now uses the existing open parking geometry on its mapped outline. Seven levels including the roof, 22.1 m above the low foundation, and the link floor 5.8 m above the drive are modeling estimates. The 10.6 m link axis follows the mapped bridge between the North Deck and the hospital core. The glazing is modeled from the daylight photo. Full-night lighting on the link is unverified. [Parking contractor photos, pp. 2–4](https://static1.squarespace.com/static/627ff551173a307442a0426d/t/666b53433d1c817564cf1fc1/1718309705513/Piedmont%2BHospital%2B-%2BAtlanta%2C%2BGA%2B-%2B2000.docx.pdf) · [Piedmont campus map](https://interactive.medmaps.com/pdf/public_pdfs/25)
- **Older wings.** Building 105 was an 8 m fallback despite the five-level silhouette and 5xxx suites. It now uses five nominal floors, 18 m above its drawn foundation, with the existing generic façade. The main older complex remains the six-level mapped mass. Building 275 and Shepherd remain distinct on the board. The South Deck has a mapped mass. Piedmont’s floor plan shows a South Deck bridge, but the available exterior views and mapped linework do not pin its span or elevation well enough for an exterior model. [Piedmont clinic directory](https://services.piedmont.org/georgia/east-point) · [Hospital floor map](https://piedmontcareers.org/wp-content/uploads/2026/06/2022-10-PAH-Department-Map.pdf)

## Matched views

Private board, high graphics, clear, paused at `2026-11-25T13:30:00-05:00`.

| View | `cam` | Accepted | Revised |
| --- | --- | --- | --- |
| Corner | `-234,-5920,-47,59,168` | [Before](before-corner.jpg) | [After](after-corner.jpg) |
| Campus | `-305,-6003,-61,56,475` | [Before](before-campus.jpg) | [After](after-campus.jpg) |
| Wide campus from the west | `-365,-6082,43,48,790` | [Before](before-wide.jpg) | [After](after-wide.jpg) |
| Main entrance | `-208,-6042,-58,66,46` | — | [Entry](entry.jpg) |

The revised screenshot harness skipped City’s opening white-model animation at serve time. The regular app ran the ground audit. The saved 999 × 496 viewport, 22° vertical FOV, and 20–36,000 m depth range matched across the pairs. Projection matrices match exactly. The largest difference between a baseline reconstructed world matrix and its recorded candidate matrix is below `3 × 10⁻¹⁴`. The Collier road edge, opposite roofs, and the surrounding blocks line up at each saved pose. [Reconstructed baseline and recorded candidate matrices](camera-matrices.json)

The revised entrance photo shows an open landing under the canopy. The full-board audit at 2 m resolution found zero penetrations and zero coplanar samples for the hospital, plaza, and plaza treads on both tiers. It checked 132 hospital and 456 tread samples per tier, plus 31,023 plaza samples on High and 29,076 on Low.

## Studio checkpoint

Paused on `study/piedmont-atlanta-hospital`. Accepted geometry is `98cf2e1d` and the original handoff is `b357096c`. Phone owns the integrated copy. Combined campus captures for `7d57f34c` are in this worktree at `dist/combined-7d57f34c/`. If work resumes, start from the approved model and coordinate verification with Phone. Promotion closed before the queued `74e0f9f0` capture started.
