# The Downtown Connector at Georgia State

City paints a **14 m mainline in each direction**. On either side of the rail bridges, edge-line to edge-line, the aerial reads **about 24–25 m per direction before shoulders**. The model also opens a 15–18 m gap between the mainlines where the two inner shoulders and divider together occupy about 6 m. For M2b, align the inner and outer edge lines first, then connect the changing outer lanes to their ramps. [Annotated comparison](log/2026-11-21-connector-footprint.png)

## Two identifiable cross-sections

Widths are metres **along the same northwest-to-southeast transect**. The aerial columns cover the marked travel lanes, including lanes entering or leaving the freeway. The City columns intersect the deployed mainline paint at its actual angle. Separate links are drawn in the figure. Endpoints are visual picks on Fulton County's 2024 Pictometry orthophoto. Allow about ±1 m per edge, or up to ±2 m on a width. The decks obscure the road directly below them. [Fulton 2024 imagery](https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/Imagery/Pictometry2024_NAIP/MapServer) · [Local source tile 22286E136250N](https://gismaps.fultoncountyga.gov/arcgispub/rest/services/Download/AerialDownloadToolPictometry2024/MapServer/0/1248) · [USDA NAIP comparison image, 8 October 2023](https://planetarycomputer.microsoft.com/api/stac/v1/collections/naip/items/ga_m_3308421_ne_16_060_20231008_20240103)

| Section and WGS84 anchor | SB aerial / City | NB aerial / City | Inside edge to inside edge, aerial / City |
| --- | ---: | ---: | ---: |
| A · south of the MARTA deck, before the NB feeder joins · 33.748589, −84.384037 | ≈25 / 14.2 | ≈25 / 14.3 | ≈6 / 15.0 |
| B · north of the freight decks, before Decatur Street · 33.749414, −84.382713 | ≈24 / 14.1 | ≈25 / 14.0 | ≈6 / 17.8 |

At the mapped freight bridge itself, the City mainline strokes are still 14 m wide normal to travel. The aerial exposes the approach and departure markings. The pavement directly beneath each deck is occluded, so continuity across that short interval is inferred.

**Northbound, on the southeast side.** At A, seven striped lanes occupy the adjoining pavement. The mapped five-lane mainline and two-lane feeder converge near the rail decks into a seven-lane way at B. A separate entrance farther east continues beside those seven lanes at B. City paints each link 6.5 m wide. At A the feeder overlaps the mainline stroke, bringing their painted union to only 16.1 m. The managed lane is along the median. [Five-lane approach](https://www.openstreetmap.org/way/949112684/history/8) · [Two-lane feeder](https://www.openstreetmap.org/way/39160892/history/6) · [Seven-lane mainline](https://www.openstreetmap.org/way/119686423/history/23) · [Separate NB entrance](https://www.openstreetmap.org/way/9235923/history/10)

**Southbound, on the northwest side.** Follow travel from B to A. B has seven marked lanes, including the inside managed lane. The rightmost is exit-only and its neighbour can continue or exit toward I‑20. Near A the road graph splits into a six-lane mainline and a two-lane I‑20 branch with a shared choice lane at the split. Their City paint overlaps at A. The separate MLK Jr. Drive exit runs farther outside both sections. These lane functions are mapped interpretations supported by the stripe and gore transitions. [SB approach and lane destinations](https://www.openstreetmap.org/way/316454382/history/12) · [Continuing SB mainline](https://www.openstreetmap.org/way/119686426/history/19) · [I‑20 exit](https://www.openstreetmap.org/way/9236888/history/18) · [MLK exit](https://www.openstreetmap.org/way/9236952/history/13)

**Shoulders and median.** The yellow inside edges enclose a narrow physical barrier and roughly 2–3 m of shoulder on either side. At A there is about 4–5 m from the SB outer white line to the adjacent ramp barrier. The NB outer margin widens into roughly 9–10 m of pavement and shadow before the retaining edge. At B the SB outer white line is about 4 m from the adjacent ramp marking. The NB outer margin leads into the entrance taper. Shadow, gore paint and adjacent ramp pavement prevent a reliable constant outer-shoulder width there. The figure shows the measured inside-edge gap as a band. Barrier thickness and under-deck shoulder widths remain unresolved. [County aerial viewer](https://fultoncountyga.gov/Maps)

## Traffic records

AADT is annual average daily traffic in vehicles/day. GDOT's labels below describe how it produced each **2025 annual estimate**. Even “Actual” is a short-term station observation expanded to an annual average. Coordinates distinguish the nearby mainline and ramp records. [GDOT 2025 station workbooks, ZIP](https://myfiles.dot.ga.gov/OTD/RoadAndTrafficData/Traffic_Tabular.zip) · [GDOT traffic reporting](https://www.dot.ga.gov/GDOT/Pages/RoadTrafficData.aspx)

| GDOT station and location | 2024 AADT | 2025 AADT | 2025 method |
| --- | ---: | ---: | --- |
| 121-5472 · Connector mainline south of the rail crossing · 33.748680, −84.383821 | 253,000 | 237,000 | Calculated |
| 121-R024 · NB entrance alongside B · 33.749188, −84.382510 | 10,400 | 10,400 | Estimated |
| 121-R623 · SB exit north of B · 33.750114, −84.382430 | 5,450 | 5,140 | Actual, short-term |

The **2024 FHWA inventory** reports 253,000 vehicles/day, 13 through lanes and two managed lanes on the two-way I‑75 record at both cuts. The non-inventory direction has no separate AADT. Count this mainline volume once. FHWA excludes auxiliary and exit lanes and includes qualifying managed lanes in the through total. Seven painted positions per side can therefore coexist with 13 inventory through lanes. The source gives no directional 6/7 split, ramp turning proportions or observed hourly volumes at these rail bridges. The existing 2023 Freedom Parkway hourly profile is a different site. [FHWA section A](https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/HPMS_National_Current/FeatureServer/0/3424052) · [FHWA section B](https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/HPMS_National_Current/FeatureServer/0/3441826) · [FHWA field definitions, items 7–9](https://www.fhwa.dot.gov/policyinformation/hpms/fieldmanual/page05.cfm)

## Rechecking the comparison

At deployed revision `ff92f13`, the terrain painter strokes a motorway at 14 m and a motorway link at 6.5 m, with one dashed centre marking on the mainline. For a road at angle θ to the section normal, its apparent section width is stroke width divided by |cos θ|. The diagram intersects every local at-grade motorway run and preserves the overlap between links and mainlines. [Width function](../web/src/terrain/transport-data.ts) · [Ground painter](../web/src/terrain/ground-map.ts)

To repeat the aerial picks, start at City (x, z) = (760, 545) m. Move along (0.8, −0.6) by −76 m for A or +77 m for B. Read offsets along (0.6, 0.8), using the mainline outer white and inner yellow markings. At A the four edge offsets are −40.8, −16.0, −10.4 and +14.6 m. At B they are −33.6, −9.2, −3.2 and +21.8 m. Decimal places locate the picks for inspection. Use the rounded widths for modelling. With downtown data staged, run `.venv/bin/python pipeline/prototypes/connector-footprint/figure.py` to regenerate the figure with NumPy, rasterio, pyproj and matplotlib. It reads only a window from the pinned public NAIP tile. [Figure script](../pipeline/prototypes/connector-footprint/figure.py)
