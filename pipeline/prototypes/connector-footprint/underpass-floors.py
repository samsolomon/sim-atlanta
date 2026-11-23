"""Infer the covered pavement from exposed class-2 returns at the road approaches outside seven street decks."""

import json
import math
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import Polygon
from shapely import contains_xy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
from king_memorial_corridor import LAT0, LON0, R, K, ept_points

# City metres on the lower road at each edge of the upper deck. Sections
# intersect the mapped beam outline with the painted carriageway axis; the
# last value is half the travel width. Short way splits share a transect.
sections = {
    953207661: [
        (963910432, 967.97, -901.8, 862.48, -998.12, 3.55),
        (1051688672, 833.78, -938.68, 892.3, -872.73, 3.55),
        (1051688674, 848.27, -954.4, 909.38, -891.13, 10.65),
        (1051688675, 957.16, -889.59, 852.56, -987.36, 10.65),
    ],
    875253220: [
        (337901415, 718.18, -1137.99, 663.38, -1206.07, 12.425),
        (337901423, 637.25, -1192.96, 714.71, -1096.62, 12.425),
        (992446026, 609.95, -1182.03, 625.33, -1159.13, 3.55),
    ],
    863050887: [
        (9235923, 894.36, 463.37, 911.94, 443.48, 1.775),
        (9236952, 827.34, 440.83, 804.02, 459.71, 1.775),
        (119686423, 871.75, 463.31, 892.21, 442.9, 12.425),
        (316454382, 849.27, 441.63, 827.25, 462.94, 12.425),
    ],
    1278959968: [
        (9236888, 576.89, 601.96, 542.74, 616.23, 3.55),
        (39160892, 613.71, 643.07, 645.69, 627.86, 3.55),
        (119686426, 596.75, 609.44, 564.75, 624.56, 10.65),
        (949112684, 597.23, 636.84, 629.32, 621.7, 8.875),
    ],
    1450884819: [
        (9238587, 580.74, -1296.42, 554.19, -1317.03, 3.55),
        (337901415, 580.05, -1286.12, 553.89, -1305.52, 12.425),
        (337901423, 551.17, -1270.34, 575.32, -1251.73, 12.425),
        (435586508, 548.11, -1252.67, 569.8, -1229.03, 1.775),
    ],
    1450884817: [
        (1467383125, 306.1, -1438.99, 324.17, -1426.66, 10.65),
        (1467383127, 299.64, -1423.86, 318.2, -1412.41, 1.775),
        (1467383131, 335.02, -1452.56, 317.61, -1465.99, 10.65),
    ],
    1451206619: [
        (28684853, 367.64, 1055.54, 340.45, 1034.87, 1.775),
        (305894125, 367.72, 1043.12, 340.58, 1014.29, 3.55),
    ],
}

surveys = json.loads((HERE / "junction-decks.json").read_text()) + json.loads(
    (HERE / "street-bridges.json").read_text()
)
planes = []
for site in surveys:
    if "rows" in site:
        sid = site["outline"]
        rows = site["rows"]
        outline = Polygon([r[:2] for r in rows] + [r[3:5] for r in reversed(rows)])
    else:
        sid = site["outlineId"]
        outline = Polygon(site["outline"])
    xmin, zmin, xmax, zmax = outline.buffer(55).bounds
    lon = lambda x: LON0 + math.degrees(x / (R * K))
    lat = lambda z: LAT0 - math.degrees(z / R)
    x, z, h, c, _ = ept_points((lon(xmin), lat(zmax), lon(xmax), lat(zmin)))
    exposed = (c == 2) & ~contains_xy(outline.buffer(3), x, z)
    for wid, ax, az, bx, bz, width in sections[sid]:
        length = math.hypot(bx - ax, bz - az)
        dx, dz = (bx - ax) / length, (bz - az) / length
        u = (x - ax) * dx + (z - az) * dz
        v = (z - az) * dx - (x - ax) * dz
        ends = ((u > -32) & (u < -4)) | ((u > length + 4) & (u < length + 32))
        use = exposed & ends & (abs(v) < width)
        for side in [u < 0, u > length]:
            sample = h[use & side]
            if len(sample) < 12:
                raise ValueError((wid, len(sample)))
            use &= ~side | (abs(h - np.median(sample)) < 1.0)
        design = np.stack([u, v, np.ones(len(u))], 1)
        for _ in range(3):
            plane = np.linalg.lstsq(design[use], h[use], rcond=None)[0]
            use &= abs(h - design @ plane) < 0.45
        if abs(plane[1]) > 0.09:
            raise ValueError((wid, plane))
        planes.append((ax, az, dx, dz, length, width, plane))
        print(wid, sum(use), plane.round(4), flush=True)

patches = {}
for source in ["downtown-ground", "square-board/north-band", "square-board/south-band"]:
    directory = HERE.parent / source
    m = json.loads((directory / "ground.json").read_text())
    raw = np.fromfile(directory / "ground.i16", dtype="<i2").reshape(
        m["rows"], m["cols"]
    )
    old = raw * m["scaleM"] + m["offsetM"]
    j, i = np.indices(old.shape)
    x = m["bounds"]["minX"] + i * m["stepM"]
    z = m["bounds"]["minZ"] + j * m["stepM"]
    cover = np.zeros_like(old)
    total = cover.copy()
    weighted = cover.copy()
    for ax, az, dx, dz, length, width, plane in planes:
        s = (x - ax) * dx + (z - az) * dz
        t = (z - az) * dx - (x - ax) * dz
        w = np.clip(
            np.minimum.reduce(
                [(width + 20 - abs(t)) / 9, (s + 44) / 16, (length + 44 - s) / 16]
            ),
            0,
            1,
        )
        cover = np.maximum(cover, w)
        weight = w * np.exp(-0.5 * (t / (0.65 * width + 4)) ** 2)
        total += weight
        weighted += weight * (plane[0] * s + plane[1] * t + plane[2])
    # Tie into the unchanged board-edge nodes before the shared mosaic seam.
    edge = np.minimum.reduce([i, j, m["cols"] - 1 - i, m["rows"] - 1 - j])
    cover *= np.clip(edge / 2, 0, 1)
    result = old + cover * (weighted / np.maximum(total, 1e-12) - old)
    q = np.round(result, 2)
    indices = np.flatnonzero((abs(q - old) > 0.015) & (raw != m["noData"]))
    patches[m["sha256"]] = [[int(i), float(q.flat[i])] for i in indices]
(HERE / "underpass-floors.json").write_text(
    json.dumps(patches, separators=(",", ":")) + "\n"
)
