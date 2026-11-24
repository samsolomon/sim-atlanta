"""Measure the Fifth Street park deck over the Connector, which OSM maps as a ground street over
two tunnel-tagged freeway ways (a land bridge, so no deck run exists to profile)."""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points

FIXTURES = HERE.parents[2] / "web/src/city/fixtures/midtown-connector"
BOARD = HERE.parent / "square-board"
NAME = "Fifth Street Northwest"
# The deck's abutments on Fifth Street: west of the southbound ramp wall and at Williams Street.
WEST, EAST = 18.0, 110.5

context = json.loads((BOARD / "midtown-central" / "context.json").read_text())
road = next(r for r in context["roads"] if r["name"] == NAME and not r["bridge"]
            and min(p[0] for p in r["pts"]) < WEST and max(p[0] for p in r["pts"]) > EAST)
xy = np.array(road["pts"], dtype=float)
lon = lambda x: LON0 + math.degrees(x / (R * K))
lat = lambda z: LAT0 - math.degrees(z / R)
zs = xy[:, 1]
x, z, y, cls, _ = ept_points((lon(WEST - 20), lat(zs.max() + 40), lon(EAST + 20), lat(zs.min() - 40)))
cloud = np.column_stack([x, z, y, cls])
deck = cloud[cloud[:, 3] == 17]          # ASPRS bridge deck
tree = cKDTree(deck[:, :2])
cum = np.r_[0, np.cumsum(np.linalg.norm(np.diff(xy, axis=0), axis=1))]
along_x = lambda s: np.interp(s, cum, xy[:, 0])
# Stations over the span, every 3 m, from the street's own geometry.
s_west = np.interp(WEST, xy[::-1, 0] if xy[0, 0] > xy[-1, 0] else xy[:, 0], cum[::-1] if xy[0, 0] > xy[-1, 0] else cum)
s_east = np.interp(EAST, xy[::-1, 0] if xy[0, 0] > xy[-1, 0] else xy[:, 0], cum[::-1] if xy[0, 0] > xy[-1, 0] else cum)
s0, s1 = sorted((s_west, s_east))
stations = np.linspace(s0, s1, math.ceil((s1 - s0) / 3) + 1)
pts = np.column_stack([np.interp(stations, cum, xy[:, i]) for i in range(2)])
heights = []
for p in pts:
    ids = tree.query_ball_point(p, 2.5)
    h = deck[ids, 2]
    heights.append(float(np.median(h)) if len(h) >= 5 and np.ptp(np.percentile(h, (10, 90))) < .8 else math.nan)
h = np.array(heights)
ok = np.isfinite(h)
print(f"{len(deck)} deck returns; {ok.sum()}/{len(h)} stations measured; range {np.nanmin(h):.2f}..{np.nanmax(h):.2f} m")
assert ok.sum() >= .7 * len(h), "too few deck returns over the span"
h = np.interp(stations, stations[ok], h[ok])
result = [{"name": NAME, "start": road["pts"][0], "end": road["pts"][-1], "pts": pts.round(4).tolist(),
           "heights": h.round(3).tolist(), "weights": [1.0] * len(h)}]
(FIXTURES / "landbridges.json").write_text(json.dumps(result, separators=(",", ":")) + "\n")
