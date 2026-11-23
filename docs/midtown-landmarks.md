# Midtown landmark inventory

The first North Avenue tile covers City x −1000…1800 and z −2500…−1700. Coordinates below use the Five Points origin, with x east and z south in metres. © OpenStreetMap contributors supplied the footprints and streets. Areas are calculated from projected exterior rings. Only the first two entries have custom models.

| Building | OSM building way | Footprint area | City z range | Decision |
|---|---|---:|---:|---|
| Bank of America Plaza | [39449840](https://www.openstreetmap.org/way/39449840) | 1,961 m² | −1912…−1860 | First tile. Preserve the four stepped wings and the diagonal orientation south of North Avenue. |
| Fox Theatre | [208355446](https://www.openstreetmap.org/way/208355446) | 6,104 m² | −2114…−2050 | First tile. Distinguish the narrow Peachtree marquee on the east from the Ponce dome on the south. |
| Georgian Terrace | [886041064](https://www.openstreetmap.org/way/886041064) | 3,883 m² | −2121…−2052 | First tile, across Peachtree from the Fox. Separate the historic hotel mass from the taller addition before replacing its generic extrusion. |
| Tower Square | [26800371](https://www.openstreetmap.org/way/26800371) | 3,368 m² | −2131…−2061 | First tile, west of the theatre. The 206 m tower has its own footprint, distinct from the Exchange and station. |
| One Atlantic Center | [39450314](https://www.openstreetmap.org/way/39450314) | 2,483 m² | −3715…−3663 | Prioritize on the upper Midtown row. At 14th and West Peachtree, the 250 m granite tower ends in a pinnacled copper roof. [Building owner's photographs](https://www.1ac.com/thebuilding.php) |
| 1180 Peachtree | [885660351](https://www.openstreetmap.org/way/885660351) | 3,920 m² | −3690…−3655 | Same row, east of One Atlantic. Resolve the tower over its 126 m-wide mapped base before sizing the two sweeping crown fins. The architect describes a 120 ft steel-and-glass veil. [Architect's gallery](https://www.pickardchilton.com/work/1180-peachtree) |
| Promenade Tower | [269637575](https://www.openstreetmap.org/way/269637575) | 2,528 m² | −3813…−3742 | Secondary skyline candidate, north of 14th. Keep the 211 m tower separate from Promenade Central and the parking deck. |

All three upper Midtown way IDs match single-ring buildings in the baked −4100…−3300 row. Sampling the 5 m bare-earth grid bilinearly at intervals of at most 2.5 m around each perimeter gave 281.6–283.1 m NAVD88 at One Atlantic Center (92 samples), 292.9–297.4 m at 1180 Peachtree (147), and 293.8–298.5 m at Promenade Tower (104). All samples had elevation data. The 4.5 m grade change around 1180 makes its entrance elevation worth checking against street photographs before placing the podium. Street-facing podiums, finished floor elevations and night lighting remain open for modeling. [Baked upper Midtown footprints and terrain](https://github.com/samsolomon/sim-atlanta/tree/68629e6/pipeline/prototypes/square-board/midtown-upper)

Peachtree Summit and 250 Williams remain with their respective owners.

## Bank of America Plaza

The 20-vertex footprint places the tower between Peachtree and West Peachtree. The mapped 311.8 m tip and the owner's 55-story count constrain its proportions. The daytime long view shows copper-colored piers and recessed vertical window strips at three shoulders. The architect's close view resolves horizontal steel ties inside the broad lower lattice. The owner's dusk view shows the cage lit gold against a darker shaft with scattered office lights. [Daylight skyline photograph](https://commons.wikimedia.org/wiki/File:BOA_Plaza_ATL_GA.jpg) · [Architect's detail photographs](https://www.architectmagazine.com/project-gallery/bank-of-america-plaza/) · [Owner's dusk cover](https://www.bankofamericaplaza.com/wp-content/uploads/2023/12/CPGroup-BankofAmericaPlaza-Atlanta-Brochure.pdf)

The office setbacks at 153 and 216 m, the steel cage from 240 to 286 m, mast taper, bay spacing and lit-window pattern are illustrative estimates. The footprint belongs to the tower itself. The surrounding plaza and neighboring buildings use the tile's own geometry.

## Fox Theatre

The 29-vertex ring extends about 115 m westward from Peachtree. The east facade has a projecting readerboard, two capped minarets and a tall red, double-sided vertical sign. On Ponce a much larger onion dome sits between two smaller domes, above a pointed portal and alternating bands of buff brick. The elevated photograph shows the low retail wing and roof equipment between the two entrances. The Fox's night photograph shows the illuminated letters, canopy border and light spilling at the arcade. [Peachtree facade, Library of Congress](https://www.loc.gov/pictures/resource/highsm.47135/) · [Elevated Ponce side](https://commons.wikimedia.org/wiki/File:Side_and_elevated_view_of_Fabulous_Fox_Threater.JPG) · [Fox Theatre night photograph, page 3](https://www.foxtheatre.org/assets/doc/FTI-and-Southface-Grants-d688d1c2e5.pdf) · [City preservation description](https://www.atlantaga.gov/government/departments/city-planning/historic-preservation/property-district-information/fox-theatre)

The footprint's one mapped level gives little guidance for the auditorium or fly tower. Their 21 and 27 m roof elevations, the 9 m retail roof, 13.4 m dome diameter, 7.8 × 11.8 m marquee, lettering, roof equipment and minaret profiles are estimates from the photographs. Night colors and brightness are illustrative. The model represents the red marquee and bulb outlines in a fixed state.

## Terrain and verification

Both replacements require the exact OSM way ID, one exterior ring, and interior probes in the mapped wings or entrance. The foundation uses the same rendered terrain triangles and 2.5 m perimeter sampling as the surrounding buildings. The Bank shaft rises from the ground at its centre and the Fox from the Peachtree entrance grade. Each shell extends down to the lowest sampled edge. A clipped ring missing a probe or a missing elevation leaves the footprint in the generic scenery. The verified first tile and loader are in [coverage PR 144](https://github.com/samsolomon/sim-atlanta/pull/144).

On a populated checkout with coverage integrated, stage the tile with `pnpm data:midtown`, run `pnpm dev`, and open `/?view=city&board=midtown&q=high&weather=clear&speed=0&t=2026-11-20T11:30:00-05:00`. For full night use 23:30 on the same date. In the development console use `__city.lookAt(x,z,{bearing,tilt,metresPerPixel})` with the settings below. Each pair uses the same 1440 × 900 viewport and camera. City controls were hidden for capture.

| View | Target x, z | Bearing | Tilt | m/px | City renders |
|---|---|---:|---:|---:|---|
| Bank of America Plaza | 565, −2050 | 20° | 50° | 0.53 | [Day](log/ui/midtown-landmarks/plaza-day.jpg) · [Night](log/ui/midtown-landmarks/plaza-night.jpg) |
| Fox Theatre from Ponce | 542, −2085 | 24° | 37° | 0.14 | [Day](log/ui/midtown-landmarks/theatre-day.jpg) · [Night](log/ui/midtown-landmarks/theatre-night.jpg) |
| Peachtree marquee | 606, −2092 | −18° | 57° | 0.076 | [Day](log/ui/midtown-landmarks/marquee-day.jpg) · [Night](log/ui/midtown-landmarks/marquee-night.jpg) |

Shipping the models requires a web rebuild and staged Midtown coverage. The geometry uses the existing static tile and City's local night factor.
