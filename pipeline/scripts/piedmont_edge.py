"""Extract Piedmont Park's west-edge gates and Lake Clara Meer structures from the checked-in OSM rows."""
import gzip
import json
from pathlib import Path

from vignette import ROOT, project

PACK = Path(ROOT) / "pipeline/prototypes"
WAYS = {"dock": 1089189870, "gazebo": 269747513, "bridge": 102679938, "spur": 146304988}
GATES = {"12th Street": 316638596, "14th Street": 5674178517, "10th Street": 1595736690}


def bake():
    elements = json.loads(gzip.decompress((PACK / "square-board/source/midtown-upper.json.gz").read_bytes()))["elements"]
    nodes = {e["id"]: [round(c, 2) for c in project(e["lon"], e["lat"])] for e in elements if e["type"] == "node"}
    ways = {e["id"]: e for e in elements if e["type"] == "way"}
    out = {name: {"osm": f"osm:way:{i}", "pts": [nodes[n] for n in ways[i]["nodes"]]} for name, i in WAYS.items()}
    out["gates"] = {name: {"osm": f"osm:node:{i}", "at": nodes[i]} for name, i in GATES.items()}
    (PACK / "piedmont-edge").mkdir(exist_ok=True)
    (PACK / "piedmont-edge/features.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
    return out


# The Active Oval: mapped pitches by sport, the tree circle at its hub and the retaining walls on its west side.
OVAL = {"softball": [182313884, 182313883], "soccer": [182313891, 182313890], "volleyball": [182313888],
        "walls": [182543449, 182543451], "hub": 226119775}
# Park furniture at mapped points inside Piedmont Park (way 208357832), outside the Botanical Garden.
FURNITURE = {("amenity", "bench"): "bench", ("amenity", "drinking_water"): "fountain", ("amenity", "bbq"): "grill",
             ("amenity", "waste_basket"): "bin", ("tourism", "picnic_site"): "picnic"}
PARK, GARDEN = 208357832, "Atlanta Botanical Garden"


def inside(x, z, ring):
    hit = False
    for (ax, az), (bx, bz) in zip(ring, ring[1:] + ring[:1]):
        if (az > z) != (bz > z) and x < ax + (z - az) * (bx - ax) / (bz - az):
            hit = not hit
    return hit


def details():
    nodes, ways = {}, {}
    for board in ("midtown-upper", "midtown-central"):
        for e in json.loads(gzip.decompress((PACK / f"square-board/source/{board}.json.gz").read_bytes()))["elements"]:
            if e["type"] == "node":
                nodes[e["id"]] = e
            elif e["type"] == "way":
                ways[e["id"]] = e
    xy = {i: [round(c, 2) for c in project(n["lon"], n["lat"])] for i, n in nodes.items()}
    line = lambda i: [xy[n] for n in ways[i]["nodes"] if n in xy]
    ring = lambda i: line(i)[:-1]
    hub = ring(OVAL["hub"])
    cx, cz = sum(p[0] for p in hub) / len(hub), sum(p[1] for p in hub) / len(hub)
    oval = {k: [{"osm": f"osm:way:{i}", "ring": ring(i)} for i in OVAL[k]] for k in ("softball", "soccer", "volleyball")}
    oval["walls"] = [{"osm": f"osm:way:{i}", "pts": line(i)} for i in OVAL["walls"]]
    oval["hub"] = {"osm": f"osm:way:{OVAL['hub']}", "at": [round(cx, 2), round(cz, 2)],
                   "r": round(sum(((p[0] - cx) ** 2 + (p[1] - cz) ** 2) ** .5 for p in hub) / len(hub), 2)}
    park = ring(PARK)
    garden = [ring(i) for i, w in ways.items() if w.get("tags", {}).get("name") == GARDEN and len(line(i)) > 3]
    points = []
    for i, n in sorted(nodes.items()):
        tags = n.get("tags", {})
        kind = next((v for (k, val), v in FURNITURE.items() if tags.get(k) == val), None)
        if kind and inside(*xy[i], park) and not any(inside(*xy[i], g) for g in garden):
            points.append({"osm": f"osm:node:{i}", "kind": kind, "at": xy[i]})
    out = {"oval": oval, "furniture": points}
    (PACK / "piedmont-edge/details.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
    return out


if __name__ == "__main__":
    print(sorted(bake()))
    d = details()
    print(len(d["furniture"]), "furniture points")
