# ViewPoint

ViewPoint (855 Peachtree Street, Preston Partnership for Novare, 2008) is a 36-floor condominium tower on the mapped outline `osm:way:536670474` and its parts. It has a blue glass curtain wall with pale precast pilasters, and six stacks of silver projecting balconies on each broad face. Each narrow end has a precast centre strip carrying one balcony stack. At the Peachtree end the strip steps out between glass corners that carry their own stacks. A glass crown screen sweeps up toward Peachtree. The tower rises between two grey precast garage wings with punched openings. Shops line Peachtree and 6th, with a glass rotunda at the corner. [Commons, south-west view](https://commons.wikimedia.org/wiki/File:Viewpoint,_Midtown_Atlanta_GA.jpg) · [SKYDB: broad face](https://www.skydb.net/file/813636314/viewpoint-atlanta/), [Peachtree end](https://www.skydb.net/file/587877041/viewpoint-atlanta/), [crown sweep](https://www.skydb.net/file/665999068/viewpoint-atlanta/), [podium and sign](https://www.skydb.net/file/980208337/viewpoint-atlanta/) · [Building facts](https://en.wikipedia.org/wiki/ViewPoint)

## Heights from lidar

The mapped heights are 150 m for the tower and 50 m for the garage. The USGS 2019 lidar (the April 2019 Georgia point cloud this repo already samples) disagrees. Peachtree grade is 304.4 m NAVD88. The shops top out at 316.8 m (12.4 m), the garage wings at 340.2 m (south) and 342.7 m (north), and the tower roof at 424.3 m (119.9 m). The crown screen's top runs from 427.2 m over the east end to 437.5 m over Peachtree, a 10.3 m sweep. In 8 m bins from west to east the lidar reads 437.5, 436.0, 434.2, 432.0, 429.4, 428.8, 427.2 and 427.2. City models it as a linear rise over the western 40 m, which matches every bin within 1 m.

## Estimates

- **Bays (estimated):** six balcony stacks per broad face between seven pilasters, from photographs. Each stack is 3.0 m wide and 1.6 m deep. The 3.33 m floor module comes from 36 floors over the lidar roof.
- **Balcony slabs:** silver curtain-glass surface with a band at every floor, not modelled railings. At the 400–700 m City orbit they read as slatted silver columns.
- **Garage openings:** one dark band per 3.6 m deck on the outer and east faces, not individual punched openings and louvres.
- **Shops:** a 4.7 m storefront band and a 3.8 m upper window band on the street faces. The rotunda at Peachtree and 6th is glass for its full height. The entrance canopy under the tower's Peachtree end is about 9.5 × 3.2 m, scaled from the photographs.

## Lighting

I found no verified full-night exterior (the skins spec lists this gap). As a residential tower, City lights it noticeably: a stable 40 percent draw over the units either side of each pilaster, in the warm shared lamp colour, plus glowing shopfronts. The crown screen and garage stay dark. Both are illustrative and unlabelled scenery.

## Captures

Use `/?view=city&cam=<camera>&t=2026-11-20T<time>-05:00`, clear weather.

| View | Camera | 11:30 AM | 11:30 PM |
|---|---|---|---|
| Three-quarter with roof, south and Peachtree faces | `715,-2673,30,48,700` | [Day](day.jpg) | [Night](night.jpg) |
| Spec starting camera | `710,-2668,32,60,380` | [Day](start-day.jpg) | [Night](start-night.jpg) |
| Peachtree entrance and canopy (`&dev&mindist=20`) | `682,-2672,70,66,140` | [Entrance](entrance.jpg) | |
| Rotunda at Peachtree and 6th (`&dev&mindist=20`) | `690,-2640,20,64,150` | [Corner](corner.jpg) | |
