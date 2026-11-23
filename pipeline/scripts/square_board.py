"""Rebuild both optional square-board sections from the archived OSM maps and pinned DEM."""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

import downtown_terrain as terrain
from king_memorial_context import extract_context
from vignette import K, LAT0, LON0, R, ROOT, VIGNETTES

PACK = Path(ROOT) / "pipeline/prototypes/square-board"
DOWNTOWN = PACK.parent / "downtown-ground"
KING = PACK.parent / "king-memorial/ground"
AUBURN = PACK.parent / "sweet-auburn/ground"


def bbox(name):
    x0, x1 = VIGNETTES[name]["x"]
    z0, z1 = VIGNETTES[name]["z"]
    pad = 35
    return ",".join(f"{v:.6f}" for v in (
        LON0 + math.degrees((x0-pad)/(R*K)), LAT0 - math.degrees((z1+pad)/R),
        LON0 + math.degrees((x1+pad)/(R*K)), LAT0 - math.degrees((z0-pad)/R)))


def bake(tile, direction):
    for part in ("band", "corner"):
        name = f"{direction}-{part}"
        out = PACK / name
        terrain.bake(tile, out, name, DOWNTOWN)
        manifest = json.loads((out / "ground.json").read_text())
        if manifest["noDataCount"]:
            raise ValueError(f"{name} extends beyond the valid DEM")
        if part == "corner":
            import numpy as np
            heights = np.fromfile(out / "ground.i16", dtype="<i2").reshape(manifest["rows"], manifest["cols"])
            terrain.verify_shared_edge(heights, AUBURN if direction == "north" else KING)
            terrain.verify_shared_edge(heights, PACK / f"{direction}-band")
        raw = gzip.decompress((PACK / "source" / f"{name}.json.gz").read_bytes())
        buildings, roads, ground = extract_context(raw, manifest["bounds"])
        for road in roads:
            if road["cls"].endswith("_link"):
                road["cls"], road["sub"] = road["cls"][:-5], "link"
        context = dict(name=name, bounds=manifest["bounds"], buildings=buildings, roads=roads,
                       ground=ground, trees=[], rail=[], source=dict(
                           attribution="© OpenStreetMap contributors", sha256=hashlib.sha256(raw).hexdigest(),
                           url="https://api.openstreetmap.org/api/0.6/map.json?bbox="+bbox(name)))
        (out / "context.json").write_text(json.dumps(context, separators=(",", ":"))+"\n")
        print(name, len(buildings), "buildings,", len(roads), "road/path runs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tile", type=Path)
    parser.add_argument("--section", choices=["north", "south"])
    args = parser.parse_args()
    for section in [args.section] if args.section else ["north", "south"]:
        bake(args.tile, section)
