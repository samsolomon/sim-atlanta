# Corey Tower on the Georgia State approach

From the eastern approach to Georgia State, the former steam stack rises to the south of the tracks. The generic City model put a 91.44 m high, 16 m wide, window-banded cylinder there. The bands read as floors, and its constant diameter made the shaft almost twice as wide as its real crown. A low dark circular base, a tapering white shaft, the rim and a single red display now identify it from across the viaduct. [Original southbound photograph](https://commons.wikimedia.org/wiki/File:Downtown_Connector_sb_Exit_247_exit_only_and_Corey_tower.jpg) · [Owner's front view](https://coreycompanies.com/wp-content/uploads/2023/02/Corey02-30-copy-redesing-1280x720.jpg) · [Owner's blank reverse with the rail approaches](https://coreycompanies.com/wp-content/uploads/2023/09/CT_back-view-copy-1280x720.jpg)

## Location and sightlines

The 19-vertex Overture footprint `fc0ebaec-e791-4f06-8a3d-b560d49032f2` measures 16.02 × 16.01 m. Its bounding-box centre is **33.748293° N, 84.383093° W** or **(786.51, 623.47)** in City. The board extends from −1000 to +1000 in x and −1300 to +700 in z. The centre is 76.53 m inside the southern edge and the full base clears it by 68.53 m. The media inventory pin, 33.748343° N, 84.383111° W, is about 5.8 m north-northwest of centre. City uses the mapped footprint for placement. [OSM way 88727583](https://www.openstreetmap.org/way/88727583) · [Media inventory sheet](https://reevesshawmedia.com/wp-content/uploads/2020/07/CT01-Reeves-Shaw-Media.pdf)

The media sheet calls the display north-facing for southbound traffic on the Grady Curve. Its precise angle matters on the railway. In the 2018 lidar, the outer panel edges rise near City (786, 617) and (792, 622.5). A perpendicular facing the Connector points roughly **40° east of north**, an estimate. The train path at (909, 559) lies at bearing 62° from the stack and has an oblique front view. Near (699, 543), the track is northwest of the stack and the screen is nearly edge-on. From south of the site, only the white shaft and crown read above the low plant. The red ATL card is a fixed illustrative house design drawn from the owner's promotional image. [Owner’s tower gallery](https://coreycompanies.com/atl-tower/) · [Southbound driver’s view](https://commons.wikimedia.org/wiki/File:Downtown_Connector_sb_Exit_247_exit_only_and_Corey_tower.jpg)

## Dimensions

| Element | Measurement and treatment |
| --- | --- |
| Base and nominal height | The 16 m footprint includes the base. Both OSM and the bake give 91.44 m (300 ft) of height. The model uses this to the rim, plus small estimated roof fittings. |
| Shaft | Upper lidar returns narrow from roughly 5.3 m radius near the foot to 3.9–4.1 m near the crown. The model tapers linearly from 5.48 m to 3.87 m. Ground at centre is 313.39 m NAVD88. The highest nearby lidar return is approximately 407.1 m NAVD88, including rooftop fittings. |
| Display | The published active area is 25 ft wide by 80 ft high (7.620 × 24.384 m). The upper frame returns cluster around 382.7–383.0 m NAVD88. The model sets the active top at 382.75 m as an estimate. |
| Secondary details | The shoulder height, backing depth, brackets, roof fittings, letterforms and colours are illustrated from the photographs. The dark base follows the local slope at its foundation. |

The lidar sample uses the public Georgia Statewide B2 2018 point cloud, depth 7–10 tiles, filtered within 9.2 m of the mapped centre. The base, shaft and sign use only local geometry in the existing City build. A web rebuild and deployment pick up the change with the existing bake. [USGS point cloud metadata](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Display dimensions](https://reevesshawmedia.com/wp-content/uploads/2020/07/CT01-Reeves-Shaw-Media.pdf)

## City cameras

Use a 1446 × 876 desktop Orca viewport, high quality and a paused clock on November 20, 2026. The daylight frames use 14:12:45 EST and dusk uses 17:19:00 EST. Call `__city.lookAt(x, z, {bearing, metresPerPixel, tilt})` in a development build. These are elevated context views.

| Direction of view | Target (x, z) | Bearing | Scale | Tilt | Frames |
| --- | --- | ---: | ---: | ---: | --- |
| Southbound along the Connector | (786, 609) | 206° | 0.27 m/px | 70° | [Before](log/ui/corey-tower/connector-before.jpg) · [Daylight](log/ui/corey-tower/connector-day.jpg) · [Dusk](log/ui/corey-tower/connector-dusk.jpg) |
| From the eastern rail approach toward Georgia State | (786, 586) | 242° | 0.42 m/px | 71° | [Before](log/ui/corey-tower/east-rail-before.jpg) · [Daylight](log/ui/corey-tower/east-rail-day.jpg) · [Dusk](log/ui/corey-tower/east-rail-dusk.jpg) |
| From the south toward downtown | (786, 600) | 334° | 0.44 m/px | 62° | [Before](log/ui/corey-tower/reverse-before.jpg) · [Daylight](log/ui/corey-tower/reverse-day.jpg) · [Dusk](log/ui/corey-tower/reverse-dusk.jpg) |
