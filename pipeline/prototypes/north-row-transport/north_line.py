"""Continuous inferred bed profiles; scene metres; stations run south to north on each track."""

import json, math
import numpy as np
from shapely.geometry import LineString, Point
from inventory import HERE


def load(name):
    return json.loads((HERE / name).read_text())


def run():
    windows = load("rail-windows.json")
    overlays = {s["way"]: s for s in load("mayson.json")["surfaces"]}
    result = []
    for track in ["NL", "NR"]:
        parts = sorted(
            (w for w in load("north-line-axes.json") if w["track"] == track),
            key=lambda w: -max(p[1] for p in w["pts"]),
        )
        coords = []
        segments = []
        samples = {}
        forced = {}
        origin = 0
        hold = []
        for w in parts:
            pts = w["pts"]
            reverse = pts[0][1] < pts[-1][1]
            if reverse:
                pts = pts[::-1]
            line = LineString(pts)
            length = line.length
            assert not coords or coords[-1] == pts[0]
            coords.extend(pts[int(bool(coords)) :])
            segments.append([origin, origin + length, w["way"], w["version"]])
            for key, s, groups in windows:
                if key != w["way"]:
                    continue
                station = origin + (length - s if reverse else s)
                desired = [17, -1] if w["kind"] == "bridge" else [2, -1]
                picks = []
                for cls in desired:
                    picks = [
                        g for g in groups if g[0] == cls and g[1] >= 3 and g[3] <= 0.8
                    ]
                    if len(picks) == 1:
                        break
                    picks = []
                if len(picks) == 1:
                    if s % 20 == 10:
                        hold.append((station, picks[0][2]))
                    else:
                        samples[round(station, 3)] = picks[0][2]
            if w["way"] in overlays:
                lo, hi = np.inf, -np.inf
                for a, b in overlays[w["way"]]["rows"]:
                    x, y, z = [(v + u) / 2 for v, u in zip(a[:3], b[:3])]
                    station = round(origin + line.project(Point(x, z)), 3)
                    forced[station] = y + 323.8
                    lo = min(lo, station)
                    hi = max(hi, station)
                samples = {s: h for s, h in samples.items() if not lo <= s <= hi}
            origin += length
        # One isolated height on a different surface cannot pull the bed to that level.
        ss = sorted(samples)
        for _ in range(4):
            bad = []
            for i in range(1, len(ss) - 1):
                a, s, b = ss[i - 1 : i + 2]
                if (
                    b - a <= 55
                    and abs(samples[s] - np.interp(s, [a, b], [samples[a], samples[b]]))
                    > 0.45
                ):
                    bad.append(s)
            if not bad:
                break
            for s in bad:
                del samples[s]
            ss = sorted(samples)
        samples.update(forced)
        # R16 exact mounted seam height and endpoint slope from the two metre back sample.
        seam = -62.628936331059116 + 323.8
        back = (-62.64233992440054 if track == "NL" else -62.628936331059116) + 323.8
        samples = {s: h for s, h in samples.items() if s >= 4}
        samples[0] = seam
        samples[2] = seam + (seam - back)
        ss = sorted(samples)
        hs = [samples[s] for s in ss]
        assert abs(ss[-1] - origin) < 5.1
        chain = LineString(coords)
        steps = sorted(
            {
                0.0,
                origin,
                *[min(origin, max(0, s)) for s in ss],
                *range(0, math.ceil(origin), 2),
                *[chain.project(Point(p)) for p in coords],
            }
        )
        rows = []
        for s in steps:
            p = chain.interpolate(s)
            if rows and s - rows[-1][0] < 1e-5:
                continue
            rows.append(
                [
                    round(s, 5),
                    round(p.x, 5),
                    float(np.interp(s, ss, hs)) - 323.8,
                    round(p.y, 5),
                ]
            )
        error = [abs(np.interp(s, ss, hs) - v) for s, v in hold]
        grades = np.diff([r[2] for r in rows]) / np.diff([r[0] for r in rows])
        result.append(
            dict(
                track=track,
                segments=segments,
                rows=rows,
                physicalRailheadM=None,
                scope="inferred bed/upper-surface proxy; scheduled train body origin uses City offset",
                anchors=len(ss),
                maxAnchorGapM=max(np.diff(ss)),
                heldOutUnique=len(error),
                heldOutMedianAbsM=float(np.median(error)),
                heldOutMaxAbsM=max(error),
                maxAbsGradePct=100 * max(abs(grades)),
            )
        )
    return result


if __name__ == "__main__":
    print(json.dumps(run(), separators=(",", ":"), allow_nan=False))
