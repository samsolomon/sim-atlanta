"""Local carrier surfaces. Run with .venv/bin/python; writes a fixture to stdout."""

import bisect
import gzip
import json
import math
import struct
from pathlib import Path

from shapely.geometry import LineString, Point

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "pipeline/prototypes"
ZERO = 323.8
LANE = 3.55  # existing illustrative Connector motor-lane default
GRADE = 0.08  # numerical regularizer for this frozen experiment, not a design criterion
K = math.radians(1) * 6371008.8


def osm(tile):
    with gzip.open(DATA / f"square-board/source/{tile}.json.gz") as f:
        elements = json.load(f)["elements"]
    nodes = {
        n["id"]: (
            round((n["lon"] + 84.3916) * K * math.cos(math.radians(33.7539)), 2),
            round(-(n["lat"] - 33.7539) * K, 2),
        )
        for n in elements
        if n["type"] == "node"
    }
    return {
        w["id"]: dict(w, pts=[nodes[n] for n in w["nodes"]])
        for w in elements
        if w["type"] == "way"
    }


class Ground:
    def __init__(self):
        self.grids = []
        for folder in [
            "downtown-ground",
            "square-board/north-band",
            "sweet-auburn/ground",
            "square-board/north-corner",
            "square-board/midtown-central",
            "king-memorial/ground",
        ]:
            path = DATA / folder
            g = json.loads((path / "ground.json").read_text())
            assert g["vertical"]["sceneZeroNavd88M"] == ZERO
            self.grids.append((g, (path / g["file"]).read_bytes()))

    def __call__(self, x, z):
        for g, raw in self.grids:
            b = g["bounds"]
            if b["minX"] <= x <= b["maxX"] and b["minZ"] <= z <= b["maxZ"]:
                col, row = (x - b["minX"]) / g["stepM"], (z - b["minZ"]) / g["stepM"]
                i, j = min(int(col), g["cols"] - 2), min(int(row), g["rows"] - 2)
                result = 0.0
                for di, wx in enumerate([1 - col + i, col - i]):
                    for dj, wz in enumerate([1 - row + j, row - j]):
                        n = struct.unpack_from(
                            "<h", raw, 2 * ((j + dj) * g["cols"] + i + di)
                        )[0]
                        if n == g["noData"]:
                            raise ValueError("DEM void")
                        result += wx * wz * (n * g["scaleM"] + g["offsetM"] - ZERO)
                return result
        raise ValueError(f"no DEM at {x, z}")


def cut(poly, axis, boundary, sign):
    """Clip an oriented polygon and all vertex attributes at the same fraction."""
    result = []
    for a, b in zip(poly[-1:] + poly, poly):
        da, db = sign * (a[axis] - boundary), sign * (b[axis] - boundary)
        if (da < 0) != (db < 0):
            f = da / (da - db)
            v = [u + (w - u) * f for u, w in zip(a, b)]
            v[axis] = boundary
            result.append(v)
        if db >= 0:
            result.append(b)
    return result


