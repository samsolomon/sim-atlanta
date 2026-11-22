"""Rebuild the Sweet Auburn study with the pinned 3DEP tile and archived OSM map response."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np

import downtown_terrain as terrain
from king_memorial_context import extract_context
from vignette import ROOT

PACK = Path(ROOT) / "pipeline/prototypes/sweet-auburn"
SNAPSHOT = PACK / "source/osm-map.json.gz"
BBOX = "-84.3812,33.7510,-84.3717,33.7590"


# Centers and approximate radii manually located on the Oct 2023 aerial crop, one pixel per metre.
CROWNS = [
    (16, 27, 12), (80, 141, 7), (276, 46, 8), (342, 98, 9), (387, 72, 7), (429, 91, 9),
    (528, 76, 9), (626, 59, 7), (702, 81, 7), (286, 127, 11), (306, 155, 9), (322, 169, 9),
    (406, 122, 12), (428, 133, 11), (447, 148, 9), (481, 138, 12), (508, 172, 11), (569, 131, 9),
    (282, 204, 11), (315, 192, 9), (334, 211, 7), (401, 213, 9), (432, 211, 9), (464, 199, 8),
    (511, 181, 9), (565, 206, 8), (285, 269, 8), (320, 251, 11), (336, 274, 9), (364, 278, 11),
    (401, 267, 11), (435, 273, 8), (467, 269, 7), (500, 269, 12), (527, 273, 11), (561, 278, 9),
    (649, 306, 13), (675, 313, 12), (709, 280, 11), (285, 347, 8), (314, 387, 8), (365, 392, 9),
    (482, 358, 8), (652, 344, 9), (676, 347, 11), (293, 412, 9), (331, 441, 8), (356, 411, 8),
    (542, 424, 9), (296, 474, 6), (333, 461, 7), (452, 468, 6), (305, 524, 7), (315, 489, 7),
    (400, 511, 9), (436, 520, 9), (454, 528, 9), (527, 531, 8), (576, 574, 7), (521, 578, 7),
    (487, 574, 7), (440, 576, 8), (266, 553, 9), (238, 602, 11), (228, 641, 11), (320, 549, 7),
    (646, 576, 9), (688, 581, 8), (711, 625, 8), (333, 685, 9), (398, 641, 7), (419, 676, 7),
    (469, 707, 9), (592, 728, 12), (576, 744, 8), (624, 751, 11), (714, 682, 9), (636, 686, 7),
    (712, 649, 9),
]


def bake(tile):
    west = PACK.parent / "downtown-ground"
    south = PACK.parent / "king-memorial/ground"
    terrain.bake(tile, PACK / "ground", "sweet-auburn", west)
    manifest = json.loads((PACK / "ground/ground.json").read_text())
    grid = np.fromfile(PACK / "ground/ground.i16", dtype="<i2").reshape(manifest["rows"], manifest["cols"])
    terrain.verify_shared_edge(grid, south)
    raw = gzip.decompress(SNAPSHOT.read_bytes())
    buildings, roads, covers = extract_context(raw, manifest["bounds"])
    for road in roads:
        if road["cls"].endswith("_link"):
            road["cls"], road["sub"] = road["cls"][:-5], "link"
    trees = [[1000 + u, -520 + v, round(1.6 * r, 1), r] for u, v, r in CROWNS]
    # Two sidewalk trees visible in both Edgewood panoramas. Coordinates, spread and height approximate.
    trees.extend([[1361.3, -46.9, 7.2, 2.7], [1376, -46.8, 6.6, 2.5]])
    context = dict(name="sweet-auburn", bounds=manifest["bounds"], buildings=buildings,
                   roads=roads, ground=covers, rail=[], trees=trees, source=dict(
                       attribution="© OpenStreetMap contributors", url="https://api.openstreetmap.org/api/0.6/map.json?bbox="+BBOX,
                       sha256=hashlib.sha256(raw).hexdigest()))
    (PACK / "context.json").write_text(json.dumps(context, separators=(",", ":")) + "\n")
    print(f"{len(buildings)} buildings, {len(roads)} road/path runs, {len(covers)} ground polygons")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tile", help="SHA-pinned local 1 m DEM")
    bake(parser.parse_args().tile)
