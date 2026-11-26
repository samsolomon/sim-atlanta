"""Freeway lids whose top is the board: Capitol Gateway (D).

The 2019 classifier labels the Capitol Gateway lid top as ground, so the board
DEM already carries it, and OSM's bridge-tagged streets and walks on it track
that surface within 0.1 m (interchange-register.json). The City draws them on
the lid instead of as decks over the concealed freeway (web/src/terrain/lids.ts).
Writes lids.json: each lid's mapped outline in City metres, from the pinned
south-band Overpass source, and the lid's ground edits, both from the class-2
returns within 2.5 m of each grid node inside the outline:

- spikes: the node stands more than 2 x SPIKE m above the median, or more than
  SPIKE m where the returns are contaminated (90th percentile CONTAMINATED m
  above the median). Something
  overhead was classified as ground (near (375, 760) the grid reads 316 m over a
  310.3 m lid). The node takes the median.
- edge sags: within EDGE m of a mapped lid street or walk, the node sits more
  than SPIKE m below the median while some returns come from the cut below the
  lid (10th percentile CUT m under the median). A 5 m grid cannot resolve the
  lid's edge, and the street on it dropped into the portal. The node takes the
  median, which the lid top dominates.

underpass-floors.py applies them with its own node edits.
"""
import gzip
import importlib.util
import json
import math
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LON0, LAT0, R = -84.3916, 33.7539, 6371008.8
K = math.cos(math.radians(LAT0))
LIDS = {1451206624: "Capitol Gateway"}
SPIKE, CONTAMINATED, CUT, RADIUS, MIN_RETURNS, EDGE = 0.5, 3.0, 2.0, 2.5, 10, 5.0
STREETS = {"primary", "primary_link", "secondary", "tertiary", "service", "footway", "residential"}

elements = json.load(gzip.open(ROOT / "pipeline/prototypes/square-board/source/south-band.json.gz"))["elements"]
scale = math.pi / 180 * R
nodes = {e["id"]: [round((e["lon"] - LON0) * scale * K, 2), round((LAT0 - e["lat"]) * scale, 2)]
         for e in elements if e["type"] == "node"}
out = []
for e in elements:
    if e["type"] == "way" and e["id"] in LIDS:
        out.append({"outline": e["id"], "name": LIDS[e["id"]], "ring": [nodes[n] for n in e["nodes"]]})
streets = [[nodes[n] for n in e["nodes"]] for e in elements if e["type"] == "way"
           and e.get("tags", {}).get("bridge") == "yes" and e.get("tags", {}).get("highway") in STREETS
           and all(n in nodes for n in e["nodes"])]
spec = importlib.util.spec_from_file_location("ramp_register", HERE / "ramp-register.py")
rr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rr)
grid = ROOT / "pipeline/prototypes/square-board/south-band"
m = json.loads((grid / "ground.json").read_text())
raw = np.fromfile(grid / "ground.i16", dtype="<i2").astype(float) * m["scaleM"] + m["offsetM"]
b, step = m["bounds"], m["stepM"]
for lid in out:
    poly = Polygon(lid["ring"])
    x0, z0, x1, z1 = poly.bounds
    x, z, h, c, _ = rr.ept_points((*rr.lonlat(x0 - 5, z1 + 5), *rr.lonlat(x1 + 5, z0 - 5)))
    keep = c == 2
    tree, hh = cKDTree(np.column_stack((x[keep], z[keep]))), h[keep]
    on_lid = unary_union([LineString(w) for w in streets if poly.buffer(.5).contains(LineString(w))])
    nodes = []
    for r in range(m["rows"]):
        for col in range(m["cols"]):
            px, pz = b["minX"] + col * step, b["minZ"] + r * step
            if not poly.contains(Point(px, pz)):
                continue
            near = tree.query_ball_point([px, pz], RADIUS)
            i = r * m["cols"] + col
            if len(near) < MIN_RETURNS:
                continue
            v = np.sort(hh[near])
            med, p90 = float(np.median(v)), float(np.percentile(v, 90))
            if raw[i] - med > 2 * SPIKE or (raw[i] - med > SPIKE and p90 - med > CONTAMINATED):
                nodes.append([i, round(med, 2)])
            elif (on_lid.distance(Point(px, pz)) <= EDGE and med - raw[i] > SPIKE
                  and float(np.percentile(v, 10)) < med - CUT):
                nodes.append([i, round(med, 2)])
    lid["groundNodes"] = {m["sha256"]: nodes}
(HERE / "lids.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
print([(l["name"], len(l["ring"]), {k: v for k, v in l["groundNodes"].items()}) for l in out])
