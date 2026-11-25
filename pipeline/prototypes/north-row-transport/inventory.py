"""Freeze identity and topology in the source frame; clip output to the north row."""

import gzip, hashlib, json, math
from pathlib import Path
from itertools import pairwise
import numpy as np
from shapely.geometry import LineString, Point, box
from shapely.strtree import STRtree

HERE = Path(__file__).resolve().parent
freeze = json.loads((HERE / "freeze.json").read_text())
bounds = box(*freeze["bounds"])
m = json.loads((HERE / "ground.json").read_text())
buffer = (HERE / "ground.i16").read_bytes()
assert hashlib.sha256(buffer).hexdigest() == m["sha256"]
dem = np.frombuffer(buffer, "<i2").reshape(m["rows"], m["cols"])


def ground(x, z):
    u = np.clip((x + 1000) / 5, 0, m["cols"] - 1)
    v = np.clip((z + 6500) / 5, 0, m["rows"] - 1)
    i = min(int(u), m["cols"] - 2)
    j = min(int(v), m["rows"] - 2)
    u -= i
    v -= j
    return float(
        m["offsetM"]
        + m["scaleM"]
        * (
            (1 - u) * (1 - v) * dem[j, i]
            + u * (1 - v) * dem[j, i + 1]
            + (1 - u) * v * dem[j + 1, i]
            + u * v * dem[j + 1, i + 1]
        )
    )


def parts(g, kind):
    if g.is_empty:
        return []
    if g.geom_type == kind:
        return [g]
    return [p for item in getattr(g, "geoms", []) for p in parts(item, kind)]


def rounded(p):
    return [round(v, 3) for v in p]


def sample_stations(line, step):
    return sorted({0.0, line.length, *range(step, math.ceil(line.length), step)})


def status(tags):
    if tags.get("railway") in [
        "abandoned",
        "disused",
        "razed",
        "construction",
        "proposed",
    ]:
        return tags["railway"]
    if "railway" in tags:
        return (
            "mapped "
            + tags["railway"]
            + (" / " + tags["service"] if "service" in tags else "")
        )
    for k in ["abandoned", "disused", "razed"]:
        if k + ":railway" in tags:
            return k
    return None


def active_road(t):
    return t.get("highway") not in [
        None,
        "construction",
        "proposed",
        "abandoned",
        "disused",
        "planned",
    ]


def feature(w):
    t = w["tags"]
    h = t.get("highway")
    classified = (
        "none"
        if not h
        else "motorway implicit forward"
        if h == "motorway"
        else "unspecified"
    )
    direction = {
        "yes": "forward",
        "-1": "reverse",
        "no": "both",
        "1": "forward",
        "true": "forward",
    }.get(t.get("oneway"), classified)
    both = t.get("sidewalk:both", t.get("sidewalk"))

    def side(k):
        if "sidewalk:" + k in t:
            return t["sidewalk:" + k]
        if both in ["left", "right"]:
            return "yes" if both == k else "no"
        return {"both": "yes"}.get(both, both)

    return dict(
        id=w["id"],
        version=w["version"],
        timestamp=w["timestamp"],
        tags=t,
        roadDirection=direction,
        lanes={
            k: t.get(k)
            for k in (
                "lanes",
                "lanes:forward",
                "lanes:backward",
                "turn:lanes",
                "turn:lanes:forward",
                "turn:lanes:backward",
            )
        },
        sidewalkSourceLeft=side("left"),
        sidewalkSourceRight=side("right"),
        railState=status(t),
        activeRoad=active_road(t),
        reportedIncline=t.get("incline"),
        deck=t.get("bridge"),
        tunnel=t.get("tunnel"),
        layer=t.get("layer"),
    )


def load():
    raw = gzip.open(HERE / "osm.json.gz").read()
    assert hashlib.sha256(raw).hexdigest() == freeze["rawSha256"]
    elements = json.loads(raw)["elements"]
    k = math.radians(1) * 6371008.8
    nodes = {
        a["id"]: (
            (a["lon"] + 84.3916) * k * math.cos(math.radians(33.7539)),
            -(a["lat"] - 33.7539) * k,
        )
        for a in elements
        if a["type"] == "node"
    }
    ways = {}
    geom = {}
    features = []
    for w in elements:
        t = w.get("tags", {})
        if (
            w["type"] != "way"
            or not (t.get("highway") or status(t))
            or len(w["nodes"]) < 2
        ):
            continue
        l = LineString([nodes[n] for n in w["nodes"]])
        ps = parts(l.intersection(bounds), "LineString")
        if not ps:
            continue
        key = w["id"]
        ways[key] = w
        geom[key] = l
        item = feature(w)
        item["pieces"] = []
        for p in ps:
            a, b = [l.project(Point(q)) for q in [p.coords[0], p.coords[-1]]]
            if a > b and not l.is_ring:
                p = LineString(p.coords[::-1])
                a, b = b, a
            stations = sample_stations(p, 10)
            ds = [ground(*p.interpolate(s).coords[0]) for s in stations]
            grades = [
                100 * (v - u) / (n - m)
                for (m, n), (u, v) in zip(pairwise(stations), pairwise(ds))
                if n - m > 0.01
            ]
            item["pieces"].append(
                dict(
                    stationRangeM=rounded([a, b]),
                    xz=[rounded(q) for q in p.coords],
                    peakBareEarthGradePct=round(max(map(abs, grades), default=0), 2),
                )
            )
        features.append(item)
    return ways, geom, nodes, features


def inventory():
    ways, geom, nodes, features = load()
    keys = list(geom)
    tree = STRtree([geom[i] for i in keys])
    crossings = []
    overlaps = []
    for a, i in enumerate(keys):
        for b in tree.query(geom[i], predicate="intersects"):
            if b <= a:
                continue
            j = keys[b]
            g = geom[i].intersection(geom[j]).intersection(bounds)
            if g.is_empty:
                continue
            wi, wj = ways[i], ways[j]
            common = set(wi["nodes"]) & set(wj["nodes"])
            for p in parts(g, "Point"):
                xy = p.coords[0]
                shared = next(
                    (n for n in common if math.dist(nodes[n], xy) < 0.01), None
                )
                ti, tj = wi["tags"], wj["tags"]
                roadRail = bool(
                    (ti.get("highway") and status(tj))
                    or (tj.get("highway") and status(ti))
                )
                relationship = "shared-source-node" if shared else "unresolved"
                upper = None
                if shared is None:
                    if any(
                        t.get("bridge") == "yes" or t.get("tunnel") == "yes"
                        for t in (ti, tj)
                    ):
                        try:
                            li, lj = (int(t.get("layer", 0)) for t in (ti, tj))
                            if li != lj:
                                upper = i if li > lj else j
                                relationship = "inferred-order"
                        except ValueError:
                            pass
                crossings.append(
                    dict(
                        ways=[i, j],
                        xz=rounded(xy),
                        sharedNode=shared,
                        upper=upper,
                        relationship=relationship,
                        roadRail=roadRail,
                    )
                )
            if parts(g, "LineString"):
                overlaps.append([i, j])
    return dict(
        reference=freeze["reference"],
        ways=features,
        crossings=crossings,
        coincidentAxes=overlaps,
    )


if __name__ == "__main__":
    print(json.dumps(inventory(), separators=(",", ":"), allow_nan=False))
