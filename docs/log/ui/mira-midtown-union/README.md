# Mira at Midtown Union

`osm:way:1297223462`, 1301 Spring Street NW. A rental tower completed in 2022, 26 storeys and 355 units ([Midtown Alliance](https://midtownatl.com/view/mira-at-midtown-union)). Skin: `web/src/city/mira-midtown-union.ts`.

## Photos

| View | Source | What it shows |
|---|---|---|
| Spring St, looking east (primary) | [Street View, May 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79040,-84.38960&heading=90&pitch=30&fov=100) · [podium close](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79040,-84.38960&heading=97&pitch=48&fov=35) | The garage screen of light and mid-grey panels in diagonal chevrons, with yellow accent slots; above it, the white frame of two-storey cells over dark recessed balconies, with a few yellow and orange panels |
| Spring St at about 18th, looking south-east (second angle) | [Street View, Feb 2022](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.79150,-84.38960&heading=150&pitch=30&fov=100) | The near-complete slab standing well above the faceted grey and white screen; confirms the slab is much taller than the garage and that the screen wraps the north end |

**Night: gap.** I found no reliable night exterior photo. The night look follows the house rule for residential buildings: about three in ten flats lit at 23:30 (skin-kit `litHash`), with the garage dark. All night lighting is `illustrative`.

**Daylight lighting in the photos:** in both, the white frame is the brightest surface and the balcony recesses read as dark grey, not black. The Feb 2022 photo is clear and sunny.

## Height (inferred, post-2019)

The April 2019 lidar shows a surface lot here (roof p50 0.2 m), so no height is measured.

- Midtown Alliance says 26 stories. OSM tags the tower `building:levels=18` with `building:min_level=9`, and maps the tower part at 64.8 m. These **conflict**. I read OSM's 18 as the residential floors (min_level 9 marks the garage), and the May 2025 photo shows about 8–9 garage levels behind the screen, then about 8–9 two-storey frame cells. With 17 residential floors, the top frame cell is one storey (estimated; the photos don't resolve the top floor).
- Model: a 28.8 m garage (the mapped podium part), 17 residential floors at an estimated 3.05 m, and a 1.5 m parapet, for about **82.5 m, inferred**. That's about 17 m above the mapped 64.8 m.

## Estimated

- Floor height 3.05 m, frame column pitch about 6.5 m, frame members 1.2 m wide (estimated from the photo's cell proportions).
- The chevron count: one per 7 m of face, with stripes 2.6 m wide; one yellow slot per bay. These approximate the pattern but don't copy it panel for panel.
- The yellow and orange accent bays: about one in ten, placed by hash, not panel for panel.
- Colours: screen `#d9d9d6` and `#8e9193`, accent `#e0a52a`, frame `#efeeea`, recess `#68717a`, picked by eye from the May 2025 photo. The recess was lifted from a first `#4a5257`, which rendered at V 23 on the shaded east face, darker than the photo's recesses.

## Shade note

At 11:30 on 2026-11-20 the tall tower south-east of Mira shades most of the slab's south face. There the recess renders navy at about V 17 (hue 217, S 93). A temporary bright-red recess confirmed the colour reaches the screen, shaded red rendering at (128, 0, 0). This is the global shade-tone issue the skyline lead has raised for Sam (Rambler north at V 14), so the skin carries no per-building lift.

## Grade

The lot climbs about 4.6 m from Spring Street's south-west corner to the north-east. The storefront band and the bottom of the screen start from each edge's higher end, so they stay above the street on the uphill side ([close-up](uphill-close.jpg), `279,-4030,225,62,110` with `&dev&mindist=20`).

## Left out

- The leasing signage and any logos.
- The retail storefront detail at grade, drawn as one dark band.
