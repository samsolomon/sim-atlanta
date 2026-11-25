"""Build an offline network from the pinned OSM graph and fitting windows."""

import json
import math
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import LineString

DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(DIR.parent))
from pilot import mesh

LANE = 3.55  # inferred motor lane width from the preceding ramp fixture


def load(name):
    return json.loads((DIR / name).read_text())


def bake():
    source = load("source.json")
    ways = source["ways"]
    incoming, *others = ways
    node = source["junction"]
    assert incoming["nodes"][-1] == node
    outgoing = [w for w in others if w["nodes"][0] == node]
    decks = [w for w in others if w not in outgoing]
    assert all(w["tags"]["oneway"] == "yes" for w in ways)
    # Lane destinations are reported; the monotone receiving ordinal is inferred.
    connections = []
    for w in outgoing:
        destinations = set(w["tags"]["destination"].split(";"))
        matching = [
            i + 1
            for i, s in enumerate(incoming["tags"]["destination:lanes"].split("|"))
            if destinations.intersection(s.split(";"))
        ]
        assert len(matching) == int(w["tags"]["lanes"])
        connections.extend([i, w["id"], j] for j, i in enumerate(matching, 1))
    outgoing.sort(key=lambda w: min(i for i, k, _ in connections if k == w["id"]))
    assert len(outgoing) == 2
    profiles = {}
    obs = load("fit-returns.json")
    for w in ways:
        cls = 17 if w["tags"].get("bridge") == "yes" else 2
        anchors = {}
        for k, s, groups in obs:
            if k != w["id"]:
                continue
            valid = [
                h for c, n, h, spread in groups if c == cls and n >= 4 and spread <= 1.2
            ]
            if len(valid) == 1:
                anchors[s] = valid[0]
        profiles[w["id"]] = sorted(anchors.items())

    def height(w, s):
        ss, hh = zip(*profiles[w["id"]])
        if s < ss[0] - 0.001 or s > ss[-1] + 0.001:
            raise ValueError("No bracketing heights")
        return float(np.interp(s, ss, hh))

    origin = np.array(incoming["xz"][-1])
    along = origin - np.array(incoming["xz"][-2])
    along /= np.linalg.norm(along)
    right = np.array([-along[1], along[0]])
    axes = {}
    for w in [incoming, *outgoing]:
        pts = np.array(w["xz"]) - origin
        dist = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
        t = pts @ along
        assert np.all(np.diff(t) > 0)
        axes[w["id"]] = (t, pts @ right, dist)
    left, rightway = outgoing

    def width(w):
        return int(w["tags"]["lanes"]) * LANE

    def raw(w, t):
        return float(np.interp(t, *axes[w["id"]][:2]))

    def center(w, t):
        if w is incoming:
            return raw(w, t)
        # Two one-way axes start at the same OSM node. Share the parent cross
        # section there, separating their lane strips until the axes diverge.
        l, r = raw(left, t), raw(rightway, t)
        deficit = max(0, (width(left) + width(rightway)) / 2 - (r - l))
        if w is left:
            return l - deficit * width(rightway) / width(incoming)
        return r + deficit * width(left) / width(incoming)

    grid = set()
    for t, _, _ in axes.values():
        grid.update([*t, *range(math.ceil(t[0]), math.ceil(t[-1]))])
    surfaces = []

    def add(w, lane, rows):
        surf = mesh(w, LANE, origin[1], rows)
        surfaces.append(
            dict(
                way=w["id"],
                lane=lane,
                rows=rows,
                pieces=surf["pieces"],
                cutZ=surf["cutZ"],
            )
        )

    for w in [incoming, *outgoing]:
        ts, _, ds = axes[w["id"]]
        for lane in range(1, int(w["tags"]["lanes"]) + 1):
            rows = []
            for t in sorted(v for v in grid if ts[0] <= v <= ts[-1]):
                s = float(np.interp(t, ts, ds))
                h = height(w, s)
                mid = center(w, t) - width(w) / 2 + (lane - 0.5) * LANE
                pts = [
                    origin + along * t + right * (mid + offset)
                    for offset in [-LANE / 2, LANE / 2]
                ]
                rows.append([[x, h, z, s] for x, z in pts])
            add(w, lane, rows)
    for w in decks:
        axis = LineString(w["xz"])
        rows = []
        for s in sorted({0, axis.length, *range(1, math.ceil(axis.length))}):
            p = np.array(axis.interpolate(s).coords[0])
            v = np.array(
                axis.interpolate(min(axis.length, s + 0.2)).coords[0]
            ) - np.array(axis.interpolate(max(0, s - 0.2)).coords[0])
            n = np.array([-v[1], v[0]]) / np.linalg.norm(v)
            rows.append(
                [
                    [x, height(w, s), z, s]
                    for x, z in (p - n * width(w) / 2, p + n * width(w) / 2)
                ]
            )
        add(w, 0, rows)
    intersections = []
    for branch in outgoing:
        line = LineString(branch["xz"])
        for deck in decks:
            hit = line.intersection(LineString(deck["xz"]))
            if hit.geom_type != "Point" or hit.is_empty:
                continue
            shared = set(branch["nodes"]) & set(deck["nodes"])
            intersections.append(
                dict(
                    branch=branch["id"],
                    deck=deck["id"],
                    station=line.project(hit),
                    sharedNodes=sorted(shared),
                    layer=deck["tags"].get("layer"),
                )
            )
    return dict(
        approach=incoming["id"],
        connections=connections,
        surfaces=surfaces,
        profiles=profiles,
        intersections=intersections,
    )


if __name__ == "__main__":
    print(json.dumps(bake(), allow_nan=False, separators=(",", ":")))
