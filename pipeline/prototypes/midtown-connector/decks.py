"""Sample USGS GA_Statewide_B2_2018 classified bridge decks along mapped crossings."""
import json
import math
import sys
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
from king_memorial_corridor import K, LAT0, LON0, R, ept_points

FIXTURES = HERE.parents[2] / "web/src/city/fixtures/midtown-connector"
BOARD = HERE.parent / "square-board"
streets = ("North Avenue Northwest", "10th Street Northwest", "14th Street Northwest", "Deering Road Northwest")


def roads(row):
    context = json.loads((BOARD / row / "context.json").read_text())
    named = [np.array(r["pts"]) for r in context["roads"] if r["bridge"] and r["name"] in streets]
    for road in context["roads"]:
        if not road["bridge"]:
            continue
        xy = np.array(road["pts"])
        if road["cls"] == "motorway":
            # The existing 17th Street model already owns these ramps and mouths.
            if road["sub"] == "link" and np.any((xy[:, 1] < -3900) & (xy[:, 1] > -4260)):
                continue
        elif road["name"] not in streets:
            if road["cls"] != "footway" or not any(
                    np.min(np.linalg.norm(xy[:, None] - span[None, :], axis=2)) < 26 for span in named):
                continue
        yield road


def samples(xy, tree, cloud):
    distances = np.r_[0, np.cumsum(np.linalg.norm(np.diff(xy, axis=0), axis=1))]
    if distances[-1] < 1:
        return None
    stations = np.unique(np.r_[distances, np.linspace(0, distances[-1], math.ceil(distances[-1] / 10) + 1)])
    points = np.column_stack([np.interp(stations, distances, xy[:, i]) for i in range(2)])
    h = np.full(len(points), np.nan)
    for i, ids in enumerate(tree.query_ball_point(points, 2.5)):
        z = cloud[ids, 2]
        if len(z) >= 5 and np.ptp(np.percentile(z, (10, 90))) < .8:
            h[i] = np.median(z)
    measured = np.where(np.isfinite(h))[0]
    if len(measured) < 2 or np.max(np.diff(stations[measured])) > 24:
        return None
    s, elevation = stations[measured], h[measured]
    if s[0] > 22 or stations[-1] - s[-1] > 22 or np.max(abs(np.diff(elevation) / np.maximum(np.diff(s), 1))) > .15:
        return None
    # Extend a measured slope over at most 22 m of sparse returns at an abutment.
    estimates = np.interp(stations, s, elevation)
    for edge, neighbor, indices in [(0, 1, stations < s[0]), (-1, -2, stations > s[-1])]:
        slope = (elevation[edge] - elevation[neighbor]) / (s[edge] - s[neighbor])
        estimates[indices] = elevation[edge] + slope * (stations[indices] - s[edge])
    return dict(start=xy[0].tolist(), end=xy[-1].tolist(), pts=points.round(4).tolist(),
                heights=estimates.round(2).tolist(), measured=measured.tolist())


profiles = []
cached = np.load(sys.argv[1]) if len(sys.argv) > 1 else None
for row in json.loads((BOARD / "midtown-rows.json").read_text()):
    for road in roads(row):
        xy = np.array(road["pts"])
        if cached is None:
            west, north = xy.min(0) - 5
            east, south = xy.max(0) + 5
            x, z, h, c, _ = ept_points((LON0 + math.degrees(west / (R * K)), LAT0 - math.degrees(south / R),
                                        LON0 + math.degrees(east / (R * K)), LAT0 - math.degrees(north / R)))
            cloud = np.column_stack((x[c == 17], z[c == 17], h[c == 17]))
        else:
            cloud = cached[cached[:, 3] == 17, :3]
        profile = samples(xy, cKDTree(cloud[:, :2]), cloud)
        if profile:
            profiles.append(profile)
(FIXTURES / "decks.json").write_text("[\n" + ",\n".join(json.dumps(p, separators=(",", ":")) for p in profiles) + "\n]\n")
