# Wheat Street Towers, 375 Auburn Avenue NE

Wheat Street Towers stands on the south side of Auburn Avenue next to Wheat Street Baptist Church. In the original Sweet Auburn preview its named footprint had neither height nor floor count, so City drew an 8 m building with generic roof equipment. The renovation architect describes a fourteen-story concrete apartment tower with an L-shaped plan. The general contractor reports that the renovation retained the building height and structure. At neighborhood scale the two wings and their open entrance court now rise above the surrounding blocks. [City and street before/after](comparison.jpg) · [Four exterior views](elevations.jpg) · [TSW architect record](https://www.tsw-design.com/portfolio-items/wheat-street-tower-and-annex-building/) · [J.M. Wilkerson project record](https://www.jmwilkerson.com/portfolio/wheat-street-towers/)

## What the sources resolve

- **Plan.** The geometry follows the 23-vertex OpenStreetMap footprint. Both wings, their returns and the diagonal face inside the elbow are present. A north-up plot compares the actual points to the outline. [OSM way 270493846](https://www.openstreetmap.org/way/270493846) · [Footprint and lidar returns](returns.png)
- **Height.** The April 22, 2019 USGS point cloud contains 1,940 class-6 building returns at least 1 m inside the outline. Their median is 343.05 m NAVD88. The lower and higher rooftop volumes at the elbow have median elevations of 346.12 m (132 returns) and 348.74 m (69 returns) in the height bands described in the script. The median describes the main roof surface. It does not survey the parapet, wall thickness or individual floors. The model simplifies the rooftop structures to two masses. [USGS point-cloud metadata](https://s3-us-west-2.amazonaws.com/usgs-lidar-public/GA_Statewide_B2_2018/ept.json) · [Repeat the selection](../../../../pipeline/prototypes/wheat-street-towers/survey.py)
- **Elevations.** March 2025 views east and west of the entrance show pale end walls, a narrow vertical stack in the Auburn end, dark piers and a rhythm of recessed glazing and light horizontal panels along the wings. The inner diagonal wall and projecting entrance canopy can also be seen in the contractor's December 2018 photograph. [Auburn looking southwest](https://www.google.com/maps/@?api=1&map_action=pano&pano=E8R_dZnEzhBTm3LOPiTVQg&heading=228&pitch=16&fov=90) · [Across the entrance court](https://www.google.com/maps/@?api=1&map_action=pano&pano=hs4JMIZoS3l0Hqpb220cvA&heading=151&pitch=16&fov=90) · [Entrance photograph](https://www.jmwilkerson.com/wp-content/uploads/2017/05/IMG_20181203_132816.jpg)
- **Approximation.** The 14-story count is reported. The lobby plus thirteen upper bands, the 2.70 m typical spacing, bay widths, window lights, rear openings, canopy dimensions and colors are illustrative. The west and south returns use the same apartment detail where sources have limited sightlines. The small roof parapet is schematic. The façade lettering, mature courtyard landscaping and entry steps are omitted.

The full-night Orca captures use the same City orbit and Auburn street-eye camera as the daytime comparison. At 22:30 EST the lobby, narrow end-wall stack and a repeating subset of apartments are lit. The available March 2025 photographs show daylight. Individual window occupancy and present-day exterior lighting are unknown, so this pattern is illustrative. To reproduce it, set the preview clock to `2026-11-20T22:30:00-05:00`. [Night comparison](night.jpg)

## Reproduce and inspect

Use the repository pipeline Python environment with NumPy, Shapely 2, pyproj, Pillow and `laspy[lazrs]` installed. The survey calls the existing EPT reader and caches its public nodes in the ignored `data/raw/ept` directory.

```sh
.venv/bin/python -B pipeline/prototypes/wheat-street-towers/survey.py --figure /tmp/wheat-returns.png
pnpm data:sweet-auburn
pnpm dev
```

Open `/?view=city&east=king-memorial&north=sweet-auburn&q=high&t=2026-11-20T10:15:00-05:00&speed=0`. In the City console, call `__city.lookAt(1500,500)`, allow the east section to load, then call `__city.lookAt(1515,-142,{bearing:140,metresPerPixel:.38,tilt:55})`. Street-eye captures use a QA camera near the two photographed street positions. The fixed views show what the skyline and façade treatments contribute at different scales.

City's foundation on the staged high and low meshes is 301.80 m NAVD88. The 41.25 m finish height places the main roof at 343.05 m on both. The loader regression raycasts each wing, both rooftop volumes and the open court on each quality setting. For release, stage the opt-in area with `pnpm data:sweet-auburn`, run `pnpm build` and deploy the static assets. The survey is offline. The finish reuses the existing buildings and lit-glass batches, and loads with the Sweet Auburn section.
