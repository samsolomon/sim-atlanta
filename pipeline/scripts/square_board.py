"""Rebuild both optional square-board sections from the archived OSM maps and pinned DEM."""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

import downtown_terrain as terrain
from king_memorial_context import extract_context
from terrain_transport import clip_runs
from vignette import K, LAT0, LON0, MIDTOWN_ROWS, R, ROOT, VIGNETTES, project

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


def south_freight(raw, bounds):
    """Continue the five mapped surface tracks from Castleberry Hill to the west edge."""
    elements = json.loads(raw)["elements"]
    nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    rails = []
    for way in elements:
        tags = way.get("tags", {})
        if way["type"] != "way" or tags.get("railway") != "rail" or tags.get("operator") != "Norfolk Southern Railway":
            continue
        if any(tags.get(key, "no") != "no" for key in ("bridge", "tunnel")):
            continue
        for pts in clip_runs([nodes[i] for i in way["nodes"]], bounds):
            rails.append(dict(kind="ground", cls="standard_gauge", name=tags.get("name"), pts=pts))
    return rails


def bake_patch(tile, name, north_tile=None):
    out = PACK / name
    reference = DOWNTOWN
    if name in MIDTOWN_ROWS:
        previous = next((key for key, row in MIDTOWN_ROWS.items() if row["minZ"] == MIDTOWN_ROWS[name]["maxZ"]), "north-band")
        reference = PACK / previous
    terrain.bake(tile, out, name, reference, north_tile)
    manifest = json.loads((out / "ground.json").read_text())
    if manifest["noDataCount"]:
        raise ValueError(f"{name} extends beyond the valid DEM")
    if name.endswith("-corner"):
        import numpy as np
        heights = np.fromfile(out / "ground.i16", dtype="<i2").reshape(manifest["rows"], manifest["cols"])
        terrain.verify_shared_edge(heights, AUBURN if name == "north-corner" else KING)
        terrain.verify_shared_edge(heights, PACK / name.replace("-corner", "-band"))
    raw = gzip.decompress((PACK / "source" / f"{name}.json.gz").read_bytes())
    station = dict(station_building="osm:way:265350477", named_deck=38978515) if name == "brookwood-station" else {}
    buildings, roads, ground = extract_context(raw, manifest["bounds"], **station)
    for road in roads:
        if road["cls"].endswith("_link"):
            road["cls"], road["sub"] = road["cls"][:-5], "link"
    context = dict(name=name, bounds=manifest["bounds"], buildings=buildings, roads=roads,
                   ground=ground, trees=[], rail=[], source=dict(
                       attribution="© OpenStreetMap contributors", sha256=hashlib.sha256(raw).hexdigest(),
                       url="https://api.openstreetmap.org/api/0.6/map.json?bbox="+bbox(name)))
    if name == "south-band":
        context["terrainTransport"] = dict(version=1, roads=[], rail=south_freight(raw, manifest["bounds"]))
    (out / "context.json").write_text(json.dumps(context, separators=(",", ":"))+"\n")
    print(name, len(buildings), "buildings,", len(roads), "road/path runs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tile", type=Path)
    parser.add_argument("--section", choices=["north", "south", "midtown"])
    parser.add_argument("--north-tile", type=Path, help="Adjacent pinned x74y375 GeoTIFF for Midtown")
    parser.add_argument("--row", choices=list(MIDTOWN_ROWS), help="Bake a single Midtown row against its predecessor")
    args = parser.parse_args()
    if args.row and args.section != "midtown":
        parser.error("--row requires --section midtown")
    if (args.section == "midtown") != (args.north_tile is not None):
        parser.error("--section midtown requires --north-tile and uses it exclusively")
    for section in [args.section] if args.section else ["north", "south"]:
        names = ([args.row] if args.row else list(MIDTOWN_ROWS)) if section == "midtown" else [f"{section}-band", f"{section}-corner"]
        for name in names:
            bake_patch(args.tile, name, args.north_tile)
