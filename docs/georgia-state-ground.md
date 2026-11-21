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

## Board module for City

Import `createDowntownTerrain` from `web/src/terrain/model.ts`. The module returns a Three group with one board and a separately toggleable scenery group. Build it once per City mount or quality change. The texture paints the available at-grade roads and selected land-cover polygons on the mesh. Road ways tagged `bridge` or `tunnel` are omitted as whole ways, consistent with the current City extract. The surface module draws no rail or elevated decks.

```ts
const area = createDowntownTerrain(grid, cityData, treeRows, {
  quality,                  // 'low' | 'high'
  contours: { value: 0 },   // optional, mutable 0–1 uniform
  openings: verifiedSlots,  // optional, defaults to an intact board
});
scene.add(area.group);
area.setSeason(dayOfYear);
area.setNight(nightFactor);
area.setWet(wetFactor);
// area.bounds and area.bottomY locate the perimeter and bottom of the skirt.
// On unmount:
area.dispose();
```

**Ground queries.** `grid.sample(x,z)` gives absolute bilinear NAVD88 metres, including the original DEM at a structural opening. `area.groundAt(x,z)` gives scene y on the actual drawn triangle. It returns null outside the inclusive board, in a cut opening or in an omitted no-data cell. To compare a mesh reading with the fixture, add `grid.manifest.vertical.sceneZeroNavd88M`. The extent is shared across tiers. On this board the skirt bottom is scene y = −44.6 m. Control can place its plinth top at that height.

**Structural openings.** Supply independent `OpenSlot` segments, each with `start` and `end` as `[x, bedSceneY, z]` and `halfWidthM` in metres. Each segment has square ends and a linearly interpolated bed height. The module subtracts the union of these bounded strips from intersecting triangles only where terrain rises above the bed. Even a 2 m strip can pass through a 5 m source cell without dropping a whole cell. The caller supplies the verified footprint, end positions and relative datum, and draws the rail bed, walls, cover or deck. Changing the slot set requires rebuilding this static mesh.

**Scenery.** Trees use the exact triangle beneath their trunk. Building foundation tests sample all footprint rings at intervals up to 2.5 m and seat each building at the lowest sample rounded down to the metre. The extra wall extends into uphill ground. Buildings with an unknown perimeter sample and trees without ground are omitted. Facade floors use the same base shift as their building. Ground and structure foundations retain distinct provenance. The lowest-perimeter rule is an illustrative placement choice on sloping sites. Land-cover polygons can also span areas whose physical street level differs from bare earth. Centerline flags alone cannot resolve all levels of a plaza.

**Low versus high.** High uses two triangles per valid 5 m source cell. Low considers 10 m blocks. A block can merge if the five omitted nodes each differ by at most 0.20 m from the candidate coarse triangles at those nodes. A stitched fan retains shared midpoints alongside a detailed neighbour. Blocks with a void or an odd boundary subdivide. In both modes, a 5 m cell touching a void contributes no face. The threshold is a decimation test on source nodes, not a survey accuracy specification.

| Geometry before user-supplied slots | Low | High |
|---|---:|---:|
| Top vertices | 98,390 | 160,801 |
| Top triangles | 195,700 | 320,000 |
| Top position, normal, UV and index bytes | 5,496,880 | 8,985,632 |
| Perimeter skirt triangles | 2,156 | 3,200 |
| Ground colour texture | 2048 × 2048 | 4096 × 4096 |
| Top, skirt and scenery triangles, including instance multiplicity | 508,701 | 763,069 |
| Static terrain manifest and grid, gzip | 122.4 KiB | 122.4 KiB |

The last geometry count includes all submitted instance slots before camera culling, including hidden seasonal canopy instances. It describes the isolated board, scenery and input dataset used here. Rendering time depends on camera, lighting, passes, instancing and device. Both tiers use the same on-disk DEM payload. Low cuts top-mesh triangles by 38.8% and texture texel count by 75%. For QA, both Orca views used a target at (615, ground, 485), an eye offset of (+235, +153, −92) m, 36° perspective, contours enabled and summer foliage. [Low detail](log/ui/2026-11-21-georgia-state-low.jpg) · [High detail](log/ui/2026-11-21-georgia-state-high.jpg)

**Measured acceptance.** The two rendered anchor heights were 312.05 and 303.77 m NAVD88 on both tiers (8.28 m drop), compared with 312.02 and 303.86 m bilinear (8.16 m drop), and 312.01 and 303.76 m native (8.25 m drop). The 5 m mesh puts each point on a planar triangle while the CSV interpolates the four surrounding nodes. In an isolated Orca scene on both tiers, forwarding season, night and wet state, calling `dispose()` and drawing the empty scene took Three's renderer counters from 63 geometries and one texture to zero of each. This includes the canvas texture and instanced mesh buffers. The shared renderer owner handles the post-slot full City and device timing checks.
