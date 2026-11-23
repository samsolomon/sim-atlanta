# The Candler Building and the storefront at 113 Peachtree

The 1906 Candler Building rises above Woodruff Park on an A-shaped plan. Its two-story stone base carries carved entrance surrounds. Nine paired bays march along Peachtree, while the narrower north elevation has paired windows at each corner and three windows between them. The top story has arched heads, with a deep bracketed cornice above. Looking north from the park, three braces cross the light court between the wings. The western end wall is plainer than the eastern one. [National Register description, pp. 1–3](https://npgallery.nps.gov/GetAsset/f7e981d5-40e9-40f5-af64-c585669c5ce1) · [Peachtree Center streetcar stop photograph](https://commons.wikimedia.org/wiki/File:Candler_Building_viewed_from_the_Peachtree_Center_Atlanta_Streetcar_stop.jpg) · [Woodruff Park photograph](https://commons.wikimedia.org/wiki/File:Downtown_Atlanta_skyline_looking_north_along_Peachtree_Street_from_Woodruff_Park.jpg) · [1959 night exterior](https://dlg.usg.edu/record/gsu_lane_15611)

At the south end of the Peachtree frontage, the March 2025 panorama shows a low, light-colored brick building. Its three shopfront openings have dark green frames. Above them sit five taller windows, a row of smaller attic openings and a brick parapet with projecting piers. The **Rising Roll** sign appears above the middle opening. The operator lists **113 Peachtree** and the hotel lists **127 Peachtree**. The renovation project describes an internally connected annex. These sources identify the photographed street frontage and uses, but do not establish a separate legal owner for the Overture polygon. The two buildings are modeled independently. The sign records the frontage as photographed in March 2025. [March 2025 Peachtree frontage](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7567059,-84.3883334&heading=104&pitch=8&fov=88) · [Rising Roll address](https://www.risingroll.com/menu-downtown-candler-building) · [Hotel address](https://www.hilton.com/en/hotels/atlcdqq-the-candler-hotel-atlanta/) · [Renovation project submission](https://ulidigitalmarketing.blob.core.windows.net/ulidcnc/sites/40/2022/03/Candler-Hotel.pdf)

| Element | Evidence and interpretation |
| --- | --- |
| Hotel | Overture ID `19774120-7c53-451e-abc4-538e31fdf018` gives 73.2 m and 17 stories. Of the 3,778 sampled lidar returns inside its outline, the lower roof clusters near 387.5 m NAVD88, with mechanical volumes near 392–393.4 m. The model places the membrane at 387.5 m and the high plant roofs at about 393.2 m. |
| Southern storefront | Overture ID `34e844fe-1076-4a70-b533-650c8f36085d` had two floors but 65.4 m of height. The 683 class-6 building returns at least 1 m inside its outline have a median of 333.2 m NAVD88. Low surrounding ground is about 323.2 m. This puts the membrane about 10 m above grade. The two return distributions were sampled independently. |
| Exterior details | Roof equipment footprints, cornice projection, sash and bracket sizes, doorway ornament, and the elevation of individual braces are estimates scaled from the photographs. The night lighting is illustrative. A 1959 photograph shows the entrances and display windows lit after dark. |

[USGS 2018 Georgia lidar](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Overhead image of the two roofs and park](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-84.3889175,33.7560404,-84.3869922,33.7576052&bboxSR=4326&imageSR=3857&size=920,820&format=jpg&f=image)

## City cameras

High quality, paused November 20, 2026 at 13:45, 17:22 and 20:30 EST. Reproduce the elevated views with `__city.lookAt(x,z,{bearing,tilt,metresPerPixel})` in development.

| Camera | Target, bearing, tilt, metres/pixel | Daylight | Dusk | Night |
| --- | --- | --- | --- | --- |
| Woodruff Park | (353, −368), 358°, 58°, 0.26 | [Before](park-day-before.jpg) · [After](park-day-after.jpg) | [Before](park-dusk-before.jpg) · [After](park-dusk-after.jpg) | [Before](park-night-before.jpg) · [After](park-night-after.jpg) |
| Historic Houston Street side | (337, −305), 158°, 55°, 0.25 | [Before](houston-day-before.jpg) · [After](houston-day-after.jpg) | [Before](houston-dusk-before.jpg) · [After](houston-dusk-after.jpg) | [Before](houston-night-before.jpg) · [After](houston-night-after.jpg) |

The street-level cameras use City coordinates in metres, with elevation relative to the scene datum. Each pair uses the same eye, target, field of view and clock.

| Camera | Eye (x, y, z) → target (x, y, z) | Vertical field of view | Daylight | Dusk |
| --- | --- | --- | --- | --- |
| Streetcar approach | (349, 5.1, −405) → (352, 27, −339) | 73° | [Before](streetcar-day-before.jpg) · [After](streetcar-day-after.jpg) | [Before](streetcar-dusk-before.jpg) · [After](streetcar-dusk-after.jpg) |
| 113 Peachtree frontage | (295, 3.4, −299) → (329, 5.1, −308) | 62° | [Before](store-day-before.jpg) · [After](store-day-after.jpg) | [Before](store-dusk-before.jpg) · [After](store-dusk-after.jpg) |