def tread(way, width, ground, seam, floors=(), limits=None, anchors=(), normal_at=None):
    """Solve full source stations, then clip triangles. Limits bound the fixture halo."""
    line = LineString(way["pts"])
    lo, hi = limits or (0, line.length)
    vertices = [0.0]
    for a, b in zip(way["pts"], way["pts"][1:]):
        vertices.append(vertices[-1] + math.dist(a, b))
    stations = sorted(
        {
            lo,
            hi,
            *(s for s in vertices if lo < s < hi),
            *(s for s, h in floors),
            *(s for s, h in anchors),
            *(lo + i for i in range(1, math.ceil(hi - lo))),
        }
    )
    assert stations[0] == lo and stations[-1] == hi
    axis = [line.interpolate(s).coords[0] for s in stations]
    ys = [ground(*p) for p in axis]
    for s, h in [*floors, *anchors]:
        i = stations.index(s)
        ys[i] = max(ys[i], h)
    # Least grade-limited majorant of sampled ground and structural clearance floors.
    for indices in [range(1, len(ys)), range(len(ys) - 2, -1, -1)]:
        for i in indices:
            j = i - indices.step
            ys[i] = max(ys[i], ys[j] - GRADE * abs(stations[j] - stations[i]))
    for s, h in anchors:
        if abs(ys[stations.index(s)] - h) > 1e-7:
            raise ValueError(f"infeasible shared anchor {way['id']}:{s}")
    # Offset-line intersections (miters) at source bends; interpolating the
    # edge vertices avoids a sudden full-width rotation in one sample cell.
    normals = []
    for a, b in zip(way["pts"], way["pts"][1:]):
        length = math.dist(a, b)
        normals.append((-(b[1] - a[1]) / length, (b[0] - a[0]) / length))
    miters = [normals[0]]
    for a, b in zip(normals, normals[1:]):
        denom = 1 + a[0] * b[0] + a[1] * b[1]
        if denom < 0.5:
            raise ValueError("turn too sharp for one ribbon")
        miters.append(tuple((u + v) / denom for u, v in zip(a, b)))
    miters.append(normals[-1])
    rows = []
    for s, (x, z), y in zip(stations, axis, ys):
        j = min(len(normals) - 1, bisect.bisect_right(vertices, s) - 1)
        f = (s - vertices[j]) / (vertices[j + 1] - vertices[j])
        n = [a + (b - a) * f for a, b in zip(miters[j], miters[j + 1])]
        if normal_at and s in normal_at:
            n = normal_at[s]
        rows.append(
            [[x + k * n[0], y, z + k * n[1], s] for k in (-width / 2, width / 2)]
        )
    return mesh(way, width, seam, rows)


def mesh(way, width, seam, rows):
    pieces = [[], []]
    for (a, b), (c, d) in zip(rows, rows[1:]):
        for face in [[a, b, d], [a, d, c]]:
            for side, sign in enumerate([-1, 1]):
                poly = cut(face, 2, seam, sign)
                for v, w in zip(poly[1:], poly[2:]):
                    u = poly[0]
                    if (
                        abs(
                            (v[0] - u[0]) * (w[2] - u[2])
                            - (w[0] - u[0]) * (v[2] - u[2])
                        )
                        > 1e-10
                    ):
                        pieces[side].extend([u, v, w])
    return dict(
        id="osm:way:" + str(way["id"]),
        version=way.get("version"),
        direction="in source order",
        width=width,
        cutZ=seam,
        rows=rows,
        pieces=pieces,
    )


def section(way, p, radius):
    l = LineString(way["pts"])
    s = l.project(Point(p))
    return max(0, s - radius), min(l.length, s + radius)


