# Kendeda Canopy Walk

The Atlanta Botanical Garden's walk crosses the board seam at z = −4100 between midtown-upper and brookwood-south. Before this change, City drew it as a generic footbridge tread about 4 m below the 3DEP ground surface at (1712.4, −4102.5).

## References

- Daytime, from below and along the deck: the [Axios Architecture gallery](https://www.axiosarchitecture.com/projects/kendeda-canopy-walk) shows the serpentine deck on a single tubular spine, raked steel masts with stays, and mesh railing panels under a steel top rail. A second angle is Greg Hume's [Wikimedia Commons photograph](https://commons.wikimedia.org/wiki/File%3AKendeda_Canopy_Walk.JPG), taken 30 May 2010 at 15:35.
- Facts: the [Garden's page](https://atlantabg.org/map-location/kendeda-canopy-walk/) gives a "600-foot-long", "12-foot-wide serpentine bridge" "soaring 40 feet in the air". It calls the walk a steel and concrete suspension bridge with towering masts, designed by Jova/Daniels/Busby, and says it opened in 2010.
- Night: the [AJC Garden Lights, Holiday Nights gallery](https://www.ajc.com/lifestyles/holiday/photos-atlanta-botanical-garden-illuminates-for-garden-lights-holiday-nights/FxkRldCF5bJjkhKtzlciUI/) has a dusk photograph from the deck. Seasonal lights wrap the tree trunks beside it, but the walk itself shows no fixtures of its own. No source documents permanent lighting on the walk. That is a gap, so City uses its ordinary night lighting and adds no holiday display.

## What is measured, inferred and estimated

| Attribute | Tier | Source |
| --- | --- | --- |
| Plan centreline | measured | OSM way, as checked in for both rows |
| 3DEP point returns near the walk | measured | 721 USGS 3DEP lidar returns within 1.65 m of the centreline, in 31 bins of 5 m |
| Deck elevation profile | inferred | The returns contain no class-17 (bridge deck) points. `pipeline/scripts/kendeda_walk.py` keeps returns within ±0.55 m of a manually identified band that descends from 287.2 m to 280.9 m NAVD88, with woods above it and class-2 earth below, and takes the median of each bin |
| Gaps at s ≈ 27–43, 63–74 and 142–159 m | inferred | Linear interpolation between supported bins |
| Landings | inferred | Blended over 9 m to the rendered ground at each tier, 0.12 m above it |
| Width | reported | 12 ft (3.66 m), from the Garden |
| Mast count, positions and 7.5 m height; rail heights of 1.12 m and 0.52 m; 0.24 m spine | estimated | From the photographs |

Independent checks: the drawn path is 178.9 m, against the published 600 ft (182.9 m). The highest deck point is 11.4 m above rendered ground at both tiers, against "nearly 40 feet" (12.2 m). Both deck edges stay at least 0.11 m above the ground surface along the whole walk. The two row halves meet within 10⁻⁴ m on the seam.

## Cameras

The viewport is 999 × 496, with the clock at 14:00 and 23:00 Eastern on 20 November 2026.

- Woodland: `/?view=city&cam=1732,-4151,-69,59,295`
- South landing at the seam: `/?view=city&cam=1713,-4100,160,56,132`

| Camera | Low day | Low night | High day | High night |
| --- | --- | --- | --- | --- |
| Woodland | [Day](woodland-low-day.jpg) | [Night](woodland-low-night.jpg) | [Day](woodland-high-day.jpg) | [Night](woodland-high-night.jpg) |
| South landing | [Day](south-landing-low-day.jpg) | [Night](south-landing-low-night.jpg) | [Day](south-landing-high-day.jpg) | [Night](south-landing-high-night.jpg) |

To re-bake `pipeline/prototypes/kendeda-walk/profile.json`, run `python pipeline/scripts/kendeda_walk.py` with the vignette pipeline's Python environment. The bake fetches 3DEP points over the network. The profile is bundled into the web build, so this change needs a web rebuild only.
