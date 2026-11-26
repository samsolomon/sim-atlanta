"""Movement and elevation register for stacked Connector ramps (Freedom Parkway
interchange, the MLK SB ramps and the Baker exit).

For every mapped Connector way in the three areas, track the way's OWN surface
along its centre line in the 2019 USGS cloud: at each 5 m station the class-2
and class-17 returns within 2.4 m split into height clusters, and the walk keeps
the cluster continuous with the previous station, seeded at the end nearest the
drawn ground. Crossing ways are ordered by those tracked heights. The register
records how City draws each way today and the drawn ground beneath it.

Run from the repository root with the pipeline venv (numpy, scipy, shapely,
laspy[lazrs], pyproj); writes ramp-register.json beside this file.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import LineString, box

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "scripts"))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points

AREAS = {
    "freedom-parkway": box(880, -900, 1700, -430),
    "mlk": box(530, 540, 690, 625),
    "baker": box(840, -900, 1060, -760),
}
STEP, RADIUS, SPLIT, CONTINUITY = 5.0, 2.4, 1.5, 1.2


def lonlat(x, z):
    return LON0 + math.degrees(x / (R * K)), LAT0 - math.degrees(z / R)


def drawn_grids():
    """Board elevations as the City draws them before decks: underpass edits applied."""
    patches = json.loads((HERE / "underpass-floors.json").read_text())
    auburn = json.loads((HERE / "sweet-auburn-decks.json").read_text())["underpass"]
    out = []
    for name in ["downtown-ground", "square-board/north-band", "square-board/north-corner", "sweet-auburn/ground"]:
        d = ROOT / "pipeline" / "prototypes" / name
        m = json.loads((d / "ground.json").read_text())
        a = np.fromfile(d / "ground.i16", dtype="<i2").astype(float)
        for i, v in patches.get(m["sha256"], []):
            a[i] = v * 10
        if m["sha256"] == auburn["groundSha256"]:
            for i, v in auburn["nodes"]:
                a[i] = v
        out.append((m, (a * m["scaleM"] + m["offsetM"]).reshape(m["rows"], m["cols"])))
    return out


def ground_at(grids, x, z):
    for m, a in grids:
        b = m["bounds"]
        if b["minX"] <= x <= b["maxX"] and b["minZ"] <= z <= b["maxZ"]:
            c, r = (x - b["minX"]) / m["stepM"], (z - b["minZ"]) / m["stepM"]
            c0, r0 = min(int(c), m["cols"] - 2), min(int(r), m["rows"] - 2)
            fc, fr = c - c0, r - r0
            return float(a[r0, c0] * (1 - fc) * (1 - fr) + a[r0, c0 + 1] * fc * (1 - fr)
                         + a[r0 + 1, c0] * (1 - fc) * fr + a[r0 + 1, c0 + 1] * fc * fr)
    return None


def clusters(heights):
    if len(heights) < 4:
        return []
    h = np.sort(heights)
    groups, start = [], 0
    for i in range(1, len(h) + 1):
        if i == len(h) or h[i] - h[i - 1] > SPLIT:
            if i - start >= 4:
                groups.append(float(np.median(h[start:i])))
            start = i
    return groups


def track(stations, ground):
    """Choose one level per station: seed at the end nearest the drawn ground."""
    def walk(order):
        out, prev, last = {}, None, None
        for k in order:
            levels = stations[k]["levels"]
            if not levels:
                continue
            if prev is None:
                g = ground[k]
                pick = min(levels, key=lambda v: abs(v - g)) if g is not None else min(levels)
            else:
                pick = min(levels, key=lambda v: abs(v - prev))
                # A structure overhead can hide the way for a few stations; allow
                # an 8% grade across the hidden stretch before rejecting a level.
                if abs(pick - prev) > CONTINUITY + .08 * STEP * (abs(k - last) - 1):
                    continue
            out[k] = pick
            prev, last = pick, k
        return out
    idx = list(range(len(stations)))
    fwd, back = walk(idx), walk(idx[::-1])
    def tie(path, k):
        g = ground[k]
        return abs(path[k] - g) if (k in path and g is not None) else math.inf
    # Keep the walk whose seed sits closer to the drawn ground.
    return fwd if tie(fwd, min(fwd, default=0)) <= tie(back, max(back, default=0)) else back


def main():
    ways = json.loads((HERE / "ways.json").read_text())
    grids = drawn_grids()
    profiled = json.loads((HERE / "sweet-auburn-decks.json").read_text())["roads"]
    ends = [(tuple(p["start"]), tuple(p["end"])) for p in profiled]
    register = []
    for area, poly in AREAS.items():
        b = poly.bounds
        x, z, h, c, _ = ept_points((*lonlat(b[0] - 10, b[3] + 10), *lonlat(b[2] + 10, b[1] - 10)))
        keep = (c == 2) | (c == 17)
        tree, hh = cKDTree(np.column_stack((x[keep], z[keep]))), h[keep]
        for wid, w in ways.items():
            line = LineString(w["pts"])
            if not line.intersects(poly) or line.intersection(poly).length < 8:
                continue
            listed = next((r for r in register if r["way"] == int(wid)), None)
            if listed:
                listed["areas"].append(area)
                continue
            stations, ground = [], []
            for s in np.arange(0, line.length + 1e-6, STEP):
                p = line.interpolate(s)
                near = tree.query_ball_point([p.x, p.y], RADIUS)
                stations.append({"s": round(float(s), 1), "xz": [round(p.x, 2), round(p.y, 2)],
                                 "levels": [round(v, 2) for v in clusters(hh[near])]})
                ground.append(ground_at(grids, p.x, p.y))
            path = track(stations, ground)
            for k, st in enumerate(stations):
                st["own"] = path.get(k)
                st["ground"] = None if ground[k] is None else round(ground[k], 2)
            above = [st["own"] - st["ground"] for st in stations if st["own"] is not None and st["ground"] is not None]
            start, end = tuple(w["pts"][0]), tuple(w["pts"][-1])
            surveyed = any(math.dist(start, a) < .5 or math.dist(end, b2) < .5 for a, b2 in ends)
            register.append({
                "areas": [area], "way": int(wid), "osmKind": w["kind"], "link": w["link"], "lanes": w["lanes"],
                "lengthM": round(line.length, 1), "start": list(start), "end": list(end),
                "drawnToday": ("surveyed deck" if surveyed else
                               "clearance-inferred bridge" if w["kind"] == "bridge" else "ground on the board"),
                "maxAboveDrawnGroundM": round(max(above), 2) if above else None,
                "trackedShare": round(sum(1 for st in stations if st["own"] is not None) / len(stations), 2),
                "stations": stations,
            })
    # Connectivity by shared endpoints, and crossings ordered by tracked height.
    for r in register:
        r["from"] = sorted({o["way"] for o in register if o is not r and math.dist(o["end"], r["start"]) < .05})
        r["to"] = sorted({o["way"] for o in register if o is not r and math.dist(o["start"], r["end"]) < .05})
    crossings = []
    for i, a in enumerate(register):
        for b2 in register[i + 1:]:
            la, lb = LineString(ways[str(a["way"])]["pts"]), LineString(ways[str(b2["way"])]["pts"])
            hit = la.intersection(lb)
            if hit.is_empty or hit.geom_type != "Point":
                continue
            if any(math.dist([hit.x, hit.y], p) < 1 for p in (a["start"], a["end"], b2["start"], b2["end"])):
                continue
            def at(r, line):
                s = line.project(hit)
                near = [st for st in r["stations"] if st["own"] is not None and abs(st["s"] - s) <= 7.5]
                return round(float(np.interp(s, [st["s"] for st in near], [st["own"] for st in near])), 2) if near else None
            ha, hb = at(a, la), at(b2, lb)
            crossings.append({"xz": [round(hit.x, 2), round(hit.y, 2)], "ways": [a["way"], b2["way"]], "heights": [ha, hb],
                              "upper": None if None in (ha, hb) else (a["way"] if ha > hb else b2["way"]),
                              "gapM": None if None in (ha, hb) else round(abs(ha - hb), 2)})
    (HERE / "ramp-register.json").write_text(json.dumps({"ways": register, "crossings": crossings}, indent=1) + "\n")
    for r in sorted(register, key=lambda r: (r["areas"][0], -(r["maxAboveDrawnGroundM"] or 0))):
        print(r["areas"], r["way"], r["osmKind"], r["drawnToday"], "max above", r["maxAboveDrawnGroundM"], "tracked", r["trackedShare"])
    print(len(crossings), "crossings")


if __name__ == "__main__":
    main()