def main():
    ground = Ground()
    ways = osm("north-band")
    register = json.loads((DATA / "connector-footprint/ways.json").read_text())
    surfaces = []
    relations = []
    lower = ways[39449296]
    lower_tread = tread(
        lower,
        int(lower["tags"]["lanes"]) * 3.1,
        lambda x, z: ground(x, z) + 0.12,
        -1300,
        limits=section(lower, (120, -1282), 45),
    )
    surfaces.append(lower_tread)
    lower_line = LineString(lower["pts"])

    def lower_height(x, z):
        station = lower_line.project(Point(x, z))
        rows = lower_tread["rows"]
        for (a, _), (b, _) in zip(rows, rows[1:]):
            if a[3] <= station <= b[3]:
                f = (station - a[3]) / (b[3] - a[3])
                return a[1] + f * (b[1] - a[1])
        raise ValueError("lower road outside fixture halo")

    for id in [1450813223, 1450813225, 1450813220, 9235148]:
        reg = register[str(id)]
        way = ways.get(id, dict(id=id, **reg))
        seam = -300 if id == 9235148 else -1300
        floors = []
        if id in (1450813223, 1450813225):
            lower = ways[39449296]
            l = LineString(way["pts"])
            p = l.intersection(LineString(lower["pts"]))
            assert p.geom_type == "Point" and not set(way["nodes"]).intersection(
                lower["nodes"]
            )
            s = l.project(p)
            # Clearance policy over the crossed pavement envelope. Width, depth and
            # required free height are modeled; the input contains no soffit survey.
            width = int(lower["tags"]["lanes"]) * 3.1
            footprint = LineString(lower["pts"]).buffer(width / 2, cap_style=2)
            span = l.intersection(footprint)
            stations = [l.project(Point(v)) for v in span.coords]
            for j in range(math.ceil(max(stations) - min(stations)) + 1):
                at = min(max(stations), min(stations) + j)
                q = l.interpolate(at)
                floors.append((at, lower_height(q.x, q.y) + 5 + 0.95))
            floors.append((s, lower_height(p.x, p.y) + 5 + 0.95))
            relations.append(
                dict(
                    kind="bridge-over",
                    upper=id,
                    lower=lower["id"],
                    point=p.coords[0],
                    lowerTop=lower_height(p.x, p.y),
                    depth=0.95,
                    required=5,
                    surveyed=None,
                )
            )
        width = reg["lanes"] * LANE
        if not floors:
            surfaces.append(tread(way, width, lambda x, z: ground(x, z) + 0.12, seam))
            continue
        before, after = (
            (1450813222, 536877682) if id == 1450813223 else (1450813229, 175629560)
        )
        chain = [ways[before], way, ways[after]]
        assert all(a["nodes"][-1] == b["nodes"][0] for a, b in zip(chain, chain[1:]))
        axis = chain[0]["pts"] + way["pts"][1:] + chain[2]["pts"][1:]
        start = LineString(chain[0]["pts"]).length
        end = start + LineString(way["pts"]).length
        run = tread(
            dict(id=id, pts=axis),
            width,
            lambda x, z: ground(x, z) + 0.12,
            seam,
            [(s + start, h) for s, h in floors],
            limits=(max(0, start - 35), min(LineString(axis).length, end + 35)),
        )
        for src, lo, hi in zip(
            chain, [0, start, end], [start, end, LineString(axis).length]
        ):
            rows = [
                [[x, y, z, s - lo] for x, y, z, s in row]
                for row in run["rows"]
                if lo - 1e-7 <= row[0][3] <= hi + 1e-7
            ]
            surfaces.append(mesh(src, width, seam, rows))
        for a, b in zip(chain, chain[1:]):
            relations.append(
                dict(
                    kind="continuation",
                    ways=[a["id"], b["id"]],
                    node=a["nodes"][-1],
                    point=a["pts"][-1],
                )
            )

    # Accepted Ellis joint provides an inferred signed fixture anchor. Both owners
    # receive one datum and transverse direction at their shared source node.
    e = osm("north-corner")
    a, b = e[115789929], e[38974057]
    assert a["nodes"][-1] == b["nodes"][0]
    joint = a["pts"][-1]
    h = -17.96321
    dx, dz = (v - u for u, v in zip(a["pts"][-2], joint))
    n = (-dz / math.hypot(dx, dz), dx / math.hypot(dx, dz))
    for way, end in [(a, True), (b, False)]:
        l = LineString(way["pts"])
        at = l.length if end else 0.0
        nearby = at - 2 if end else at + 1
        surfaces.append(
            tread(
                way,
                6.2,
                lambda x, z: ground(x, z) + 0.12,
                joint[1],
                limits=section(way, joint, 16),
                anchors=[(at, h), (nearby, h)],
                normal_at={at: n},
            )
        )
    relations.append(
        dict(
            kind="continuation",
            ways=[a["id"], b["id"]],
            node=a["nodes"][-1],
            point=joint,
            top=h,
            tier="inferred from accepted Ellis render",
            sidewalkOnBridge=a["tags"].get("sidewalk"),
        )
    )
    m = osm("midtown-central")
    for ids in [
        (48663359, 306157879, 311764287, 629238141),
        (1001561467, 1431380388),
        (1001561467, 1431380389),
    ]:
        (node,) = set.intersection(*(set(m[i]["nodes"]) for i in ids))
        p = m[ids[0]]["pts"][m[ids[0]]["nodes"].index(node)]
        relations.append(
            dict(
                kind="same-grade" if len(ids) == 4 else "pedestrian-connection",
                ways=ids,
                node=node,
                point=p,
                physicalSidewalkWidth=None,
            )
        )
        if len(ids) == 2:
            foot = m[ids[1]]
            relations[-1].update(
                sidewalkAxis=foot["pts"],
                crossingAxis=m[ids[0]]["pts"],
                widthSource=foot["tags"].get("width"),
                sharedFootwayNode=node,
            )
        if len(ids) == 4:
            # Common ground junction elevation, outgoing lane permissions unresolved.
            for i in ids:
                line = LineString(m[i]["pts"])
                at = line.project(Point(p))
                surfaces.append(
                    tread(
                        m[i],
                        int(m[i]["tags"]["lanes"]) * 3.1,
                        lambda x, z: ground(x, z) + 0.12,
                        p[1],
                        limits=section(m[i], p, 8),
                        anchors=[(at, ground(*p) + 0.12)],
                    )
                )
    rail = json.loads((ROOT / "web/src/city/fixtures/king-rail.json").read_text())
    bore = dict(id=144588627, pts=[[1381.41, 488.14], [1382.14, 527.43]])
    road = lambda x, z: 307.66 + (z - 488.14) * 0.0046 - ZERO
    surfaces.append(tread(bore, 6.2, road, 508))
    for track in rail:
        key = int(track["id"].split(":")[-1])
        if key not in (
            144595771,
            539939093,
            905879528,
            539939596,
            539939602,
            539939598,
            539939594,
            539939595,
        ):
            continue
        line = LineString(track["pts"])
        p = line.intersection(LineString(bore["pts"]))
        if p.geom_type != "Point" or p.is_empty:
            continue
        surfaces.append(
            tread(
                dict(id=key, pts=track["pts"]),
                1.435,
                lambda x, z: 313.79 - ZERO,
                p.y,
                limits=section(dict(pts=track["pts"]), p.coords[0], 5),
            )
        )
        relations.append(
            dict(
                kind="rail-over-road",
                upper=key,
                lower=bore["id"],
                point=p.coords[0],
                structure="fra:643081D",
                depth=313.79 - 312.04,
                required=4.10,
                posted=4.0894,
                surveyed=None,
                trainAssignment=None,
            )
        )
    # Metadata and warnings are downstream of the frozen numerical solve.
    # Design speed and design terrain class are absent from these sources.
    all_ways = {**ways, **e, **m}
    for surface in surfaces:
        key = int(surface["id"].split(":")[-1])
        tags = all_ways.get(key, {}).get("tags", {})
        rail_axis = any(
            r.get("kind") == "rail-over-road" and r["upper"] == key for r in relations
        )
        cls = "standard_gauge" if rail_axis else tags.get("highway")
        if key == 9235148:
            cls = "motorway_link"
        if key == 144588627:
            cls = "tertiary"
        surface.update(
            sourceClass=cls,
            designSpeedMph=None,
            designTerrain=None,
            postedSpeed=tags.get("maxspeed"),
            widthTier="illustrative" if rail_axis else "inferred",
            surveyedWidth=None,
            elevationTier="inferred",
            sidewalk=tags.get("sidewalk:both", tags.get("sidewalk")),
        )
        if key in (9235148, 1450813220):
            surface["orderStatus"] = (
                "unresolved; register ground alone does not establish carrier at a crossing"
            )
        if key in (1450813222, 536877682, 1450813229, 175629560):
            row = surface["rows"][0 if key in (1450813222, 1450813229) else -1]
            x, y, z, _ = [(a + b) / 2 for a, b in zip(*row)]
            surface["outerApproachExcessM"] = y - ground(x, z) - 0.12
    return dict(
        version=1,
        units="scene metres; y = NAVD88 minus 323.8",
        surfaces=surfaces,
        relations=relations,
    )


if __name__ == "__main__":
    print(json.dumps(main(), allow_nan=False, separators=(",", ":")))
