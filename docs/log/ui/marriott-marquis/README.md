# Atlanta Marriott Marquis

The white hotel rises behind Marquis One and Marquis Two. From Peachtree Center Avenue, the narrower end of the hotel and its two glazed slots are visible between the office towers. The Courtland Street side exposes the depth of the guest-room floors as they fan out around the lower atrium. Portman’s close-up shows how individual concrete panels meet the recessed glazing. The freeway-level Street View under the overpass yielded no useful view of the tower. [West entrance photograph](https://portmanarchitects.com/wp-content/uploads/2019/03/New_Slider03.jpg) · [Courtland oblique](https://portmanarchitects.com/wp-content/uploads/2019/03/New_Slider04.jpg) · [Lower facade detail](https://portmanarchitects.com/wp-content/uploads/2019/03/New_Slider05.jpg) · [Connector viewpoint](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=33.7627852,-84.3822857&heading=241&pitch=18&fov=88)

The City bake assigns 20.53 m and three floors to one T-shaped hotel footprint. Three stories do describe its podium in the Peachtree Center historic-district survey. The office towers flanking its entrance have separate mapped IDs. Portman lists 554 ft and prints an inconsistent metric equivalent. 554 ft converts to 168.9 m. The model uses the surveyed roof elevations below, so its visible height varies with the grade around this block. [Historic-district survey, pp. 70–71](https://saportakinsta.s3.amazonaws.com/wp-content/uploads/2017/09/Peachtree-Center-HD-Final-4-24-17.pdf) · [Portman project sheet](https://portmanarchitects.com/project/atlanta-marriott-marquis-hotel/)

| Element | Evidence and interpretation |
| --- | --- |
| Site | Overture ID `f36a8d1a-981d-4229-bfcf-f2635e5ab028`. The study samples 43,524 USGS lidar returns inside that footprint. City x increases east and z south. |
| Podium | Roof returns cluster near 325–326 m NAVD88 west and south of the tower, and 334.1–334.6 m along Baker Street. The model uses 326.1 and 334.3 m. The depth of the west entrance recess and its piers are photo estimates. |
| Guest-room tower | The rectangular upper roof spans about 85 × 32 m, centred near City (624.4, −854.5). The lower faces bow out by roughly 18–19 m at midspan. At 402 m NAVD88 that offset has shrunk to about 6.5 m. The model interpolates eight vertical intervals and fits a parabola across each floor. |
| Roof | Main deck 466.9 m NAVD88. The raised skylight and plant housing reach about 469–470 m. The highest small fitting returns are 471.6 m. Forms, exact skylight glazing and parapet thickness are estimates. |
| Facade | 22 bays, 44 repeated guest-room bands, pale precast fins, dark end glazing and the extent of the solid panels are scaled from photographs. They do not establish the number of occupied floors. The room lights at dusk are illustrative. |

[USGS 2018 Georgia point cloud](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json)

## Matched City views

High quality, paused November 20, 2026 at 13:45 and 17:22 EST. Reproduce in a development build with `__city.lookAt(x,z,{bearing,tilt,metresPerPixel})`.

| Camera | Target, bearing, tilt, metres/pixel | Daylight | Dusk |
| --- | --- | --- | --- |
| Courtland and Connector | (621, −851), 301°, 57°, 0.54 | [Before](courtland-day-before.jpg) · [After](courtland-day-after.jpg) | [Before](courtland-dusk-before.jpg) · [After](courtland-dusk-after.jpg) |
| Baker and Peachtree Center | (615, −854), 162°, 57°, 0.55 | [Before](baker-day-before.jpg) · [After](baker-day-after.jpg) | [Before](baker-dusk-before.jpg) · [After](baker-dusk-after.jpg) |

At 20:30 EST the pale fins fall into shadow and scattered guest-room windows light the two broad faces. Portman’s evening photograph shows the mostly dark end and the illuminated driveway between the offices. Individual occupied rooms are illustrative. [Evening reference](https://portmanarchitects.com/wp-content/uploads/2019/03/New_Slider02-3.jpg) · [Courtland at night](courtland-night-after.jpg) · [Baker at night](baker-night-after.jpg)

## Splayed piers on the lower bulge (November 23)

At the normal 490 m orbit Sam saw a tall cream band smeared down the middle of the curved south face. The cause was geometry, not texture or lighting. An ellipse of one-sided stone wedges, centred on 358 m NAVD88 and spanning ±35 m, filled up to 2.45 m of each 3.85 m bay from its left pier. Lit by the sun, the wedges turned two-thirds of the glass the colour of the frame. At about 0.3 m per pixel the remaining panes aliased into vertical streaks.

Day and night photographs show something different. Above the terrace the piers splay into V fins, symmetrical about each pier. The fins are widest at the base and the middle of the face, and they fade out about a dozen floors up. Every window stays a centred dark pane, narrowed to roughly half the bay at the base. The night photograph shows uplit fins and scattered lit rooms across both faces. [Day, broad face from Peachtree Center Avenue](https://commons.wikimedia.org/wiki/File:Atlanta_Marriott_Marquis_Hotel,_Atlanta,_GA_(47474200091).jpg) · [Day, oblique over the podium](https://commons.wikimedia.org/wiki/File:Atlanta_Marriott_Marquis_Hotel,_Atlanta,_GA_(46558854255).jpg) · [Night, base of the bulge](https://commons.wikimedia.org/wiki/File:Atlanta_Marriott_Marquis_Hotel,_Atlanta,_GA_(33597634798).jpg)

The model now widens each pier by up to 0.75 m on each side. The flare falls off with the square of the distance from the middle of the face (zero at ±34 m) and linearly over the 38 m above the terrace. Each cheek takes a stone a shade darker than the pier face. The 0.75 m limit, the 38 m fade and the cheek colour are estimates from the photographs. The fin uplighting is not modelled. Lit rooms are illustrative. No material or shader program was added.

| View | City camera | Comparison |
| --- | --- | --- |
| Normal orbit, day 11:30 | `557,-862,-14,52,490` | [Before and after](day-before-after.jpg) |
| Normal orbit, night 23:30 | `557,-862,-14,52,490` | [Before and after](night-before-after.jpg) |
| Lower bulge, day 11:30 | `615,-878,-8,62,230` | [Before and after](near-before-after.jpg) |

All three use November 20, 2026, clear weather and a paused clock at default quality. Web rebuild only.
