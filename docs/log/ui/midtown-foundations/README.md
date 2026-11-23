# Hillside foundations in the Midtown rows

The 5 m 3DEP grid under Sage Parking spans 271.9–287.2 m NAVD88. At Arts Center station, it spans 281.9–288.8 m. These are outward-rounded terrain extrema across exterior and courtyard boundaries and interior ground nodes. Individual floor elevations are inferred. All generic buildings keep their existing height sources. OSM height tags are reported, floors × 3.6 m are inferred, and the 8 m fallback is illustrative. Neither site has a surveyed finished floor in these fixtures. [Midtown ground manifest](../../../../pipeline/prototypes/square-board/midtown-upper/ground.json) · [OSM attribution](https://www.openstreetmap.org/copyright)

For a hillside building flagged by the bake, walls reach down to the local low footing while the roof and fixtures reference a common inferred ground floor. That level starts at the middle of the combined footprint's elevation range, then rises if the uphill edge would have less than 2.4 m of exposed wall, capped at the source building height. The 2.4 m allowance is illustrative. To reproduce the fixture, run `python pipeline/scripts/midtown_foundations.py` with NumPy and Shapely 2. Publishing this feature requires a web rebuild.

Both cameras use 2026-11-20 at 14:00 and 23:00 Eastern, a paused clock and a 999 × 496 viewport.

| Camera | Low day | Low night | High day | High night |
| --- | --- | --- | --- | --- |
| Sage Parking (1690, −3910), bearing −55°, tilt 54°, 0.30 m/px | [Day](sage-parking-low-day.jpg) | [Night](sage-parking-low-night.jpg) | [Day](sage-parking-high-day.jpg) | [Night](sage-parking-high-night.jpg) |
| Arts Center (451, −3933), bearing 22°, tilt 50°, 0.34 m/px | [Day](arts-center-low-day.jpg) | [Night](arts-center-low-night.jpg) | [Day](arts-center-high-day.jpg) | [Night](arts-center-high-night.jpg) |
