# Odd Fellows Building and Auditorium, 228–250 Auburn Avenue

The six-story office tower stands at Bell Street, at the eastern end of the block. The two-story storefront and auditorium run west toward Jesse Hill Jr Drive, historically Butler Street. The Grand United Order of Odd Fellows financed the complex, and Black contractor Robert Pharrow built it. The older City view gave both footprints the same 8 m envelope and a 302.8 m NAVD88 roof. The result erased a 17 m change at the tower. [City and street comparisons](comparison.jpg) · [National Register nomination, description and history](https://npgallery.nps.gov/NRHP/GetAsset/cccd3162-d0fa-46e3-9694-7af5919e3343)

## What the roof survey resolves

In the baked OSM data, the Bell Street office tower is way 841048595 (“Odd Fellows Hall”). The broad auditorium is way 102163024 (“The Odd Fellows Building”). One metre inside those mapped outlines, 1,049 USGS building returns give a median elevation of 319.97 m for the tower. The auditorium's 2,390 returns have a median of 306.03 m. Each median combines multiple roofs. The smaller probe rectangles below pick out the change in level within each footprint. [Tower footprint](https://www.openstreetmap.org/way/841048595) · [Auditorium footprint](https://www.openstreetmap.org/way/102163024) · [USGS point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)

| April 2019 roof sample | Building returns | Median, m NAVD88 |
| --- | ---: | ---: |
| Auburn storefront roof | 332 | 304.07 |
| North eave strip at the rear hall | 100 | 306.00 |
| Raised hall ridge strip | 95 | 310.02 |
| Bell Street tower, rear roof | 266 | 317.24 |
| Tower roof toward Auburn | 241 | 320.02 |
| Small upper projection | 17 | 321.63 |

The model follows these six heights. The front tower roof sits 2.78 m above the rear one. The auditorium ridge rises 5.95 m above the storefront roof and sits behind it. The ground foundation on both board tiers is 294.80 m NAVD88. City x points east and z south in local metres from Five Points (33.7539° N, 84.3916° W), and scene y equals NAVD88 metres minus 323.8. Hip slopes, ridge endpoints, the small upper volume's footprint and parapet thickness are estimated. The lidar predates the tower's renovation. [Roof views](roofs.jpg) · [Survey script and selection rectangles](../../../../pipeline/prototypes/odd-fellows/survey.py)

## Streets and light

March 2025 panoramas show two distinct street fronts. The office tower has pale stone at the street, tall dark-red brick piers, light spandrel diamonds, arched fifth-floor windows and raised end bays. The auditorium has two rows of glazing with a pale string course, low crenellations and a projecting awning over its entrance. Looking west from Bell and east from Jesse Hill establishes the order of the buildings. The Library of Congress preserves photographs and measured drawings of both. [Bell Street corner](https://www.google.com/maps/@?api=1&map_action=pano&pano=IxQd8JKSNNYSW6vqh9QzJw&heading=304&pitch=10&fov=94) · [Auditorium frontage](https://www.google.com/maps/@?api=1&map_action=pano&pano=CXOVeRt9IxrWlTHnR2V0AQ&heading=350&pitch=10&fov=94) · [West corner](https://www.google.com/maps/@?api=1&map_action=pano&pano=-8A7JbVMP7YgltkPA3_U9w&heading=51&pitch=10&fov=94) · [HABS record](https://www.loc.gov/item/ga0209/)

The 2015 frontal photograph resolves single windows in the end bays and groups of three in the middle. The March 2025 rear view shows construction scaffolding. Maria Saporta's April 2026 opening-day photograph shows the restored tower behind the auditorium's dark awning. The model uses the finished masonry. It simplifies window depths, carving, storefronts and rear openings. The small projecting blocks suggest the tower's carved heads at City scale. Individual portraits and inscriptions require finer detail. [Frontal photograph](https://www.flickr.com/photos/sminor/18474674983) · [Rear view during restoration](https://www.google.com/maps/@?api=1&map_action=pano&pano=ka-ueVptQKCw0M3O_0ANYA&heading=232&pitch=10&fov=94) · [Opening-day exterior](https://i0.wp.com/saportareport.com/wp-content/uploads/2026/04/oddfellows-building-1030x773.jpg)

**Night evidence is limited.** The dated building photographs above show daylight. The night photograph of nearby Big Bethel establishes its own illuminated spire, but gives no usable view of the Odd Fellows street fronts. I could not verify facade floodlighting, lettering illumination or a pattern of occupied windows for this complex. In the full-night model both facades use ambient City lighting, with no dedicated emissive surfaces. [Matched day and night views](night.jpg) · [Big Bethel night photograph, program page 36](https://ameced.com/wp-content/uploads/2018/06/Program-book.pdf#page=36)

## Reproduce and release

Run the survey with the pipeline Python environment (NumPy, Shapely 2, pyproj and laspy with LAZ support). Source LAZ nodes are cached under the ignored data directory. The model uses the two existing area footprints and the Sweet Auburn building batch.

```sh
.venv/bin/python -B pipeline/prototypes/odd-fellows/survey.py
pnpm data:sweet-auburn
pnpm dev
```

Open `/?view=city&east=king-memorial&north=sweet-auburn&q=high&t=2026-11-20T10:15:00-05:00&speed=0`. Approach King with `__city.lookAt(1500,500)`, then use `__city.lookAt(1090,-205,{bearing:340,metresPerPixel:.22,tilt:54})`. Use 22:30 EST for the corresponding full-night frame. The reverse view uses the same target with bearing 148°, 0.21 m/px and tilt 56°. Street captures use a 75° vertical field of view and the following City coordinates in metres.

| Street view | Camera x,y,z | Look at x,y,z |
| --- | --- | --- |
| Bell Street | 1129, −24, −174 | 1110, −14, −204 |
| Auburn Avenue | 1099, −24, −162 | 1093, −15, −201 |
| Jesse Hill Jr Drive | 1041, −24, −164 | 1085, −17, −202 |

The area-loader test casts rays through the storefront, ridge and both tower roofs on high and low quality. For release run `pnpm data:sweet-auburn`, then `pnpm build` and deploy the static output. The visitors' existing area files supply all inputs.
