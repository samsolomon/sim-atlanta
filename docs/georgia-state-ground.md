# Ground along the eastbound Georgia State approach

The [184-row section](../pipeline/prototypes/downtown-ground/georgia-state-section.csv) follows `marta:path:155177` from Five Points (s = 7367.8 m), through Georgia State (8025.0 m) and onto the west half of the Downtown Connector crossing (ending at 8280.0 m). The extra overlap connects to the existing freeway-floor check. These limits are sampling locations. Identifying the physical abutment or a portal requires structural evidence.

| Location | Full-path s (m) | City x, z (m) | Baked ground (m NAVD88) | Native pixel (m NAVD88) |
|---|---:|---:|---:|---:|
| Five Points stop location | 7367.8 | 18.60, 7.12 | 323.80 | 323.81 |
| Sharp change east of Five Points | 7410 | 52.94, 31.10 | 322.26 | 323.39 |
| East depression | 7600 | 197.54, 153.08 | 311.24 | 311.21 |
| Georgia State stop location | 8025 | 528.67, 417.65 | 309.08 | 309.07 |
| West approach high ground | 8185 | 652.70, 519.28 | 312.02 | 312.01 |
| Descending bank | 8220 | 683.21, 535.96 | 308.26 | 307.93 |
| West freeway floor | 8240 | 701.70, 543.88 | 303.86 | 303.76 |
| Overlap with Connector section | 8280 | 739.61, 555.98 | 304.00 | 304.06 |

**Scenery acceptance check.** From s = 8185 to 8240 m the grid drops **8.16 m** over 55 path metres. Independent sampling of the native pixels gives **8.25 m**. A bare-earth scene section should retain that drop on both detail tiers, with road markings attached to the rendered surface. This is a check on the approach bank and freeway terrain. Applying the descent to a passing train would place it on the lower surface.

**Uncertainty.** All 184 samples have a valid native pixel and a complete weighted neighbourhood on the 5 m grid. Across these points, the mean absolute grid-to-native difference is 0.10 m, the 95th percentile is 0.35 m and the largest difference is 1.13 m at s = 7410. The two rasters share a source. Agreement checks resampling only. The broad bank-to-freeway transition and low freeway surface support scenery placement at board scale. At individual steep edges use the native comparison before aligning a wall. At Five Points and Georgia State, a ground pixel at the stop's x/z cannot identify a track, platform, deck or tunnel crown. Bridge removal and surface interpolation can produce perfectly valid pixels. This DEM has no per-pixel flag distinguishing direct ground returns from interpolation under structures. Downtown construction since the 2018–2019 source period adds uncertainty. [Tile, mask, datum and coordinate details](downtown-ground.md) · [USGS bridge treatment](https://www.usgs.gov/ngp-standards-and-specifications/lidar-base-specification-digital-elevation-model-surface)

**Reproduction.** The [pinned path slice](../pipeline/prototypes/downtown-ground/georgia-state-path.csv) contains vertices 585 through 657 inclusive (zero-based) from this path's `coords` and `cum` arrays in the 2026-11-21 routes snapshot, SHA-256 `5385af7996d155dde14b199eaffb941fc807b577663af57cf1f014e40edde625`. The endpoints of the path slice bracket the requested section. The timetable stop IDs are `marta:stop:908981` and `marta:stop:908696`. For each full-path distance, linearly interpolate longitude and latitude between adjacent vertices by their published cumulative metres. Project to City x/z, rounded to 0.01 m. At this same location take the bilinear grid reading and the containing native 1 m USGS pixel. Distances are the start stop and multiples of five metres through the crossing. Blank measurement cells denote unknown data. Differences use unrounded elevations.

From the repository root with the environment and tile described in the [bake instructions](downtown-ground.md), run:

```sh
.venv/bin/python -B pipeline/scripts/georgia_state_ground.py data/raw/terrain/USGS_1M_16_x74y374_GA_Statewide_2018_B18_DRRA.tif
git diff --exit-code -- pipeline/prototypes/downtown-ground/georgia-state-section.csv
```
