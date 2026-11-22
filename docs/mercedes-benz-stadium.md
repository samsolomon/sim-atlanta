# Mercedes-Benz Stadium across the Gulch

| City camera | Previous | With stadium |
| --- | --- | --- |
| Looking west across the Gulch | [Before](log/ui/stadium/gulch-before.jpg) | [After](log/ui/stadium/gulch-after.jpg) |
| Looking down on the roof | [Before](log/ui/stadium/roof-before.jpg) | [After](log/ui/stadium/roof-after.jpg) |

In the normal production interface, open the paused daylight Map link and click **City**. The transfer holds the location, scale and bearing at the default 57° City tilt. The screenshot shows this handoff in the local production build. [Daylight review link](https://atlanta.solomon.io/?view=map&q=high&t=2026-11-20T14:12:45-05:00&speed=0#17.017/33.755465/-84.400794/-85) · [Review frame](log/ui/stadium/review-daylight.jpg)

## Where it meets the ground

The 20-vertex baked Overture footprint (`c102d61f-1027-4d71-8024-57c8eabc3a58`) spans 300.39 m east–west and 257.01 m north–south in City metres. Its western point is x = −1005.48 m. The DEM ends at −1000 m. A generic building needs a valid height around its entire foundation, so this one previously disappeared.

The stadium registration intersects the mapped perimeter with the west board plane. The two crossings are at z = −178.71 and −131.93 m. The resulting 46.78 m apron edge has a closed face. The model samples the retained perimeter at intervals of at most 2.5 m, sinks the base 0.65 m below the lowest sample, and sets roof heights relative to bare earth at the hub. The shell, field-side concourses and roof fit inside the board. Rays from outside the board intersect the west face at scene x = −1000 m. [West face in City](log/ui/stadium/west-edge.jpg) · [Terrain registration and ray tests](../web/src/city/stadium.test.ts)

## What the views establish

- **East elevation and public approach.** HOK's daylight photograph toward the Window to the City shows tall glazing between folded silver panels, a diagonal brace and a recessed entrance level. The plaza angle confirms the mullions, columns and projecting shell. These features determine the panel geometry. Reflected tones and writing on the metal were excluded. [HOK daylight exterior](https://www.hok.com/wp-content/uploads/2019/02/Mercedes-Benz-4.jpg) · [HOK plaza photograph](https://www.hok.com/wp-content/uploads/2019/02/Mercedes-Benz-Stadium_Plaza_1900.jpg) · [HOK project](https://www.hok.com/projects/view/mercedes-benz-stadium/)
- **Roof plan.** Fulton County's north-up imagery shows the octagonal fixed roof, its folds and guideways, and the smaller pale centre. The model traces eight outer ridges and eight moving leaves separately. The rib direction changes at each leaf. The large painted roof mark is absent from the model. The county frame covers City x = −1040 to −660 m and z = −350 to 0 m. Roof corners are estimates from the image. [Fulton County aerial crop](https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/Imagery/Pictometry2024_NAIP/MapServer/export?bbox=-9395682.193005707%2C3995804.4844704363%2C-9395224.63874137%2C3996225.9237660435&bboxSR=3857&imageSR=3857&size=760%2C700&format=jpg&f=image)
- **Roof state and height.** The operator describes eight ETFE-clad petals that slide straight and lock at closure. The miniature shows one illustrative closed position at every clock setting. The published height is 305 ft (93 m), consistent with the bake. The local DEM hub supplies the drawing datum. The 2.2 m plaza, 7 m entrance heads, 58–66 m eaves, individual lap heights and mullion spacing are modeling estimates. [Stadium roof description](https://www.mercedesbenzstadium.com/news/a-time-lapse-of-the-roof-closing-at-mercedes-benz-stadium) · [Stadium A–Z guide](https://www.mercedesbenzstadium.com/visit/a-to-z-guide)

## Integration and camera settings

The measured-terrain build calls `createStadium` with its remaining generic buildings and the existing ground grid. The function returns two static meshes and removes the matching stadium from that list. Missing footprints, incompatible extents or absent on-board foundation data fall back to ordinary City handling. A web rebuild and deployment are sufficient. [City registration](../web/src/city/city.ts) · [Model](../web/src/city/stadium.ts)

The matched frames use a 1446 × 876 Orca viewport at `/?view=city&q=high&t=2026-11-20T14:12:45-05:00&speed=0`. On a development server, call `__city.lookAt(x, z, { bearing, metresPerPixel, tilt })` with the following values.

| View | x | z | Bearing | m/px | Tilt |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gulch | −850 | −174 | 275° | 0.49 | 53° |
| Roof | −854 | −168 | 0° | 0.51 | 20° |
| West cut | −943 | −145 | 88° | 0.36 | 70° |
