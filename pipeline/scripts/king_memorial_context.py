"""Bake the east board's ordinary street and building context from the corridor OSM extract."""
import hashlib
import json
import sys
from pathlib import Path

from king_memorial_corridor import OSM_BBOX, fetch
from terrain_transport import clip_runs
from vignette import RAW, ROOT, project

PACK = Path(ROOT) / "pipeline/prototypes/king-memorial"
BOUNDS = json.loads((PACK / "ground/ground.json").read_text())["bounds"]


# Visible crown centres and approximate radii (pixels) in the north-up 800 × 360
# NAIP export linked in the evidence note. This crop is one pixel per scene metre.
# Sparse where individual crowns cannot be separated. Heights are illustrative.
CROWNS = [
    (31,66,5), (51,78,4), (76,56,8), (94,62,4), (128,29,5), (122,62,4),
    (124,83,5), (121,106,4), (125,130,5), (135,145,6), (144,157,5),
    (174,172,5), (190,169,6), (207,163,6), (244,138,8), (260,146,6),
    (322,140,4), (412,143,6), (425,139,4), (526,116,7), (565,105,7),
    (595,99,6), (627,92,4), (233,214,5), (239,222,6), (322,259,5),
    (345,255,6), (540,239,5), (575,236,8), (598,263,6), (622,217,8),
    (644,230,6), (663,228,6), (682,171,7), (734,190,7), (771,206,8),
    (737,234,8), (791,251,9), (549,276,7), (582,289,6), (630,307,6),
    (684,309,7), (742,288,5), (735,317,7), (771,326,6), (539,330,5),
    (569,345,7), (592,325,6), (625,345,6),
]


def bake(raw):
    from shapely.geometry import LineString, Polygon, box
    from shapely.ops import polygonize

    clip = box(BOUNDS["minX"], BOUNDS["minZ"], BOUNDS["maxX"], BOUNDS["maxZ"])
    elements = json.loads(raw)["elements"]
    nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    ways = {e["id"]: e for e in elements if e["type"] == "way"}
    roads, buildings, cover = [], [], []

    def add_area(ref, tags, outer, holes=()):
        building = tags.get("building")
        if building in ("train_station", "roof", "no") or tags.get("railway"):
            return
        kind = "parking" if tags.get("amenity") == "parking" else tags.get("landuse") or tags.get("leisure")
        if not building and kind not in ("parking", "grass", "park", "pitch", "garden", "cemetery"):
            return
        polygon = Polygon(outer, holes)
        if not polygon.is_valid or (building and polygon.area < 45):
            return
        cropped = polygon.intersection(clip)
        pieces = cropped.geoms if hasattr(cropped, "geoms") else [cropped]
        # Five stories in the 2023 McAuley Park Phase II market study, confirmed
        # at 349 Decatur in the Nov 2025 street panorama (see the block note).
        pencil_factory = ref in ("osm:way:897345398", "osm:way:897345399")
        for i, part in enumerate(pieces):
            if part.geom_type != "Polygon" or part.area < 1:
                continue
            rings = [[[round(x, 2), round(z, 2)] for x, z in ring.coords[:-1]]
                     for ring in [part.exterior, *part.interiors]]
            if building:
                levels = tags.get("building:levels", "5" if pencil_factory else "")
                buildings.append(dict(id=ref if i == 0 else f"{ref}/{i}", cls=building,
                                      floors=int(levels) if levels.isdigit() else None,
                                      h=None, rings=rings, name=tags.get("name")))
            else:
                cover.append(dict(kind=kind, sub=None, name=tags.get("name"), rings=rings))

    def ring(w):
        return [nodes[i] for i in w["nodes"]]

    members = set()
    for r in elements:
        t = r.get("tags", {})
        if r["type"] != "relation" or t.get("type") != "multipolygon" or not t.get("building"):
            continue
        boundaries = {"outer": [], "inner": []}
        for m in r["members"]:
            w = ways.get(m["ref"]) if m["type"] == "way" else None
            if w and m["role"] in boundaries:
                boundaries[m["role"]].append(LineString(ring(w)))
        shells = list(polygonize(boundaries["outer"]))
        holes = list(polygonize(boundaries["inner"]))
        for i, shell in enumerate(shells):
            ref = f"osm:relation:{r['id']}" + (f"/{i}" if i else "")
            add_area(ref, t, shell.exterior.coords, [h.exterior.coords for h in holes if shell.covers(h)])
        if shells:
            members.update(m["ref"] for m in r["members"] if m["type"] == "way")


    # Rail authors the platforms, station entrance and pedestrian access. Ordinary
    # sidewalks along Decatur stay in the neighborhood ground texture.
    station = Polygon(ring(ways[270494115]))
    for ident, way in ways.items():
        t = way.get("tags", {})
        coords = ring(way)
        if way["nodes"][0] == way["nodes"][-1] and ident not in members:
            add_area(f"osm:way:{ident}", t, coords)
        if t.get("highway") and not t.get("railway") and t.get("area") != "yes":
            if t.get("public_transport") or (t["highway"] in ("footway", "steps", "path") and
                    (station.intersects(LineString(coords)) or t.get("tunnel") or t.get("covered") == "yes")):
                continue
            for pts in clip_runs(coords, BOUNDS):
                roads.append(dict(cls=t["highway"], sub=t.get("footway") or t.get("service"),
                                  name=t.get("name"), bridge=t.get("bridge", "no") != "no",
                                  tunnel=t.get("tunnel", "no") != "no" or t.get("indoor") == "yes", pts=pts))
    trees = [[BOUNDS["minX"] + px, BOUNDS["minZ"] + py, round(radius * 1.8 + 1.5, 1), radius]
             for px, py, radius in CROWNS]
    return dict(trees=trees, name="king-memorial", bounds=BOUNDS, buildings=buildings, roads=roads, ground=cover,
                rail=[], source=dict(attribution="© OpenStreetMap contributors", bbox=OSM_BBOX,
                                     rawSha256=hashlib.sha256(raw).hexdigest()))


if __name__ == "__main__":
    url = "https://api.openstreetmap.org/api/0.6/map.json?bbox=" + ",".join(map(str, OSM_BBOX))
    raw = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else fetch(url, Path(RAW) / "osm_king_memorial.json")
    context = bake(raw)
    (PACK / "context.json").write_text(json.dumps(context, separators=(",", ":")) + "\n")
    print({k: len(context[k]) for k in ("buildings", "roads", "ground", "trees")})
