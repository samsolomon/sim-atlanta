"""Open-track grade anchors for the Norcross mains between the Brookwood clip and the board edges.

Samples the staged USGS 3DEP bare-earth rows (5 m grid, NAVD88) along the mapped
continuations of Main 1, Main 2 and the siding. Neither extension crosses a mapped
bridge, tunnel or road overpass, so the bare earth under the track is the bed.
Each anchor is the median of both mains within 6 m of the anchor's x.
"""
import json
import math
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
BOARD = HERE.parent / "square-board"
FIXTURES = HERE.parents[2] / "web/src/city/fixtures"
rail = json.loads((FIXTURES / "midtown-rail.json").read_text())


def grid(row):
    m = json.loads((BOARD / row / "ground.json").read_text())
    return m, np.fromfile(BOARD / row / "ground.i16", "<i2").reshape(m["rows"], m["cols"])


def sample(m, a, x, z):
    b = m["bounds"]
    c, r = (x - b["minX"]) / m["stepM"], (z - b["minZ"]) / m["stepM"]
    c0, r0 = int(c), int(r)
    fc, fr = c - c0, r - r0
    v = a[r0:r0 + 2, c0:c0 + 2].astype(float) * m["scaleM"] + m["offsetM"]
    return float(v[0, 0] * (1 - fc) * (1 - fr) + v[0, 1] * fc * (1 - fr) + v[1, 0] * (1 - fc) * fr + v[1, 1] * fc * fr)


def points(pts, step=2.0):
    for i in range(1, len(pts)):
        (ax, az), (bx, bz) = pts[i - 1], pts[i]
        n = max(1, math.ceil(math.dist(pts[i - 1], pts[i]) / step))
        for k in range(n + 1):
            yield ax + (bx - ax) * k / n, az + (bz - az) * k / n


def anchors(row, runs, xs):
    m, a = grid(row)
    samples = [(x, z, sample(m, a, x, z)) for run in runs for x, z in points(run["pts"])]
    out = []
    for x in xs:
        near = [h for sx, _, h in samples if abs(sx - x) <= 6]
        out.append([x, round(float(np.median(near)), 2)])
    return out


mains = lambda row: [r for r in rail[row] if r.get("name") == "NS Norcross District"]
west = anchors("brookwood-south", mains("brookwood-south"), list(range(-600, -1000, -25)) + [-994])
east = anchors("brookwood-station", mains("brookwood-station"), list(range(430, 700, 25)) + [694])
siding = [r for r in rail["brookwood-station"] if r.get("name") is None and r["cls"] == "standard_gauge"]
tip = anchors("brookwood-station", siding, [706])
result = {"west": sorted(west), "east": sorted(east + tip)}
(FIXTURES / "brookwood-corridor.json").write_text(json.dumps(result, separators=(",", ":")) + "\n")
print(json.dumps(result))
