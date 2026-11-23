# Two landmarks on Auburn Avenue

**1. Ebenezer Baptist Church, Heritage Sanctuary.** Prioritize the historic church at Auburn and Jackson for a street-level arrival in the King district. Its paired red-brick towers, central gable and sign projecting over the doorway are recognizable together from the intersection. A turn onto Jackson reveals two side gables and tall windows along the nave. The lower education wing sits east of a narrow lightwell. The newer Horizon Sanctuary stands across Auburn. [Before and after](comparison.jpg) · [National Park Service](https://www.nps.gov/places/ebenezer-heritage-sanctuary.htm)

**2. Big Bethel AME.** This is the stronger long-distance landmark on the western edge of the section. A tall square belfry and steep spire rise above the low blocks along Auburn. At the entrance, a short round turret, arched glazing and a projecting porch give the church an asymmetric profile. A cross gable is visible from Jesse Hill Jr Drive. The ranking reflects these two approaches and how much the previous generic buildings concealed. [City orbits and reverse views](orbit.jpg) · [Long view from Auburn](https://www.google.com/maps/@?api=1&map_action=pano&pano=Zcn-QPIvFnNEdU_Ods7Bng&heading=37&pitch=23&fov=94)

## Exterior evidence

| Building | Daylight, March 2025 | After dark |
| --- | --- | --- |
| Heritage | [Auburn frontage](https://www.google.com/maps/@?api=1&map_action=pano&pano=5Y3Q71dsJy1kqYNt2kcDKg&heading=160&pitch=10&fov=94), [corner](https://www.google.com/maps/@?api=1&map_action=pano&pano=bHIfq0tENJFSRSpUuLvpvg&heading=132&pitch=10&fov=94), [Jackson elevation](https://www.google.com/maps/@?api=1&map_action=pano&pano=73-FCTMBLUSVHQgA1nmcOQ&heading=87&pitch=10&fov=94) | The lettering and cross read pale blue-white against a dark blue sign. Brick around the entrance catches warm light. The NPS records restoration and relighting of the neon. [September 2012 sign photograph](https://www.shutterstock.com/image-photo/atlanta-ga-usa-september-19-neon-2741086213) · [NPS restoration](https://www.nps.gov/places/ebenezer-heritage-sanctuary.htm) |
| Big Bethel | [Auburn frontage](https://www.google.com/maps/@?api=1&map_action=pano&pano=HEM56Z6K3lNMAFwSiDasCQ&heading=350&pitch=10&fov=94), [Jesse Hill corner](https://www.google.com/maps/@?api=1&map_action=pano&pano=NMWU6x_ZrvbWqmUZU_yXcQ&heading=315&pitch=10&fov=94) | The denomination's program shows amber light on the tower and blue-white lettering high on the spire. The church describes its blue neon “Jesus Saves” sign. [2018 program, page 36](https://ameced.com/wp-content/uploads/2018/06/Program-book.pdf#page=36) · [Church anniversary bulletin](https://files.stablerack.com/WebFiles/96337/WorshipBulletin-10_20_24-177thChurchAnniversary_Bulletin2024.pdf) |

Both signs follow City's simulated night factor. Their size, support spacing, lettering, brightness and the reach of the warm light are illustrative. The photographs establish appearance at the time of capture. Fixture positions, present-day operating hours and interior occupancy are unknown. [Matched daylight and full-night views](night.jpg)

## What the lidar resolves

USGS returns acquired on April 22, 2019 constrain the roof heights. OpenStreetMap locates each footprint. The board uses local metres east (x) and south (z) of Five Points, 33.7539° N, 84.3916° W. Heights below are absolute orthometric metres on NAVD88. Subtract 323.8 m for scene y. The ground and the building returns are separate measurements. [USGS point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Heritage footprint](https://www.openstreetmap.org/way/173532779) · [Big Bethel footprint](https://www.openstreetmap.org/way/97337613) · [Ground registration](../sweet-auburn/README.md)

| Feature | Selected source returns | Model |
| --- | --- | --- |
| Heritage | 524 building returns on the east wing have a median of 312.55 m. The west front tower has 76, median 319.69 m. A narrow strip on the pitched nave reaches 319.66 m. | Wing cap 312.80 m, main tower cap 319.96 m and estimated nave ridge 320.10 m. |
| Big Bethel | Nine building returns near the nave ridge reach 315.42 m. The short turret's 69 building returns have a median of 315.76 m. In the spire-tip patch, five returns across all classes reach 336.84 m. | Nave ridge 315.65 m, round turret roof 315.85 m, square belfry cornice about 322.3 m and finial 336.72 m. |

The fitted roof planes, spire taper and finial interpolate between samples. The spire-tip returns fall outside LAS building class 6. Keeping only that class would lose the highest part of the silhouette. Window bays, trim, steps, stone courses, rear walls, sign mounts and roof-edge details are simplified from the available angles. The source cannot establish the exact sign or finial dimensions.

## Reproduce and integrate

Run the survey in the pipeline Python environment with NumPy, pyproj and laspy with LAZ support. The script prints the point counts, medians, 90th percentiles and maxima from fixed local-coordinate rectangles. Only the offline survey accesses USGS. [Selection script](../../../../pipeline/prototypes/sweet-auburn-churches/survey.py)

```sh
.venv/bin/python -B pipeline/prototypes/sweet-auburn-churches/survey.py
pnpm data:sweet-auburn
pnpm dev
```

Open `/?view=city&east=king-memorial&north=sweet-auburn&q=high&t=2026-11-20T10:15:00-05:00&speed=0`. Call `__city.lookAt(1500,500)` to approach via King Memorial, then use the poses below. Repeat with `t=2026-11-20T22:30:00-05:00` for the night plate. The street poses are inspection cameras with a 75° vertical field of view and y relative to the scene datum.

| Plate | Camera |
| --- | --- |
| Heritage orbit / reverse | Target x,z (1609,−151), bearing 145°, 0.15 m/px, tilt 48° / (1613,−150), 10°, 0.12 m/px, 58° |
| Bethel orbit / reverse | (1026,−215), 342°, 0.135 m/px, 53° / (1026,−214), 170°, 0.14 m/px, 55° |
| Heritage frontage / intersection | Eye (1609,−18,−195) toward (1610,−12,−158) / (1595,−18,−181) toward (1609,−12,−160) |
| Bethel intersection | Eye (1052,−25,−181) toward (1027,−9,−216) |

The Sweet Auburn loader replaces these two IDs when their footprints fall within valid terrain. It draws two architecture meshes and four sign faces, and releases them with the section. High and low quality share the measured elevations. Loader tests cast rays through both churches and Ebenezer's lightwell. For release, stage the King and Sweet Auburn data with `pnpm data:sweet-auburn`, run `pnpm build` and deploy the static build. Visitors use the existing area assets.
