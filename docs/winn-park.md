# Winn Park western ravine

## Plan

1. Keep the mapped Winn Park boundary and existing canopy. Confine the intervention to the western ravine around x 815–900, z −4088…−4045; the park's eastern lawn stays lawn.
2. Add a clipped ground-map paint hook for leaf litter, a narrow earth walk, ivy banks, a stone path/terrace and the small pond. Use the existing cover palette's quiet mean colours. Both tiers use this paint: no low-tier geometry, extra textures, resolution changes or drape.
3. Add high-tier geometry for a granite channel edge, stone pond rim, a terrace with one existing furniture bench, and sparse liriope tufts. Keep it under 4,000 triangles. Reuse `retainingEdge`, extending its optional stone/cap colours without changing other callers.
4. Carve the high-tier terrace and pond through `GroundYield` before any dependent scenery samples terrain. Use flat tops and buried side faces; no large lift. Paint follows the drawn terrain without extra geometry. Dispose added meshes with the board.
5. Test the park boundary, zero low geometry, high budget and ground contact. Run full tests/build/performance, day/night matched captures at `855,-4068,30,58,150`, and the full ground audit. Send the commit and close cameras to ground-contact; cross-review before the PR.

## Reference notes

Viewed in a fresh Orca Google Maps tab on 2026-11-23: [Winn Park photos](https://www.google.com/maps/search/Winn+Park+Atlanta/).

- Yong Zhao, July 2019 pond view: shallow dark reflective water, flat irregular stone edging, a narrow gravel/stone walk and thick low green planting on the bank. Large canopy trees dwarf the water garden.
- Gregory Hoyle, July 2021: an open lawn with low chunky stone seats on a paved edge. The park is not uniformly leaf litter.
- Vicente Fernandez, June 2021: playground on wood-chip surfacing under mature trees.
- Deaflephant, June 2023: a broad lawn and low stone terrace seen from the opposite side.

These photographs establish material and planting patterns, not surveyed positions. The western ravine extent follows Sam's handoff observations. Pond dimensions (roughly 12 × 7 m), channel width (about 1 m), path width (1.4 m), terrace (8 × 5 m), and all feature coordinates are illustrative estimates. The existing 3DEP terrain supplies heights. No reliable night photograph was established; add no new lamps or emissive surfaces. Reference images were viewed, not redistributed.

## Architect review — 2026-11-23

The existing ground-map hook and landscape primitives fit this work. A full high-tier `GroundCover.patch` across the ravine would consume the geometry budget before adding furniture, so both tiers use the same ground paint. Low has no carved basin or terrace, preserving its zero-added-geometry requirement. High's hard surfaces are carved before scenery and use flat floors, as required by `GroundYield`. No new ground resolution or terrain LOD settings.

## Product design review — 2026-11-23

Keep the quiet ground palette and a legible narrow path. Preserve the open eastern lawn and all tree ownership. No new UI, ambient truth labels or invented night lights. The low-tier pond is a painted impression; the high-tier close view supplies the level water and stone rim. Day/night captures must make that tier difference reviewable.

## Verification and integration

The high-tier park detail is 1,263 triangles. Low returns no park geometry. Full `pnpm test` passed: 20 Rust tests, 11 Python tests plus pipeline validation, 935 web tests with one existing skip, and five worker tests. Build and both performance tiers passed. The final default-view budget run measured low 2,356,763 triangles / 168.4 MB geometry and high 13,732,815 / 274 MB geometry.

Ground-contact checked commit `9acc077d` on the served terrain: 4,149 upward-face samples at 0.5 m had zero penetrations; an additional water-inclusive run checked 4,036 water points at 0.25 m with zero penetrations. Granite and alternate rim faces were clear. The intentionally buried terrace underside is 12 cm below the carved terrain; it is not an exposed contact fault. The board-wide audit still reports unrelated intersections and is not a claim of a globally clean board.

The close render revealed pre-existing flat tree leaf-carpet discs crossing the new water and channel. Tree-lab and tree-species owners approved a local exclusion in `rolloutSpecies`: whole discs intersecting the already-painted Winn floor are omitted. Tree positions, species, crowns, limbs and transforms are unchanged; default carpet behaviour elsewhere remains. This removes duplicate cover without extra low-tier triangles. The regression test checks both tiers, including a disc whose centre lies outside the exclusion but whose edge overlaps.

Publishing requires a web rebuild and coordinator deployment, with no new data, texture allocation or per-visitor server work.

Review (Claude): no findings. [Matched views and camera strings](log/ui/winn-park/README.md).
