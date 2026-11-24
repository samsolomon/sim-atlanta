# North Avenue NW underpass — evidence gate

Survey started 2026-11-23; implementation has not begun. Coordinator approved the
work only after the deck count and span lengths are settled from panoramas and
aerial imagery. Do not treat the 86 m road tunnel as one rail span.

## Observations

- [East approach, March 2025](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77085,-84.39935&heading=243&pitch=3&fov=30):
  concrete balustrade, haunched square columns, two road openings and a sidewalk
  opening. This eastern crossing carries **Marietta Street**, not just railway.
- [West approach, May 2022](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.77035,-84.40125&heading=60&pitch=3&fov=45):
  separate deck faces with daylight gaps, median piers, pipe railings and lamps
  attached to trench walls. No reliable night imagery recovered.
- [Google aerial](https://www.google.com/maps/@33.7708,-84.40025,160m/data=!3m1!1e3):
  vegetation obscures part of the crossing. Capture date not established.
- [Esri World Imagery export](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-84.4015,33.7701,-84.3990,33.7714&bboxSR=4326&size=1500,900&imageSR=3857&format=jpg&f=image):
  shows additional deck strips west of the active tracks, apparently without
  tracks. A train obscures the active track decks. Capture date not established.
  Viewed only; neither aerial nor Street View imagery is copied into this repo.

The current sources establish multiple separate decks, but do **not yet settle**
the active rail deck subdivision or all span endpoints. Counting visible deck
faces in one perspective as separate complete bridges would overstate the evidence.

## Existing geometry and intended replacement

The staged midtown-south context has two North Avenue tunnel carriageways:
`(-764.74,-1889.70) → (-840.19,-1847.81)` (86.3 m), and
`(-836.42,-1839.22) → (-757.58,-1881.83)` (89.6 m).
The inherited OSM references are ways 218105244 and 218105246, layer -1.
The ground-contact exception covers x -840…-760, z -1935…-1820. It records ballast
dropping about 6 m over 6 m as the DEM follows the road beneath the tracks.

Replace that terrain-following rail with a continuous grade over the surveyed
rail decks; draw North Avenue at its lower level in a shared OpenSlot trench.
Include the Marietta road deck and surveyed western deck strips so the replacement
is complete. Piers must stay outside lanes, shoulders and ramps. Retain the
exception until tests demonstrate complete replacement.

## Constraints and unresolved measurements

- Rail grade at most 1.5%; proposed soffit clearance at least 4.5 m is **inferred**,
  not a posted or surveyed measurement. Keep clearance out of on-screen UI.
- Existing USGS 3DEP ground can anchor approaches. No bridge-specific lidar or
  measured soffit evidence has been recovered; bare-earth elevations cannot
  establish the deck underside.
- Before geometry: settle deck count, endpoints and individual span lengths.
- Incremental low-tier cap: 5,000 triangles and two draws, shared materials, no new
  texture. This is a cap, not a measured result. Record baseline and after with
  `__perf.report`, and pass `pnpm test:perf`.
- Matched day/night before/after, including camera target `(-783,-1860)`.
- Web rebuild only is intended; no server work or upstream calls.
