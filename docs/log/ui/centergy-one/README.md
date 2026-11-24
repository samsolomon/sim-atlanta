# Centergy One, Technology Square

Centergy One (Smallwood, 2003) is the brick office tower at 75 Fifth Street NW. It replaces the mapped outline `osm:way:42706826`, about 27 × 38 m, mapped at 65.3 m. The 22 April 2019 lidar measures the roof at p50 58.8 m, p95 64.4 m and max 64.9 m above grade (ground 291.2 m NAVD88). The model uses:
- a 6 m lobby;
- 13 floors at 4 m to 58 m;
- a parapet at 59.2 m;
- a sunshade trellis at 62.6–64.4 m, which is the high return.

## Identifying features (confirmed with the lead)

1. **Red-brick panels** with one continuous ribbon window per floor.
2. **A full-height glazed bay** down the centre of each face, plus glazed corners. This splits the brick into four stacked fields per face.
3. **A white open sunshade trellis** cantilevered past the roof edge: the crown silhouette. It is drawn 0.9 m out, inside the 2.5 m footprint allowance, and carried on posts from the parapet.
4. **The lobby glazing** on Fifth Street.

## References

- [Smallwood case study](https://www.smallwood-us.com/work/case-study/centergy-at-technology-square): an aerial with the tower's brick ribbons, glass bays and white trellis crown, and a dusk photo of the plaza with lit office floors. Viewed in an Orca tab.
- Street View panoramas at [Spring Street](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77760,-84.38900&heading=270&pitch=25&fov=90) and in [the plaza](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77720,-84.38935&heading=330&pitch=25&fov=90), viewed, not copied.
- The tall brick tower with a teal centre bay just south (x ≈ 235, z ≈ −2693) is a separate building, not Centergy One.

## Glass

Ribbons `#7f8f97` and the bay `#8d9ca4`. At 11:30, high tier, the sunlit south face renders the ribbons at H180 S11 V51 and the bay at H147 S7 V58. A generic tower in the same frame renders H126 S5 V77.

## Lighting

The Smallwood dusk photo shows warm office floors. At 23:30 about 7% of panes are lit, from skin-kit `litFacade`, drawing only the lit panes. The lobby is lit and the trellis is dark.

## Checks

The footprint and detachment checks from `skin-footprint.test.ts` both pass: nothing outside the 2.5 m allowance, and no detached clusters.

## Captures

| View | Camera | Local time, November 20, 2026 | Capture |
|---|---|---|---|
| West face, looking east (money shot) | `189,-2632,90,50,420` | 11:30 AM EST | [Day](day.jpg) |
| Same | `189,-2632,90,50,420` | 11:30 PM EST | [Night](night.jpg) |
| South face, looking north | `189,-2632,0,50,420` | 11:30 AM EST | [South](south.jpg) |
| Trellis crown and glazed bay (close) | `189,-2632,90,40,140` | 11:30 AM EST | [Close](close.jpg) |
| Four-side sheet | bearings 180/270/0/90 at 420 m | 11:30 AM EST | [Four sides](four-side.jpg) |

The bearing is the view heading. Use `/?view=city&cam=<camera>&t=2026-11-20T<clock>`. The close view adds `&dev&mindist=20`.
