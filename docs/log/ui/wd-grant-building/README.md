# W. D. Grant Building

The 1898 building at 44 Broad Street NW replaces the generic glass box in City. The model follows the U-shaped Overture footprint, with three limestone street elevations, a darker service court, a deep cornice and three arched entrances. The street façades have wide punched sash windows between narrow piers. The low tier keeps the ten levels and entry silhouette with fewer arch segments.

## Evidence and dimensions

- The National Register nomination describes the Bedford limestone frame, wide wood windows, the three roughly 20 ft arched entries, the cornice and the U-shaped service court. [National Register nomination](https://npgallery.nps.gov/GetAsset/4cd62200-1c80-4ea9-bf47-496c7a94d91c/)
- The 2019 exterior photos show pale limestone around dark window openings, the horizontal belt above the tall lower floors, the projecting crown and rustication around the arched entries. The corner views show both ends of Walton Street. [Broad and Walton](https://commons.wikimedia.org/wiki/File:The_Grant_Building,_Atlanta,_GA_(33597842048).jpg) · [Forsyth and Walton](https://commons.wikimedia.org/wiki/File:The_Grant_Building,_Atlanta,_GA_(40508262683).jpg) · [Walton entry detail](https://commons.wikimedia.org/wiki/File:The_Grant_Building,_Atlanta,_GA_(46559094095).jpg)
- The 3DEP roof sample returned 3,377 points inside the footprint inset by 0.5 m and above adjacent grade plus 12 m. The median is 361.39 m NAVD88, with the 95th percentile at 367.59 m. The adjacent ground median is 321.93 m. That gives a 39.5 m main roof versus Overture's 47.5 m. The cornice reaches about 362.8 m and the highest roof plant reaches 367.6 m.
- The mapped street wall is about 56 m long and 28 m deep. The 0.51 m cornice projection, spacing of window bays, entry widths, trim and simplified plant outlines are estimates from the photos and lidar distribution. The granite-colored ground-level detailing and window surrounds are simplified into broad bands and arch trim.
- The daylight photographs show a mixture of sky reflections and dark interiors. The muted gray glass is illustrative. Reliable modern night exterior photographs were unavailable. The model uses a sparse 8% pane-lighting estimate, with subdued warm windows. [Current adaptive reuse listing](https://downtownatlantainc.com/development/grant-building-1)

## Cameras

| View | Clock ET | Tier | `cam=` |
| --- | --- | --- | --- |
| Downtown day | 11:30 | high | `123,-184,250,48,500` |
| Downtown night | 23:30 | high | `123,-184,250,48,500` |
| Downtown low | 11:30 | low | `123,-184,250,48,500` |
| Close | 11:30 | high | `123,-184,225,52,170` |

The screenshots use November 20, 2026 and a pinned timetable clock.

## Deploy

The skin ships with a `web/dist` rebuild and worker redeploy. Existing staged scene data supplies the footprint.
