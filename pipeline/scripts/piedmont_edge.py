"""Extract Piedmont Park's west-edge gates and Lake Clara Meer structures from the checked-in OSM rows."""
import gzip
import json
from pathlib import Path

from vignette import ROOT, project

PACK = Path(ROOT) / "pipeline/prototypes"
WAYS = {"dock": 1089189870, "gazebo": 269747513, "bridge": 102679938, "spur": 146304988}
GATES = {"12th Street": 316638596, "14th Street": 5674178517}


def bake():
    elements = json.loads(gzip.decompress((PACK / "square-board/source/midtown-upper.json.gz").read_bytes()))["elements"]
    nodes = {e["id"]: [round(c, 2) for c in project(e["lon"], e["lat"])] for e in elements if e["type"] == "node"}
    ways = {e["id"]: e for e in elements if e["type"] == "way"}
    out = {name: {"osm": f"osm:way:{i}", "pts": [nodes[n] for n in ways[i]["nodes"]]} for name, i in WAYS.items()}
    out["gates"] = {name: {"osm": f"osm:node:{i}", "at": nodes[i]} for name, i in GATES.items()}
    (PACK / "piedmont-edge").mkdir(exist_ok=True)
    (PACK / "piedmont-edge/features.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
    return out


if __name__ == "__main__":
    print(sorted(bake()))
