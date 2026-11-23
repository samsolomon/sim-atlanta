# Brookwood station and the Crescent approach

## Survey, 23 November 2026

| Feature | Measurement or observation | Basis |
|---|---|---|
| Atlanta stop ATL | 33.799445° N, 84.392477° W. City x −81 m, z −5064 m. | Exact decimal fields in Amtrak GTFS edition 20261122. The Studio bake uses edition 20261120 and rounds stops to five decimals. |
| Passenger alignment | Two NS Norcross District mains, both mapped for bidirectional operation. Main 1 is the southeast edge. The island lies between mains 1 and 2. | OSM track references and island polygon. The timetable identifies the station and direction. Track choice for an individual trip is inferred. |
| Local rail extent | Main 1 measures 1,311 m, with 686 m southwest and 625 m northeast of the perpendicular projection of ATL. Main 2 measures 1,310 m. Clip at x −575 and +410 m. | Joined OSM ways projected into the City Five Points metre grid. Coverage reserved x −1000..1800, z −5700..−4100. |
| Freight infrastructure | Steel Lead Track, 466 m, and siding, 442 m within the clip. Both mains also carry freight. | OSM service and operator tags. Freight frequency, dispatch and occupied track are unknown. |
| Boarding island | Long edges 367.7 and 367.8 m. Width tapers from 4.8 m at the southwest end to 3.9 m at the depot. | OSM way 1180995316. Orthophoto shows the long island continuing onto the rail bridge at its southwest end. |
| Passenger access | Street-level forecourt and waiting room above the railroad. Stairs and passenger elevator descend to the island. Principal street facade 26.3 m long. | OSM way 265350477, Amtrak station accessibility listing, photographs. |
| Vertical relationship | USGS bare earth 264.8 m NAVD88 on open Main 1 southwest of the building and 264.1 m northeast. Beneath the street facade the DEM reads 272.9–273.1 m. Interpolated rail bed about 264.5 m, upper floor about 273 m, rise about 8.5 m. | One-metre 3DEP tile. The gridded surface jumps onto the upper level beneath the building and drops below the railway over the freeway. Interpolate between open track samples across both discontinuities. Platform surface, railhead and floor elevations are estimates. |
| Peachtree Street NE | 1985 two-span continuous steel beam bridge, 113.7 m long, deck 34.0 m wide. Mapped road centreline 113.2 m. Six lanes. | FHWA GA 2025 structure 000000012100260, OSM way 38978515. The recorded 10.05 m underclearance references the highway. Rail clearance is unverified. |

The incoming feed uses extended service-day hours. Through southbound calls include 32:43–33:08 (08:43–09:08 local the following morning). Through northbound calls include 23:00–23:29. Short turns and calendar exceptions exist. The model must consume the same dated TrainState as the map. Generic consist, stopping marker, assigned edge and boarding details are estimates. [Amtrak GTFS](https://content.amtrak.com/content/gtfs/GTFS.zip) · [Georgia rail plan](https://www.dot.ga.gov/InvestSmart/Rail/StateRailPlan/2015GeorgiaStateRailPlan-1-26-16.pdf)

Coordinates in the fixture are metres east and south of Five Points, rounded to centimetres for reproducibility. Map accuracy is lower. Southwest to northeast, Main 1 uses ways 38978867, 38978865, 1043756765 and 144485854. Main 2 uses 28978838, 874902950, 1043756764 and 874902949. The Steel Lead uses 874902959 and the siding uses 874902960 and 874902961. Geometry © OpenStreetMap contributors, ODbL. [OSM platform and surrounding ways](https://www.openstreetmap.org/way/1180995316) · [FHWA inventory CSV](https://www.fhwa.dot.gov/bridge/nbi/2025/delimited/GA25.txt) · [USGS DEM](https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/GA_Statewide_2018_B18_DRRA/TIFF/USGS_1M_16_x74y375_GA_Statewide_2018_B18_DRRA.tif)

## Exterior and lighting

Amtrak's street-facing photograph shows three arched openings with green joinery, cream surrounds, brick piers, a pale lettered frieze and deep eaves. The October 2022 oblique view shows the short return and the roof silhouette. These were the latest dated daylight facade angles verified here. No 2026 daylight facade photograph was verified. The March 26, 2026 AP platform view shows bright pale light under a shallow canopy, visible cross-braces and two locomotive headlights. A March 2019 view from the same platform has a distinctly warmer cast. Full-night street-facade lighting is unverified. Canopy extent, details of the lift enclosure, parapet, sash dimensions and fixture spacing are estimated. [Amtrak exterior](https://www.greatamericanstations.com/stations/atlanta-ga-atl/) · [October 2022 return facade](https://commons.wikimedia.org/wiki/File:Peachtree_station,_Atlanta,_Georgia.jpg) · [Amtrak access](https://www.amtrak.com/stations/atl) · [Passenger account and stair photos](https://www.hyperphysics.phy-astr.gsu.edu/Nave-html/S20/trainvis.html) · [March 2026 platform](https://apnews.com/article/e4d8ea591b3b036142c2bf2dee7dff5a) · [March 2019 platform](https://commons.wikimedia.org/wiki/File:Amtrak%27s_Crescent_arrives_at_Peachtree_station_in_Atlanta,_Georgia.jpg)

## Integration plan

The opt-in City station study frames the reserved site before Midtown coverage reaches it. The rail component will own its track profile, visible structure and train mesh pool. Coverage owns the generic terrain and streets. Suppress the depot footprint and overlapping bridge surface when attaching the component. The model reads the shared clock and scheduled train list.

Architect review, 23 November. Anchor track grade to open-track samples across the two DEM discontinuities. Reuse City selection and schedule state. Stage a local cutaway for inspection until the coverage tile mounts.

Product design review, 23 November. Keep scheduled position and illustrative consist distinct. Label the inferred berth. An empty timetable interval leaves the station empty. Use a single camera for both lighting checks.
