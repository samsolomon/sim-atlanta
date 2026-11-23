"""Bake downtown MARTA cover from OSM into the web bundle, for Follow.

Source: every railway=subway way in the board south of the Midtown rows (x -1000..1800,
z -1300..1100), fetched from Overpass on 2026-11-23 and archived as source.json.gz
(re-fetch with --refresh). (c) OpenStreetMap contributors, ODbL.

Each way becomes 'tunnel' (tunnel=yes), 'covered' (tunnel=building_passage or
covered=yes), 'bridge' (bridge=yes) or 'open'. Unnamed pieces (crossovers, platform
tracks) take the line name of a named way they share an endpoint with, so a Red or Gold
train is never matched to a Blue or Green tunnel where the lines cross at Five Points.

City never draws a train inside these ways. Follow uses them only to explain a train it
cannot draw: the claim comes from the mapped tag, not from the absence of a car.
"""
import gzip
import json
import math
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[2] / "web/src/city/fixtures/downtown-rail-cover.json"
SOURCE = HERE / "source.json.gz"
BOX = (-1000, 1800, -1300, 1100)  # minX, maxX, minZ, maxZ: south of the North Line bake
R, LON0, LAT0 = 6371008.8, -84.3916, 33.7539
K = math.cos(math.radians(LAT0))


def project(lon, lat):
    return (lon - LON0) * math.radians(1) * R * K, -(lat - LAT0) * math.radians(1) * R


def unproject(x, z):
    return LON0 + x / (math.radians(1) * R * K), LAT0 - z / (math.radians(1) * R)


def fetch():
    lon0, lat1 = unproject(BOX[0] - 60, BOX[2] - 60)
    lon1, lat0 = unproject(BOX[1] + 60, BOX[3] + 60)
    q = f'[out:json][timeout:60];way["railway"="subway"]({lat0:.5f},{lon0:.5f},{lat1:.5f},{lon1:.5f});out tags geom;'
    req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode(),
                                 headers={"User-Agent": "sim-atlanta-pipeline"})
    data = json.load(urllib.request.urlopen(req, timeout=120))
    if not data.get("elements"):
        raise RuntimeError("Overpass returned no subway ways; not overwriting the archive")
    with gzip.open(SOURCE, "wt") as f:
        json.dump(data, f)


def clip(pts):
    """Keep the sub-polylines inside BOX (vertices only; ways are densely noded), each with
    whether its start and end are the way's own ends (a mouth) rather than a cut at BOX."""
    runs, run, first = [], [], 0
    for i, (x, z) in enumerate(pts):
        if BOX[0] <= x <= BOX[1] and BOX[2] <= z <= BOX[3]:
            if not run:
                first = i
            run.append([round(x, 2), round(z, 2)])
        else:
            if len(run) >= 2:
                runs.append((run, [first == 0, False]))
            run = []
    if len(run) >= 2:
        runs.append((run, [first == 0, True]))
    return runs


def main(refresh=False):
    if refresh or not SOURCE.exists():
        fetch()
    ways = [e for e in json.load(gzip.open(SOURCE))["elements"] if e["type"] == "way"]
    ends = lambda w: {(g["lat"], g["lon"]) for g in (w["geometry"][0], w["geometry"][-1])}
    line = {w["id"]: w["tags"].get("name") for w in ways}
    # Propagate names across shared endpoints until stable (unnamed crossovers and platform tracks).
    for _ in range(10):
        changed = False
        for w in ways:
            if line[w["id"]]:
                continue
            names = {line[o["id"]] for o in ways if o is not w and line[o["id"]] and ends(o) & ends(w)}
            if len(names) == 1:
                line[w["id"]] = names.pop()
                changed = True
        if not changed:
            break
    # Then a way still unnamed takes the name of a named way within 10 m on the same layer:
    # a platform track beside its line, never the line on another level below it.
    def seg(p, a, b):
        dx, dz = b[0] - a[0], b[1] - a[1]
        t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz or 1)))
        return math.dist(p, (a[0] + t * dx, a[1] + t * dz))
    pts_of = {w["id"]: [project(g["lon"], g["lat"]) for g in w["geometry"]] for w in ways}
    layer = {w["id"]: w["tags"].get("layer", "0") for w in ways}
    for w in ways:
        if line[w["id"]]:
            continue
        mine = pts_of[w["id"]]
        mid = mine[len(mine) // 2]
        near = [(min(seg(mid, q[i - 1], q[i]) for i in range(1, len(q))), line[o["id"]])
                for o in ways if line[o["id"]] and layer[o["id"]] == layer[w["id"]] for q in [pts_of[o["id"]]]]
        near = [n for n in near if n[0] <= 10]
        if near and len({n[1] for n in near}) == 1:
            line[w["id"]] = near[0][1]
    out, counts = [], {}
    for w in ways:
        t = w["tags"]
        kind = ("covered" if t.get("tunnel") == "building_passage" or t.get("covered") == "yes" else
                "tunnel" if t.get("tunnel") == "yes" else "bridge" if t.get("bridge") == "yes" else "open")
        for pts, ends in clip([project(g["lon"], g["lat"]) for g in w["geometry"]]):
            out.append({"way": w["id"], "line": line[w["id"]], "kind": kind, "layer": int(t.get("layer", 0)), "ends": ends, "pts": pts})
            counts[(line[w["id"]], kind)] = counts.get((line[w["id"]], kind), 0) + 1
    OUT.write_text(json.dumps(out, separators=(",", ":")) + "\n")
    for k, v in sorted(counts.items(), key=lambda kv: str(kv[0])):
        print(v, k)


if __name__ == "__main__":
    main("--refresh" in sys.argv)
