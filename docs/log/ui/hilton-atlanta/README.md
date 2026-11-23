# Hilton Atlanta and the northern board edge

At 255 Courtland Street the guest rooms occupy three wings around a taller core. From the street, two pale concrete grids frame a darker glazed recess. The tips of the wings have tall, nearly blank end walls. The original Atlanta Center also included a shopping concourse, parking and a separate office tower, now Altitude Apartments. Georgia’s historic resources survey describes 29 hotel stories. The Overture record says 30. City models the lower meeting floors, an estimated 25 rows of guest windows and the roof structure separately. [State architectural survey, Atlanta Center](https://dca.georgia.gov/document/document/modern-downtown-atlanta/download) · [Hilton’s site and address](https://www.hilton.com/en/hotels/atlahhh-hilton-atlanta) · [Atlanta History Center photograph](https://dlg.usg.edu/record/geh_caprogress_95)

## Roof survey

Each figure below comes from the USGS Georgia Statewide B2 2018 point cloud, EPT depths 7–10. Samples count class-6 returns at least one metre inside the Overture exterior. Elevations are metres NAVD88. City uses its ground grid for the base of each replacement. [USGS survey metadata](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)

| Overture footprint | Interior returns | What City draws |
| --- | ---: | --- |
| Hilton Atlanta, `20ecbeda-7f1c-4009-b976-c005905f6e7a` | 11,928 | The source Y spans 89.55 × 94.01 m. The wing roofs cluster at 395.6. The upper returns outline a taller, roughly six-sided roof at the junction, stepping to 408.8 and 411.8. |
| Northern recreation deck, `f7303311-3c8f-4a65-8414-b96c4b6753f4` | 4,654 | The main surface is at 321.1, with a lower shoulder near 315.7. Aerial imagery shows courts on this side. |
| Concourse and podium, `c97061e3-9654-4b96-88de-06d74037fa35` | 7,386 | The source’s 64 m extrusion hid much of the hotel. The east surface clusters at 306.8, the connecting strip near 313.3 and the southwest roof at 322.1. The survey’s 98th percentile here is 386.2, near the neighboring high-rise. Its distribution across the plan rules out using that percentile for the whole roof. |
| Altitude Apartments, `53678626-003d-40da-86c2-cfe2fb7c63e7` | 7,675 | The separate eastern slab has a median roof at 387.8. It keeps its own footprint and façade. |

The source rings set the perimeter. The podium step positions, the crown outline, mullion widths, sign proportions, court markings and individual storey heights are approximations. [Aerial view of the complete block](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-9393599.12%2C3996743.67%2C-9393382.38%2C3996918.27&bboxSR=3857&imageSR=3857&size=1000%2C806&format=jpg&f=image)

## Street and night references

Daytime views from the two approaches show the projecting piers, horizontal spandrels, dark glass between the wings and broader windows at the base. At night, scattered warm rooms interrupt otherwise dark banks of windows. The photographed end wall catches a warm wash and the lettering remains bright. City estimates the wash strength and uses a fixed illustrative room pattern. [Daylight end wall](https://commons.wikimedia.org/wiki/File:Hilton_Atlanta_Hotel,_Atlanta,_GA_(32532261517).jpg) · [Recess between wings](https://commons.wikimedia.org/wiki/File:Hilton_Atlanta_Hotel,_Atlanta,_GA_(33597633418).jpg) · [Reverse street elevation](https://commons.wikimedia.org/wiki/File:Hilton_Atlanta_Hotel,_Atlanta,_GA_(47421491362).jpg) · [Full-night street view](https://commons.wikimedia.org/wiki/File:Hilton_Atlanta_Hotel,_Atlanta,_GA_(47474220271).jpg) · [Night end wall and letters](https://commons.wikimedia.org/wiki/File:Hilton_Atlanta_Hotel,_Atlanta,_GA_(46558873235).jpg)

## Peachtree Summit coverage

The downtown ground grid ends at City z = −1300. Peachtree Summit’s named Overture ring (`30306c74-51c3-4ae2-9a93-11f9341f87ee`) reaches −1331.04. Only 2,454.55 m² of its 3,205.50 m² plan lies inside the board. The 7,075 interior lidar returns put the main roof at 417.1 m NAVD88. The north-cap owner verified full ground coverage on the prototype and agreement at all 401 downtown seam nodes. Rendering one complete landmark still depends on two-grid ownership in the hardware-gated preview. The current board retains its clipped source geometry. [Historic Summit photograph](https://dlg.usg.edu/record/geh_caprogress_27)

## Matched City views

Desktop Orca at 1200 × 850 and high quality. Before is `e2e8eec`. Open `/?view=city&q=high&t=2026-06-21T10:30:00-04:00&speed=0` and call `__city.lookAt(x,z,{bearing,tilt,metresPerPixel})` in development. For full night use 23:00 EDT.

| Camera | Target (x, z), bearing, tilt, metres/pixel | Day | Full night |
| --- | --- | --- | --- |
| Courtland | (748, −885), 36°, 58°, 0.29 | [Before](courtland-day-before.jpg) · [After](courtland-day-after.jpg) | [Before](courtland-night-before.jpg) · [After](courtland-night-after.jpg) |
| Reverse | (776, −858), 216°, 49°, 0.34 | [Before](east-day-before.jpg) · [After](east-day-after.jpg) | [Before](east-night-before.jpg) · [After](east-night-after.jpg) |

Rebuild and deploy the web bundle with the existing City bake.
