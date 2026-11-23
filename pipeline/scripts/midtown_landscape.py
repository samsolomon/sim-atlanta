"""Bake the Midtown row crowns and ground-level plazas and waterways."""
import argparse
import gzip
import json
from pathlib import Path

from shapely.geometry import LineString, Polygon, box
from shapely.ops import polygonize

from expanded_canopy import PACK, bake
from vignette import MIDTOWN_ROWS, project

OUT = PACK / "midtown-landscape"


def ground_features(row):
    elements = json.loads(gzip.decompress((PACK / f"square-board/source/{row}.json.gz").read_bytes()))["elements"]
    nodes = {e["id"]: project(e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    ways = {e["id"]: e for e in elements if e["type"] == "way"}
    clip = box(-1000, MIDTOWN_ROWS[row]["minZ"], 1800, MIDTOWN_ROWS[row]["maxZ"])
    features = []
    for e in elements:
        tags = e.get("tags", {})
        if tags.get("natural") == "water":
            kind = "water"
        elif tags.get("area") == "yes" and tags.get("highway") == "pedestrian":
            if any(tags.get(key, "no") != "no" for key in ("bridge", "tunnel", "indoor")) or tags.get("level", "0") != "0":
                continue
            kind = "meadow" if tags.get("surface") in ("grass", "artificial_turf") else "plaza"
        else:
            continue
        if e["type"] == "way" and e["nodes"][0] == e["nodes"][-1]:
            polys = [Polygon([nodes[n] for n in e["nodes"]])]
        elif e["type"] == "relation" and tags.get("type") == "multipolygon":
            def rings(role):
                return list(polygonize([LineString([nodes[n] for n in ways[m["ref"]]["nodes"]])
                                        for m in e["members"] if m["role"] == role and m["ref"] in ways]))
            holes = rings("inner")
            polys = [Polygon(p.exterior, [hole.exterior for hole in holes if p.covers(hole)]) for p in rings("outer")]
        else:
            continue
        for polygon in polys:
            if not polygon.is_valid:
                continue
            clipped = polygon.intersection(clip)
            for p in getattr(clipped, "geoms", [clipped]):
                if p.geom_type == "Polygon" and p.area >= 1:
                    rings = [[[round(x, 2), round(z, 2)] for x, z in r.coords[:-1]] for r in [p.exterior, *p.interiors]]
                    features.append(dict(kind=kind, name=tags.get("name"), sub=tags.get("surface"), rings=rings))
    return features


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tile", type=Path)
    args = parser.parse_args()
    ground = {row: ground_features(row) for row in MIDTOWN_ROWS}
    bake(args.tile, [f"square-board/{row}" for row in MIDTOWN_ROWS], OUT / "crowns.json", "midtown-rows", ground)
    (OUT / "ground.json").write_text(json.dumps(ground, separators=(",", ":")) + "\n")
