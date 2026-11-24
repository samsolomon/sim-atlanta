# Medical Arts Building

Overture `51e690cd-e135-46db-9935-e4588b6b2e1f`, rank 40 in [building skins](https://github.com/samsolomon/sim-atlanta/blob/samsolomon/studio-building-skins/docs/building-skins.md). Code: `web/src/city/medical-arts.ts`, which uses the `classical-ornament.ts` band template.

The building was designed by G. Lloyd Preacher and completed in 1927 at 384 Peachtree Street NE. It was listed on the National Register in 2016 (NRIS 16000816).

## Sources

| What | Source |
|---|---|
| Elevation-by-elevation description, materials, penthouse and condition | [National Register nomination, NPGallery 16000816](https://npgallery.nps.gov/AssetDetail/NRIS/16000816) (read 2026-11-24) |
| Listing summary | [Rough Draft Atlanta, 30 Dec 2016](https://roughdraftatlanta.com/2016/12/30/medical-arts-building-listed-national-register-historic-places/) |
| Second angle: east and south faces from Peachtree, Sep 2024, base still boarded | [Street View](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.76505,-84.38560&heading=255&pitch=28&fov=95) (viewed in an Orca tab, not copied) |

The nomination describes the elevations this way:
- **Peachtree (east):** a "two-story base … clad in a light buff-colored limestone" with a limestone stringer course under the third-floor windows. Above it, a buff brick shaft. "An orange band of highly articulated terracotta separates the shaft from the two-story capital." Paired limestone pilasters divide the capital's window bays. A cast-iron cornice of dentils and scrolled brackets "turns the corner and terminates abruptly on both the north and south elevations."
- **North:** the limestone base and terracotta band continue. Two heightened window bays frame "a symmetrical composition of white, orange, and blue tile, flanked on either side by an elaborate shield." Above each shield, the parapet steps up.
- **South:** "red brick … rather plain," with a light brick stringer and a blank central band where the elevator core sits.
- **West:** the terracotta band continues across a dark brick shaft.
- **Roof:** "a two-story penthouse for the original elevator equipment," plus a mid-20th-century HVAC shed.
- **Footprint:** "approximately 60 feet of frontage … extends back approximately 140 feet," which matches the Overture outline (about 18 × 43 m).

## Heights

From the April 2019 3DEP lidar on a 2 m raster: main roof 352.0 m NAVD88, penthouse 357.4 m, stair and elevator head 361.6 m. The penthouse and the stair head are placed where the returns put them.

## Estimates and simplifications

- **Floors:** 3.2 m each, with a 9 m two-storey base measured from the Peachtree sidewalk.
- **Bays:** three on Peachtree, then about one bay per 4.3 m on the other faces.
- **Back walls:** the south and west faces use one window strip per bay. Their floor rhythm can't be read from any public view, and this halves their cost.
- **Cornice and tile panel:** the cornice's dentils and brackets, and the shields' detail, are below City resolution. They are drawn as a shade course and plain tiles.
- **Materials:** flat vertex colours, because each library surface costs a shader program.

## Lighting

The nomination records the storefronts boarded over in 2016, and Street View in September 2024 still shows the base boarded. The building is treated as vacant: no lit windows, and no lamp mesh at all. **Gap:** no night photograph exists. If the building is renovated, this needs revisiting.

## Captures

Clock 2026-11-20. Prefix each camera with `/?view=city&cam=`.

| View | Camera | Clock |
|---|---|---|
| Start cam, day / night / low tier | `520,-1234,32,60,172` | 11:30 / 23:30 / 11:30 `&q=low` |
| North and Peachtree three-quarter, day / night (the money shot) | `520,-1234,235,64,230` with `&dev&mindist=20` | 11:30 / 23:30 |
| Peachtree base and corner (close) | `528,-1226,250,62,110` with `&dev&mindist=20` | 11:30 |
