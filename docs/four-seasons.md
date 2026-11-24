# Four Seasons Hotel Atlanta

`osm:way:269843469`, 75 14th Street NE. It opened in 1992 as the GLG Grand, designed by Rabun Hogan Ota Rasche Architects; sources also credit "Rabun Architects" or Rabun Rasche Rector & Reece. It has 53 floors and reaches 186 m (609 ft). The hotel occupies floors 1 to 19, offices sit in the middle of the stack, and 96 residences fill the upper floors, with a 50th-floor ballroom. City code: `web/src/city/midtown-skyline-fourseasons.ts`, registered in the Midtown skyline registry.

## Sources

- [GLG Grand, Wikipedia](https://en.wikipedia.org/wiki/GLG_Grand): height, floor count, year and builder, plus "Art Deco-inspired, pyramid-capped". [Hotel fact sheet](https://press.fourseasons.com/atlanta/hotel-facts): the floor stack and the architect.
- Daytime, full height from the south-west, late 2006: [7 GLG Grand](https://commons.wikimedia.org/wiki/File:7_GLG_Grand.jpg) and [3 GLG Grand](https://commons.wikimedia.org/wiki/File:3_GLG_Grand.jpg). Promenade Tower stands behind on the right, which fixes the bearing.
- Crown close-up from a neighbouring tower, 2008-03-03: [GLG Grand](https://commons.wikimedia.org/wiki/File:GLG_Grand.jpg).
- The 14th Street entrance from street level, 2020-10-05: [GLG Grand 4](https://commons.wikimedia.org/wiki/File:GLG_Grand_4.jpg) and [GLG Grand 2](https://commons.wikimedia.org/wiki/File:GLG_Grand_2.jpg).
- Full night, 2023-06-17 at 22:25, from the Woodruff Arts Center side looking at the north face: [Atlanta at night](https://commons.wikimedia.org/wiki/File:Atlanta_at_night.jpg). I identified the tower by its arched atrium bay and stepped Deco shaft.

## What City draws

The frame runs u east and v south, with the origin at the shaft centre (City 577.4, −3601.9). Heights are measured above the 14th Street grade.

| Part | Plan, m | Height, m | Basis |
|---|---|---|---|
| South podium (ballroom and service) | mapped part `osm:way:885988325` | 16.8 | mapped |
| Hotel base, floors 1–19 | 46 × 32, corners notched 2 m | 0–68 | mapped plan; the setback height is estimated from the photo floor count (3.5 m floors) |
| Office shaft | 42 × 28.4 | 68–118 | inset estimated from photos |
| Residential shaft | 38 × 25 | 118–150 | inset estimated |
| Crown tiers with notched pier tops | 34 × 22, then 30 × 19 | 150–168 | estimated |
| Attic with gold lattice | 25 × 16 | 168–176 | the 25 × 16 m plan matches the mapped 186 m core part |
| Standing-seam pyramid | 26.2 × 17.2 eave | 176–190 | The mapped 186 m and the lidar 95th percentile mark the main roofline; the lidar maximum is 193 m. The first draft used a 10 m pyramid to 186 m, which the coordinator couldn't pick out at the review camera, so the apex rises to 190 m, still under the lidar maximum. The colour is the light verdigris (`#8fbcab`) seen in the 2006 photographs. |

- **Walls.** Rose granite, `#cfbcb0`, with rustication joints up to 17 m. Paired punched windows sit at a 3.3 m bay, one quad per bay per floor. City estimates the bay; the photos show a pair of panes per bay.
- **14th Street (north) face.** A recessed granite arch frames a glazed bay from 18 to 62 m, about 12 m wide, under a round head. Below it are the arched hotel entrance and a navy porte-cochère canopy.
- **Ornament.** Gold starburst rosettes run along the first setback. Round balconies stack down the centre of the east and west faces, between about 70 and 148 m. That fits the 2006 photographs, whose left face is the narrow west face. The broad faces carry an arched top window.
- **Crown.** The attic's dark windows sit behind small gold X-lattice panels. The verdigris pyramid has a row of dark dormers along each face's foot.

## Night

The 2023 photograph shows warm floodlight grazing the corner piers and the attic band, while the pyramid stays dark. City lights the attic lattice and band and the notched pier faces of the crown tiers, and leaves the pyramid unlit. I found no source describing the lighting scheme, so its colour and extent are estimated from that one photograph.

Window occupancy follows the building's uses: hotel rooms 40%, offices 12% and residences 30%. Crown floors (above 150 m) keep their windows but never light, so the crown does not speckle. The atrium arch glazing is half lit, as in the night photograph.

## Captures

The captures are listed in [log/ui/four-seasons/README.md](log/ui/four-seasons/README.md).
