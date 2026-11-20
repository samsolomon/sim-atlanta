"""Crop the downtown Overture extract to one small diorama "vignette" and project it to scene metres.

The vignette is the art-direction sandbox: few enough buildings that each can get modelled
detail. Coordinates match pipeline/src/scene.rs (origin Five Points, x east, z = -north).

    python3 pipeline/scripts/vignette.py            # writes web/public/data/scene/vignette-east/vignette.json
"""
import json
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "data", "raw")
LON0, LAT0 = -84.3916, 33.7539
R = 6_371_008.8
K = math.cos(math.radians(LAT0))

# East portal: the east-west line leaves the tunnel, runs beside the freight main and
# crosses the Downtown Connector on a viaduct. Scene metres.
VIGNETTES = {"vignette-east": {"x": (300.0, 1150.0), "z": (120.0, 620.0)}}


def project(lon, lat):
    return (round((lon - LON0) * math.radians(1) * R * K, 2), round(-(lat - LAT0) * math.radians(1) * R, 2))


def lines(geom):
    t = geom["type"]
    if t == "LineString":
        return [geom["coordinates"]]
    if t == "MultiLineString":
        return geom["coordinates"]
    return []


def polys(geom):
    t = geom["type"]
    if t == "Polygon":
        return [geom["coordinates"]]
    if t == "MultiPolygon":
        return geom["coordinates"]
    return []


def clip_line(pts, box, pad):
    """Keep runs of points inside the padded box (cheap clip: the renderer masks the board edge)."""
    (x0, x1), (z0, z1) = box
    runs, cur = [], []
    for p in pts:
        if x0 - pad <= p[0] <= x1 + pad and z0 - pad <= p[1] <= z1 + pad:
            cur.append(p)
        else:
            if len(cur) > 1:
                runs.append(cur)
            cur = []
    if len(cur) > 1:
        runs.append(cur)
    return runs


def main(name):
    box = VIGNETTES[name]
    bx, bz = box["x"], box["z"]
    out = {"name": name, "bounds": {"minX": bx[0], "maxX": bx[1], "minZ": bz[0], "maxZ": bz[1]}, "buildings": [], "roads": [], "rail": []}

    b = json.load(open(os.path.join(RAW, "overture_downtown_buildings.geojson")))
    for f in b["features"]:
        for poly in polys(f["geometry"]):
            rings = [[project(*c) for c in ring[:-1]] for ring in poly]
            cx = sum(p[0] for p in rings[0]) / len(rings[0])
            cz = sum(p[1] for p in rings[0]) / len(rings[0])
            if not (bx[0] < cx < bx[1] and bz[0] < cz < bz[1]):
                continue
            p = f["properties"]
            out["buildings"].append({"id": p["id"], "h": p.get("height"), "floors": p.get("num_floors"), "rings": rings})

    r = json.load(open(os.path.join(RAW, "overture_downtown_roads.geojson")))
    for f in r["features"]:
        p = f["properties"]
        cls = p.get("class")
        flags = {v for rf in (p.get("road_flags") or []) for v in rf.get("values", [])}
        levels = {lr.get("value") for lr in (p.get("level_rules") or [])}
        for l in lines(f["geometry"]):
            for run in clip_line([project(*c) for c in l], (bx, bz), 40):
                out["roads"].append({"cls": cls, "name": p.get("name"), "bridge": "is_bridge" in flags or any((v or 0) > 0 for v in levels), "tunnel": "is_tunnel" in flags, "pts": run})

    rl = json.load(open(os.path.join(RAW, "overture_downtown_rail.geojson")))
    for f in rl["features"]:
        p = f["properties"]
        flags = {v for rf in (p.get("rail_flags") or []) for v in rf.get("values", [])}
        for l in lines(f["geometry"]):
            for run in clip_line([project(*c) for c in l], (bx, bz), 40):
                out["rail"].append({"cls": p.get("class"), "name": p.get("name"), "flags": sorted(flags), "pts": run})

    dest = os.path.join(ROOT, "web", "public", "data", "scene", name)
    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, "vignette.json"), "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    from collections import Counter

    print(f"{name}: {len(out['buildings'])} buildings, {len(out['roads'])} road runs {dict(Counter(x['cls'] for x in out['roads']))}, "
          f"{len(out['rail'])} rail runs {dict(Counter(x['cls'] for x in out['rail']))}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "vignette-east")
