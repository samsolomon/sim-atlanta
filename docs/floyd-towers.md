# The Floyd towers above Georgia State Station

The two slabs stand across the railway at opposite ends of one low base. From the plaza, the gap between them is wider than either tower. From an arriving train, the near tower fills the skyline and the two tracks enter the northeast edge of its base. [Plaza model](log/ui/floyd/plaza-after.jpg) · [East face from the viaduct](log/ui/floyd/east-face-after.jpg)

## How the photographs shaped the model

I searched exterior and approach photographs in a new Orca tab before building the geometry. The screenshots in this note are our City renders.

| View | Detail used |
|---|---|
| Plaza, nearly square to the narrow elevations | Three broad bays per tower, repeated dark ribbons of glazing, vertical piers carried into a tall blank crown. The two rooflines meet the same level. The commissioning team reports two buildings of twenty storeys each. [TSCx project photograph](https://www.tscx.org/laboratory-portfolio/gba-sloppy-floyd-towers-restack-gba-197-sc) |
| Low view from the flags | The piers and horizontal masonry project in front of the glass. A low roof connects the towers across the gap. The model recesses the glass and gives that connecting roof its own silhouette. [Nick NeSmith/WABE photograph, New Georgia Encyclopedia](https://www.georgiaencyclopedia.org/articles/arts-culture/richard-aeck-1912-1996/m-1838/) |
| Oblique street corner | Eight bays run along the long return. Both the vertical framing and the smaller mullions are visible in the sun. A continuous dark strip sets off the plaza level. Two colours of individual office panes provide a restrained dusk treatment. Their occupancy is illustrative. [Martha Williams photograph, Atlanta Magazine](https://www.atlantamagazine.com/list/you-asked-we-answered-34-things-you-probably-dont-know-about-atlanta/who-the-hell-is-sloppy-floyd/) |
| Aerial and rail approach | Two rectangular roofs have narrow darker equipment strips facing the gap. The canopies and tracks approach from the northwest. In Sam’s dusk reference the train enters a lit enclosure under the near tower. The model leaves a continuous opening for the train and the station lighting. The ground-level wall and track intersections locate the faces more reliably than the roofs, which lean in the orthophoto. [USGS NAIP 2023 aerial](log/rail/2026-11-21-naip-2023-georgia-state.jpg) · [Sam’s reference and camera study](georgia-state-station-study.md) |

Georgia DCA describes red-brick veneer and a flat-roofed connecting base. The warm masonry colour is an interpretation of the sunlit photographs. [Modern Downtown Atlanta, printed p. 82](https://dca.georgia.gov/document/document/modern-downtown-atlanta/download)

## Dimensions and registration

| Component | Basis and interpretation |
|---|---|
| Tower plans | The projected building parts are about 31.2 × 62.1 m and 31.7 × 62.1 m. The gap between them is about 52.9 m in this rectangular approximation. Their plan positions stay fixed when the track is registered to the City line. [Tower One](https://www.openstreetmap.org/way/537007595) · [Tower Two](https://www.openstreetmap.org/way/537007597) |
| Heights | Both OSM parts carry 20 levels and a 78.4 m height tag. The height's survey source is unknown. The model uses 78.4 m above one sampled plaza-side ground elevation as a **schematic** common crown. Eighteen glazed rows above the two-level base, the crown depth and roof equipment are modeling choices. [Base](https://www.openstreetmap.org/way/287320828) |
| Railway | Rail Accuracy locates the two faces 115.7 m apart along the mapped axis. Track spacing is about 4.86 m. The outer platform edges span roughly −8.78 to +8.40 m in the mapped frame. Control registers that frame to the smoothed City corridor, roughly 2.3 m north. Both platforms and the mouth must receive the same translation. [Rail Accuracy’s station frame](georgia-state-geometry.md) [Eastbound passage](https://www.openstreetmap.org/way/702258821) · [Westbound passage](https://www.openstreetmap.org/way/702258822) |
| Model opening | The void is 18 m wide, from −9 to +9 m across each centre sample. Its horizontal soffit is 6.4 m above the **highest** supplied bed. The flat roof is another 2.2 m higher. These values provide space for the modeled platforms and cars. Actual rail clearances and structural depths are unmeasured. |

## City composition

Call `createFloyd(vd.buildings, passage, groundAt)` from `web/src/city/floyd.ts` after the registered station samples exist and **before** batching generic buildings. Supply the full face-to-face centreline, ordered northwest to southeast, including both face samples. Each point is `{ x, z, bedY }` in City metres. Use the same bed as the drawn rails, before their +0.55 m offset. `groundAt` supplies scene-relative terrain metres or null.

- On success, pass `{ ...vd, buildings: floyd.buildings }` to the generic terrain/scenery builder and add `floyd.group` once. The filtered array drops the Floyd base UUID. Missing plaza ground, an absent base ID or an invalid rail passage returns null so the generic buildings are preserved. The original bake is reusable.
- `eastFace` returns `{ x, z, bedY, dx, dz, soffitY, clearWidthM }`. The fascia is in the vertical plane through the final sample, perpendicular to the outward tangent `(dx,dz)`. Moving inward for a ceiling fixture means subtracting its setback times that tangent. Place it just below `soffitY`. In the preview, the face is at (578.14, 460.42), the bed at −9.32 and the soffit at −2.74 scene metres. Read these values from the returned model for the integrated alignment.
- Call `floyd.setNight(atm.dark)` alongside the existing night update. This varies the brightness of a fixed set of office windows. The entrance lights, canopies, track deck and train visibility belong to the station composition.
- Call `floyd.dispose()` when an in-progress build is cancelled and when the scene is released, before any remaining scene traversal. It detaches the group and releases both geometries and materials. The 30-sample preview submits 2,356 opaque triangles plus 1,456 triangles in one window batch after dusk. Position, normal and colour arrays total 411,696 bytes. The model needs no textures or extra light sources.
- The branch contains the model and tests. Control owns the import and release in `city.ts`. Once composed, rebuild and redeploy with the City assets that include the 116 m Floyd cover span from [the station geometry bake](georgia-state-geometry.md#regenerating). The landmark adds no new asset.

## Before and after

Orca desktop, 1446 × 876, high quality, paused Atlanta time on 2026-11-20. The plaza comparison isolates the landmark. For the dusk and winter study poses and the daylight mouth, I also opened Control’s integrated City build in Orca. The after images below include its registered rails, platforms and entrance lighting. The 17:41:28 close frame shows the train between the platforms beneath the lit fascia. [Integrated arrival](log/ui/floyd/entrance-after.jpg)

| Pose | What to look for |
|---|---|
| Dusk, 17:41:20, target (600,474), bearing 292°, tilt 68°, requested 0.06 m/px | The stock window wall gives way to a two-track opening with office windows above. The camera’s near-distance limit yields 0.0666 m/px in both frames. [Before](log/ui/floyd/dusk-before.jpg) · [After](log/ui/floyd/dusk-after.jpg) |
| Winter reference camera, 14:12:45, (630,492), 235°, 56°, 0.07 m/px | Only a sliver of the Floyd elevation at the upper right falls within the foreground crossing shot. The broad building beyond the rails belongs to another footprint. The November replay reproduces the study pose, including its clear ground. [Before](log/ui/floyd/winter-before.jpg) · [After](log/ui/floyd/winter-after.jpg) |
| Plaza, 14:12:45, (516,444), 49°, 59°, 0.28 m/px | The two crowns and the shared base are visible together. [Before](log/ui/floyd/plaza-before.jpg) · [After](log/ui/floyd/plaza-after.jpg) |
| SE mouth, 14:12:29, (575,461), 311°, 72°, 0.085 m/px | The emerging train is framed by both jambs and the soffit. The separate freight structure remains visible on the right. [Daylight opening](log/ui/floyd/east-face-after.jpg) |

For the integrated build, open `/?view=city&q=high&t=2026-11-20T17:41:20-05:00&speed=0` on the dev server, then call `__city.lookAt(600, 474, { bearing: 292, tilt: 68, metresPerPixel: 0.06 })`. Substitute the times and poses above for the other frames. The mesh tests cast rays through both track centres and both platform edges and check for masonry at either jamb and overhead. They also probe both tower slabs and the sky gap. [Regression tests](../web/src/city/floyd.test.ts)
