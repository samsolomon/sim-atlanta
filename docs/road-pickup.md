# Road pickup: full-size crew cab (F-150 SuperCrew-like)

`web/src/vignette/road-pickup.ts` models a full-size crew-cab pickup in the proportions of a current (2021+) Ford F-150 SuperCrew with the 5.5 ft box. It has no Ford badge, oval, script or lettering. The Model Lab entry is `/models.html?v=f150`:
- **Paint:** seven generic look-alikes of the current range.
- **Trim:** chrome (XLT-like, with chrome bumpers and grille bars and alloy wheels) or work (XL-like, with dark bumpers and grille and painted steel wheels).
- **Detail:** High shows the close form; Low shows the traffic form.

A midsize sedan follows 3 m behind for scale. City High traffic draws the traffic form in place of the generic pickup (2026-11-26; see [City traffic](#city-traffic)).

## Dimensions

| Item | Value | Source |
|---|---|---|
| Wheelbase | 145.4 in (3.693 m) | Ford 2026 F-150 technical specifications |
| Overall length | 232.0 in (5.893 m) | same |
| Width without mirrors | 79.9 in (2.029 m); standard mirrors 95.7 in | same |
| Height | 1.94 m (4x2 1.915, 4x4 1.958) | same |
| Track | 67.9 / 68.3 in (1.725 m used) | same |
| Front / rear overhang | 37.4 / 49.2 in (0.95 / 1.25 m) | same |
| Front bumper to back of cab | 155.6 in (3.952 m) | same |
| Box floor length, load floor | 67.1 in (1.704 m); 0.866 m (4x4) | same |
| Tyres | 275/65R18 (XLT 4x4), radius 0.408 m | same |
| Hood about 1.44 m at the cowl, belt 1.24 m (the glass is the top third of the side), glass to 1.92 m, windshield base at z 1.40, box rail 1.30 m, rocker 0.58 m, arch radius 0.47 m plus an 8 cm flare lip (black on the work trim), door cuts (front door to the B-pillar, long rear door) | **estimated** from the Commons photos below | — |

## Detail and cost

| Form | Triangles | Vertices | Use |
|---|---:|---:|---|
| Close | 3,110 | — | Model Lab only |
| Traffic | 1,178 | — | City High traffic |
| Generic `pickup` (vehicles.ts) | 432 | 1,296 | East Portal vignette |

It uses the shared `vehicleMaterial` kinds: 0 paint, 1 headlamps and C-clamp running lamps, 2 tail lamps, 3 glass, 4 trim, and 5 amber markers. It adds no program. Faces come from the shared `face-kit.ts` (the semi's kit, now shared), and a test raycasts both forms and both trims for back faces.

## City traffic

City High traffic draws the traffic form for every pickup slot. That's 13% of passenger cars, the same band as the generic pickup it replaces. About 1 in 4 is the XL-like work trim (`work`), and the rest are XLT-like (`pickup`). Each trim is its own instanced mesh on the shared vehicle material: +1 draw, 0 programs. The trim and the paint both come from the slot's existing passenger draw, so no other slot's phase, threshold or paint moves.

- **Paint.** XLT-like trucks spread evenly over `PICKUP_PAINTS`. Work trucks are fleet white three times in five, otherwise silver or grey.
- **Length.** The footprint is 5.893 m (it was 5.6 m), which also sets traffic spacing and the headlight pool's start.
- **Not changed:** Low (sedan, SUV and box truck only), and the East Portal vignette, which keeps the generic `pickup` from `vehicles.ts`.

## Lighting

The night photo shows white C-clamp running lamps along the top and outboard edges of each headlamp, with amber inboard and LED fog bars in the bumper. The model lights the headlamp, the C bars and the fog bars (kind 1), the amber markers (kind 5), and the vertical box-corner tail lamps (kind 2). The reference has no matching rear night photo; the tail lamps follow the daytime rear view.

## References

Links only; the photographs are not committed.

- [Ford 2026 F-150 technical specifications](https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2026/specs/2026_Ford_F150_Specs.pdf) · [2024 specifications](https://fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2024/specs/2024-Ford-F-150-Technical-Specs.pdf)
- Day: [2021 SuperCrew XL, front](https://commons.wikimedia.org/wiki/File:2021_Ford_F-150_SuperCrew,_front_4.28.21.jpg) · [rear](https://commons.wikimedia.org/wiki/File:2021_Ford_F-150_SuperCrew,_rear_4.28.21.jpg) · [white SuperCrew side](https://commons.wikimedia.org/wiki/File:Ford_F-150_2021-2023_Crew_Cab_ACI.JPG) · [Lariat](https://commons.wikimedia.org/wiki/File:2021_Ford_F-150_Lariat.jpg)
- Night: [2021 F-150 Platinum front lighting (Ford Authority)](https://fordauthority.com/wp-content/uploads/2022/06/2021-Ford-F-150-Platinum-PowerBoost-FA-Garage-Night-Exterior-001-front-headlights-DRLs-1200x900.jpg) · [2023 F-150 XLT at night (video)](https://www.youtube.com/watch?v=knsYdxcm71c)

## Stills

[Cab side and night lamps, close](log/road-pickup/f150-closeups.jpg) · [Close form, day and night](log/road-pickup/f150-lab-day-night.jpg) · [Trim, scale and traffic form](log/road-pickup/f150-lab-trim-traffic.jpg) · [In City traffic, before and after](log/road-pickup/f150-city-traffic.jpg)
