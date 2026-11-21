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
# Downtown: the City view's board. Five Points, the Gulch, Peachtree Center and the Connector.
VIGNETTES = {
    "vignette-east": {"x": (300.0, 1150.0), "z": (120.0, 620.0)},
    "downtown": {"x": (-1000.0, 1000.0), "z": (-1300.0, 700.0)},
}


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
            out["buildings"].append({"id": p["id"], "h": p.get("height"), "floors": p.get("num_floors"), "cls": p.get("class"), "name": p.get("name"), "rings": rings})

    r = json.load(open(os.path.join(RAW, "overture_downtown_roads.geojson")))
    for f in r["features"]:
        p = f["properties"]
        cls = p.get("class")
        flags = {v for rf in (p.get("road_flags") or []) for v in rf.get("values", [])}
        levels = {lr.get("value") for lr in (p.get("level_rules") or [])}
        for l in lines(f["geometry"]):
            for run in clip_line([project(*c) for c in l], (bx, bz), 40):
                out["roads"].append({"cls": cls, "sub": p.get("subclass"), "name": p.get("name"), "bridge": "is_bridge" in flags or any((v or 0) > 0 for v in levels), "tunnel": "is_tunnel" in flags, "pts": run})

    rl = json.load(open(os.path.join(RAW, "overture_downtown_rail.geojson")))
    for f in rl["features"]:
        p = f["properties"]
        flags = {v for rf in (p.get("rail_flags") or []) for v in rf.get("values", [])}
        for l in lines(f["geometry"]):
            for run in clip_line([project(*c) for c in l], (bx, bz), 40):
                out["rail"].append({"cls": p.get("class"), "name": p.get("name"), "flags": sorted(flags), "pts": run})

    if name == "downtown":
        from terrain_transport import bake
        out["terrainTransport"] = bake(r["features"], rl["features"], out["bounds"])

    # Ground cover and street furniture (Overture base theme).
    def overlaps(rings, pad=0):
        xs = [q[0] for q in rings[0]]
        zs = [q[1] for q in rings[0]]
        return max(xs) > bx[0] - pad and min(xs) < bx[1] + pad and max(zs) > bz[0] - pad and min(zs) < bz[1] + pad

    out["ground"] = []
    lu = json.load(open(os.path.join(RAW, "overture_downtown_landuse.geojson")))
    for f in lu["features"]:
        p = f["properties"]
        for poly in polys(f["geometry"]):
            rings = [[project(*c) for c in ring[:-1]] for ring in poly]
            if len(rings[0]) >= 3 and overlaps(rings):
                out["ground"].append({"kind": p.get("class"), "sub": p.get("subtype"), "name": p.get("name"), "rings": rings})
    out["points"] = {}
    out["lines"] = {}
    inf = json.load(open(os.path.join(RAW, "overture_downtown_infra.geojson")))
    for f in inf["features"]:
        p = f["properties"]
        cls = p.get("class")
        g = f["geometry"]
        if g["type"] == "Point":
            x, z = project(*g["coordinates"])
            if bx[0] - 5 < x < bx[1] + 5 and bz[0] - 5 < z < bz[1] + 5:
                out["points"].setdefault(cls, []).append([x, z])
        elif g["type"] in ("Polygon", "MultiPolygon"):
            for poly in polys(g):
                rings = [[project(*c) for c in ring[:-1]] for ring in poly]
                if len(rings[0]) >= 3 and overlaps(rings):
                    # Parking areas and platforms go with the ground cover.
                    out["ground"].append({"kind": cls, "sub": p.get("subtype"), "name": p.get("name"), "rings": rings})
        else:
            for l in lines(g):
                for run in clip_line([project(*c) for c in l], (bx, bz), 5):
                    out["lines"].setdefault(cls, []).append(run)

    dest = os.path.join(ROOT, "web", "public", "data", "scene", name)
    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, "vignette.json"), "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    from collections import Counter

    print(f"{name}: {len(out['buildings'])} buildings, {len(out['roads'])} road runs {dict(Counter(x['cls'] for x in out['roads']))}, "
          f"{len(out['rail'])} rail runs {dict(Counter(x['cls'] for x in out['rail']))}")
    print("  ground:", dict(Counter(g["kind"] for g in out["ground"])))
    print("  points:", {k: len(v) for k, v in out["points"].items()}, " lines:", {k: len(v) for k, v in out["lines"].items()})


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "vignette-east")
