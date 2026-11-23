# Midtown Connector and Brookwood split

The five rows add 103 directed OSM ways to the downtown lane graph. Northbound traffic reaches I‑75 at the west edge and I‑85 at the north edge. Southbound traffic from each edge reaches the existing Georgia State screenline. At the nine-lane southbound merge, keeping every driver in a fixed lane sent all the I‑75 arrivals toward exits. A through driver now moves one lane inward over 160 m south of 14th Street. The two covered ways beneath Fifth Street keep their routes and conceal their vehicles through the lid. Traffic, speed and lane choice are illustrative. [Archived OSM row maps, © OpenStreetMap contributors, ODbL](../pipeline/prototypes/square-board/source) · [Downtown traffic model](connector-traffic.md)

## Plan and lighting references

The daytime aerial looks along several consecutive overpasses. From road level at exit 251, the guide signs place I‑85 ahead on the left and I‑75 on the right. The Brookwood branches cross after the lanes divide. The Fifth Street night photograph shows warm roadway lighting and opposing streams of headlights and taillights. The aerial night view shows the same directionality and uneven brightness between street crossings. These are historical views. Current lane counts come from the archived OSM ways. Nighttime lamp spacing and illumination on individual ramps are unmeasured. [Daytime aerial](https://commons.wikimedia.org/wiki/File:Downtownconnectoratlantaaerial.jpg) · [Northbound exit 251](https://commons.wikimedia.org/wiki/File:2016-03-23_13_19_35_View_north_along_The_Downtown_Connector_%28Interstate_75_and_Interstate_85%29_at_Exit_251_in_Atlanta,_Georgia.jpg) · [Fifth Street looking south at night](https://commons.wikimedia.org/wiki/File:Downtown_connector_nighttime.jpg) · [Aerial night view](https://www.youtube.com/watch?v=S3SEHKbHR1I)

The highway ribbons estimate lane pitch at 3.55 m. Shoulder allowances are 1.8 m per side on a mainline deck and 0.7 m on a link. The road-building code uses the directed OSM lane counts and reuses the same stripe positions for the pavement and traffic. Around the fork, adjacent branches share the common stripe grid at the nose. The 2025 FHWA Georgia bridge inventory supplies curb-to-curb widths and structure lengths for the named road crossings. North Avenue's inventory records five lanes and its mapped way records four. City follows the four mapped travel lanes. The internal stripe positions are estimates. [FHWA Georgia 2025 inventory](https://www.fhwa.dot.gov/bridge/nbi/2025/delimited/GA25.txt) · [North Avenue way](https://www.openstreetmap.org/way/38976991)

| Crossing | Structure number | Inventory length | Roadway width | Modeled lanes |
| --- | --- | ---: | ---: | --- |
| North Avenue | 12100220 | 77.1 m | 21.3 m | 2 each way |
| 10th Street | 12104070 | 64.9 m | 25.6 m | 3 and 4 |
| 14th Street | 12153370 | 120.7 m | 11.6 m per modeled carriageway | 3 each way |
| Deering Road | 12104050 | 88.7 m | 8.5 m | 1 each way |

## Decks and ground

At 29 mapped structural runs, 245 of 270 longitudinal elevation samples are medians of class‑17 bridge-deck returns within 2.5 m. A sample needs five returns and a 10th–90th percentile spread below 0.8 m. Intervening heights and short abutment extensions are inferred. At an extrapolated landing the adjacent bare-earth grid supplies a lower bound. The 63 approach pieces blend each connected street or ramp's deck grade into its own rendered terrain triangles. Structural thickness, crossfall between observations and the approach curves are inferred. All absolute elevations are NAVD88 metres. [USGS GA Statewide B2 2018 lidar](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Survey scripts](../pipeline/prototypes/midtown-connector) · [Frozen profiles and measured indices](../web/src/city/fixtures/midtown-connector/decks.json)

* **Brookwood flyovers.** The exposed class‑2 pavement on ramp way 29013401 rises from about 255.5 to 257.3 m across the stacked interchange. Through the covered stretch the overhead returns are around 265–267 m. At (−193.42, −4685.54) the modeled I‑85 tread is 9.54 m above the lower ramp. The fitted road grade corrects 84 five-metre grid nodes on the south Brookwood row.
* **Peachtree Street.** Class‑2 returns on the I‑85-to-I‑75 ramp on opposite sides of the cover measure 260.03 m and 260.84 m at 25 m from the crossing. The deck above returns 273.17 m at the center. The underpass correction covers this ramp, both mainlines and the two GA‑13 carriageways, changing 61 station-row grid nodes. The mapped outer walks follow the depot model's 273 m road deck. The existing rail model still controls the track and station. At the rail crossings the nearest ground nodes on the two I‑75 carriageways measure 255.3 and 253.9 m against the inferred rail bed near 267 m. [Depot, grade and bridge inventory](brookwood-rail.md)
* **17th Street.** The east approach sidewalk follows the finished bank. The landmark supplies its existing deck, ramp mouths and lighting. At x 12.3 the integrated bridge test checks more than 15 m from lower road to upper pavement and more than 12 m from the road to the first upward ray hit. A Midtown test samples the open traffic routes every 3 m on both quality tiers. [Landmark survey](seventeenth-street.md) · [Traffic and ground checks](../web/src/city/midtown-connector.test.ts)

### Rectangle elevation register

All 57 Midtown road findings were checked at their registered coordinates on low detail. The default rectangle supplies the generic deck and campus-footway corrections. Kendeda's walk is owned by the park team. The smallest signed differences below are measurements of rendered surfaces. The register's crossing test uses pavement elevation on both roads. Structural depth must still be subtracted to estimate vehicle headroom. [Original register and cameras](rectangle-elevation.csv)

| Row | Formerly buried tread points | Smallest tread above terrain | Flagged crossings | Smallest upper minus lower pavement |
| --- | ---: | ---: | ---: | ---: |
| Midtown south | 1 | 2.22 m | 11 | 5.92 m |
| Midtown central | 2 | 0.12 m | 2 | 6.77 m |
| Midtown upper | 3 | 0.15 m | 10 | 4.46 m |
| Brookwood south | 8 | 0.12 m | 11 | 6.12 m |
| Brookwood station | 4 | 0.12 m | 5 | 6.76 m |

### Matched cameras

Use `/?view=city&cam=-190,-4650,10,52,1210&q=high&weather=clear&speed=0&t=2026-11-20T14:00:00-05:00` for the split. Change the clock to 23:30 for full night. Each camera records x, z, bearing, tilt and orbit distance. Review used Orca over localhost. Rebuilding the web bundle includes the fixtures. The existing rectangle terrain pack supplies the base grids.

| Camera | Low day / night | High day / night |
| --- | --- | --- |
| Brookwood split, −190,−4650,10,52,1210 | [Day](log/ui/midtown-connector/split-low-day.jpg) · [Night](log/ui/midtown-connector/split-low-night.jpg) | [Day](log/ui/midtown-connector/split-high-day.jpg) · [Night](log/ui/midtown-connector/split-high-night.jpg) |
| 17th Street, 12,−4191,−12,50,820 | [Day](log/ui/midtown-connector/seventeenth-low-day.jpg) · [Night](log/ui/midtown-connector/seventeenth-low-night.jpg) | [Day](log/ui/midtown-connector/seventeenth-high-day.jpg) · [Night](log/ui/midtown-connector/seventeenth-high-night.jpg) |
| 14th Street, 44,−3640,7,50,820 | [Day](log/ui/midtown-connector/fourteenth-low-day.jpg) · [Night](log/ui/midtown-connector/fourteenth-low-night.jpg) | [Day](log/ui/midtown-connector/fourteenth-high-day.jpg) · [Night](log/ui/midtown-connector/fourteenth-high-night.jpg) |
