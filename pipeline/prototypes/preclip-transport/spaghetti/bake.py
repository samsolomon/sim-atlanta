"""Bake the offline tread fixture. Only fit-returns.json supplies elevations."""

import json, math, sys
from pathlib import Path
import numpy as np
from scipy.interpolate import PchipInterpolator
from shapely.geometry import LineString

DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(DIR.parent))
from pilot import mesh


def bake():
    source = json.loads((DIR / "source.json").read_text())
    samples = json.loads((DIR / "fit-returns.json").read_text())
    ways = source["route"]
    for a, b in zip(ways, ways[1:]):
        assert a["nodes"][-1] == b["nodes"][0] and a["tags"]["oneway"] == "yes"
    assert ways[-1]["tags"]["oneway"] == "yes"

    # Rotate the projected frame: harness Z now increases east; north is positive X.
    def axis(coords):
        return LineString([(-z, x) for x, z in coords])

    route = axis([p for i, w in enumerate(ways) for p in w["xz"][int(i > 0) :]])
    ends = np.cumsum([axis(w["xz"]).length for w in ways])

    def way(s):
        return ways[min(len(ways) - 1, np.searchsorted(ends, s, side="right"))]

    crossings = source["crossings"]
    cut = next(c["crossXZ"][0] for c in crossings if c["crossingWay"] == 41050323)
    surfaces = []
    for label, line, entry in [("route", route, None)] + [
        (str(c["crossingWay"]), axis(c["xz"]), c) for c in crossings
    ]:
        anchors = []
        for key, s, groups in samples:
            if key != label:
                continue
            tags = way(s)["tags"] if entry is None else entry["tags"]
            cls = 17 if tags.get("bridge") == "yes" else 2
            # Block potentially misassigned returns beneath/above another axis.
            near = (
                min(abs(s - c["station"]) for c in crossings)
                if entry is None
                else abs(s - line.project(axis_point(entry)))
            )
            if near < 18:
                continue
            g = [
                h for k, n, h, spread in groups if k == cls and n >= 4 and spread <= 1.2
            ]
            if len(g) == 1:
                anchors.append((s, g[0]))
        anchors = sorted(dict(anchors).items())
        if len(anchors) < 2:
            raise ValueError(f"Insufficient unambiguous anchors for {label}")
        ss, hh = np.array(anchors).T
        profile = PchipInterpolator(ss, hh, extrapolate=False)

        # Extrapolate only short section ends along the nearest sampled secant.
        def height(s):
            if s < ss[0]:
                return hh[0] + (s - ss[0]) * (hh[1] - hh[0]) / (ss[1] - ss[0])
            if s > ss[-1]:
                return hh[-1] + (s - ss[-1]) * (hh[-1] - hh[-2]) / (ss[-1] - ss[-2])
            return float(profile(s))

        centers = []
        rows = []
        widths = [3.55 * int(w["tags"]["lanes"]) for w in ways]

        # A 30 m illustrative width transition keeps the carrier continuous across way joins.
        def width(s):
            if entry:
                return 3.55 * int(entry["tags"].get("lanes", 1))
            value = widths[0]
            for end, left, right in zip(ends, widths, widths[1:]):
                value += (right - left) * min(1, max(0, (s - end + 15) / 30))
            return value

        stations = sorted(
            {
                *np.arange(0, line.length, 2),
                line.length,
                *[v for v in ss if v < line.length],
            }
        )
        for s in stations:
            p = line.interpolate(s)
            a = line.interpolate(max(0, s - 0.5))
            b = line.interpolate(min(line.length, s + 0.5))
            dx, dz = b.x - a.x, b.y - a.y
            length = math.hypot(dx, dz)
            nx, nz = -dz / length, dx / length
            w = width(s)
            y = height(s)
            rows.append([[p.x + t * nx, y, p.y + t * nz, s] for t in (-w / 2, w / 2)])
            centers.append([p.x, y, p.y, s, w])
        m = mesh({"id": label}, width(0), cut, rows)
        m.update(id=label, centers=centers, anchors=anchors)
        surfaces.append(m)
    return dict(
        surfaces=surfaces,
        cut=cut,
        ends=ends.tolist(),
        routeIds=[w["id"] for w in ways],
        crossings=crossings,
    )


def axis_point(c):
    from shapely.geometry import Point

    x, z = c["crossXZ"]
    return Point(-z, x)


if __name__ == "__main__":
    print(json.dumps(bake(), separators=(",", ":"), allow_nan=False))
