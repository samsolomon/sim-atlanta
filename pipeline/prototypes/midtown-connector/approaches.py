"""Carry each deck grade to its connected on-grade street or carriageway."""
import json
import math
from collections import defaultdict
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
BOARD = HERE.parent / "square-board"
FIXTURES = HERE.parents[2] / "web/src/city/fixtures/midtown-connector"
profiles = json.loads((FIXTURES / "decks.json").read_text())
key = lambda pts: (tuple(pts[0]), tuple(pts[-1]))
roads = {}
for row in json.loads((BOARD / "midtown-rows.json").read_text()):
    for r in json.loads((BOARD / row / "context.json").read_text())["roads"]:
        if len(r["pts"]) >= 2 and r["pts"][0] != r["pts"][-1]:
            roads[key(r["pts"])] = r
ends = defaultdict(list)
for k, r in roads.items():
    if r["bridge"] or r["tunnel"]:
        continue
    for i in (0, -1):
        ends[k[i]].append((k, i))

# Samples here are longitudinal grade estimates. At the toe the renderer blends
# each side of the full pavement into its own drawn terrain triangle.
ties = defaultdict(dict)
def trace(k, i, direction, h, slope, distance, length, family):
    r = roads[k]
    points = np.asarray(r["pts"])[::1 if i == 0 else -1]
    delta = points[1] - points[0]
    if np.dot(direction, delta) < .65 * np.linalg.norm(delta):
        return
    previous = ties[k].get(i)
    if previous and previous[0] <= distance:
        return
    ties[k][i] = (distance, length, h, slope)
    remainder = np.diff(points, axis=0)
    distance += np.linalg.norm(remainder, axis=1).sum()
    if distance >= length:
        return
    heading = remainder[-1] / np.linalg.norm(remainder[-1])
    for other, j in ends[tuple(points[-1])]:
        if other != k and same_family(roads[other], family):
            trace(other, j, heading, h, slope, distance, length, family)

def same_family(road, family):
    return (road["name"], road["cls"], road["sub"]) == family

for profile in profiles:
    k = (tuple(profile["start"]), tuple(profile["end"]))
    owner = roads[k]
    family = (owner["name"], owner["cls"], owner["sub"])
    for i, j in ((0, 1), (-1, -2)):
        pt = np.array(profile["pts"][i]); delta = pt - profile["pts"][j]
        dist = np.linalg.norm(delta)
        if dist == 0:
            continue
        slope = np.clip((profile["heights"][i] - profile["heights"][j]) / dist, -.09, .09)
        for other, side in ends[tuple(pt)]:
            if same_family(roads[other], family):
                trace(other, side, delta / dist, profile["heights"][i], slope, 0,
                      75 if owner["cls"] == "motorway" else 38, family)

result = []
for k, anchors in sorted(ties.items()):
    a = np.array(roads[k]["pts"])
    cum = np.r_[0, np.cumsum(np.linalg.norm(np.diff(a, axis=0), axis=1))]
    intervals = []
    for i, (distance, length, h, slope) in anchors.items():
        reach = min(cum[-1], length - distance)
        intervals.append((0, reach) if i == 0 else (cum[-1] - reach, cum[-1]))
    if len(intervals) == 2 and max(p[0] for p in intervals) <= min(p[1] for p in intervals):
        intervals = [(0, cum[-1])]
    for start, end in intervals:
        s = np.unique(np.r_[cum[(cum >= start) & (cum <= end)], np.linspace(start, end, math.ceil((end - start) / 6) + 1)])
        xy = np.column_stack([np.interp(s, cum, a[:, i]) for i in range(2)])
        weights, heights = [], []
        for station in s:
            influence, profile = [], []
            for i, (d, length, h, slope) in anchors.items():
                dist = d + (station if i == 0 else cum[-1] - station)
                t = min(1, dist / length)
                influence.append(1 - t*t*(3-2*t))
                profile.append(h + slope * dist)
            f = max(influence)
            weights.append(round(f, 5))
            # Respect both deck ends when two spans share a short ground link.
            weights_at_point = [v / max(1e-6, 1-v) for v in influence]
            heights.append(round(float(np.average(profile, weights=weights_at_point) if f else profile[0]), 3))
        result.append(dict(start=list(k[0]), end=list(k[1]), pts=xy.round(4).tolist(), heights=heights, weights=weights))
(FIXTURES / "approaches.json").write_text("[\n" + ",\n".join(json.dumps(p, separators=(",", ":")) for p in result) + "\n]\n")
