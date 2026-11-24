# Ansley Park street widths

Sam, walking Ansley on 2026-11-23: "The streets here are pretty wide in Ansley, which is unusual." City drew them all at its 7 m residential default, because OpenStreetMap tags every Ansley street `highway=residential` with no `width` or `lanes`.

**Truth tier:** `inferred`. These are curb-to-curb widths measured on aerial imagery. They are ambient scenery, so they carry no on-screen label.

## Method

The measurements used Google Maps satellite imagery in an Orca browser tab, viewed and not copied, at the "40 m" zoom. Each street was measured at its mid-segment against the map's 20 ft scale bar (about 7.7 px per metre). A parked car, about 4.5 m long, confirmed the scale. Each width is curb to curb, including curbside parking, and is accurate to about ±1 m. Junction flares were excluded.

| Street (OSM name) | Measured | Drawn |
| --- | --- | --- |
| Peachtree Circle Northeast, by Winn Park | 12–13 m (about 20 m at The Prado fork) | 12 m |
| The Prado Northeast | about 12–13 m | 12 m |
| South Prado Northeast | about 12–14 m, parking both sides | 12 m |
| 15th Street Northeast, at Lafayette | about 10 m | 10 m |
| 17th Street Northeast, at The Prado | about 10 m | 10 m |
| Westminster Drive, Park Lane, Montgomery Ferry Drive | about 6–7 m | 7 m (default, unchanged) |
| Barksdale Drive | about 8 m | 7 m (default, unchanged) |

The table is `ANSLEY_WIDTHS` in `web/src/terrain/transport-data.ts`. It applies only to `residential` ways of those names with a point inside the Ansley box (x 740–1750, z −4750 to −3700). Every consumer of `roadWidth` follows it: ground paint, kerb lines, sidewalks, yards, walkers and bus lanes. Wide residential streets carry no painted centreline. Sam saw none on the circles, and only a faded yellow one on Peachtree Circle.

## Checks

`web/src/terrain/ansley-widths.test.ts` walks every widened street on midtown-upper and brookwood-south. It checks that no house or building wall comes within the new carriageway, and that no mapped tree trunk does either (trees are checked when `pnpm data` has staged the served contexts). The check found no conflicts.

## Street View notes (Sam allowed a fresh Orca tab; patterns only, nothing copied)

To be filled in by the Ansley houses and yards PRs.
