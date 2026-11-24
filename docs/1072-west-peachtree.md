# 1072 West Peachtree

`osm:way:1464967906` is the unnamed 60-floor outline at the south-west corner of West Peachtree Street and 12th Street. Its location and its three mapped parts match the Rockefeller Group tower reported at that corner, 1072 West Peachtree. The design architect is TVS, with Brock Hudgins Architects for the residential floors, and Turner built it. It topped out in November 2025 and finished its exterior in April 2026. The 2019 lidar shows an empty site, so City's heights come from reports and the developer's diagrams. City code: `web/src/city/midtown-skyline-1072.ts`, registered in the Midtown skyline registry.

## Sources

- [Urbanize, 2026-05-04](https://atlanta.urbanize.city/post/rockefeller-1072-west-peachtree-atl-tallest-building-30-years-fresh-images-details): the developer's floor-stack diagram, plus renderings of the tower and the motor-court entrance. The stack is lobby and retail, parking on floors 1–9, the Commons on 10, offices on 11–18 and residences on 20–60. [Urbanize, 2025-11-14](https://atlanta.urbanize.city/post/rockefeller-midtown-interview-1072-west-peachtree-skyscraper-photos): 60 storeys and 749 ft (228 m), with the architects. [CTBUH](https://www.skyscrapercenter.com/building/alina/42494) lists 223.4 m and 61 floors.
- Real photographs: [Urbanize, April 2026](https://atlanta.urbanize.city/post/1072-west-peachtree-crane-coming-down-tallest-new-tower-finished) shows the finished crown and a recessed balcony slot. The same piece reports that the parapet hides a two-storey machine room and that crown lighting is a "reveal" still to come. Urbanize, November 2025, has a street-level view looking south along West Peachtree.
- Full night: [skydb, 2026-08-20](https://www.skydb.net/file/500986372/1072-west-peachtree-atlanta/), a watermarked reference only. Scattered warm residential windows are lit, the office block reads as a lit grid, the podium and office roof edges glow, and the crown is unlit.

## What City draws

The frame runs u east along 12th Street and v south, with the origin at the lot centre (City 308.3, −3351.2), turned 0.88° to the lot. Heights are measured above the West Peachtree grade.

| Part | Plan, m | Height, m | Basis |
|---|---|---|---|
| Base: lobby and retail, nine screened parking levels, the glazed Commons | the whole mapped lot, 55 × 75 | 0–36 | mapped part `osm:way:1464967895` and the stack diagram |
| Precast office block, floors 11–18 | 32 × 66 | 36–72 | the mapped L-shaped part `osm:way:1464967905`. The stack diagram shows the block running under the tower too, so City draws it as one rectangle. |
| Glass residential tower, floors 20–60 | 23.5 × 32.4, at the north-east corner | 72–219 | mapped part `osm:way:1464967904`, which maps 216 m. 41 floors at 3.5 m. |
| Parapet hiding the machine room | tower plan | 219–223.4 | CTBUH architectural height |
| Raised middle of the crown, on the broad east and west faces | 24 × 17.5 | 223.4–228 | the reported 749 ft; the step is read from the April 2026 photograph |

- **Tower glass.** Blue-grey reflective glass, `#7d97ad`, with a light floor line every storey and a mullion line every unit of about 4.6 m. All of these are estimated.
- **Balcony slots.** Each tower face has a 3 m wide, 1.5 m deep balcony slot running full height, offset as a pinwheel to match the pinwheel floor plan. The April photograph shows one off-centre slot per face; their positions are estimated.
- **Office block.** A light precast grid at a 3.1 m bay and 4.5 m floors.
- **Base.** Limestone lobby glazing up to 5.6 m, vertical screen fins over the parking levels, and a glazed Commons band at 32–36 m.

City draws no motor-court canopy, pool deck or rooftop equipment; they are too small to read at City distances. The renderings' crown fins were never approved, so City leaves them out.

## Night

City lights units at random: residences 32%, offices 25%, the Commons 45% and the retail lobby 35%. The parking levels never light. The podium and office roof edges glow, as in the August 2026 photograph. Nothing above the 219 m roof lights. Crown lighting has been announced but not shown, so City adds none.

## Captures

The captures are listed in [log/ui/1072-west-peachtree/README.md](log/ui/1072-west-peachtree/README.md).
