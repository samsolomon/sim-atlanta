"""Recover the lower highway surface where the Peachtree deck enters the bare-earth raster."""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree
from shapely.geometry import LineString, Point

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
from king_memorial_corridor import ept_points, R, K, LON0, LAT0

FIXTURES = HERE.parents[2] / "web/src/city/fixtures/midtown-connector"
board = HERE.parent / "square-board"
row = board / "brookwood-station"
manifest = json.loads((row / "ground.json").read_text())
grid = np.fromfile(row / "ground.i16", "<i2").reshape(manifest["rows"], manifest["cols"])
if len(sys.argv) > 1:
    cloud = np.load(sys.argv[1])
else:
    x, z, y, cls, _ = ept_points((LON0+math.degrees(-275/(R*K)), LAT0-math.degrees(-4570/R),
                                  LON0+math.degrees(55/(R*K)), LAT0-math.degrees(-5160/R)))
    cloud = np.column_stack([x, z, y, cls])
cloud = cloud[cloud[:, 3] == 2]
indexed = cKDTree(cloud[:, :2])
ways = json.loads((FIXTURES / "ways.json").read_text())
bridge = LineString(json.loads((FIXTURES.parent / "brookwood.json").read_text())["bridge"])
sections = [(ways[k]["pts"], ways[k]["lanes"], bridge, (-42,-36,-30,30,36,42)) for k in ("9235729", "28038801", "369529885")]
for road in json.loads((row/"context.json").read_text())["roads"]:
    if road["name"] == "Buford-Spring Connector" and not road["bridge"] and LineString(road["pts"]).intersects(bridge):
        sections.append((road["pts"], 2, bridge, (-42,-36,-30,30,36,42)))
sections.append((ways["29013401"]["pts"], 3, Point(-193.42, -4685.54), (-48,-42,-36,60,66,72)))
patches = {}
for pts, lanes, crossing, stations in sections:
    line = LineString(pts)
    at = line.project(crossing if isinstance(crossing, Point) else crossing.intersection(line))
    center = line.interpolate(at)
    row = board / ("brookwood-station" if center.y < -4900 else "brookwood-south")
    manifest = json.loads((row / "ground.json").read_text())
    grid = np.fromfile(row / "ground.i16", "<i2").reshape(manifest["rows"], manifest["cols"])
    updates = patches.setdefault(manifest["sha256"], {})
    half = lanes * 3.55 / 2 + 1.4
    samples = []
    for s in stations:
        p = line.interpolate(at+s)
        dx, dz = np.array(line.interpolate(at+s+.5).coords[0]) - line.interpolate(at+s-.5).coords[0]
        for off in np.linspace(-half+.8, half-.8, 5):
            xy = (p.x - dz*off, p.y + dx*off)
            h = cloud[indexed.query_ball_point(xy, 1.6), 2]
            if len(h) >= 4:
                samples.append([s, off, np.median(h)])
    a = np.array(samples)
    design = np.column_stack([a[:, :2], np.ones(len(a))])
    keep = np.array([abs(h - np.median(a[a[:,0] == s, 2])) < 1.2 for s, _, h in a])
    for _ in range(3):
        slope = np.linalg.lstsq(design[keep], a[keep, 2], rcond=None)[0]
        keep = abs(design @ slope - a[:, 2]) < .45
    assert keep.sum() >= 12 and abs(slope[0]) < .07 and abs(slope[1]) < .10, (pts[0], keep.sum(), slope)
    for x in range(5*math.floor((center.x-100)/5),5*math.ceil((center.x+100)/5),5):
        for z in range(5*math.floor((center.y-100)/5),5*math.ceil((center.y+100)/5),5):
            xy = Point(x, z)
            s = line.project(xy)
            dist = line.distance(xy)
            if not stations[0] < s-at < stations[-1] or dist >= half + 5:
                continue
            p = line.interpolate(s)
            dx, dz = np.array(line.interpolate(s+.5).coords[0]) - line.interpolate(s-.5).coords[0]
            off = (z - p.y)*dx - (x - p.x)*dz
            h = slope @ [s-at, off, 1]
            rr, cc = (z-int(manifest['bounds']['minZ']))//5, (x+1000)//5
            raw = int(grid[rr, cc])
            weight = min(1, (half+5-dist)/5, (s-at-stations[0])/8, (stations[-1]-s+at)/8)
            if raw/10-h < .35:
                continue
            index = rr*manifest["cols"] + cc
            updates[index] = min(updates.get(index, raw), round(raw+weight*(10*h-raw)))
result = {sha: [[k, v] for k, v in sorted(updates.items())] for sha, updates in patches.items()}
(FIXTURES / "underpass.json").write_text(json.dumps(result, separators=(",", ":"))+"\n")
