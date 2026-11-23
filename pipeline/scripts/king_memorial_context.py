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


def parse_height(value):
    if not value:
        return None
    try:
        metres = float(value.removesuffix(" m"))
        return metres if 0 < metres < 1000 else None
    except ValueError:
        return None


LEVEL_M = 3.3        # inferred storey height for a building part with levels only
ROOF_SLAB_M = 0.6    # thickness of a building:part=roof canopy
PART_FALLBACK_M = 8  # the existing illustrative height for a building with no data
MIN_SHARE = 0.1      # a part at least this much inside an outline belongs to it


def _levels(value):
    try:
        n = float(value)
        return n if 0 <= n < 200 else None
    except (TypeError, ValueError):
        return None


def _rings(polygon):
    return [[[round(x, 2), round(z, 2)] for x, z in ring.coords[:-1]]
            for ring in [polygon.exterior, *polygon.interiors]]


def _polygons(shape, min_area=1.0):
    geoms = shape.geoms if hasattr(shape, "geoms") else [shape]
    return [g for g in geoms if g.geom_type == "Polygon" and g.area >= min_area]


def part_height(tags, parent_tags, king=False, tallest=None):
    """(top, bottom, tier) in metres above the footprint for one building:part.

    A height tag is reported. Levels alone are inferred: when the parent reports
    a height, its tallest part (by levels, `tallest`) is scaled to that height,
    as long as that gives 2.5-6.5 m per level; a parent with levels only lends
    City's 3.6 m; anything else uses 3.3 m.
    """
    parent_h = None if king else parse_height(parent_tags.get("height"))
    parent_levels = _levels(parent_tags.get("building:levels"))
    most = max(tallest or 0, parent_levels or 0)
    per_level = LEVEL_M
    if parent_h and most and 2.5 <= parent_h / most <= 6.5:
        per_level = parent_h / most
    elif parent_levels and not parent_h:
        per_level = 3.6  # the parent itself is drawn at 3.6 m per level
    top = None if king else parse_height(tags.get("height"))
    tier = "reported" if top else None
    levels = _levels(tags.get("building:levels"))
    if top is None and levels:
        top, tier = levels * per_level, "inferred"
    bottom = None if king else parse_height(tags.get("min_height"))
    if bottom is None:
        min_level = _levels(tags.get("building:min_level"))
        bottom = min_level * per_level if min_level else 0.0
    if tags.get("building:part") == "roof":
        top = top or PART_FALLBACK_M
        bottom = bottom or max(0.0, top - ROOF_SLAB_M)
        tier = tier or "illustrative"
    if top is None:
        top, tier = PART_FALLBACK_M, "illustrative"
    return top, min(bottom, top - 0.1), tier


def resolve(masses):
    """Trim each mass wherever an earlier mass spans its whole vertical range
    (taller first; equal ranges by id), so every part keeps its own id and tier."""
    from shapely.ops import unary_union

    masses = sorted(masses, key=lambda m: (-m["top"], m["bottom"], m["id"]))
    for i, m in enumerate(masses):
        covers = [o["shape"] for o in masses[:i] if o["bottom"] <= m["bottom"] and o["top"] >= m["top"]]
        if covers:
            m["shape"] = m["shape"].difference(unary_union(covers))
    return masses


def attach_parts(buildings, pieces_by_id, outlines, parts, clip, king=False):
    """Give each drawn building its mapped building:part masses.

    A part whose vertical range lies inside another part's is trimmed by it.
    Parts inside an outline City does not draw (roofs, stations, railway
    buildings, slivers) are left to whatever replaces that outline. Whatever
    the parts leave of the parent keeps the parent's height, capped by its
    lowest part when the parts map at least half the plan. Parts outside every outline become buildings.
    """
    from shapely.ops import unary_union

    by_parent, orphans = {}, []
    for ref, tags, shape in parts:
        best, share = None, 0.0
        for owner, outline in outlines:
            if outline.intersects(shape):
                overlap = outline.intersection(shape).area / shape.area
                if overlap > share:
                    best, share = owner, overlap
        if share >= MIN_SHARE:
            by_parent.setdefault(best, []).append((ref, tags, shape))
        else:
            orphans.append((ref, tags, shape))

    for b in buildings:
        piece, tags, ref = pieces_by_id[id(b)]
        mine = by_parent.get(ref)
        if not mine:
            continue
        masses = []
        tallest = max(((_levels(t.get("building:levels")) or 0) for _, t, _ in mine
                       if t.get("building:part") != "roof" and not parse_height(t.get("height"))), default=0)
        for ref, ptags, shape in mine:
            top, bottom, tier = part_height(ptags, tags, king, tallest)
            masses.append(dict(id=ref, top=top, bottom=bottom, tier=tier, shape=shape.intersection(piece)))
        masses = resolve(masses)
        out = []
        for m in masses:
            for poly in _polygons(m["shape"]):
                entry = dict(id=m["id"], rings=_rings(poly), h=round(m["top"], 1), tier=m["tier"])
                if m["bottom"] > 0:
                    entry["minH"] = round(m["bottom"], 1)
                out.append(entry)
        if not out:
            continue
        # The parent footprint the parts leave uncovered is a podium at the parent's own height.
        own = b["h"] if b["h"] is not None else (b["floors"] * 3.6 if b["floors"] else PART_FALLBACK_M)
        tier = "reported" if b["h"] is not None else "inferred" if b["floors"] else "illustrative"
        grounded = [m for m in masses if m["bottom"] == 0]
        covered = unary_union([m["shape"] for m in grounded]) if grounded else None
        # Where parts map most of the plan, the remainder is a podium no taller than
        # its lowest part. A sparse part (an entrance or canopy) leaves the parent as it was.
        podium_h = own
        if covered is not None and covered.area >= 0.5 * piece.area:
            major = [m for m in grounded if m["shape"].area >= 0.1 * covered.area]
            lowest = min(major, key=lambda m: m["top"], default=None)
            if lowest and lowest["top"] < own:
                podium_h, tier = lowest["top"], lowest["tier"]
        rest = piece.difference(covered) if covered is not None else piece
        for poly in _polygons(rest, 20):
            if not poly.buffer(-0.75).is_empty:
                out.append(dict(id="podium", rings=_rings(poly), h=round(podium_h, 1), tier=tier))
        b["parts"] = out

    # Parts outside every outline stand alone; overlapping ones resolve as one group.
    lone = []
    for ref, tags, shape in orphans:
        top, bottom, tier = part_height(tags, {}, king)
        lone.append(dict(id=ref, top=top, bottom=bottom, tier=tier, tags=tags, shape=shape.intersection(clip)))
    for m in resolve(lone):
        tags = m["tags"]
        for i, poly in enumerate(_polygons(m["shape"], 20)):
            kind = tags.get("building:part")
            rings = _rings(poly)
            part = dict(id=m["id"], rings=rings, h=round(m["top"], 1), tier=m["tier"])
            if m["bottom"] > 0:
                part["minH"] = round(m["bottom"], 1)
            buildings.append(dict(id=m["id"] if i == 0 else f"{m['id']}/{i}", cls=kind if kind not in ("yes", None) else "yes",
                                  floors=int(_levels(tags.get("building:levels")) or 0) or None, h=part["h"],
                                  rings=rings, name=tags.get("name"), parts=[part]))


