"""Bake scoped non-MARTA transport for the terrain board, or update an existing City bake."""
import bisect
import itertools
import json
import math
from pathlib import Path

from pyproj import Geod
from vignette import RAW, ROOT, lines, project

GEOD = Geod(ellps="WGS84")


def clip_runs(points, bounds):
    """Intersect each segment with the rectangle, including outside-to-outside crossings."""
    run = []
    for a, b in zip(points, points[1:]):
        lo, hi = 0.0, 1.0
        for j, axis in enumerate(("X", "Z")):
            low, high = bounds["min" + axis], bounds["max" + axis]
            delta = b[j] - a[j]
            if delta:
                t0, t1 = sorted(((low - a[j]) / delta, (high - a[j]) / delta))
                lo, hi = max(lo, t0), min(hi, t1)
            elif not low <= a[j] <= high:
                hi = -1.0
        if hi > lo:
            start, end = ([round(u + t * (v - u), 2) for u, v in zip(a, b)] for t in (lo, hi))
            if start != end:
                if run and run[-1] != start:
                    yield run
                    run = []
                if not run:
                    run.append(start)
                run.append(end)
        if hi < 1 and run:
            yield run
            run = []
    if run:
        yield run


def intervals(coords, flags, levels):
    """Resolve each rule along the full source geometry using WGS84 ellipsoid lengths."""
    distances = list(itertools.accumulate(GEOD.line_lengths(*zip(*coords)), initial=0.0))
    if not distances[-1]:
        return
    fractions = [d / distances[-1] for d in distances]
    rules = [(rule.get("between") or (0, 1), rule["values"]) for rule in flags]
    rules += [(rule.get("between") or (0, 1), ["is_bridge"]) for rule in levels if rule["value"] > 0]
    cuts = sorted({0, 1}.union(*(bounds for bounds, _ in rules)))

    def state(pair):
        mid = sum(pair) / 2
        tags = {v for (a, b), values in rules if a <= mid < b for v in values}
        if tags.intersection(("is_tunnel", "is_abandoned", "is_disused")):
            return "hidden"
        return "bridge" if "is_bridge" in tags else "ground"

    def at(f):
        i = min(bisect.bisect_right(fractions, f) - 1, len(coords) - 2)
        if f == 1:
            return coords[-1]
        t = (f - fractions[i]) / (fractions[i + 1] - fractions[i])
        return [a + t * (b - a) for a, b in zip(coords[i], coords[i + 1])]

    for kind, pairs in itertools.groupby(zip(cuts, cuts[1:]), state):
        group = list(pairs)
        a, b = group[0][0], group[-1][1]
        if kind != "hidden":
            inner = coords[bisect.bisect_right(fractions, a):bisect.bisect_left(fractions, b)]
            yield kind, [project(*c) for c in [at(a), *inner, at(b)]]


# One track of the Atlanta Terminal Subdivision, east to north. Overture source
# IDs preserve the choice of main track at the parallel Hulsey leads and the Gulch fork.
FREIGHT_MAIN = (
    ("c10339f4-274d-4e9e-96e1-fd6218a7bcb5", False),
    ("2ecfc011-adbf-4653-8a0a-9a794f69ca03", False),
    ("425c2519-3178-4749-bf27-f6a28f0cae07", True),
    ("e87db0cb-36d2-4c13-9992-7beae86bda56", True),
)


def freight_axis(rails, bounds):
    """Establish distance along the continuous route, including its covered intervals."""
    features = {f["properties"].get("id"): f for f in rails}
    points = []
    for source_id, reverse in FREIGHT_MAIN:
        feature = features.get(source_id)
        if not feature or feature["properties"].get("class") != "standard_gauge":
            return None
        parts = [pts for coords in lines(feature["geometry"])
                 for pts in clip_runs([project(*p) for p in coords], bounds)]
        if len(parts) != 1:
            return None
        part = parts[0][::-1] if reverse else parts[0]
        if points and points[-1] != part[0]:
            return None
        points.extend(part[1:] if points else part)
    return points


def distance_on_axis(points, at):
    distance = 0
    nearest = (math.inf, 0)
    for a, b in zip(points, points[1:]):
        dx, dz = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dz)
        if length == 0:
            continue
        f = max(0, min(1, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dz) / length**2))
        error = math.hypot(a[0] + f * dx - at[0], a[1] + f * dz - at[1])
        nearest = min(nearest, (error, distance + f * length))
        distance += length
    return round(nearest[1], 2)


def bake(roads, rails, bounds):
    result = {"version": 1, "roads": [], "rail": []}
    axis = freight_axis(rails, bounds)
    route_ids = {source_id for source_id, _ in FREIGHT_MAIN}
    for key, features, flag_key in (("roads", roads, "road_flags"), ("rail", rails, "rail_flags")):
        for feature in features:
            p = feature["properties"]
            flags, levels = p.get(flag_key) or [], p.get("level_rules") or []
            if key == "roads":
                # The board already paints every road without a whole-way structure flag.
                tags = {v for rule in flags for v in rule["values"]}
                if not (tags & {"is_bridge", "is_tunnel"} or any(r["value"] > 0 for r in levels)):
                    continue
            elif p.get("class") not in ("tram", "standard_gauge"):
                continue
            for coords in lines(feature["geometry"]):
                for kind, points in intervals(coords, flags, levels):
                    for pts in clip_runs(points, bounds):
                        item = {"cls": p["class"], "kind": kind, "pts": pts}
                        if p.get("subclass"):
                            item["sub"] = p["subclass"]
                        if key == "rail" and axis is not None and p.get("id") in route_ids:
                            item["freightS"] = [distance_on_axis(axis, xz) for xz in (pts[0], pts[-1])]
                        result[key].append(item)
    return result


if __name__ == "__main__":
    path = Path(ROOT, "web/public/data/scene/downtown/vignette.json")
    city = json.loads(path.read_text())
    features = [json.loads(Path(RAW, f"overture_downtown_{key}.geojson").read_text())["features"]
                for key in ("roads", "rail")]
    city["terrainTransport"] = bake(*features, city["bounds"])
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(city, separators=(",", ":")))
    temp.replace(path)
