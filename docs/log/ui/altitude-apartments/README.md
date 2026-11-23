# Altitude Apartments at Baker and Piedmont

The former Atlanta Center office tower stands directly east of Hilton Atlanta. The conversion developer identifies a 20-story office building at 250 Piedmont Avenue, adapted into 327 apartments beginning in 2014. The property now uses the name Altitude. The mapped record gives 22 floors. City fits a glazed lobby and 19 rows of windows to the measured roof elevation. Floor heights, including the lobby, are estimated. [Developer’s conversion announcement](https://debartolodevelopment.com/wp-content/uploads/2016/05/09_01_15_THE_OFFICE_PRESS_RELEASE.pdf) · [Developer’s project history](https://www.revel.company/the-office-apartments) · [Current property gallery](https://livealtitudeatlanta.com/gallery/)

## The slab and the street deck

The named Overture ring `53678626-003d-40da-86c2-cfe2fb7c63e7` is about 32 × 65 m. The 2018 USGS distribution contains 7,675 class-6 returns at least 1 m inside this ring. Its median is 387.8 m NAVD88. Across the full ring, 7,335 building returns fall in the 387.4–388.2 m roof band. In the middle 50 m along Piedmont, the median height at x = 859–860 falls to 306.8. Those outer metres belong to the lower deck, while the occupied floors stop around x = 857.8. City steps the shaft back 3.4 m and sets the roof at 387.85. Another 382 building returns inside the full ring cluster at 390.9–392.6 m, outlining a roughly 10 × 20 m equipment housing near the middle. City sets its top at 392.2. [USGS 2018 Georgia B2 metadata](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Overhead image of the block](https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=-9393599.12%2C3996743.67%2C-9393382.38%2C3996918.27&bboxSR=3857&imageSR=3857&size=1000%2C806&format=jpg&f=image)

The adjoining concourse has a separate Overture ID, `c97061e3-9654-4b96-88de-06d74037fa35`, with different roof clusters. Altitude consumes only its own verified footprint and samples its ground independently. [Adjacent Hilton podium survey](../hilton-atlanta/README.md)

## Exterior and lighting

On the Baker corner the narrow elevation has three broad bays, with a red-brown spandrel in the middle bay. The longer Piedmont face has repeated pale piers. In daylight the windows read as blue-green glass. A lower strip of openings sits behind the light-colored street deck lip. From the terrace, the frames and continuous horizontal bands are visible at closer range. The property’s night views show lighted roof lettering on the two corner elevations, scattered bright rooms and occasional coloured windows. City lights the lettering and a fixed illustrative selection of rooms. Letter size, mullion subdivisions, the deck openings, occupied units and light intensity are estimated. [Baker and Piedmont in daylight](https://livealtitudeatlanta.com/assets/images/cache/001_1600x1067_mls_1600x1067-14f5c93d3b2ac807b503167a9c8f497e.jpg) · [Terrace elevation](https://livealtitudeatlanta.com/assets/images/cache/altitude_0000_025_1600x1067_mls_1600x1067-3187b0b1b1827d84385900b680f8f704.jpg) · [Wider night view](https://livealtitudeatlanta.com/assets/images/cache/0o6NeU1FUkIMq1ZiTxK9CqnPXzslPABBfmedrTcr-ab777a3a5aba149cd876fa8a5fe6ee38.jpg) · [Roof lettering after dark](https://livealtitudeatlanta.com/assets/images/cache/XKEO4losrGuyYXPLtoDsoGSMuakzqkIUpgeWziXY-c205824885b687cd998dc90a350c3203.jpg)

## Matched City cameras

Before is Hilton commit `f322cb2`. Use desktop high quality at 1200 × 850, `/?view=city&q=high&t=2026-06-21T10:30:00-04:00&speed=0` (23:00 EDT for night) and `__city.lookAt(x,z,{bearing,tilt,metresPerPixel})`.

| Approach | Target (x, z), bearing, tilt, metres/pixel | Daylight | Full night |
| --- | --- | --- | --- |
| Baker corner | (824, −844), 217°, 57°, 0.24 | [Before](baker-day-before.jpg) · [After](baker-day-after.jpg) | [Before](baker-night-before.jpg) · [After](baker-night-after.jpg) |
| Piedmont reverse | (832, −875), 322°, 54°, 0.25 | [Before](piedmont-day-before.jpg) · [After](piedmont-day-after.jpg) | [Before](piedmont-night-before.jpg) · [After](piedmont-night-after.jpg) |

Rebuild and deploy the web bundle with the existing scene data.
