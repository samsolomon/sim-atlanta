"""Freeze the directed OSM carriageways and their ramps in the Five Points metre frame."""
import argparse
import gzip
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("osm", type=Path, help="OSM API 0.6 map XML, bbox -84.3905,33.7435,-84.3770,33.7698")
args = parser.parse_args()
root = ET.parse(args.osm).getroot()
scale = 6371008.8 * math.pi / 180
def point(lon, lat):
    return [round((float(lon) + 84.3916) * scale * math.cos(math.radians(33.7539)), 2),
            round((33.7539 - float(lat)) * scale, 2)]

nodes = {n.get("id"): point(n.get("lon"), n.get("lat")) for n in root.findall("node")}
ways = {}
# The lower roads at Williams, Spring and West Peachtree/Civic Center are
# open-sided underpasses. Draw pavement and cars below the separate upper
# decks. The Capitol Gateway cap farther south still conceals its lower road.
open_underpasses = {
    1051688674, 1051688675, 1051688672, 963910432,  # Baker/Piedmont mainlines and ramps
    492215616, 525603074, 1467383125, 1467383127, 1467383128,
    1467383129, 1467383131, 1467386396, 1467386398,
}
for w in root.findall("way"):
    tags = {t.get("k"): t.get("v") for t in w.findall("tag")}
    link = tags.get("highway") == "motorway_link"
    if not link and (tags.get("highway") != "motorway" or tags.get("name") != "Downtown Connector"):
        continue
    pts = [nodes[n.get("ref")] for n in w.findall("nd")]
    if not any(-1100 < x < 1900 and -1850 < z < 1300 for x, z in pts):
        continue
    way = int(w.get("id"))
    concealed = (tags.get("covered") == "yes" or tags.get("tunnel") in ("yes", "building_passage")) and way not in open_underpasses
    ways[way] = dict(version=int(w.get("version")), lanes=int(tags.get("lanes", 1)),
        link=link, kind="tunnel" if concealed
        else "bridge" if tags.get("bridge") == "yes" else "ground",
        hov=tags.get("hov") == "designated", pts=pts)

# Only walk ramps connected to the Connector. Local motorway-class distributor
# roads that never touch one of these directed interchange branches stay generic.
selected = {k for k, w in ways.items() if not w["link"]}
while True:
    endpoints = {tuple(ways[k]["pts"][i]) for k in selected for i in (0, -1)}
    endpoints.update(tuple(p) for k in selected if not ways[k]["link"] for p in ways[k]["pts"])
    more = {k for k, w in ways.items() if tuple(w["pts"][0]) in endpoints or tuple(w["pts"][-1]) in endpoints}
    if more <= selected:
        break
    selected |= more
# The archived Midtown map includes the seven-lane SB approach to exit 249C.
with gzip.open(Path(__file__).parent.parent / "square-board/source/midtown-south.json.gz") as src:
    elements = json.load(src)["elements"]
approach = next(e for e in elements if e["type"] == "way" and e["id"] == 337901411)
coords = {e["id"]: point(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
tags = approach["tags"]
assert tags["highway"] == "motorway" and tags["oneway"] == "yes"
assert not any(k in tags for k in ("bridge", "tunnel", "covered"))
ways[approach["id"]] = dict(version=approach["version"], lanes=int(tags["lanes"]),
    link=False, kind="ground", hov=False, pts=[coords[n] for n in approach["nodes"]])
selected.add(approach["id"])
out = Path(__file__).with_name("ways.json")
out.write_text("{\n" + ",\n".join(f'  "{k}":' + json.dumps(ways[k], separators=(",", ":"))
                                  for k in sorted(selected)) + "\n}\n")
