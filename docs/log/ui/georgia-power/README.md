# Georgia Power headquarters at the east edge of City

The 24-story office tower at 241 Ralph McGill Boulevard shades its own south-facing windows. Each floor projects 15 inches (0.381 m) past the one below. From the southwest, the silver sunscreen tubes run across a broad recessed face and stop at a narrow strip of dark glass. Around the corner, the other elevations read as flat sheets of smoked glass. City models the steps and the returns in geometry and uses the same skyline-reflection material as the Westin and Truist Plaza. [Building Owners and Managers Association](https://bomalegacy.org/legends/tobyawards/georgia-power-headquarters-2/) · [Project architect’s account in *Architecture*, March 1989](https://www.usmodernist.org/AJ/A-1989-03.pdf) · [South street elevation](https://henryinc.com/wp-content/uploads/2023/11/Georgia_Power_Building_Atlanta_GA_47474220191-Crop--scaled.jpg) · [Oblique aerial](https://henryinc.com/wp-content/uploads/2023/11/DJI_0001-scaled.jpg) · [Closer aerial of the opposite face](https://henryinc.com/wp-content/uploads/2023/11/DJI_0003-scaled.jpg)

## Three heights in two footprints

| Element | Source geometry | Survey and treatment |
| --- | --- | --- |
| Office tower | North end of Overture `0831390e-07dd-4e8b-8eff-1e70d35e1c55`. The source assigns 11.7 m to the entire outline. | 4,099 class-6 returns across the broader survey fall between 394.7 and 395.3 m NAVD88. The model roof is at 395.0 m. The roof plate is approximately 56 × 40 m, with the highest small fittings about another metre above the deck. |
| Curved low roof | The same footprint sweeps southwest and south from the tower. The baked east edge reaches City x = 1,002.54 m. | Low roof returns cluster at 306.1 m NAVD88. The low roof follows the source curve to the board cut at x = 1,000 m. Its exposed wall has 5 cm of clearance from the rendering clip plane. The tower itself fits inside the board. |
| East annex | Overture `98ea45a8-aec5-4eab-b1b1-77a136c99a38`, about 15.5 × 39 m. The bake assigns 100.2 m and two floors. | Of the 948 class-6 points at least 1 m inside the ring, the median is 301.7 m NAVD88 and the 98th percentile is 303.8 m. City gives the annex its own light roof at the median and a small equipment housing. Its terrain foundation is independent of the tower. |

The survey uses the USGS Georgia Statewide B2 2018 point cloud, EPT depths 7–10, projected to City's east/south metres. The sample at least 1 m inside the combined headquarters outline contains 17,082 building-class returns across the high and low roofs. The lidar establishes horizontal roof surfaces. The architect’s account and the street photograph supply the nearly vertical stepped façade, which the roof returns alone cannot resolve. The ground DEM sets the foundation. [USGS EPT metadata](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Overture building data](https://docs.overturemaps.org/guides/buildings/)

The overhead image shows a curved brick perimeter, light roof, long glazed strip at the tower foot and several small panel fields farther south. Panel layout, roof fittings, brick colour, the width of the vertical glass strip and the tower’s individual floor heights are estimates. Each named footprint is checked independently, so a missing or mismatched feature can retain its generic treatment. [Overhead imagery of the complex](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-9393364.32%2C3996954.39%2C-9393177.69%2C3997121.76&bboxSR=3857&imageSR=3857&size=1000%2C897&format=jpg&f=image)

## Evening light

The arrival guide’s dusk photograph shows a gold reflection on one flat elevation and mostly dark glass on the adjacent face. The DOE lighting presentation includes two full-night exterior photographs of the headquarters grounds. They resolve pools of light on the paving. Henry documents two 100-foot LED signs near the roof, and Southern Company records their illumination. City uses simple white lettering and a fixed, illustrative pattern of office lights. The available photographs do not resolve the upper offices well enough to establish their ordinary full-night occupancy or brightness. [Dusk arrival photograph](https://www.southeasternrtp.com/docs/general/2023/Parking_HQ_Directions.pdf#page=1) · [Nighttime grounds, slide 12](https://www1.eere.energy.gov/buildings/publications/pdfs/ssl/smalley_msslc_lightfair2012.pdf#page=12) · [Sign fabricator](https://henryinc.com/portfolio/georgia-power-rebrand/) · [Owner’s illumination account](https://www.southerncompany.com/newsroom/community/2017-01-20-so-new-branding.html)

## Matched City cameras

Desktop Orca, 1200 × 850, high quality. Before uses commit `4a42a34` and the same downtown bake. Pause the clock at June 21, 2026, 10:30 or 23:00 EDT. Use `/?view=city&q=high&t=2026-06-21T10:30:00-04:00&speed=0` and `__city.lookAt(x,z,{bearing,tilt,metresPerPixel})` in a development build.

| View | Target (x, z), bearing, tilt, metres/pixel | Daylight | Full night |
| --- | --- | --- | --- |
| South façade from the southwest | (973, −1093), 28°, 58°, 0.27 | [Before](south-day-before.jpg) · [After](south-day-after.jpg) | [Before](south-night-before.jpg) · [After](south-night-after.jpg) |
| East annex and cut edge from the northeast | (958, −1027), 225°, 47°, 0.36 | [Before](annex-day-before.jpg) · [After](annex-day-after.jpg) | [Before](annex-night-before.jpg) · [After](annex-night-after.jpg) |

The web bundle needs a rebuild and deployment. The corrected geometry uses the existing City bake.
