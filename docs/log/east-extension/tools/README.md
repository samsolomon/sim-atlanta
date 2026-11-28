# East extension extent tools

`nb.py` projects the City neighbourhood polygons into scene metres and tallies km² per
neighbourhood over a box (`python3 nb.py x0 x1 z0 z1`, 50 m raster). `cls.py` adds the city
limit and Census places for cells with no neighbourhood (`python3 cls.py x0,x1,z0,z1 ...`).

Run them from a folder holding:
- `neighborhoods.json`: `web/public/data/ga/neighborhoods.json` (`pipeline/scripts/neighborhoods.py`);
- `layer0.json`: City of Atlanta DCP GIS, GeopoliticalArea FeatureServer layer 0 (city limits), GeoJSON;
- `layer2.json`: the same service, layer 2 (NPU);
- `cdp.json`: TIGERweb Places layer 5, envelope −84.36,33.76,−84.33,33.81.

`../tiles.json` is the per-tile neighbourhood share (25 m raster) used in the plan.
