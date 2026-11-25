"""Standalone vector greybox views from local OSM, context and terrain; no runtime map registration."""

from collections import Counter
from pathlib import Path
import gzip, html, json, math
from shapely.geometry import LineString, Polygon, Point, box
from inventory import HERE, ground, inventory, parts

data = inventory()
(HERE / "inventory.json.gz").write_bytes(
    gzip.compress(json.dumps(data, separators=(",", ":")).encode(), mtime=0)
)
context = json.loads((HERE / "context.json").read_text())
controls = json.loads((HERE / "mayson.json").read_text())
rail = json.loads((HERE / "north-line-profile.json").read_text())
# The context baker omits building:part; add Marcus Tower from its own footprint.
raw = json.load(gzip.open(HERE / "osm.json.gz"))["elements"]
nodes = {a["id"]: a for a in raw if a["type"] == "node"}
part = next(a for a in raw if a["type"] == "way" and a["id"] == 887724918)
k = math.radians(1) * 6371008.8
tower = [
    [
        (nodes[n]["lon"] + 84.3916) * k * math.cos(math.radians(33.7539)),
        -(nodes[n]["lat"] - 33.7539) * k,
    ]
    for n in part["nodes"]
]
buildings = context["buildings"] + [
    dict(id="osm:way:887724918", floors=16, rings=[tower], cls="hospital")
]


