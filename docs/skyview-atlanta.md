# SkyView Atlanta

`a7661a6c-82d6-4347-98fe-f0acff8b918e` (Overture). This is the Ferris wheel beside Centennial Olympic Park, a Bussink R60 observation wheel that opened in 2013. City code: `web/src/city/skyview-atlanta.ts`, mounted in `city.ts` after Centennial Tower and added to the downtown batcher's `listed` array. Shipping it requires a web rebuild and redeploy; the data is unchanged.

## Sources

- [Construction Equipment Guide](https://www.constructionequipmentguide.com/atlanta-visitors-residents-go-sky-high-on-skyview/21076): 21 spokes and 42 gondolas, six footings, and "one million multi-colored LED lights". [PLSN, 2013-07-30](https://plsn.com/?p=247571): the show runs from one console and is lit "each evening". [Bussink](https://bussink.com/observation-wheels): the R60 model. [Wikipedia](https://en.wikipedia.org/wiki/Centennial_Olympic_Park): 200 ft.
- Day photographs:
  - [face-on, 2020](https://commons.wikimedia.org/wiki/File:SkyView_ATL.jpg)
  - [oblique, July 2018](https://commons.wikimedia.org/wiki/File:SkyView_Atlanta,_July_2018.jpg)
  - [from Luckie Street, 2019](https://commons.wikimedia.org/wiki/File:SkyView_Atlanta,_Atlanta,_GA_(40508040873).jpg)
  - [hub, rim and legs, 2018](https://commons.wikimedia.org/wiki/File:Skyview_Atlanta.jpg)
- Night photographs:
  - [purple-blue, before 2018](https://commons.wikimedia.org/wiki/File:The_Wheel_(259777543).jpeg)
  - [blue, 2020-05-31](https://commons.wikimedia.org/wiki/File:Protecting_Atlanta_Georgia_National_Guard.jpg)
  - [magenta, 2018-09-29](https://commons.wikimedia.org/wiki/File:SkyView_Atlanta_IMG_7479.jpg)
- Orientation: OSM and Overture map the wheel as a 50.3 × 2.3 m strip at about 42° (NE–SW). An Esri aerial shows its shadow as a full circle to the north-west, so the wheel faces the park broadside.
- Height: 3DEP lidar (2019-04-22). Along the strip, the per-slice maximum heights trace the top of a circle about 27 m in radius, centred about 27.5 m up, with a top return of 54.5 m above the 317.1 m (NAVD88) ground. An R60 spec sheet found in search put the axle near 29 m. The official 200 ft (61 m) counts the platform and site. Lidar under-samples thin tubes, so its maximum is a lower bound.

## What City draws

- **Wheel:** a 25 m-radius wheel with its axle at 29 m, in the mapped plane.
- **Rim:** a two-ring rim 3.2 m deep, as two 1 m ribbons with an outer band, in 42 segments. The members are drawn wider than the real tubes so their white reads through the outline ink at City distances.
- **Spokes:** 21 tapered spokes on each face, converging on a dark hub.
- **Gondolas:** 42 white capsules with dark glass bands, hung between the two rim rings from pivots 1 m outside the rim. At the top a capsule rides just above the rim to 54.7 m, matching the lidar's 54.5 m top return. At the bottom its floor clears the boarding deck by 0.7 m.
- **Supports:** two white tubular A-frames, one on each side of the wheel, from the ground to the axle.
- **Base:** a boarding deck under an arched canopy on the street side.
- **Not drawn:** cross-cables, the stair truss, the "ATLANTA" hub sign and the VIP gondola's black finish. They are too fine or not worth the triangles.
- **Budget:** 1,354 body triangles and 252 lamp triangles, inside the 2,400-triangle landmark budget.

## Night

**Night colour (reported, varies).** The LED show runs each evening from one console ([PLSN, 2013-07-30](https://plsn.com/?p=247571)), but its colours change. The photographs show:
- purple-blue spokes with a white rim before 2018;
- magenta on 2018-09-29;
- blue and violet with a white rim on 2020-05-30/31;
- pink or blue for gender reveals, and blue for essential workers in 2020.

`finish()` gives the lamp mesh a single emissive colour, so City lights the rim and spokes in the blue-violet (`#8f86ff`) seen most often. The gondolas stay dark, as they appear in the night photographs (inferred).

**No rotation.** The wheel is static because animating it would mean moving batched geometry. An illustrative slow turn is a possible later touch for Sam to decide on.

**Labels.** On-screen labels stay generic ("Centennial Park observation wheel"). This README names the attraction and its sources.

## Captures

| View | Camera | Image |
|---|---|---|
| Broadside, before and after, 11:30 | `cam=-23,-548,312,62,260` with `&dev&mindist=20` | [compare-day.jpg](log/ui/skyview-atlanta/compare-day.jpg) |
| Same, 23:30 | same | [compare-night.jpg](log/ui/skyview-atlanta/compare-night.jpg) |
| From over the park, day and night | `cam=-23,-548,140,58,420` | [park-day-night.jpg](log/ui/skyview-atlanta/park-day-night.jpg) |
| From the park, production camera (no dev flags), day and night | `cam=-60,-500,135,58,500` | [production-day-night.jpg](log/ui/skyview-atlanta/production-day-night.jpg) |
| Four sides by day, about 400 m (checked for floating, missing or z-fighting parts: none) | N `-23,-593,0,60,400` · E `22,-548,90,60,400` · S `-23,-503,180,60,400` · W `-68,-548,270,60,400` | [four-side.jpg](log/ui/skyview-atlanta/four-side.jpg) |
