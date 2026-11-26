"""Freeway lids whose top is the board: Capitol Gateway (D).

The 2019 classifier labels the Capitol Gateway lid top as ground, so the board
DEM already carries it, and OSM's bridge-tagged streets and walks on it track
that surface within 0.1 m (interchange-register.json). The City draws them on
the lid instead of as decks over the concealed freeway (web/src/terrain/lids.ts).
Writes lids.json: each lid's mapped outline in City metres, from the pinned
south-band Overpass source.
"""
import gzip
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LON0, LAT0, R = -84.3916, 33.7539, 6371008.8
K = math.cos(math.radians(LAT0))
LIDS = {1451206624: "Capitol Gateway"}

elements = json.load(gzip.open(ROOT / "pipeline/prototypes/square-board/source/south-band.json.gz"))["elements"]
scale = math.pi / 180 * R
nodes = {e["id"]: [round((e["lon"] - LON0) * scale * K, 2), round((LAT0 - e["lat"]) * scale, 2)]
         for e in elements if e["type"] == "node"}
out = []
for e in elements:
    if e["type"] == "way" and e["id"] in LIDS:
        out.append({"outline": e["id"], "name": LIDS[e["id"]], "ring": [nodes[n] for n in e["nodes"]]})
(HERE / "lids.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
print([(l["name"], len(l["ring"])) for l in out])
