# The Campanile

`osm:way:269843407`, modelled in `web/src/city/midtown-skyline-campanile.ts` through the Midtown
skyline registry. It stands at 1155 Peachtree Street, at 14th Street. It was built in 1987 as
BellSouth's headquarters and has been owned by Dewberry since 2010.

## Reference date: as it stands in 2026

City shows the tower as it is now: a stripped concrete frame, not the finished 1987 building and not Dewberry's proposed glass recladding.

- **Dec 2022:** [Urbanize Atlanta drone photos](https://atlanta.urbanize.city/post/campanile-dewberry-midtown-development-photos-slow-progress-news). More than eight storeys of windows were gone, the upper floors were open to bare slabs and columns, and a tower crane stood on site. Work had begun before the 2020 lockdowns, then sat idle for more than two years.
- **Oct 2025:** [AJC](https://www.ajc.com/business/2025/10/developer-of-midtowns-naked-tower-says-work-could-soon-restart). Dewberry said work had resumed inside the building.
- **19 May 2026:** [AJC photos from Peachtree and 14th](https://www.ajc.com/business/2026/05/site-of-skeletal-midtown-office-tower-hit-with-unsafe-warning/). The whole height is a bare frame, with orange safety rails on most open bays, a white construction hoist mast, construction fencing at the base, and a crane jib in one frame. The city posted the site as unsafe on 18 May 2026.
- **Feb 2026:** a [deed filing](https://roughdraftatlanta.com/2026/07/30/dewberry-regains-campanile-ownership/) cleared the mortgage. No permit or schedule for recladding was found.

If the recladding restarts, this model goes out of date. The fixture name and this README carry the date.

## Night

- No photograph of the site at night was found.
- Nothing suggests interior or decorative lighting at a stalled site, so the frame is drawn unlit. Its lit mesh is empty and its night intensity is 0.
- Crane and aviation lights are not modelled.

## Dimensions

- **Roof:** the 3DEP lidar of 22 April 2019 puts the main roof at 95.4 m above the median ground in a ring 3 to 20 m around the footprint (295.4 m NAVD88). The top return is 98.6 m, and there is a perimeter level at 87.4 m. The 2026 photos show a flat top, so City uses the 95.4 m slab. The mapped 200 m is wrong.
- **Lidar date caveat:** the April 2019 survey may predate the stripping, which began before 2020. Stripping cladding does not change the slab heights.
- **Footprint:** the mapped outline, about 66 × 45 m on the diagonal grid.
- **Estimated:**
  - The 6.4 m open ground floor.
  - 20 evenly spaced upper levels at about 4.45 m. The mapped record has 20 floors.
  - Column spacing of about 9 m.
  - A 2.2 m interior inset for the dark core.
  - Rail height of about 1 m.
  - Rails on roughly three bays in four.
  - The hoist mast on the 14th Street face, 4 m above the roof.

## Cameras

- Day and night: `cam=773,-3540,300,55,650` at zoom 1.6, at 11:30 and 23:30, both tiers.
- Close view: `cam=790,-3596,300,60,520` at zoom 3.2.

## Budget

- One body mesh of 1,904 triangles in `StaticLandmarkMaterial`. No new program, and no lit mesh content.
