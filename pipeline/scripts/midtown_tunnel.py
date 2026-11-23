"""Bake the OSM-mapped MARTA North Line tunnel ways into the web bundle.

City never draws a train in these ways. Follow uses them only to say that a followed
Red or Gold train is underground: the claim comes from the mapped tunnel=yes tag,
not from the absence of a drawn car.
"""
import gzip
import json
from pathlib import Path

from terrain_transport import clip_runs
from vignette import ROOT, project

pack = Path(ROOT) / "pipeline/prototypes/square-board"
fixtures = Path(ROOT) / "web/src/city/fixtures"
ROWS = ["north-band", "midtown-south", "midtown-central", "midtown-upper", "brookwood-south", "brookwood-station"]

runs = []
for row in ROWS:
    with gzip.open(pack / "source" / (row + ".json.gz")) as source:
        elements = json.load(source)["elements"]
    nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    bounds = json.loads((pack / row / "ground.json").read_text())["bounds"]
    for way in elements:
        tags = way.get("tags", {})
        if (way["type"] != "way" or tags.get("railway") != "subway" or tags.get("name") != "MARTA North Line"
                or tags.get("tunnel", "no") == "no"):
            continue
        for points in clip_runs([nodes[i] for i in way["nodes"]], bounds):
            runs.append(dict(way=way["id"], row=row, pts=[[round(x, 2), round(z, 2)] for x, z in points]))
(fixtures / "midtown-tunnel.json").write_text(json.dumps(runs, separators=(",", ":")) + "\n")
print(len(runs), "tunnel runs,", sum(len(r["pts"]) for r in runs), "points")