def extract_context(raw, bounds, *, king=False, station_building=None, named_deck=None):
    from shapely.geometry import LineString, Polygon, box
    from shapely.ops import polygonize

    clip = box(bounds["minX"], bounds["minZ"], bounds["maxX"], bounds["maxZ"])
    elements = json.loads(raw)["elements"]
    nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    ways = {e["id"]: e for e in elements if e["type"] == "way"}
    roads, buildings, cover = [], [], []
    pieces_by_id, outlines, parts = {}, [], []

    def add_area(ref, tags, outer, holes=()):
        building = tags.get("building")
        if building and building != "no":
            shape = Polygon(outer, holes).buffer(0)
            if not shape.is_empty:
                outlines.append((ref, shape))
        elif not building and tags.get("building:part", "no") != "no":
            shape = Polygon(outer, holes).buffer(0)
            if shape.area >= 1:
                parts.append((ref, tags, shape))
            return
        if building in ("roof", "no") or (building == "train_station" and ref != station_building) or tags.get("railway"):
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
        pencil_factory = king and ref in ("osm:way:897345398", "osm:way:897345399")
        for i, part in enumerate(pieces):
            if part.geom_type != "Polygon" or part.area < 1:
                continue
            rings = [[[round(x, 2), round(z, 2)] for x, z in ring.coords[:-1]]
                     for ring in [part.exterior, *part.interiors]]
            if building:
                levels = tags.get("building:levels", "5" if pencil_factory else "")
                ident = ref if i == 0 else f"{ref}/{i}"
                buildings.append(dict(id=ident, cls=building,
                                      floors=int(levels) if levels.isdigit() else None,
                                      h=parse_height(tags.get("height")) if not king else None, rings=rings, name=tags.get("name")))
                pieces_by_id[id(buildings[-1])] = (part, tags, ref)
            else:
                cover.append(dict(kind=kind, sub=None, name=tags.get("name"), rings=rings))

    def ring(w):
        return [nodes[i] for i in w["nodes"]]

    members = set()
    for r in elements:
        t = r.get("tags", {})
        if r["type"] != "relation" or t.get("type") != "multipolygon" or not (
                t.get("building") or t.get("building:part", "no") != "no"):
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
    station = Polygon(ring(ways[270494115])) if king else None
    for ident, way in ways.items():
        t = way.get("tags", {})
        coords = ring(way)
        if way["nodes"][0] == way["nodes"][-1] and ident not in members:
            add_area(f"osm:way:{ident}", t, coords)
        if t.get("highway") and not t.get("railway") and t.get("area") != "yes":
            if t.get("public_transport") or (t["highway"] in ("footway", "steps", "path") and
                    ((station is not None and station.intersects(LineString(coords))) or t.get("tunnel") or t.get("covered") == "yes")):
                continue
            for pts in clip_runs(coords, bounds):
                roads.append(dict(cls=t["highway"], sub=t.get("footway") or t.get("service"),
                                  name=t.get("name"), bridge=t.get("bridge", "no") != "no",
                                  tunnel=t.get("tunnel", "no") != "no" or t.get("indoor") == "yes", pts=pts))
                if ident == named_deck:
                    roads[-1]["id"] = f"osm:way:{ident}"
    attach_parts(buildings, pieces_by_id, outlines, parts, clip, king)
    return buildings, roads, cover


def bake(raw):
    buildings, roads, cover = extract_context(raw, BOUNDS, king=True)
    # Approximate waterline in the Oct 8, 2023 NAIP (USGS image 41283).
    # Trace only the water, including the short northeast arm. The deck is a separate building.
    pool = [[1422.8, 577.1], [1433.5, 573.2], [1435.1, 577.2], [1430.1, 579.2],
            [1429.8, 589.6], [1423.5, 589.6]]
    cover.append(dict(kind="swimming_pool", sub=None, name="Marchon courtyard pool", rings=[pool]))
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
