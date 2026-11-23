"""Bake the existing Baker/Piedmont beam deck from an OSM map extract and USGS bridge returns.

Usage: python junction-survey.py data/raw/connector-footprint/{baker,courtland}.osm
Requires numpy, shapely, pyproj and laspy[lazrs].
"""

import argparse
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from shapely import contains_xy
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "scripts"))
from king_memorial_corridor import ept_points, project, LON0, LAT0, R, K


def bake(osm, baker):
    if baker:
        outline_id, origin = 953207661, [876.72, -922.69]
        streets = ["Piedmont Avenue Northeast", "Baker Street Northeast"]
        widths = [20.5, 15]
        parks_ids = [1455345427, 1455345426]
        portals = [
            (878.24, -991.44, 0.02, -1, 11.8),
            (875.41, -881.85, -0.02, 1, 12),
            (838.36, -923.05, -1, -0.01, 9.8),
            (956.11, -921.68, 1, 0.02, 10.2),
        ]
    else:
        outline_id, origin = 875253220, [689.81, -1162.40]
        streets = ["Courtland Street Northeast", "Ralph McGill Boulevard"]
        widths = [16, 14]
        parks_ids = [1455345442, 1455345443, 1455345444]
        portals = [
            (690.34, -1210.33, 0.01, -1, 10.7),
            (690.15, -1086.68, 0.01, 1, 10),
            (599.31, -1170.82, -1, -0.095, 9),
            (732.78, -1158.55, 1, 0.09, 8.8),
        ]

    root = ET.parse(osm)
    nodes = {
        n.get("id"): np.round(
            project(float(n.get("lon")), float(n.get("lat"))), 2
        ).tolist()
        for n in root.findall("node")
    }
    ways = {
        int(w.get("id")): (
            [nodes[n.get("ref")] for n in w.findall("nd")],
            {tag.get("k"): tag.get("v") for tag in w.findall("tag")},
        )
        for w in root.findall("way")
    }
    outline = Polygon(ways[outline_id][0])
    roads = []
    road_widths = []
    walks = []
    pavement = []
    # Road widths are curb-to-curb estimates from the 2024 Fulton orthophoto.
    road_width = dict(zip(streets, widths))
    for pts, tags in ways.values():
        cls = tags.get("highway")
        if cls not in ("secondary", "secondary_link", "footway", "path"):
            continue
        line = LineString(pts)
        if not outline.buffer(0.15).covers(line):
            continue
        if cls in ("footway", "path"):
            walks.append(pts)
        else:
            roads.append(pts)
            width = road_width.get(tags.get("name"), 6.5)
            road_widths.append(width)
            pavement.append(line.buffer(width / 2, cap_style="square"))
    road = unary_union(pavement).intersection(outline)
    parks = [Polygon(ways[i][0]).intersection(outline) for i in parks_ids]

    def rings(poly):
        def ring(coords):
            return [[round(x, 3), round(z, 3)] for x, z in coords[:-1]]

        return [
            ring(list(poly.exterior.coords)),
            *[ring(list(h.coords)) for h in poly.interiors],
        ]

    def polys(g):
        if g.geom_type == "Polygon":
            return [rings(g)] if g.area > 0.01 else []
        return [p for item in getattr(g, "geoms", []) for p in polys(item)]

    xmin, zmin, xmax, zmax = outline.bounds
    lon = lambda x: LON0 + math.degrees(x / (R * K))
    lat = lambda z: LAT0 - math.degrees(z / R)
    x, z, h, c, _ = ept_points(
        (lon(xmin - 2), lat(zmax + 2), lon(xmax + 2), lat(zmin - 2))
    )
    inside = (c == 17) & contains_xy(outline.buffer(-2), x, z)
    design = np.c_[x[inside] - origin[0], z[inside] - origin[1], np.ones(inside.sum())]
    heights = h[inside]
    mask = np.ones(len(heights), dtype=bool)
    for _ in range(4):
        plane = np.linalg.lstsq(design[mask], heights[mask], rcond=None)[0]
        mask = abs(heights - design @ plane) < 0.6
    # The opening for each landward road is the section of the oblique outline
    # between its two sidewalk edges. A 30–45 m apron reaches exposed land.
    sides = []
    for ax, az, dx, dz, half in portals:
        section = []
        for sign in [-1, 1]:
            x0, z0 = ax - sign * dz * half, az + sign * dx * half
            ray = LineString(
                [(x0 - dx * 32, z0 - dz * 32), (x0 + dx * 32, z0 + dz * 32)]
            )
            hits = ray.intersection(outline.boundary)
            points = [hits] if hits.geom_type == "Point" else list(hits.geoms)
            p = min(points, key=lambda p: p.distance(Point(x0, z0)))
            y = plane @ [p.x - origin[0], p.y - origin[1], 1]
            section.append([round(p.x, 3), round(p.y, 3), round(float(y), 3)])
        sides.append(
            dict(
                edge=section,
                direction=[dx, dz],
                pavedWidth=widths[0 if abs(dz) > 0.5 else 1],
            )
        )
    quilt = parks[0]
    # The tiled portion of the northwest park ends south of the red arcade.
    patterned = quilt.intersection(
        Polygon([(820, -932), (867, -932), (867, -973), (820, -973)])
    )
    tiles = []
    # Rotated squares in two scales, clipped at the actual plaza boundary.
    size = 4.3
    for i in range(-12, 2):
        for j in range(-10, 2):
            x, z = 865 + i * size, -934 + j * size
            count = 1 if (i // 2 + j // 2) % 2 == 0 else 2
            step = size / count
            for col in range(count):
                for row in range(count):
                    cx, cz = x + (col + 0.5) * step, z + (row + 0.5) * step
                    r = step / 2
                    tile = Polygon(
                        [(cx, cz - r), (cx + r, cz), (cx, cz + r), (cx - r, cz)]
                    )
                    tiles.extend(polys(tile.intersection(patterned)))
    markings = []
    # Short lane dividers stop before the four marked pedestrian crossings.
    for dx, dz, offsets in [
        (0.021 if baker else 0.009, -1, [-6, -2, 2, 6] if baker else [-4, 0, 4]),
        (1, 0.012 if baker else 0.09, [-3.8, 0, 3.8]),
    ]:
        cx, cz = origin
        for off in offsets:
            for s in range(-85, 91, 8):
                if abs(s) < 15:
                    continue
                p = (cx + dx * s - dz * off, cz + dz * s + dx * off)
                markings.extend(
                    polys(
                        LineString([p, (p[0] + 3 * dx, p[1] + 3 * dz)])
                        .buffer(0.10, cap_style="flat")
                        .intersection(road)
                    )
                )
    for pts, tags in ways.values():
        if tags.get("footway") != "crossing":
            continue
        line = LineString(pts)
        if not outline.buffer(0.15).covers(line):
            continue
        for s in np.arange(0.5, line.length, 0.98):
            a = line.interpolate(s)
            b = line.interpolate(min(s + 0.28, line.length))
            markings.extend(
                polys(
                    LineString([a, b]).buffer(1.25, cap_style="flat").intersection(road)
                )
            )
    out = dict(
        outline=polys(outline)[0][0],
        outlineId=outline_id,
        origin=origin,
        bounds=list(outline.bounds),
        plane=plane.round(7).tolist(),
        roads=roads,
        roadWidths=road_widths,
        walks=walks,
        pavement=polys(road),
        sidewalk=polys(outline.difference(road)),
        parks=[polys(p)[0] for p in parks],
        quiltBase=polys(patterned),
        quilt=tiles,
        markings=markings,
        portals=sides,
    )

    print(
        f"{mask.sum()} accepted bridge returns; {outline.area:.0f} m²; {len(roads)} roads, {len(walks)} paths"
    )
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("osm", type=Path, nargs=2)
    baker, court = parser.parse_args().osm
    (HERE / "junction-decks.json").write_text(
        json.dumps([bake(baker, True), bake(court, False)], separators=(",", ":"))
        + "\n"
    )
