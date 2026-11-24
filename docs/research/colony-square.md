# Colony Square 100 and 400 — research and implementation plan

Research started 2026-11-23 on `samsolomon/studio-colony-square`. Next item after 1180 Peachtree B (#341). No rendering changes yet.

## Evidence

- [Design team's Material + Form](https://colonysquare.design/materiality): gridded tower windows, curved cast-in-place concrete bases, metal/glass retail additions. Opened in a fresh Orca tab and inspected its axonometric diagrams, Building 500 adjacency photograph, and dusk IPIC photograph with the original tower behind. The diagram is plan/massing evidence, not a photograph.
- [Design team's Openness + Density](https://colonysquare.design/openness): open-air plaza and the colonnade along Building 400. Important to avoid recreating the demolished enclosed mall.
- [100 exterior, AtlChampion, 2025-11-09](https://commons.wikimedia.org/wiki/File:AColonySq1002511-0966.jpg): additional source located; photograph still to inspect at full resolution.
- [400 exterior, dbking, 2007](https://commons.wikimedia.org/wiki/File:Colony_Square.jpg): additional source located; old base predates redevelopment, so use only for the tower after inspection.
- [Josh Green / Urbanize, January 2022 night walk](https://atlanta.urbanize.city/post/photos-wandering-reborn-colony-square-midtown-landmark): inspected four photographs. Colonnade shows bright glass entries, warm ceiling/soffit lighting, string lights and 400 entry numbers. Grove photo shows illuminated retail and a red vertical tower accent. Skating-rink photo shows pale concrete faces and sparse illuminated offices. This is holiday-season evidence: do not treat coloured accents, skating rink, or Christmas tree as permanent. A nonseasonal full-crown night view remains a gap.
- [Skyscraper Center complex](https://www.skyscrapercenter.com/complex/1329): lists 100 at 96 m and 400 at 94 m; compare against measured lidar rather than silently treating all listed heights as surveyed.

## Existing data

`web/public/data/scene/square-board/midtown-upper/context.json` includes both tower parents and parts. No bespoke Colony Square renderer currently exists.

- 100: `osm:way:536737548`, generic 96 m, 22 floors. Core `1414724139`, shaft `1451518631`; several 8.7 m low parts.
- 400: `osm:way:536737549`, generic 94 m, 22 floors. Core `1414724134`, shaft `1451518632` at 86.2 m; several 7.8 m low parts. The generated residual `podium` also carries 86.2 m: do not assume that is a measured podium.
- Footprints occupy scene x≈761–852, z≈−3786 to −3642. Towers follow the diagonal street frame. Current part outlines require comparison against photos, especially where lidar high returns fall inside purported low parts.

## Lidar measurement

Used existing `pipeline/scripts/king_memorial_corridor.py:ept_points` with USGS `GA_Statewide_B2_2018` EPT, clipping scene x=750–865, z=−3800 to −3630. Classified-ground median within each parent polygon buffered by 12 m provides a local reference. Heights below are roof-return statistics above that reference, not finished-floor counts. This acquisition predates completion of the plaza redevelopment; use it for old tower massing, not new retail roofs.

| Tower | Ground NAVD88 | Parent returns | Parent p99 height | Core median | Main-shaft median |
| --- | ---: | ---: | ---: | ---: | ---: |
| 100 | 296.08 m | 9,567 | 96.39 m | 96.31 m (485 points) | 89.18 m (7,579 points) |
| 400 | 296.30 m | 9,857 | 91.09 m | 89.80 m (635 points), p90 91.12 m | 83.15 m (6,231 points) |

100 shaft p99 is 94.69 m; 400 shaft p99 is 88.86 m. These are not yet assigned to parapets versus facade tops: inspect distributions and imagery before fixing the vertical sections. 100 low-part `1414724141` contains returns near 94.5 m; 400 low-part `1414724136` has returns up to 88.8 m. That mismatch needs footprint registration checks, not arbitrary height offsets.

Scratch evidence is `/tmp/colony-research/`: `measure.py`, `measure.txt`, `lidar.npz`, downloaded reference images and contact sheets. EPT downloads are cached by the existing helper in `data/raw/ept/`.

## Implementation plan

1. Resolve footprint/height registration against full tower photos; retain measured main roof, parapet and core as distinct sections. Record dimensions estimated from photographs separately.
2. Add a dedicated Colony Square module and measured fixture through the existing `midtown-skyline.ts` registry. Preserve the two stable parent IDs. Model recessed vertical window grids, corner piers, narrow spandrels, roof screens, curved low concrete bases and photographed contemporary glass entry additions. Use the material library first; avoid new textures.
3. Ground the bases using the existing local shell and 3DEP callback. Keep the new plaza/retail block out of this tower-focused pass unless existing geometry would visibly collide. Do not modify generated building-part JSON by hand.
4. Night: sparse warm offices and photographed entry/soffit illumination. Keep uncertain crown lighting conservative and document the source gap. No holiday colours, logos, lettering, invented floodlit crowns or simulated lighting presented as live data.
5. Capture before/after daylight and full night on high/low tiers, an aerial that includes both towers, and a street-facing entry angle. Save camera strings and source links. Test height and ID integration, run full tests and performance budgets, then cross-review before a dedicated PR. Coordinator alone deploys.

### Architect review — 2026-11-23

Read `midtown-skyline.ts`, `landmark-shell.ts`, the existing skyline fixtures and staged building parts. Reuse the current registry/local-shell contract instead of adding a second landmark path. Significant concrete risk: copying inferred low-part heights despite high lidar returns would produce incorrect geometry. Step 1 now resolves registration before implementation. Pipeline generation and building IDs remain unchanged.

### Product design review — 2026-11-23

Photo evidence supports a recessed grid and open, street-facing base, not a generic glass box or the historical enclosed mall. Significant concrete risk: the available night walk records holiday lighting. Step 4 excludes those temporary colours from the everyday model. No new UI, ambient truth labels or controls are needed. Day/night matched views and two-tier checks remain the acceptance evidence.

## Shared palette (agreed by skins-6 and skins-7, 2026-11-24)

Both towers use one palette so they read as a pair and a step away from the generic pale-blue glass. Each tower's rhythm and form come from its own photographs.

| Role | Hex | Notes |
| --- | --- | --- |
| Glass | `#6b655e` | Warm bronze-grey, base S12 V42. The recessed reveals render darker; the piers carry the sunlit read. |
| Piers and spandrels | `#ece8de` | Bright precast, above the generic cream. |
| Floor or reveal shadow | `#b9b3a7` | Pier cheeks and shadow bands. |
| Crown band and penthouse | `#d6d1c6` | |
| Lobby | `#3f4448` | Dark recessed base. |

400 Colony Square (skins-7), from the 2007 dbking photograph:
- Tall slit windows: 2.5 m bays with 1.55 m piers standing 0.35 m proud, and 1.2 m spandrels.
- Solid blank corners, 3.2 m wide.
- One continuous dark mechanical band at the fourteenth window floor.
- A two-storey blank crown under the parapet.

100 Colony Square (skins-6): mirrors the palette and keeps its own near-square punched rhythm. See its PR.
