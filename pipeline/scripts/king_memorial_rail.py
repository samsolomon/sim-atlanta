"""Bake the OSM freight track on the King Memorial board into the web bundle.

The board's context (king_memorial_context.py) carries no rail, so City drew nothing east
of the downtown edge: the CSX Atlanta Terminal Subdivision (the old Georgia Railroad
corridor) and its Hulsey Yard leads stopped at x = 1000. This archives every surface
railway=rail way inside the board, clipped to it, like midtown_rail.py does for the rows.
MARTA (railway=subway) is drawn by the corridor and is left out.

    python3 pipeline/scripts/king_memorial_rail.py [cached-overpass.json]
"""
import json
import math
import sys
import urllib.parse
from pathlib import Path

from king_memorial_corridor import fetch
from terrain_transport import clip_runs
from vignette import LAT0, LON0, R, K, RAW, ROOT, project

PACK = Path(ROOT) / "pipeline/prototypes/king-memorial"
FIXTURE = Path(ROOT) / "web/src/city/fixtures/king-rail.json"
BOUNDS = json.loads((PACK / "ground/ground.json").read_text())["bounds"]


def lon_lat(x, z):
    return LON0 + x / (math.pi / 180 * R * K), LAT0 - z / (math.pi / 180 * R)


def bake(raw):
    elements = json.loads(raw)["elements"]
    nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    runs = []
    for way in sorted((e for e in elements if e["type"] == "way"), key=lambda e: e["id"]):
        tags = way.get("tags", {})
        if tags.get("railway") != "rail" or tags.get("tunnel", "no") != "no":
            continue
        for pts in clip_runs([nodes[i] for i in way["nodes"]], BOUNDS):
            runs.append(dict(kind="ground" if tags.get("bridge", "no") == "no" else "bridge",
                             cls="standard_gauge", name=tags.get("name"), id=f"osm:way:{way['id']}",
                             sub=tags.get("service"), pts=pts))
    return runs


if __name__ == "__main__":
    # A 30 m margin keeps ways whose nodes sit just outside the board.
    west, north = lon_lat(BOUNDS["minX"] - 30, BOUNDS["minZ"] - 30)
    east, south = lon_lat(BOUNDS["maxX"] + 30, BOUNDS["maxZ"] + 30)
    query = f'[out:json][timeout:60];way["railway"]({south:.5f},{west:.5f},{north:.5f},{east:.5f});(._;>;);out body;'
    url = "https://overpass-api.de/api/interpreter?data=" + urllib.parse.quote(query)
    raw = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else fetch(url, Path(RAW) / "osm_king_memorial_rail.json")
    runs = bake(raw)
    FIXTURE.write_text(json.dumps(runs, separators=(",", ":")) + "\n")
    print(len(runs), "runs;", sum(1 for r in runs if not r["sub"]), "main")
