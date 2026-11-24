"""Audit City footprints against archived residential land use; bake the untyped low-rise candidates."""
import gzip
import json
from collections import Counter
from pathlib import Path

from shapely.geometry import LineString, Polygon
from shapely.ops import polygonize, unary_union

from vignette import ROOT, project

ROOT = Path(ROOT)
PACK = ROOT / "pipeline/prototypes"
SCENE = ROOT / "web/public/data/scene"


def mapped_land():
    nodes, ways, relations, tags = {}, {}, {}, {}
    files = [*sorted((PACK / "square-board/source").glob("*.gz")),
             PACK / "sweet-auburn/source/osm-map.json.gz", PACK / "expanded-canopy/source/king-map.json.gz"]
    for file in files:
        for e in json.loads(gzip.decompress(file.read_bytes()))["elements"]:
            if e["type"] == "node":
                nodes[e["id"]] = project(e["lon"], e["lat"])
            elif e["type"] == "way":
                ways[e["id"]] = e
            elif e["type"] == "relation":
                relations[e["id"]] = e
            if "building" in e.get("tags", {}):
                tags[f"osm:{e['type']}:{e['id']}"] = e["tags"]

    def line(ref):
        ids = ways.get(ref, {}).get("nodes", [])
        if len(ids) >= 2 and all(i in nodes for i in ids):
            return LineString([nodes[i] for i in ids])

    polygons = []
    for e in ways.values():
        if e.get("tags", {}).get("landuse") == "residential":
            shell = line(e["id"])
            if shell is not None and shell.is_ring:
                polygons.append(Polygon(shell))
    for e in relations.values():
        if e.get("tags", {}).get("landuse") != "residential":
            continue
        parts = {}
        for role in ("outer", "inner"):
            lines = [line(m["ref"]) for m in e["members"] if m["type"] == "way" and m["role"] == role]
            parts[role] = unary_union(list(polygonize([ls for ls in lines if ls is not None])))
        polygons.append(parts["outer"].difference(parts["inner"]))
    return unary_union(polygons), tags


def audit():
    mapped, tags = mapped_land()
    candidates, other_use, counts = set(), set(), Counter()
    paths = [*sorted((SCENE/"square-board").glob("*/context.json")), SCENE/"sweet-auburn/context.json",
             SCENE/"king-memorial/context.json", SCENE/"downtown/vignette.json"]
    if len(paths) != 12:
        raise ValueError("Stage all 12 City boards before running the audit")
    for path in paths:
        data = json.loads(path.read_text())
        land = mapped
        if path.parent.name == "downtown":
            land = unary_union([mapped, *[Polygon(g["rings"][0], g["rings"][1:]).buffer(0) for g in data["ground"]
                                         if g["kind"] == "residential" or g.get("sub") == "residential"]])
        for b in data["buildings"]:
            shape = Polygon(b["rings"][0], b["rings"][1:]).buffer(0)
            inside = not shape.is_empty and land.covers(shape.representative_point())
            cls = b.get("cls")
            explicit = cls in ("house", "detached", "residential")
            if shape.area > 450:
                if explicit:
                    counts[cls] += 1
                if inside:
                    counts["landuse"] += 1
                if explicit and inside:
                    counts["both"] += 1
                if explicit or inside:
                    counts["union"] += 1
            t = tags.get(b["id"].split("/")[0], {})
            use = t.get("building:use")
            if cls in ("house", "detached", "residential") and (
                (use and use not in ("house", "detached", "residential")) or any(k in t for k in ("shop", "office", "tourism", "amenity"))
            ):
                other_use.add(b["id"])
            if not inside or cls not in (None, "yes", "building") or b.get("name"):
                continue
            if any(k in t for k in ("amenity", "shop", "office", "industrial", "tourism", "man_made", "building:part")):
                continue
            if t.get("building:use", "residential") not in ("house", "residential", "detached"):
                continue
            if b.get("floors") or b.get("h"):
                candidates.add(b["id"])
    out = PACK / "residential/landuse.json"
    out.write_text(json.dumps({"lowRiseCandidates": sorted(candidates), "otherUse": sorted(other_use)}, separators=(",", ":"))+"\n")
    return counts


if __name__ == "__main__":
    print(dict(audit()))
