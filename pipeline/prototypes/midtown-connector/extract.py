"""Extend the downtown directed lane graph from the five archived OSM row maps."""
import gzip
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIXTURES = HERE.parents[2] / "web/src/city/fixtures/midtown-connector"
BOARD = HERE.parent / "square-board"
old = json.loads((HERE.parent / "connector-footprint/ways.json").read_text())
nodes, roads = {}, {}
scale = math.pi * 6371008.8 / 180
for row in json.loads((BOARD / "midtown-rows.json").read_text()):
    with gzip.open(BOARD / "source" / (row + ".json.gz")) as source:
        for e in json.load(source)["elements"]:
            if e["type"] == "node":
                nodes[e["id"]] = [round((e["lon"] + 84.3916) * scale * math.cos(math.radians(33.7539)), 2),
                                  round((33.7539 - e["lat"]) * scale, 2)]
            elif e["type"] == "way" and e.get("tags", {}).get("highway") in ("motorway", "motorway_link"):
                roads[e["id"]] = e

selected = {k for k, e in roads.items() if e["tags"]["highway"] == "motorway"
            and any(ref in ("I 75", "I 85") for ref in e["tags"].get("ref", "").split(";"))}
while True:
    touched = {n for k in selected for n in roads[k]["nodes"]}
    more = {k for k, e in roads.items() if e["tags"]["highway"] == "motorway_link"
            and (e["nodes"][0] in touched or e["nodes"][-1] in touched)}
    if more <= selected:
        break
    selected |= more

ways = {}
for k in sorted(selected):
    if str(k) in old:
        continue
    e, tags = roads[k], roads[k]["tags"]
    assert tags["oneway"] == "yes"
    ways[k] = dict(version=e["version"], lanes=int(tags.get("lanes", 1)), link=tags["highway"] == "motorway_link",
                   kind="tunnel" if tags.get("tunnel") == "yes" or tags.get("covered") == "yes" else
                   "bridge" if tags.get("bridge") == "yes" else "ground",
                   hov=tags.get("hov") == "designated", pts=[nodes[n] for n in e["nodes"]])
(FIXTURES / "ways.json").write_text("{\n" + ",\n".join(f'  "{k}":' + json.dumps(w, separators=(",", ":"))
                                                 for k, w in ways.items()) + "\n}\n")