def view(title, scope, angle, scale, labels):
    cx, cz = (
        (scope.bounds[0] + scope.bounds[2]) / 2,
        (scope.bounds[1] + scope.bounds[3]) / 2,
    )
    zero = ground(cx, cz)
    sn, cs = math.sin(angle), math.cos(angle)

    def proj(p):
        x, h, z = p
        x -= cx
        z -= cz
        return [
            600 + scale * (x * cs - z * sn),
            257 + scale * ((x * sn + z * cs) * 0.61 - (h - zero) * 0.79),
        ]

    def depth(p):
        return (p[0] * sn + p[2] * cs) * 0.79 + p[1] * 0.61

    land = []
    rest = []

    def primitive(vertices, color, base=False, stroke=None, thick=1):
        xy = " ".join(",".join("%.2f" % v for v in proj(p)) for p in vertices)
        el = (
            f'<polygon points="{xy}" fill="{color}" stroke="{color}" stroke-width=".35"/>'
            if stroke is None
            else f'<polyline points="{xy}" fill="none" stroke="{stroke}" stroke-width="{thick:.2f}" stroke-linejoin="round"/>'
        )
        (land if base else rest).append((sum(map(depth, vertices)) / len(vertices), el))

    def corners(x, z, dx, dz):
        return [
            (u, ground(u, v), v)
            for u, v in [(x, z), (x + dx, z), (x + dx, z + dz), (x, z + dz)]
        ]

    xmin, zmin, xmax, zmax = scope.bounds
    step = 40 if scale < 1 else 8
    for x in range(int(xmin), int(xmax), step):
        for z in range(int(zmin), int(zmax), step):
            pp = corners(x, z, min(step, xmax - x), min(step, zmax - z))
            shade = int(max(0, min(25, 12 + (pp[0][1] - pp[2][1]) / step * 45)))
            primitive(
                pp, "#%02x%02x%02x" % (202 + shade, 207 + shade, 191 + shade), True
            )

    def drawline(points, col, w):
        for a, b in zip(points, points[1:]):
            primitive([a, b], "none", stroke=col, thick=max(0.55, w * scale))

    for f in data["ways"]:
        t = f["tags"]
        h = t.get("highway")
        r = f["railState"]
        if scale > 1 and any(f["id"] == s["way"] for s in controls["surfaces"]):
            continue
        if (
            t.get("bridge") == "yes"
            or t.get("tunnel") == "yes"
            or t.get("railway:track_ref") in ["NL", "NR"]
        ):
            continue
        if not f["activeRoad"] and not (r or "").startswith("mapped"):
            continue
        width = {
            "motorway": 13,
            "motorway_link": 6,
            "primary": 12,
            "secondary": 9,
            "footway": 1.4,
            "cycleway": 1.8,
            "path": 1.3,
        }.get(h, 3.6)
        col = "#a5a7a3" if h else "#796851"
        for piece in f["pieces"]:
            for line in parts(
                LineString(piece["xz"]).intersection(scope), "LineString"
            ):
                pts = []
                count = max(1, math.ceil(line.length / (12 if scale < 1 else 3)))
                for i in range(count + 1):
                    x, z = line.interpolate(line.length * i / count).coords[0]
                    pts.append((x, ground(x, z) + 0.08, z))
                drawline(pts, col, width if h else 1.435)
    for f in buildings:
        ring = f["rings"][0]
        if len(ring) < 3:
            continue
        poly = Polygon(ring)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if not poly.intersects(scope):
            continue
        for sub in parts(poly.intersection(scope), "Polygon"):
            if sub.area < 5:
                continue
            pts = list(sub.exterior.coords)[:-1]
            x, z = sub.representative_point().coords[0]
            base = ground(x, z)
            civic = f["cls"] == "hospital" or f["id"] == "osm:way:887724918"
            warehouse = f["id"] in ("osm:way:268895222", "osm:way:268895265")
            ht = (
                (f.get("h") or (f.get("floors") or 1) * (3.5 if civic else 3.3))
                if not warehouse
                else 5
            )
            top = [(u, base + ht, v) for u, v in pts]
            for j, (u, v) in enumerate(pts):
                U, V = pts[(j + 1) % len(pts)]
                normal = (U - u) / max(1, math.hypot(U - u, V - v))
                val = int(155 + 18 * normal)
                color = (
                    "#%02x%02x%02x" % (val - 14, val + 6, val + 8)
                    if civic
                    else "#%02x%02x%02x" % (val + 8, val + 3, val - 4)
                )
                primitive(
                    [(u, base, v), (U, base, V), top[(j + 1) % len(pts)], top[j]], color
                )
            primitive(
                top, "#bbcecd" if civic else "#b9b4a7" if warehouse else "#c8c6bd"
            )
            if warehouse:
                # Reusable greybox roof monitor along the mapped building's long axis.
                hull = list(sub.minimum_rotated_rectangle.exterior.coords)
                a, b = max(zip(hull, hull[1:]), key=lambda ab: math.dist(*ab))
                dx = (b[0] - a[0]) * 0.25
                dz = (b[1] - a[1]) * 0.25
                drawline(
                    [
                        (x - dx, base + ht + 0.7, z - dz),
                        (x + dx, base + ht + 0.7, z + dz),
                    ],
                    "#8d887d",
                    1.5,
                )
    for track in rail if scale < 1 else []:
        pts = [
            (x, y + 323.8, z)
            for _, x, y, z in track["rows"]
            if xmin <= x <= xmax and zmin <= z <= zmax
        ]
        drawline(pts, "#4d7892", 2.5)
    for s in controls["surfaces"]:
        if not any(scope.covers(Point(v[0], v[2])) for row in s["rows"] for v in row):
            continue
        c = (
            "#386980"
            if s["way"] in (81137860, 319512612)
            else "#8d684e"
            if s["way"] == 144485857
            else "#767b7d"
        )
        for a, b in zip(s["rows"], s["rows"][1:]):
            primitive([(v[0], v[1] + 323.8, v[2]) for v in [a[0], a[1], b[1], b[0]]], c)
    body = "".join(s for _, s in sorted(land)) + "".join(s for _, s in sorted(rest))
    for label, x, h, z, ox, oy in labels:
        u, v = proj((x, h, z))
        tx, ty = u + ox, v + oy
        body += f'<path d="M{u:.1f} {v:.1f}L{tx:.1f} {ty:.1f}" stroke="#30434a"/><rect x="{tx - 3:.1f}" y="{ty - 20:.1f}" width="{len(label) * 8 + 8}" height="21" fill="#f7f6ef"/><text x="{tx:.1f}" y="{ty - 4:.1f}" fill="#183237">{html.escape(label)}</text>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 515" font-family="system-ui,sans-serif" font-size="15" fill="#203435"><title>{title}</title><rect width="1200" height="515" fill="#f7f6ef"/>{body}<text x="20" y="32" font-size="24" font-weight="bold">{title}</text><text x="20" y="490" font-size="14">Blue: MARTA upper-surface proxy · Rust: freight track · Gray: streets and generic surroundings</text></svg>'


overview = view(
    "North row · offline terrain and transport greybox",
    box(-1000, -6500, 1800, -5700),
    -0.05,
    0.4,
    [
        (
            "Piedmont Atlanta Hospital · Marcus Tower",
            -245,
            ground(-245, -5992) + 56,
            -5992,
            -155,
            -60,
        ),
        (
            "Ottley Drive · repeated warehouse form",
            775,
            ground(775, -6000) + 5,
            -6000,
            -70,
            74,
        ),
        ("Mayson Street NE", 1292, 268.1, -6202, 20, -61),
    ],
)
close = view(
    "Mayson Street NE · carrier study",
    box(1215, -6270, 1365, -6136),
    -0.65,
    5.6,
    [
        ("NR over Mayson", 1291.81, 268.1, -6202.19, 40, -95),
        ("NL over MARTA Access", 1287.33, 268.19, -6203.25, -210, -42),
        ("NS yard at grade", 1288.72, 258.24, -6203.0, -160, 106),
    ],
)
(HERE / "overview.svg").write_text(overview)
(HERE / "mayson.svg").write_text(close)
