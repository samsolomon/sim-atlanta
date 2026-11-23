"""Mapped night lighting in the five Midtown rows from the archived OSM row extracts.

Writes the lit (lit=yes) ground-level footways, paths, cycleways, pedestrian ways and
steps, and every highway=street_lamp node. Bridges, tunnels, covered and indoor ways
are skipped. Coordinates are City metres east and south of Five Points.
Geometry (c) OpenStreetMap contributors, ODbL.
"""
import gzip
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
BOARD = HERE.parent / "square-board"
OUT = HERE.parents[2] / "web/src/city/fixtures/midtown-night.json"
PATHS = {"footway", "path", "cycleway", "pedestrian", "steps"}
scale = math.pi * 6371008.8 / 180
nodes, ways, lamps = {}, {}, {}
for row in json.loads((BOARD / "midtown-rows.json").read_text()):
    with gzip.open(BOARD / "source" / (row + ".json.gz")) as source:
        elements = json.load(source)["elements"]
    for e in elements:
        if e["type"] != "node":
            continue
        p = [round((e["lon"] + 84.3916) * scale * math.cos(math.radians(33.7539)), 2), round((33.7539 - e["lat"]) * scale, 2)]
        nodes[e["id"]] = p
        if e.get("tags", {}).get("highway") == "street_lamp":
            lamps[e["id"]] = p
    for e in elements:
        t = e.get("tags", {})
        if e["type"] != "way" or t.get("lit") != "yes" or t.get("highway") not in PATHS:
            continue
        if any(t.get(k) not in (None, "no") for k in ("bridge", "tunnel", "covered", "indoor")) or t.get("layer", "0") not in ("0",):
            continue
        # A way that leaves the extract is split at its missing nodes, never bridged.
        run, part = [], 0
        for n in e["nodes"] + [None]:
            if n in nodes:
                run.append(nodes[n])
                continue
            if len(run) >= 2:
                ways[(e["id"], part)] = run
                part += 1
            run = []
result = {"paths": [ways[k] for k in sorted(ways)], "lamps": [lamps[k] for k in sorted(lamps)]}
OUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
length = sum(math.dist(a, b) for pts in ways.values() for a, b in zip(pts, pts[1:]))
print(len(ways), "lit paths,", round(length), "m;", len(lamps), "mapped lamps")
